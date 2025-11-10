import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const profileId = searchParams.get('profileId');
    const email = searchParams.get('email');

    // Accept userId, profileId, or email
    if (!userId && !profileId && !email) {
      return NextResponse.json(
        { success: false, message: 'User ID, Profile ID, or Email is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      console.error('Supabase admin client not available');
      return NextResponse.json(
        { success: false, message: 'Database configuration error' },
        { status: 500 }
      );
    }

    // First, get the userId from the profile if profileId is provided, or from email
    let targetUserId: string | null = userId || null;
    
    // If email is provided, find the user by email in auth.users
    if (email && !targetUserId) {
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error('Error listing auth users:', listError);
        return NextResponse.json(
          { success: false, message: 'Failed to fetch auth users', error: listError.message },
          { status: 500 }
        );
      }

      const user = authUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (user) {
        targetUserId = user.id;
      }
    }
    
    if (profileId && !targetUserId) {
      // Fetch the profile to get the userId
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .eq('id', profileId)
        .single();
      
      if (fetchError) {
        // Try user_profile (singular)
        const { data: profile2, error: fetchError2 } = await supabaseAdmin
          .from('user_profile')
          .select('user_id')
          .eq('id', profileId)
          .single();
        
        if (fetchError2) {
          console.error('Error fetching user profile:', fetchError2);
          // If profile doesn't exist but we have email, continue with auth deletion
          if (email && targetUserId) {
            console.log('Profile not found, but proceeding with auth deletion for email:', email);
          } else {
            return NextResponse.json(
              { success: false, message: 'User profile not found', error: fetchError2.message },
              { status: 404 }
            );
          }
        } else {
          targetUserId = profile2?.user_id || null;
        }
      } else {
        targetUserId = profile?.user_id || null;
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, message: 'User ID not found. Please provide a valid userId, profileId, or email.' },
        { status: 404 }
      );
    }

    // Step 1: Check if user exists in auth.users before attempting deletion
    let userExistsInAuth = false;
    let couldNotVerifyExistence = false;
    try {
      const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
      if (!getUserError && authUser?.user) {
        userExistsInAuth = true;
      } else if (getUserError) {
        // User doesn't exist or we couldn't fetch it
        console.log('Could not fetch user from auth.users, user may not exist:', getUserError.message);
        couldNotVerifyExistence = true;
      }
    } catch (checkError) {
      console.log('Exception checking if user exists in auth.users, will attempt deletion anyway');
      couldNotVerifyExistence = true;
    }

    // Step 2: Attempt to delete from auth.users
    // With CASCADE DELETE in place, if this succeeds, user_profiles will be automatically deleted
    // We'll always proceed with profile deletion regardless of auth deletion status
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    
    let authDeletionSucceeded = false;
    let authDeletionFailed = false;
    
    if (authDeleteError) {
      console.error('Error deleting user from auth.users:', authDeleteError);
      
      // If we get a "Database error", check if the user actually exists
      // This could mean the user doesn't exist, which is fine
      const errorMessage = authDeleteError.message?.toLowerCase() || '';
      if (errorMessage.includes('database error') || errorMessage.includes('unexpected_failure')) {
        // Double-check if user exists after the error
        try {
          const { data: verifyUser, error: verifyError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
          if (verifyError || !verifyUser?.user) {
            // User doesn't exist - treat as success (already deleted or never existed)
            console.log('User not found in auth.users after deletion error - treating as success');
            authDeletionSucceeded = true; // User doesn't exist, which is what we want
          } else {
            // User still exists - real error
            authDeletionFailed = true;
            console.warn('Auth deletion failed, but proceeding with profile deletion as requested:', {
              message: authDeleteError.message,
              code: authDeleteError.status || authDeleteError.code,
              userExists: true
            });
          }
        } catch (verifyErr) {
          // Couldn't verify - assume user doesn't exist (safer assumption)
          console.log('Could not verify user existence after error - assuming user does not exist');
          authDeletionSucceeded = true;
        }
      } else {
        // Other error - check if it's a "not found" error
        const isNotFound = errorMessage.includes('not found') || 
                          errorMessage.includes('does not exist') ||
                          errorMessage.includes('user not found') ||
                          authDeleteError.status === 404;
        
        if (isNotFound || !userExistsInAuth) {
          authDeletionSucceeded = true; // User doesn't exist, which is what we want
        } else {
          authDeletionFailed = true;
          console.warn('Auth deletion failed, but proceeding with profile deletion as requested:', {
            message: authDeleteError.message,
            code: authDeleteError.status || authDeleteError.code,
            userExists: userExistsInAuth
          });
        }
      }
    } else {
      console.log('User deleted from auth.users:', targetUserId);
      authDeletionSucceeded = true;
      // With CASCADE DELETE, the profile should be automatically deleted
      // But we'll verify and manually delete if needed
    }

    // Step 3: Delete from user_profiles table
    // Note: With CASCADE DELETE, if auth deletion succeeded, this should already be deleted
    // But we'll still try to delete manually in case CASCADE didn't work or auth deletion failed
    let deleteError = null;
    let deleted = false;

    if (profileId) {
      const { error: error1 } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', profileId);
      
      if (!error1) {
        deleted = true;
      } else if (error1.message.includes('does not exist')) {
        // Try user_profile (singular)
        const { error: error2 } = await supabaseAdmin
          .from('user_profile')
          .delete()
          .eq('id', profileId);
        
        if (!error2) {
          deleted = true;
        } else {
          deleteError = error2;
        }
      } else {
        deleteError = error1;
      }
    } else if (targetUserId) {
      // Delete by user_id
      const { error: error1 } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('user_id', targetUserId);
      
      if (!error1) {
        deleted = true;
      } else if (error1.message.includes('does not exist')) {
        // Try user_profile (singular)
        const { error: error2 } = await supabaseAdmin
          .from('user_profile')
          .delete()
          .eq('user_id', targetUserId);
        
        if (!error2) {
          deleted = true;
        } else {
          deleteError = error2;
        }
      } else {
        deleteError = error1;
      }
    }

    if (deleteError) {
      console.error('Error deleting user profile:', deleteError);
      return NextResponse.json(
        { success: false, message: 'Failed to delete user profile', error: deleteError.message },
        { status: 500 }
      );
    }

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'User profile not found' },
        { status: 404 }
      );
    }

    // Build response message
    let message = '';
    if (authDeletionSucceeded && deleted) {
      message = 'User deleted successfully from both auth.users and user_profiles (CASCADE DELETE handled profile deletion automatically)';
    } else if (authDeletionSucceeded && !deleted) {
      // Auth deletion succeeded, but profile wasn't found (might have been deleted by CASCADE already)
      message = 'User deleted successfully from auth.users. Profile was automatically deleted via CASCADE DELETE.';
    } else if (deleted && authDeletionFailed) {
      // Profile deleted but auth deletion failed
      if (userExistsInAuth) {
        message = 'User profile deleted successfully. Note: User could not be deleted from auth.users (error: ' + (authDeleteError?.message || 'Database error') + '). You may need to delete the auth user manually from Supabase Auth dashboard.';
      } else {
        message = 'User profile deleted successfully. Note: User was not found in auth.users (may have been already deleted).';
      }
    } else {
      message = 'User profile deleted successfully';
    }

    return NextResponse.json({
      success: true,
      message: message,
      authDeletionFailed: authDeletionFailed && userExistsInAuth,
      cascadeUsed: authDeletionSucceeded && deleted
    });

  } catch (error) {
    console.error('Error in delete user profile API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


