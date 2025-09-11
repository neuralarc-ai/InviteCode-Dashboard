
'use server';

import { generateInvitationEmail } from '@/ai/flows/automated-invitation-emails';
import { revalidatePath } from 'next/cache';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { updateWaitlistUser, generateInviteCodes, markInviteCodeAsUsed, addEmailToInviteCode } from '@/lib/data';
import { supabaseAdmin } from '@/lib/supabase';

const sendInviteSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  inviteCode: z.string(),
  email: z.string().email(),
  companyName: z.string().optional(),
});

export async function sendInviteEmailAction(formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());
  const validation = sendInviteSchema.safeParse(rawFormData);

  if (!validation.success) {
    return { success: false, message: 'Invalid form data.' };
  }

  const { userId, userName, inviteCode, companyName, email } = validation.data;

  try {
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

    // Generate email content using the AI flow
    const emailContent = await generateInvitationEmail({
      userName,
      inviteCode,
      companyName: companyName || '',
    });

    // Email content with simplified, clean layout and background color #D4D5D0
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Helium OS</title>
      <style>
        body { margin: 0; padding: 0; background-color: #D4D5D0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 32px 20px; }
        p { margin: 0 0 16px 0; font-size: 18px; text-align: left; }
        .footer { text-align: center; font-size: 14px; color: #666; margin-top: 32px; }
        @media (max-width: 600px) { .container { padding: 24px 14px; } }
      </style>
    </head>
    <body style="margin:0; padding:0; background-color:#D4D5D0;" bgcolor="#D4D5D0">
      <div class="container">
        <h1 style="margin:0 0 16px; font-size: 28px; text-align: center;">
          Welcome to Helium OS
        </h1>
        <p>Dear ${userName},</p>

        <p>Congratulations! You have been selected to join Helium the OS for your business, our first-ever Public Beta experience for businesses. Your account has been credited with <strong><span style="font-size:18px; font-weight:800;">1500</span> free Helium credits</strong> to explore and experience the power of Helium.</p>

        <p style="font-weight: bold;">Your Invite Code:</p>
        <div style="text-align: center; margin: 16px 0 8px;">
          <div style="color: #333; padding: 12px 24px; font-size: 24px; font-weight: bold; font-family: monospace; display: inline-block; letter-spacing: 2px; white-space: nowrap; border: 2px solid #333;">
            ${inviteCode}
          </div>
        </div>
        <p style="margin-top: 12px;">Use this code to activate your account at <a href="https://he2.ai" style="color: inherit; text-decoration: underline;">https://he2.ai</a></p>

        <p>Helium is designed to be the operating system for business intelligence, giving you a single, seamless layer to connect data, decisions, and workflows. As this is our first public beta, you may notice minor bugs or quirks. If you do, your feedback will help us make Helium even better.</p>

        <p>You are not just testing a product. You are helping shape the future of business intelligence.</p>

        <p>Welcome to Helium OS. The future of work is here.</p>

        <p>Cheers,<br>Team Helium<br><a href="https://he2.ai" style="color: inherit; text-decoration: underline;">https://he2.ai</a></p>

        <div class="footer">
          Helium AI by Neural Arc Inc. <a href="https://neuralarc.ai" style="color: inherit; text-decoration: underline;">https://neuralarc.ai</a>
        </div>
      </div>
    </body>
    </html>
    `;

    // Plain text version for email clients that don't support HTML
    const textContent = `Dear ${userName},

Congratulations! You have been selected to join Helium the OS for your business, our first-ever Public Beta experience for businesses. Your account has been credited with 1500 free Helium credits to explore and experience the power of Helium.

Your Invite Code: ${inviteCode}

Use this code to activate your account at https://he2.ai

Helium is designed to be the operating system for business intelligence, giving you a single, seamless layer to connect data, decisions, and workflows. As this is our first public beta, you may notice minor bugs or quirks. If you do, your feedback will help us make Helium even better.

You are not just testing a product. You are helping shape the future of business intelligence.

Welcome to Helium OS. The future of work is here.

Cheers,
Team Helium
https://he2.ai

Helium AI by Neural Arc Inc. https://neuralarc.ai`;

    // Send email
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM}" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: 'Welcome to Helium OS - Your Invitation is Here!',
      text: textContent,
      html: htmlContent,
    });

    console.log('Email sent:', info.messageId);

    // Update the database to mark the user as notified
    await updateWaitlistUser(userId, {
      isNotified: true,
      notifiedAt: new Date()
    });

    // Mark the invite code as used
    await markInviteCodeAsUsed(inviteCode);

    // Add email to the invite code's email_sent_to array
    await addEmailToInviteCode(inviteCode, email);

    revalidatePath('/');
    return { success: true, message: `Invitation sent to ${userName}.` };
  } catch (error) {
    console.error('Failed to send invitation:', error);
    return { success: false, message: 'An error occurred while sending the email.' };
  }
}

const sendEmailSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  email: z.string().email('Invalid email address'),
  inviteCode: z.string().min(1, 'Invite code is required'),
});

