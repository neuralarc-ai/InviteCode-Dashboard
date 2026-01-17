import { NextRequest, NextResponse } from 'next/server';
import { sendHeliumInviteEmailAction } from '@/lib/actions';

export async function GET(request: NextRequest) {
  try {
    const formData = new FormData();
    formData.append('firstName', 'Pranav');
    formData.append('email', 'pranav.tikhe@neuralarc.ai');
    formData.append('inviteCode', 'HELIUM-BETA-PRANAV');

    const result = await sendHeliumInviteEmailAction(formData);
    return NextResponse.json(result);
  } catch (error) {
    console.error('send-invite-now API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}


