import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase';

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

    // Send email to individual user
    try {
      const info = await transporter.sendMail({
        from: `"${process.env.SMTP_FROM}" <${process.env.SENDER_EMAIL}>`,
        to: individualEmail,
        subject: emailSubject,
        text: textContent,
        html: emailContent,
      });

      console.log(`Email sent to ${individualEmail}:`, info.messageId);
      
      return NextResponse.json({
        success: true,
        message: `Email sent successfully to ${individualEmail}`,
        details: {
          recipient: individualEmail,
          messageId: info.messageId
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
