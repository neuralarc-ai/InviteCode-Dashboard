import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Archive all used invite codes that are not already archived
    const { data, error } = await supabase
      .from('invite_codes')
      .update({ is_archived: true })
      .eq('is_used', true)
      .eq('is_archived', false)
      .select();

    if (error) {
      console.error('Error archiving used codes:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to archive used codes'
      }, { status: 500 });
    }

    const archivedCount = data?.length || 0;

    return NextResponse.json({
      success: true,
      message: `Successfully archived ${archivedCount} used invite code${archivedCount !== 1 ? 's' : ''}`,
      archivedCount
    });

  } catch (error) {
    console.error('Error in bulk-archive-used-codes API:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

