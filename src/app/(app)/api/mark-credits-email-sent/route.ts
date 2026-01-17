import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Mark users as credits email sent
 * Updates user_profiles table with credits_email_sent_at timestamp
 */
export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'userIds array is required'
      }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        message: 'Database configuration error'
      }, { status: 500 });
    }

    const now = new Date().toISOString();

    // Update user_profiles with credits_email_sent_at timestamp
    // We'll store this in metadata since there's no direct field
    // First, try to fetch without metadata to check if column exists
    const { data: testProfile, error: testError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .in('user_id', userIds.slice(0, 1))
      .limit(1);

    if (testError) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch user profiles',
        error: testError
      }, { status: 500 });
    }

    // Now fetch existing profiles to preserve metadata
    const { data: profiles, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, metadata')
      .in('user_id', userIds);

    if (fetchError) {
      // Check if error is due to missing metadata column
      if (fetchError.message.includes('metadata') || fetchError.code === '42703') {
        return NextResponse.json({
          success: false,
          message: 'Metadata column does not exist in user_profiles table',
          sqlMigration: `
-- Please run this SQL in your Supabase SQL editor:
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_user_profiles_metadata ON user_profiles USING gin (metadata);
UPDATE user_profiles SET metadata = '{}'::jsonb WHERE metadata IS NULL;
          `
        }, { status: 400 });
      }
      
      console.error('Error fetching profiles:', fetchError);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch user profiles',
        error: fetchError
      }, { status: 500 });
    }

    // Update each profile with credits_email_sent_at in metadata
    const updatePromises = profiles.map(profile => {
      const updatedMetadata = {
        ...(profile.metadata || {}),
        credits_email_sent_at: now,
        // If credits_assigned is not already set, keep it as is, otherwise preserve it
        ...(profile.metadata?.credits_assigned !== undefined ? { credits_assigned: profile.metadata.credits_assigned } : {})
      };

      return supabaseAdmin
        .from('user_profiles')
        .update({
          metadata: updatedMetadata,
          updated_at: now
        })
        .eq('user_id', profile.user_id);
    });

    const results = await Promise.all(updatePromises);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      console.error('Some updates failed:', errors);
      
      // Check if error is due to missing metadata column
      const metadataErrors = errors.filter(e => 
        e.error?.message?.includes('metadata') || e.error?.code === '42703'
      );
      
      if (metadataErrors.length > 0) {
        return NextResponse.json({
          success: false,
          message: 'Metadata column does not exist in user_profiles table',
          sqlMigration: `
-- Please run this SQL in your Supabase SQL editor:
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_user_profiles_metadata ON user_profiles USING gin (metadata);
UPDATE user_profiles SET metadata = '{}'::jsonb WHERE metadata IS NULL;
          `
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: false,
        message: `Failed to update ${errors.length} user(s)`,
        errors: errors.map(e => e.error)
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${userIds.length} user(s) as credits email sent`,
      count: userIds.length
    });

  } catch (error) {
    console.error('Error marking users as sent:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

