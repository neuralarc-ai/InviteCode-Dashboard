import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Mark specific users as credits email sent by email addresses
 */
export async function POST(request: NextRequest) {
  try {
    const { emails } = await request.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'emails array is required'
      }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        message: 'Database configuration error'
      }, { status: 500 });
    }

    // Get user IDs from email addresses
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch user emails',
        error: authError
      }, { status: 500 });
    }

    // Create a map of email to user ID
    const emailToUserId = new Map<string, string>();
    if (authUsers?.users) {
      authUsers.users.forEach(user => {
        if (user.email) {
          emailToUserId.set(user.email.toLowerCase(), user.id);
        }
      });
    }

    // Find user IDs for the provided emails
    const userIds: string[] = [];
    const notFoundEmails: string[] = [];
    
    emails.forEach(email => {
      const userId = emailToUserId.get(email.toLowerCase());
      if (userId) {
        userIds.push(userId);
      } else {
        notFoundEmails.push(email);
      }
    });

    if (userIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No users found for the provided emails',
        notFoundEmails
      }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Fetch existing profiles to preserve metadata
    // First try without metadata to check if column exists
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

    // Now try to fetch with metadata
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

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No user profiles found for the provided user IDs'
      }, { status: 404 });
    }

    // Update each profile with credits_email_sent_at in metadata
    const updatePromises = profiles.map(profile => {
      const updatedMetadata = {
        ...(profile.metadata || {}),
        credits_email_sent_at: now,
        credits_assigned: true // Mark as credits assigned too
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
        updatedCount: profiles.length - errors.length,
        notFoundEmails
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${profiles.length} user(s) as credits email sent and assigned`,
      count: profiles.length,
      userIds: profiles.map(p => p.user_id),
      notFoundEmails: notFoundEmails.length > 0 ? notFoundEmails : undefined
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

