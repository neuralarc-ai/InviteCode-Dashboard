import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Delete a user from auth.users by email or userId
 * This is useful for cleaning up orphaned users that exist in auth.users
 * but not in user_profiles
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');

    if (!email && !userId) {
      return NextResponse.json(
        { success: false, message: 'Email or User ID is required' },
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

    let targetUserId: string | null = userId || null;

    // If email is provided, find the user by email
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
      
      if (!user) {
        return NextResponse.json(
          { success: false, message: `User with email ${email} not found in auth.users` },
          { status: 404 }
        );
      }

      targetUserId = user.id;
    }

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, message: 'User ID not found' },
        { status: 404 }
      );
    }

    // Delete from auth.users
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    
    if (authDeleteError) {
      console.error('Error deleting user from auth.users:', authDeleteError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to delete user from auth.users', 
          error: authDeleteError.message 
        },
        { status: 500 }
      );
    }

    console.log('User deleted from auth.users:', targetUserId);

    return NextResponse.json({
      success: true,
      message: `User ${email || targetUserId} deleted successfully from auth.users`
    });

  } catch (error) {
    console.error('Error in delete auth user API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

