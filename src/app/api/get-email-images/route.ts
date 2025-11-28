import { NextResponse } from 'next/server';
import { getImageBase64 } from '@/lib/email-utils';

export async function GET() {
  try {
    // Use centralized utility function for image loading
    const logoBase64 = getImageBase64('email-logo.png');
    const downtimeBodyBase64 = getImageBase64('downtime-body.png');
    const uptimeBodyBase64 = getImageBase64('uptime-body.png');
    const creditsBodyBase64 = getImageBase64('1Kcredits.png');
    const creditsCustomBase64 = getImageBase64('Credits.png');
    const updatesBodyBase64 = getImageBase64('Updates.png');

    return NextResponse.json({
      success: true,
      images: {
        logo: logoBase64,
        downtimeBody: downtimeBodyBase64,
        uptimeBody: uptimeBodyBase64,
        creditsBody: creditsBodyBase64,
        creditsCustom: creditsCustomBase64,
        updatesBody: updatesBodyBase64,
      },
    });
  } catch (error) {
    console.error('Error getting email images:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get email images' },
      { status: 500 }
    );
  }
}

