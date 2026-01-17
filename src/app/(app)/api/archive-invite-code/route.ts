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

    // Archive the invite code
    const { error: archiveError } = await supabase
      .from('invite_codes')
      .update({ is_archived: true })
      .eq('id', id);

    if (archiveError) {
      console.error('Error archiving invite code:', archiveError);
      return NextResponse.json({
        success: false,
        message: 'Failed to archive invite code'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Invite code archived successfully'
    });

  } catch (error) {
    console.error('Error in archive-invite-code API:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

