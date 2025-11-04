import { NextResponse } from 'next/server';
import { getImageBase64 } from '@/lib/email-utils';

export async function GET() {
  try {
    // Use centralized utility function for image loading
    const logoBase64 = getImageBase64('email-logo.png');
    const uptimeBodyBase64 = getImageBase64('uptime-body.png');
    const downtimeBodyBase64 = getImageBase64('downtime-body.png') || uptimeBodyBase64; // Fallback to uptime image if downtime image doesn't exist
    const creditsBodyBase64 = getImageBase64('credits-body.png');

    return NextResponse.json({
      success: true,
      images: {
        logo: logoBase64,
        uptimeBody: uptimeBodyBase64,
        downtimeBody: downtimeBodyBase64,
        creditsBody: creditsBodyBase64,
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

