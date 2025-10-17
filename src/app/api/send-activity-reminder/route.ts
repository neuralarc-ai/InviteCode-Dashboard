import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: NextRequest) {
  try {
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { userEmail, userName, activityLevel } = requestBody;

    if (!userEmail || !userName) {
      return NextResponse.json(
        { error: 'User email and name are required' },
        { status: 400 }
      );
    }

    // Email content based on activity level
    const getEmailContent = (level: string) => {
      const baseMessage = "Looks like your activity on Helium has slowed down. Is everything okay? We're here to help if you need any assistance.";
      
      switch (level) {
        case 'medium':
          return {
            subject: "We miss you on Helium! ",
            text: `Hi ${userName},\n\n${baseMessage}\n\nWe'd love to see you back and help you get the most out of our AI platform.\n\nBest regards,\nThe Helium Team`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #D4EB9D; padding: 20px;">
                <h2 style="color: #000000;">We miss you on Helium! </h2>
                <p>Hi ${userName},</p>
                <p>${baseMessage}</p>
                <p>We'd love to see you back and help you get the most out of our AI platform.</p>
                <p>Best regards,<br>The Helium Team</p>
                <div style="text-align: center; margin-top: 20px;">
                  <a href="http://he2.ai" style="background-color: #004116; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                    Go back to Using Helium OS
                  </a>
                </div>
              </div>
            `
          };
        case 'low':
          return {
            subject: "Let's get you back on track with Helium! 🚀",
            text: `Hi ${userName},\n\n${baseMessage}\n\nWe understand that sometimes life gets busy, but we're here to support you whenever you're ready to continue your AI journey.\n\nBest regards,\nThe Helium Team`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Let's get you back on track with Helium! 🚀</h2>
                <p>Hi ${userName},</p>
                <p>${baseMessage}</p>
                <p>We understand that sometimes life gets busy, but we're here to support you whenever you're ready to continue your AI journey.</p>
                <p>Best regards,<br>The Helium Team</p>
              </div>
            `
          };
        default:
          return {
            subject: "We're here to help with Helium! 💙",
            text: `Hi ${userName},\n\n${baseMessage}\n\nBest regards,\nThe Helium Team`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">We're here to help with Helium! 💙</h2>
                <p>Hi ${userName},</p>
                <p>${baseMessage}</p>
                <p>Best regards,<br>The Helium Team</p>
              </div>
            `
          };
      }
    };

    const emailContent = getEmailContent(activityLevel);

    // Send email
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: userEmail,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    };

    console.log('Attempting to send email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT
    });

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);

    console.log(`Activity reminder email sent to ${userEmail} (${userName}) - Activity Level: ${activityLevel}`);

    return NextResponse.json({
      success: true,
      message: `Activity reminder email sent to ${userName}`,
    });

  } catch (error) {
    console.error('Error sending activity reminder email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
