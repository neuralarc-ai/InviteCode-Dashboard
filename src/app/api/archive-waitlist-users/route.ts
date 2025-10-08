import { NextRequest, NextResponse } from 'next/server';
import { archiveNotifiedWaitlistUsers } from '@/lib/data';

export async function POST(request: NextRequest) {
  try {
    console.log('Archive notified waitlist users API called');
    
    const result = await archiveNotifiedWaitlistUsers();
    
    return NextResponse.json({
      success: true,
      message: `Successfully archived ${result.archived} notified waitlist users`,
      archived: result.archived,
      emails: result.emails,
      names: result.names
    });
    
  } catch (error) {
    console.error('Error in archive-waitlist-users API:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to archive notified waitlist users',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Also support GET for manual archiving
export async function GET(request: NextRequest) {
  return POST(request);
}
