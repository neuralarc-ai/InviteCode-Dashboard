import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase';
import { createEmailAttachments, EMAIL_IMAGES } from '@/lib/email-utils';

export async function POST(request: NextRequest) {
  try {
    // Parse request body for custom email content and individual email
    let customEmailData = null;
    let individualEmail = '';
    
    try {
      const body = await request.json();
      
      // Check for required fields
      if (!body.subject || !body.textContent || !body.htmlContent || !body.individualEmail) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Missing required fields: subject, textContent, htmlContent, and individualEmail are required',
            details: {
              hasSubject: !!body.subject,
              hasTextContent: !!body.textContent,
              hasHtmlContent: !!body.htmlContent,
              hasIndividualEmail: !!body.individualEmail
            }
          },
          { status: 400 }
        );
      }

      customEmailData = {
        subject: body.subject,
        textContent: body.textContent,
        htmlContent: body.htmlContent
      };
      individualEmail = body.individualEmail;
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { success: false, message: 'Invalid request data: ' + (parseError instanceof Error ? parseError.message : 'Unknown error') },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(individualEmail)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // Validate required environment variables
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SENDER_EMAIL', 'SMTP_FROM'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars);
      return NextResponse.json(
        { success: false, message: `Missing email configuration: ${missingVars.join(', ')}` },
        { status: 500 }
      );
    }

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Database configuration error' },
        { status: 500 }
      );
    }

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('SMTP verification failed:', verifyError);
      return NextResponse.json(
        { success: false, message: 'SMTP configuration error. Please check email settings.' },
        { status: 500 }
      );
    }

    // Email template - use custom content
    const emailSubject = customEmailData.subject;
    const emailContent = customEmailData.htmlContent;
    const textContent = customEmailData.textContent;

    // Detect if HTML contains CID references and attach corresponding images
    const attachments: Array<{
      filename: string;
      content: Buffer;
      cid: string;
      contentType: string;
      contentDisposition?: string;
    }> = [];

    // Check for common CID references in the HTML content
    if (emailContent.includes('cid:email-logo')) {
      attachments.push(...createEmailAttachments([EMAIL_IMAGES.logo]));
    }
    if (emailContent.includes('cid:uptime-body')) {
      attachments.push(...createEmailAttachments([EMAIL_IMAGES.uptimeBody]));
    }
    if (emailContent.includes('cid:downtime-body')) {
      attachments.push(...createEmailAttachments([EMAIL_IMAGES.downtimeBody]));
    }
    if (emailContent.includes('cid:credits-body')) {
      attachments.push(...createEmailAttachments([EMAIL_IMAGES.creditsBody]));
    }

    // Send email to individual user
    try {
      const info = await transporter.sendMail({
        from: `"${process.env.SMTP_FROM}" <${process.env.SENDER_EMAIL}>`,
        to: individualEmail,
        subject: emailSubject,
        text: textContent,
        html: emailContent,
        attachments: attachments.length > 0 ? attachments as any : undefined, // Attach images if CID references found
      });

      const messageId = (info as any).messageId || 'unknown';
      console.log(`Email sent to ${individualEmail}:`, messageId);
      
      // If this is a credits email, mark user as sent
      // Check for credits-related content in multiple ways
      const isCreditsEmail = emailContent.includes('cid:credits-body') || 
                             emailContent.includes('credits-body') ||
                             emailSubject.toLowerCase().includes('credit') ||
                             emailSubject.toLowerCase().includes('credits') ||
                             textContent.toLowerCase().includes('credit') ||
                             textContent.toLowerCase().includes('credits');
      
      if (isCreditsEmail) {
        try {
          // Get user ID from email
          const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
          const user = authUsers?.users?.find(u => u.email === individualEmail);
          if (user) {
            // Mark user as credits email sent
            const markResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/mark-credits-email-sent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userIds: [user.id] }),
            });
            
            if (!markResponse.ok) {
              const markResult = await markResponse.json();
              console.warn(`Failed to mark user as sent for ${individualEmail}:`, markResult);
            } else {
              console.log(`Marked user ${user.id} (${individualEmail}) as credits email sent`);
            }
          }
        } catch (markError) {
          console.warn(`Failed to mark user as sent for ${individualEmail}:`, markError);
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Email sent successfully to ${individualEmail}`,
        details: {
          recipient: individualEmail,
          messageId: messageId
        }
      });

    } catch (emailError) {
      console.error(`Failed to send email to ${individualEmail}:`, emailError);
      return NextResponse.json(
        { success: false, message: `Failed to send email to ${individualEmail}: ${emailError}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Individual email error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send individual email' },
      { status: 500 }
    );
  }
}
