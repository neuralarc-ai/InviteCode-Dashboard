import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    if (!ids) {
      return NextResponse.json(
        { success: false, message: 'No invite code IDs provided' },
        { status: 400 }
      );
    }

    const codeIds = ids.split(',');
    
    if (codeIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid invite code IDs provided' },
        { status: 400 }
      );
    }

    // Filter out preview codes (they don't exist in database)
    const databaseIds = codeIds.filter(id => !id.startsWith('preview-'));
    
    if (databaseIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All selected codes were preview codes and have been removed',
        deletedCount: codeIds.length
      });
    }

    if (!supabaseAdmin) {
      console.error('Supabase admin client not available');
      return NextResponse.json(
        { success: false, message: 'Database configuration error' },
        { status: 500 }
      );
    }

    const { error } = await supabaseAdmin
      .from('invite_codes')
      .delete()
      .in('id', databaseIds);

    if (error) {
      console.error('Error deleting invite codes:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to delete invite codes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${databaseIds.length} invite code${databaseIds.length > 1 ? 's' : ''}`,
      deletedCount: databaseIds.length
    });

  } catch (error) {
    console.error('Failed to delete invite codes:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete invite codes' },
      { status: 500 }
    );
  }
}
