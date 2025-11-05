import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Mark first N users as credits email sent
 * This endpoint marks the first N users (ordered by created_at) as sent
 */
export async function POST(request: NextRequest) {
  try {
    const { count = 40 } = await request.json();

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        message: 'Database configuration error'
      }, { status: 500 });
    }

    // Get first N users ordered by created_at
    // Don't select metadata if column doesn't exist - handle gracefully
    const { data: profiles, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .order('created_at', { ascending: true })
      .limit(count);

    if (fetchError) {
      console.error('Error fetching profiles:', fetchError);
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
          `,
          error: fetchError
        }, { status: 400 });
      }
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch user profiles',
        error: fetchError
      }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No user profiles found'
      }, { status: 404 });
    }

    const now = new Date().toISOString();
    const userIds = profiles.map(p => p.user_id);

    // Try to fetch profiles with metadata to check if column exists
    const { data: testProfiles, error: metadataError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, metadata')
      .in('user_id', userIds.slice(0, 1)); // Test with just one

    if (metadataError && (metadataError.message.includes('metadata') || metadataError.code === '42703')) {
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

    // Fetch full profiles with metadata
    const { data: fullProfiles, error: fullFetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, metadata')
      .in('user_id', userIds);

    if (fullFetchError) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch user profiles with metadata',
        error: fullFetchError
      }, { status: 500 });
    }

    // Update each profile with credits_email_sent_at in metadata
    const updatePromises = (fullProfiles || []).map(profile => {
      const updatedMetadata = {
        ...(profile.metadata || {}),
        credits_email_sent_at: now
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
        errors: errors.map(e => e.error),
        updatedCount: (fullProfiles || []).length - errors.length
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${(fullProfiles || []).length} user(s) as credits email sent`,
      count: (fullProfiles || []).length,
      userIds: userIds
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

