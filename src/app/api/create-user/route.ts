import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      fullName,
      preferredName,
      workDescription,
      personalReferences,
      avatarUrl,
      referralSource,
      consentGiven,
      consentDate,
      planType,
      accountType,
      metadata,
      emailConfirm = true, // Auto-confirm email by default
    } = body;

    // Validate required fields
    if (!email || !password || !fullName || !workDescription || !planType || !accountType) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: email, password, fullName, workDescription, planType, and accountType are required',
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email format',
        },
        { status: 400 }
      );
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password must be at least 6 characters long',
        },
        { status: 400 }
      );
    }

    // Validate plan_type enum values
    const validPlanTypes = ['seed', 'edge', 'quantum'];
    if (!validPlanTypes.includes(planType)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid plan_type. Must be one of: ${validPlanTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate account_type enum values
    const validAccountTypes = ['individual', 'business'];
    if (!validAccountTypes.includes(accountType)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid account_type. Must be one of: ${validAccountTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate consent_date if consent is given
    if (consentGiven && !consentDate) {
      return NextResponse.json(
        {
          success: false,
          message: 'consentDate is required when consentGiven is true',
        },
        { status: 400 }
      );
    }

    // Validate metadata if provided (should be an object)
    let parsedMetadata: Record<string, any> | null = null;
    if (metadata !== undefined && metadata !== null) {
      if (typeof metadata === 'string') {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch {
          return NextResponse.json(
            {
              success: false,
              message: 'Invalid metadata format. Must be valid JSON',
            },
            { status: 400 }
          );
        }
      } else if (typeof metadata === 'object') {
        parsedMetadata = metadata;
      } else {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid metadata format. Must be an object or JSON string',
          },
          { status: 400 }
        );
      }
    }

    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('Supabase Admin client not available');
      return NextResponse.json(
        {
          success: false,
          message: 'Server configuration error: Admin client not available',
        },
        { status: 500 }
      );
    }

    console.log('Creating user in Supabase Auth:', { email, fullName, planType, accountType });

    // Step 1: Create user in auth.users using admin API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: emailConfirm,
      user_metadata: {
        full_name: fullName.trim(),
        preferred_name: preferredName?.trim() || fullName.trim(),
      },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      
      // Handle duplicate email error
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return NextResponse.json(
          {
            success: false,
            message: 'A user with this email address already exists',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: authError.message || 'Failed to create user in authentication system',
        },
        { status: 500 }
      );
    }

    if (!authUser?.user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User creation failed: No user data returned',
        },
        { status: 500 }
      );
    }

    const userId = authUser.user.id;
    console.log('Auth user created successfully:', userId);

    // Step 2: Create corresponding entry in user_profiles table
    // Use database defaults for created_at and updated_at, or set explicitly
    const now = new Date().toISOString();
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: userId,
        full_name: fullName.trim(),
        preferred_name: preferredName?.trim() || fullName.trim(),
        work_description: workDescription.trim(),
        personal_references: personalReferences?.trim() || null,
        avatar_url: avatarUrl?.trim() || null,
        referral_source: referralSource?.trim() || null,
        consent_given: consentGiven || null,
        consent_date: consentGiven && consentDate ? consentDate : null,
        plan_type: planType as 'seed' | 'edge' | 'quantum',
        account_type: accountType as 'individual' | 'business',
        metadata: parsedMetadata || {},
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      
      // If profile creation fails, delete the auth user to maintain consistency
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        console.log('Rolled back auth user creation due to profile creation failure');
      } catch (deleteError) {
        console.error('Error rolling back auth user:', deleteError);
      }

      return NextResponse.json(
        {
          success: false,
          message: profileError.message || 'Failed to create user profile',
          error: profileError,
        },
        { status: 500 }
      );
    }

    console.log('User profile created successfully:', profileData?.id);

    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully',
        user: {
          id: profileData?.id,
          userId: userId,
          email: email,
          fullName: fullName.trim(),
          preferredName: preferredName?.trim() || fullName.trim(),
          planType: planType,
          accountType: accountType,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error creating user:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred while creating the user',
      },
      { status: 500 }
    );
  }
}
