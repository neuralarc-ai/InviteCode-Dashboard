import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmailAction } from '@/lib/actions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const to = searchParams.get('to') || undefined;
    const name = searchParams.get('name') || undefined;
    const code = searchParams.get('code') || undefined;
    const result = await sendTestEmailAction(to || undefined, name || undefined, code || undefined);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Test email API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
