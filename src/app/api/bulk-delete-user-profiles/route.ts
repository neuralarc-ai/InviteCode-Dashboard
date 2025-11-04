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

    // Determine which table to use and which column to match
    let deleteError = null;
    let deletedCount = 0;
    const isProfileId = !!profileIds;

    // Try user_profiles table first
    const { error: error1, count } = await supabaseAdmin
      .from('user_profiles')
      .delete({ count: 'exact' })
      .in(isProfileId ? 'id' : 'user_id', ids);
    
    if (!error1) {
      deletedCount = count || ids.length;
    } else if (error1.message.includes('does not exist')) {
      // Try user_profile (singular)
      const { error: error2, count: count2 } = await supabaseAdmin
        .from('user_profile')
        .delete({ count: 'exact' })
        .in(isProfileId ? 'id' : 'user_id', ids);
      
      if (!error2) {
        deletedCount = count2 || ids.length;
      } else {
        deleteError = error2;
      }
    } else {
      deleteError = error1;
    }

    if (deleteError) {
      console.error('Error bulk deleting user profiles:', deleteError);
      return NextResponse.json(
        { success: false, message: 'Failed to delete user profiles', error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} user profile${deletedCount !== 1 ? 's' : ''}`,
      deletedCount
    });

  } catch (error) {
    console.error('Error in bulk delete user profiles API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


