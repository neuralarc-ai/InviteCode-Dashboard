import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const codeId = searchParams.get('id');

    if (!codeId) {
      return NextResponse.json(
        { error: 'Invite code ID is required' },
        { status: 400 }
      );
    }

    // Delete the invite code from the database
    const { error } = await supabase
      .from('invite_codes')
      .delete()
      .eq('id', codeId);

    if (error) {
      console.error('Error deleting invite code:', error);
      return NextResponse.json(
        { error: 'Failed to delete invite code' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete invite code API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
