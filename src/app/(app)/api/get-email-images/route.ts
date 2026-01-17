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
    const inactiveBodyBase64 = getImageBase64('inactive.png');
    const partialBodyBase64 = getImageBase64('partial.png');
    const patternBase64 = getImageBase64('pattern1.png');
    const pattern2Base64 = getImageBase64('pattern2.png');
    const pattern3Base64 = getImageBase64('pattern3.png');
    const pattern4Base64 = getImageBase64('pattern4.png');

    return NextResponse.json({
      success: true,
      images: {
        logo: logoBase64,
        downtimeBody: downtimeBodyBase64,
        uptimeBody: uptimeBodyBase64,
        creditsBody: creditsBodyBase64,
        creditsCustom: creditsCustomBase64,
        updatesBody: updatesBodyBase64,
        inactiveBody: inactiveBodyBase64,
        partialBody: partialBodyBase64,
        pattern: patternBase64,
        pattern2: pattern2Base64,
        pattern3: pattern3Base64,
        pattern4: pattern4Base64,
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

