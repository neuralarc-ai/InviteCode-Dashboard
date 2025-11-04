import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const profileId = searchParams.get('profileId');

    // Accept either userId or profileId
    if (!userId && !profileId) {
      return NextResponse.json(
        { success: false, message: 'User ID or Profile ID is required' },
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

    // Determine which table to use by trying both
    let deleteError = null;
    let deleted = false;

    // Try user_profiles table first
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
    } else if (userId) {
      // Delete by user_id
      const { error: error1 } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);
      
      if (!error1) {
        deleted = true;
      } else if (error1.message.includes('does not exist')) {
        // Try user_profile (singular)
        const { error: error2 } = await supabaseAdmin
          .from('user_profile')
          .delete()
          .eq('user_id', userId);
        
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

    return NextResponse.json({
      success: true,
      message: 'User profile deleted successfully'
    });

  } catch (error) {
    console.error('Error in delete user profile API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


