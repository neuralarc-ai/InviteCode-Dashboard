import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
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

    console.log('Email configuration:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      senderEmail: process.env.SENDER_EMAIL,
      smtpFrom: process.env.SMTP_FROM,
      recipient: email
    });

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
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

    // Send test email
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM}" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: 'Test Email - Helium OS Dashboard',
      text: 'This is a test email from the Helium OS Dashboard to verify email configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Test Email - Helium OS Dashboard</h2>
          <p>This is a test email from the Helium OS Dashboard to verify email configuration.</p>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>SMTP Host: ${process.env.SMTP_HOST}</li>
            <li>SMTP Port: ${process.env.SMTP_PORT}</li>
            <li>SMTP User: ${process.env.SMTP_USER}</li>
            <li>Sender Email: ${process.env.SENDER_EMAIL}</li>
            <li>SMTP From: ${process.env.SMTP_FROM}</li>
          </ul>
          <p>If you received this email, the email configuration is working correctly!</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Sent from Helium OS Dashboard at ${new Date().toISOString()}
          </p>
        </div>
      `
    });

    console.log('Test email sent:', info.messageId);

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${email}`,
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Failed to send test email:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
