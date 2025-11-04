import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Helper function to find and convert image to base64
    const getImageBase64 = (imageName: string): string | null => {
      const possiblePaths = [
        path.join(process.cwd(), 'public', 'images', imageName),
        path.join(process.cwd(), 'src', 'public', 'images', imageName),
        path.join(__dirname, '..', '..', '..', '..', 'public', 'images', imageName),
      ];

      for (const imagePath of possiblePaths) {
        if (fs.existsSync(imagePath)) {
          try {
            const imageBuffer = fs.readFileSync(imagePath);
            const base64 = imageBuffer.toString('base64');
            const mimeType = imageName.endsWith('.png') ? 'image/png' : 'image/jpeg';
            return `data:${mimeType};base64,${base64}`;
          } catch (error) {
            console.error(`Failed to read image ${imageName}:`, error);
            continue;
          }
        }
      }
      return null;
    };

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

