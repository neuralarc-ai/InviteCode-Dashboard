import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: 'Server configuration error: Supabase admin client unavailable',
        },
        { status: 500 }
      );
    }

    // Get user profiles - try both possible table names
    let profilesData = null;
    let profilesError = null;

    // Try user_profiles first
    const result1 = await supabaseAdmin
      .from('user_profiles')
      .select(
        'id, user_id, full_name, preferred_name, work_description, personal_references, created_at, updated_at, avatar_url, referral_source, consent_given, consent_date, metadata, plan_type, account_type'
      )
      .order('created_at', { ascending: false });

    if (result1.error && result1.error.message.includes('relation "public.user_profiles" does not exist')) {
      // Try user_profile (singular)
      const result2 = await supabaseAdmin
        .from('user_profile')
        .select(
          'id, user_id, full_name, preferred_name, work_description, personal_references, created_at, updated_at, avatar_url, referral_source, consent_given, consent_date, metadata, plan_type, account_type'
        )
        .order('created_at', { ascending: false });

      profilesData = result2.data;
      profilesError = result2.error;
    } else {
      profilesData = result1.data;
      profilesError = result1.error;
    }

    if (profilesError) {
      // Don't throw if table doesn't exist - just return empty array
      if (profilesError.message.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          data: [],
        });
      }
      throw profilesError;
    }

    if (!profilesData || profilesData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Get user IDs to fetch emails from auth.users
    const userIds = profilesData.map((profile) => profile.user_id);

    // Create a map of user_id to email
    const userIdToEmail = new Map<string, string>();

    // Fetch emails from auth.users with pagination
    let allAuthUsers = [];
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page: page,
        perPage: perPage,
      });

      if (authError) {
        console.warn('Error fetching auth users:', authError);
        break;
      }

      if (!authUsers?.users || authUsers.users.length === 0) {
        break;
      }

      allAuthUsers = allAuthUsers.concat(authUsers.users);

      if (authUsers.users.length < perPage) {
        break;
      }

      page++;
    }

    // Map user IDs to emails
    allAuthUsers.forEach((user) => {
      if (user.email && userIds.includes(user.id)) {
        userIdToEmail.set(user.id, user.email);
      }
    });

    // Transform profiles with emails
    const transformedProfiles = profilesData.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      fullName: row.full_name,
      preferredName: row.preferred_name,
      workDescription: row.work_description,
      personalReferences: row.personal_references,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      avatarUrl: row.avatar_url,
      referralSource: row.referral_source,
      consentGiven: row.consent_given,
      consentDate: row.consent_date,
      email: userIdToEmail.get(row.user_id) || 'Email not available',
      metadata: row.metadata || null,
      planType: row.plan_type || 'seed',
      accountType: row.account_type || 'individual',
    }));

    return NextResponse.json({
      success: true,
      data: transformedProfiles,
    });
  } catch (error) {
    console.error('Error fetching user profiles:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch user profiles',
      },
      { status: 500 }
    );
  }
}

