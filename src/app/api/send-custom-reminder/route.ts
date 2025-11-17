import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createEmailAttachments, EMAIL_IMAGES } from '@/lib/email-utils';

export async function POST(request: Request) {
  try {
    const { userEmail, userName, activityLevel, customSubject, customMessage } = await request.json();

    // Validate required fields
    if (!userEmail || !userName || !customSubject || !customMessage) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create transporter (matching existing configuration)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Get attachments for Reminder.png
    const attachments = createEmailAttachments([EMAIL_IMAGES.reminder]);

    // Email content
    const emailContent = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: userEmail,
      subject: customSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="cid:reminder" alt="Reminder" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
          </div>
          <div style="padding: 30px; text-align: center;">
            <h1 style="color: #000000; margin: 0; font-size: 28px;">Welcome Back!</h1>
          </div>
          
          <div style="padding: 20px; margin: 20px 0; color: #000000;">
              ${customMessage.replace(/\n/g, '<br>')}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://he2.ai'}" 
                 style="background: #004116; 
                        color: #FFFFFF; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        display: inline-block; 
                        font-weight: bold;">
                Get Back to Using Helium OS
              </a>
            </div>
          </div>
        </div>
      `,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    // Debug email configuration
    console.log('Email configuration:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER ? '***configured***' : 'MISSING',
      pass: process.env.SMTP_PASS ? '***configured***' : 'MISSING',
      from: process.env.SMTP_FROM || process.env.SMTP_USER
    });

    // Send email
    await transporter.sendMail(emailContent);

    console.log(`✅ Custom reminder email sent to ${userName} (${userEmail})`);
    console.log(`📧 Subject: ${customSubject}`);
    console.log(`📝 Message: ${customMessage.substring(0, 100)}...`);

    return NextResponse.json({
      success: true,
      message: `Custom reminder email sent successfully to ${userName}`,
      details: {
        recipient: userEmail,
        subject: customSubject,
        messageLength: customMessage.length,
        activityLevel
      }
    });

  } catch (error) {
    console.error('❌ Error sending custom reminder email:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send custom reminder email' 
      },
      { status: 500 }
    );
  }
}
