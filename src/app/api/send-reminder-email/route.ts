import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { codeId, code, emails } = await request.json();

    if (!codeId || !code || !emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: codeId, code, and emails array'
      }, { status: 400 });
    }

    // Verify the invite code exists and is not used
    const { data: inviteCode, error: fetchError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('id', codeId)
      .single();

    if (fetchError || !inviteCode) {
      return NextResponse.json({
        success: false,
        message: 'Invite code not found'
      }, { status: 404 });
    }

    if (inviteCode.is_used) {
      return NextResponse.json({
        success: false,
        message: 'Cannot send reminder for used invite code'
      }, { status: 400 });
    }

    // Check if code has expired
    const now = new Date();
    const expiresAt = inviteCode.expires_at ? new Date(inviteCode.expires_at) : null;
    if (expiresAt && expiresAt < now) {
      return NextResponse.json({
        success: false,
        message: 'Cannot send reminder for expired invite code'
      }, { status: 400 });
    }

    // Validate required environment variables
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SENDER_EMAIL', 'SMTP_FROM'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars);
      return NextResponse.json({
        success: false,
        message: `Missing email configuration: ${missingVars.join(', ')}`
      }, { status: 500 });
    }

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransporter({
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
      return NextResponse.json({
        success: false,
        message: 'SMTP configuration error. Please check email settings.'
      }, { status: 500 });
    }

    // Read the Email.png image file
    let imageBuffer;
    try {
      const imagePath = path.join(process.cwd(), 'public', 'images', 'Email.png');
      imageBuffer = fs.readFileSync(imagePath);
    } catch (error) {
      console.warn('Could not read Email.png image file:', error);
    }

    // Create reminder email template
    const emailSubject = 'Reminder: Your Helium Invite Code is Still Waiting for You';
    
    const emailContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          ${imageBuffer ? '<img src="cid:email-logo" alt="Helium Logo" style="max-width: 200px; height: auto;">' : ''}
        </div>
        
        <h2 style="color: #2563eb;">Your Helium Invite Code is Still Waiting for You</h2>
        
        <p>Hello,</p>
        
        <p>We noticed that you haven't used your Helium invite code yet. We wanted to reach out and see if you need any assistance getting started with Helium OS.</p>
        
        <div style="background-color: #f8f9fa; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <h3 style="margin: 0 0 10px 0; color: #2563eb;">Your Invite Code</h3>
          <div style="font-size: 24px; font-weight: bold; font-family: monospace; color: #2563eb; letter-spacing: 2px;">
            ${code}
          </div>
        </div>
        
        <p><strong>Expires:</strong> ${expiresAt ? expiresAt.toLocaleDateString() : 'Never'}</p>
        
        <p>Use this code to activate your account at <a href="https://he2.ai" style="color: #2563eb; text-decoration: underline;">https://he2.ai</a></p>
        
        <p>If you're having any trouble or have questions about getting started with Helium, please don't hesitate to reach out to us. We're here to help you make the most of your Helium experience.</p>
        
        <p>Some things you can do with Helium:</p>
        <ul>
          <li>Connect your business data sources</li>
          <li>Create intelligent workflows</li>
          <li>Get AI-powered insights</li>
          <li>Automate decision-making processes</li>
        </ul>
        
        <p>If you need any assistance or have questions, just reply to this email and we'll be happy to help!</p>
        
        <p>Best regards,<br>The Helium Team<br><a href="https://he2.ai" style="color: #2563eb; text-decoration: underline;">https://he2.ai</a></p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          Helium AI by Neural Arc Inc. <a href="https://neuralarc.ai" style="color: #2563eb; text-decoration: underline;">https://neuralarc.ai</a>
        </div>
      </body>
    </html>
    `;

    // Plain text version
    const textContent = `Your Helium Invite Code is Still Waiting for You

Hello,

We noticed that you haven't used your Helium invite code yet. We wanted to reach out and see if you need any assistance getting started with Helium OS.

Your Invite Code: ${code}
Expires: ${expiresAt ? expiresAt.toLocaleDateString() : 'Never'}

Use this code to activate your account at https://he2.ai

If you're having any trouble or have questions about getting started with Helium, please don't hesitate to reach out to us. We're here to help you make the most of your Helium experience.

Some things you can do with Helium:
- Connect your business data sources
- Create intelligent workflows
- Get AI-powered insights
- Automate decision-making processes

If you need any assistance or have questions, just reply to this email and we'll be happy to help!

Best regards,
The Helium Team
https://he2.ai

Helium AI by Neural Arc Inc. https://neuralarc.ai`;

    // Prepare email attachments
    const attachments = [];
    if (imageBuffer) {
      attachments.push({
        filename: 'Email.png',
        content: imageBuffer,
        cid: 'email-logo', // Content-ID for referencing in HTML
        contentType: 'image/png'
      });
    }

    // Send reminder emails
    const emailPromises = emails.map(async (email: string) => {
      try {
        console.log('Sending reminder email to:', email);
        const info = await transporter.sendMail({
          from: `"${process.env.SMTP_FROM}" <${process.env.SENDER_EMAIL}>`,
          to: email,
          subject: emailSubject,
          text: textContent,
          html: emailContent,
          attachments
        });

        console.log('Reminder email sent:', info.messageId);
        return { email, success: true };
      } catch (error) {
        console.error(`Error sending reminder email to ${email}:`, error);
        return { email, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    // Log the reminder email activity (optional - you could add this to a separate table)
    console.log(`Reminder email sent for invite code ${code} to ${successful.length} recipients`);

    if (successful.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Failed to send reminder emails to all recipients',
        details: failed
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Reminder email sent to ${successful.length} recipient${successful.length > 1 ? 's' : ''}`,
      sent: successful.length,
      failed: failed.length,
      details: {
        successful: successful.map(r => r.email),
        failed: failed.map(r => ({ email: r.email, error: r.error }))
      }
    });

  } catch (error) {
    console.error('Error in send-reminder-email API:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}
