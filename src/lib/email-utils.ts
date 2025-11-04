import fs from 'fs';
import path from 'path';

/**
 * Image attachment configuration for email templates
 */
export interface ImageAttachment {
  filename: string;
  path: string;
  cid: string; // Content-ID for referencing in HTML (e.g., "email-logo")
  contentType: string;
}

/**
 * Common image attachments used across email templates
 */
export const EMAIL_IMAGES: Record<string, ImageAttachment> = {
  logo: {
    filename: 'email-logo.png',
    path: 'email-logo.png', // Primary: email-logo.png, fallback will check Email.png
    cid: 'email-logo',
    contentType: 'image/png',
  },
  downtimeBody: {
    filename: 'downtime-body.png',
    path: 'downtime-body.png',
    cid: 'downtime-body',
    contentType: 'image/png',
  },
  uptimeBody: {
    filename: 'uptime-body.png',
    path: 'uptime-body.png',
    cid: 'uptime-body',
    contentType: 'image/png',
  },
  creditsBody: {
    filename: 'credits-body.png',
    path: 'credits-body.png',
    cid: 'credits-body',
    contentType: 'image/png',
  },
};

/**
 * Find and read an image file from common locations
 * @param imageName Name of the image file (e.g., 'email-logo.png')
 * @returns Buffer containing image data or null if not found
 */
export function getImageBuffer(imageName: string): Buffer | null {
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'images', imageName),
    path.join(process.cwd(), 'src', 'public', 'images', imageName),
    path.join(__dirname, '..', '..', 'public', 'images', imageName),
    path.join(__dirname, '..', '..', 'src', 'public', 'images', imageName),
  ];

  // Special handling for logo: check both email-logo.png and Email.png
  if (imageName === 'email-logo.png') {
    const fallbackPaths = [
      path.join(process.cwd(), 'public', 'images', 'Email.png'),
      path.join(process.cwd(), 'src', 'public', 'images', 'Email.png'),
      path.join(__dirname, '..', '..', 'public', 'images', 'Email.png'),
      path.join(__dirname, '..', '..', 'src', 'public', 'images', 'Email.png'),
    ];
    possiblePaths.push(...fallbackPaths);
  }

  for (const imagePath of possiblePaths) {
    if (fs.existsSync(imagePath)) {
      try {
        const imageBuffer = fs.readFileSync(imagePath);
        console.log(`Image loaded successfully: ${imagePath}`);
        return imageBuffer;
      } catch (error) {
        console.error(`Failed to read image ${imagePath}:`, error);
        continue;
      }
    }
  }

  console.warn(`Image not found: ${imageName} (checked paths: ${possiblePaths.join(', ')})`);
  return null;
}

/**
 * Convert image to base64 data URI (for email providers that support it)
 * @param imageName Name of the image file
 * @returns Base64 data URI string or null if image not found
 */
export function getImageBase64(imageName: string): string | null {
  const buffer = getImageBuffer(imageName);
  if (!buffer) return null;

  const mimeType = imageName.endsWith('.png') ? 'image/png' : 
                   imageName.endsWith('.jpg') || imageName.endsWith('.jpeg') ? 'image/jpeg' :
                   'image/png'; // default to png

  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Create nodemailer attachments array from image attachments
 * @param imageAttachments Array of image attachment configurations
 * @returns Array of nodemailer attachment objects
 */
export function createEmailAttachments(
  imageAttachments: ImageAttachment[]
): Array<{
  filename: string;
  content: Buffer;
  cid: string;
  contentType: string;
  contentDisposition?: string;
}> {
  const attachments: Array<{
    filename: string;
    content: Buffer;
    cid: string;
    contentType: string;
    contentDisposition?: string;
  }> = [];

  for (const attachment of imageAttachments) {
    const buffer = getImageBuffer(attachment.path);
    if (buffer) {
      attachments.push({
        filename: attachment.filename,
        content: buffer,
        cid: attachment.cid,
        contentType: attachment.contentType,
        contentDisposition: 'inline', // Important for email clients to display images inline
      });
    } else {
      console.warn(`Skipping attachment ${attachment.filename} - image not found`);
    }
  }

  return attachments;
}

/**
 * Get attachments for downtime email template
 */
export function getDowntimeAttachments() {
  return createEmailAttachments([
    EMAIL_IMAGES.logo,
    EMAIL_IMAGES.downtimeBody,
  ]);
}

/**
 * Get attachments for uptime email template
 */
export function getUptimeAttachments() {
  return createEmailAttachments([
    EMAIL_IMAGES.logo,
    EMAIL_IMAGES.uptimeBody,
  ]);
}

/**
 * Get attachments for credits email template
 */
export function getCreditsAttachments() {
  return createEmailAttachments([
    EMAIL_IMAGES.logo,
    EMAIL_IMAGES.creditsBody,
  ]);
}

/**
 * Get attachments for general invite email template
 */
export function getInviteEmailAttachments() {
  return createEmailAttachments([
    EMAIL_IMAGES.logo,
  ]);
}

