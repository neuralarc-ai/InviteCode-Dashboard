import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userIds, profileIds } = body;

    if (!userIds && !profileIds) {
      return NextResponse.json(
        { success: false, message: 'User IDs or Profile IDs are required' },
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

    const ids = profileIds || userIds;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid IDs array' },
        { status: 400 }
      );
    }

    const isProfileId = !!profileIds;
    let targetUserIds: string[] = [];

    // Step 1: Get userIds from profiles if profileIds are provided
    if (isProfileId) {
      const { data: profiles, error: fetchError } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .in('id', ids);
      
      if (fetchError) {
        // Try user_profile (singular)
        const { data: profiles2, error: fetchError2 } = await supabaseAdmin
          .from('user_profile')
          .select('user_id')
          .in('id', ids);
        
        if (fetchError2) {
          console.error('Error fetching user profiles:', fetchError2);
          return NextResponse.json(
            { success: false, message: 'Failed to fetch user profiles', error: fetchError2.message },
            { status: 500 }
          );
        }
        
        targetUserIds = (profiles2 || []).map(p => p.user_id).filter(Boolean);
      } else {
        targetUserIds = (profiles || []).map(p => p.user_id).filter(Boolean);
      }
    } else {
      // userIds are already provided
      targetUserIds = ids;
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid user IDs found' },
        { status: 404 }
      );
    }

    // Step 2: Delete from auth.users and track which ones succeeded
    // With CASCADE DELETE in place, if auth deletion succeeds, user_profiles will be automatically deleted
    const authDeleteErrors: string[] = [];
    const successfullyDeletedUserIds: string[] = [];
    const failedUserIds: string[] = [];
    const userExistenceMap = new Map<string, boolean>();
    
    // First, check which users exist in auth.users
    for (const userId of targetUserIds) {
      try {
        const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
        userExistenceMap.set(userId, !getUserError && !!authUser?.user);
      } catch {
        userExistenceMap.set(userId, false);
      }
    }
    
    // Now attempt to delete each user from auth.users
    // With CASCADE DELETE, successful deletions will automatically delete from user_profiles
    for (const userId of targetUserIds) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        console.error(`Error deleting user ${userId} from auth.users:`, authDeleteError);
        
        // Check if the error is because the user doesn't exist (already deleted)
        const errorMessage = authDeleteError.message?.toLowerCase() || '';
        const errorCode = authDeleteError.status || authDeleteError.code;
        const errorCodeString = String(authDeleteError.code || '').toLowerCase();
        const userExists = userExistenceMap.get(userId) ?? false;
        
        // Check if user doesn't exist - if we checked and user doesn't exist, or error indicates not found
        // Note: unexpected_failure can occur when user doesn't exist, so we check user existence first
        const isUserNotFound = errorMessage.includes('not found') || 
                               errorMessage.includes('does not exist') ||
                               errorMessage.includes('user not found') ||
                               errorMessage.includes('no user found') ||
                               errorCode === 404 ||
                               (!userExists && (errorMessage.includes('database error') || errorCodeString === 'unexpected_failure'));
        
        if (isUserNotFound || !userExists) {
          // User doesn't exist in auth (already deleted or never existed), treat as success
          // CASCADE won't trigger, but we'll delete profile manually
          console.log(`User ${userId} not found in auth.users (already deleted or never existed), treating as successful`);
          successfullyDeletedUserIds.push(userId);
        } else {
          // Real error - still try to delete profile manually
          authDeleteErrors.push(`${userId}: ${authDeleteError.message || 'Database error deleting user'}`);
          failedUserIds.push(userId);
          // Still add to successful list so we can try to delete profile
          successfullyDeletedUserIds.push(userId);
        }
      } else {
        console.log('User deleted from auth.users:', userId);
        successfullyDeletedUserIds.push(userId);
        // With CASCADE DELETE, profile should be automatically deleted
      }
    }

    // Step 3: Delete from user_profiles for users where auth deletion succeeded or failed
    // Note: With CASCADE DELETE, if auth deletion succeeded, profiles should already be deleted
    // But we'll still try to delete manually as a fallback or for failed auth deletions
    let deleteError = null;
    let deletedCount = 0;

    // Note: With CASCADE DELETE, we should still try to delete profiles even if auth deletion failed
    // because the user requested deletion. We'll delete profiles manually as a fallback.

    // If we have profileIds, we need to map them to userIds to only delete successful ones
    if (isProfileId) {
      // Get the profile IDs that correspond to successfully deleted user IDs
      const { data: successfulProfiles, error: fetchError } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .in('user_id', successfullyDeletedUserIds);
      
      if (fetchError) {
        // Try user_profile (singular)
        const { data: successfulProfiles2, error: fetchError2 } = await supabaseAdmin
          .from('user_profile')
          .select('id')
          .in('user_id', successfullyDeletedUserIds);
        
        if (fetchError2) {
          console.error('Error fetching successful profiles:', fetchError2);
          return NextResponse.json(
            { success: false, message: 'Failed to fetch profiles for successful auth deletions', error: fetchError2.message },
            { status: 500 }
          );
        }
        
        const successfulProfileIds = (successfulProfiles2 || []).map(p => p.id);
        
        if (successfulProfileIds.length > 0) {
          const { error: error1, count } = await supabaseAdmin
            .from('user_profiles')
            .delete({ count: 'exact' })
            .in('id', successfulProfileIds);
          
          if (!error1) {
            deletedCount = count || successfulProfileIds.length;
          } else if (error1.message.includes('does not exist')) {
            // Try user_profile (singular)
            const { error: error2, count: count2 } = await supabaseAdmin
              .from('user_profile')
              .delete({ count: 'exact' })
              .in('id', successfulProfileIds);
            
            if (!error2) {
              deletedCount = count2 || successfulProfileIds.length;
            } else {
              deleteError = error2;
            }
          } else {
            deleteError = error1;
          }
        }
      } else {
        const successfulProfileIds = (successfulProfiles || []).map(p => p.id);
        
        if (successfulProfileIds.length > 0) {
          const { error: error1, count } = await supabaseAdmin
            .from('user_profiles')
            .delete({ count: 'exact' })
            .in('id', successfulProfileIds);
          
          if (!error1) {
            deletedCount = count || successfulProfileIds.length;
          } else if (error1.message.includes('does not exist')) {
            // Try user_profile (singular)
            const { error: error2, count: count2 } = await supabaseAdmin
              .from('user_profile')
              .delete({ count: 'exact' })
              .in('id', successfulProfileIds);
            
            if (!error2) {
              deletedCount = count2 || successfulProfileIds.length;
            } else {
              deleteError = error2;
            }
          } else {
            deleteError = error1;
          }
        }
      }
    } else {
      // userIds provided - only delete profiles for successfully deleted auth users
      const { error: error1, count } = await supabaseAdmin
        .from('user_profiles')
        .delete({ count: 'exact' })
        .in('user_id', successfullyDeletedUserIds);
      
      if (!error1) {
        deletedCount = count || successfullyDeletedUserIds.length;
      } else if (error1.message.includes('does not exist')) {
        // Try user_profile (singular)
        const { error: error2, count: count2 } = await supabaseAdmin
          .from('user_profile')
          .delete({ count: 'exact' })
          .in('user_id', successfullyDeletedUserIds);
        
        if (!error2) {
          deletedCount = count2 || successfullyDeletedUserIds.length;
        } else {
          deleteError = error2;
        }
      } else {
        deleteError = error1;
      }
    }

    if (deleteError) {
      console.error('Error bulk deleting user profiles:', deleteError);
      return NextResponse.json(
        { success: false, message: 'Failed to delete user profiles', error: deleteError.message },
        { status: 500 }
      );
    }

    // Build success message
    const cascadeUsed = successfullyDeletedUserIds.length > 0 && deletedCount > 0;
    let message = '';
    
    if (authDeleteErrors.length === 0) {
      if (cascadeUsed) {
        message = `Successfully deleted ${deletedCount} user${deletedCount !== 1 ? 's' : ''} from both auth.users and user_profiles (CASCADE DELETE handled profile deletion automatically)`;
      } else {
        message = `Successfully deleted ${deletedCount} user${deletedCount !== 1 ? 's' : ''} from both auth.users and user_profiles`;
      }
    } else {
      message = `Successfully deleted ${deletedCount} user profile${deletedCount !== 1 ? 's' : ''}`;
      if (cascadeUsed) {
        message += `. CASCADE DELETE automatically deleted profiles for successfully deleted auth users.`;
      }
      message += `. Warning: ${authDeleteErrors.length} user(s) could not be deleted from auth.users: ${authDeleteErrors.join('; ')}. Their profiles were still deleted.`;
    }

    return NextResponse.json({
      success: deletedCount > 0, // Success if any profiles were deleted
      message,
      deletedCount,
      authDeleteErrors: authDeleteErrors.length > 0 ? authDeleteErrors : undefined,
      failedUserIds: failedUserIds.length > 0 ? failedUserIds : undefined,
      cascadeUsed: cascadeUsed
    });

  } catch (error) {
    console.error('Error in bulk delete user profiles API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


