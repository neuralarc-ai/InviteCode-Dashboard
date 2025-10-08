import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting cleanup of expired invite codes...');
    
    // First, get expired codes before deletion
    const { data: expiredCodes, error: fetchError } = await supabase
      .from('invite_codes')
      .select('id, code')
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString())
      .eq('is_used', false);
    
    if (fetchError) {
      console.error('Error fetching expired invite codes:', fetchError);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch expired invite codes',
        error: fetchError.message
      }, { status: 500 });
    }
    
    const expiredCodesList = expiredCodes || [];
    const deletedCount = expiredCodesList.length;
    const deletedCodes = expiredCodesList.map(code => code.code);
    
    if (deletedCount === 0) {
      console.log('No expired invite codes found');
      return NextResponse.json({
        success: true,
        message: 'No expired invite codes found',
        deletedCount: 0,
        deletedCodes: []
      });
    }
    
    // Delete expired codes
    const { error: deleteError } = await supabase
      .from('invite_codes')
      .delete()
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString())
      .eq('is_used', false);
    
    if (deleteError) {
      console.error('Error deleting expired invite codes:', deleteError);
      return NextResponse.json({
        success: false,
        message: 'Failed to delete expired invite codes',
        error: deleteError.message
      }, { status: 500 });
    }
    
    console.log(`Cleaned up ${deletedCount} expired invite codes:`, deletedCodes);
    
    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${deletedCount} expired invite codes`,
      deletedCount,
      deletedCodes
    });
    
  } catch (error) {
    console.error('Error in cleanup-expired-codes API:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during cleanup'
    }, { status: 500 });
  }
}

// Also support GET for manual cleanup
export async function GET(request: NextRequest) {
  return POST(request);
}
