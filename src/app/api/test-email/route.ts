import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmailAction } from '@/lib/actions';

export async function GET(request: NextRequest) {
  try {
    const result = await sendTestEmailAction();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Test email API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
