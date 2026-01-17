import { NextRequest, NextResponse } from 'next/server';
import { generateInviteCodes } from '@/lib/data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { maxUses = 1, expiresInDays = 30 } = body;

    // Generate a single invite code
    const codes = await generateInviteCodes(1, maxUses);
    
    if (codes.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Failed to generate invite code'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      code: codes[0],
      message: 'Invite code generated successfully'
    });

  } catch (error) {
    console.error('Error generating invite code:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}