export async function sendHeliumInviteEmailAction(formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());
  const validation = sendEmailSchema.safeParse(rawFormData);

  if (!validation.success) {
    return { success: false, message: 'Invalid form data.' };
  }

  const { firstName, email, inviteCode } = validation.data;

  try {
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

    // Email content with simplified, clean layout and background color #D4D5D0
    const emailContent = `
    <!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Helium OS</title>
  <style>
    body { margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 20px auto; padding: 32px 20px; background-color: #D4D5D0; }
    p { margin: 0 0 16px 0; font-size: 18px; text-align: left; }
    .footer { text-align: center; font-size: 14px; color: #666; margin-top: 32px; }
    @media (max-width: 600px) { .container { padding: 24px 14px; } }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0; padding:0; background-color:#ffffff;">
    <tr>
      <td align="center">
        <div class="container">
          <h1 style="margin:0 0 16px; font-size: 28px; text-align: center;">Welcome to Helium OS</h1>
          <p>Dear ${firstName},</p>

          <p>Congratulations! You have been selected to join Helium OS for your business, our first-ever Public Beta experience for businesses. Your account has been credited with <strong><span style="font-size:18px; font-weight:800;">1500</span> free Helium credits</strong> to explore and experience the power of Helium.</p>

          <p style="font-weight: bold;">Your Invite Code:</p>
          <div style="text-align: center; margin: 16px 0 8px;">
            <div style="color: #333; padding: 12px 24px; font-size: 24px; font-weight: bold; font-family: monospace; display: inline-block; letter-spacing: 2px; white-space: nowrap; border: 2px solid #333; background-color: #fff;">
              ${inviteCode}
            </div>
          </div>
          <p style="margin-top: 12px;">Use this code to activate your account at <a href="https://he2.ai" style="color: inherit; text-decoration: underline;">https://he2.ai</a></p>

          <p>Helium is designed to be the operating system for business intelligence, giving you a single, seamless layer to connect data, decisions, and workflows. As this is our first public beta, you may notice minor bugs or quirks. If you do, your feedback will help us make Helium even better.</p>

          <p>You are not just testing a product. You are helping shape the future of business intelligence.</p>

          <p>Welcome to Helium OS. The future of work is here.</p>

          <p>Cheers,<br>Team Helium<br><a href="https://he2.ai" style="color: inherit; text-decoration: underline;">https://he2.ai</a></p>

          <div class="footer">
            Helium AI by Neural Arc Inc. <a href="https://neuralarc.ai" style="color: inherit; text-decoration: underline;">https://neuralarc.ai</a>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Plain text version for email clients that don't support HTML
    const textContent = `Dear ${firstName},

Congratulations! You have been selected to join Helium the OS for your business, our first-ever Public Beta experience for businesses. Your account has been credited with 1500 free Helium credits to explore and experience the power of Helium.

Your Invite Code: ${inviteCode}

Use this code to activate your account at https://he2.ai

Helium is designed to be the operating system for business intelligence, giving you a single, seamless layer to connect data, decisions, and workflows. As this is our first public beta, you may notice minor bugs or quirks. If you do, your feedback will help us make Helium even better.

You are not just testing a product. You are helping shape the future of business intelligence.

Welcome to Helium OS. The future of work is here.

Cheers,
Team Helium
https://he2.ai

Helium AI by Neural Arc Inc. https://neuralarc.ai`;

    // Send email
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM}" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: 'Welcome to Helium OS - Your Invitation is Here!',
      text: textContent,
      html: emailContent,
    });

    console.log('Email sent:', info.messageId);

    // First, save the invite code to the database with 7-day expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    if (!supabaseAdmin) {
      console.error('Supabase admin client not available');
      return { success: false, message: 'Database configuration error' };
    }

    const { error: saveError } = await supabaseAdmin
      .from('invite_codes')
      .insert({
        code: inviteCode,
        is_used: false,
        max_uses: 1,
        current_uses: 0,
        expires_at: expiresAt.toISOString(),
        email_sent_to: [email], // Include the email in the initial insert
      });

    if (saveError) {
      console.error('Error saving invite code to database:', saveError);
      console.error('Save error details:', JSON.stringify(saveError, null, 2));
      // Don't throw error here - email was sent successfully
    } else {
      console.log('Invite code saved to database:', inviteCode);
      console.log('Database insert successful for code:', inviteCode);
    }

    return { success: true, message: `Invitation sent to ${firstName} at ${email}` };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, message: 'Failed to send email. Please try again.' };
  }
}

const saveCodesSchema = z.object({
  codes: z.string(), // JSON string of codes array
});

export async function saveGeneratedCodesAction(formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());
  const validation = saveCodesSchema.safeParse(rawFormData);

  if (!validation.success) {
    return { success: false, message: 'Invalid codes data.' };
  }

  try {
    const codesData = JSON.parse(validation.data.codes);
    const codes = await generateInviteCodes(codesData.length, codesData[0]?.maxUses || 1);

    console.log(`Saved ${codes.length} codes to database:`, codes);
    return { success: true, message: `${codes.length} codes saved to database.` };
  } catch (error) {
    console.error('Failed to save codes:', error);
    return { success: false, message: 'An error occurred while saving codes.' };
  }
}

// (Removed test email action to keep only the single clean template in use)
