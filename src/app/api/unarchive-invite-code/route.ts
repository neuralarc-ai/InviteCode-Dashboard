import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'Invite code ID is required'
      }, { status: 400 });
    }

    // Verify the invite code exists
    const { data: inviteCode, error: fetchError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !inviteCode) {
      return NextResponse.json({
        success: false,
        message: 'Invite code not found'
      }, { status: 404 });
    }

    // Unarchive the invite code
    const { error: unarchiveError } = await supabase
      .from('invite_codes')
      .update({ is_archived: false })
      .eq('id', id);

    if (unarchiveError) {
      console.error('Error unarchiving invite code:', unarchiveError);
      return NextResponse.json({
        success: false,
        message: 'Failed to unarchive invite code'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Invite code unarchived successfully'
    });

  } catch (error) {
    console.error('Error in unarchive-invite-code API:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

