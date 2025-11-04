
'use server';

import { revalidatePath } from 'next/cache';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { updateWaitlistUser, generateInviteCodes, markInviteCodeAsUsed, addEmailToInviteCode } from '@/lib/data';
import { supabaseAdmin } from '@/lib/supabase';
import { generateInvitationEmail } from '@/ai/flows/automated-invitation-emails';
import { getInviteEmailAttachments } from '@/lib/email-utils';

const sendInviteSchema = z.object({
  userId: z.string().optional(),
  userName: z.string(),
  inviteCode: z.string(),
  email: z.string().email(),
  companyName: z.string().optional(),
});

export async function sendInviteEmailAction(formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());
  const validation = sendInviteSchema.safeParse(rawFormData);

  if (!validation.success) {
    console.error('Validation failed:', validation.error);
    return { success: false, message: 'Invalid form data.' };
  }
  
  const { userId, userName, inviteCode, companyName, email } = validation.data;

  try {
    // Validate required environment variables
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SENDER_EMAIL', 'SMTP_FROM'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars);
      return { success: false, message: `Missing email configuration: ${missingVars.join(', ')}` };
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
      return { success: false, message: 'SMTP configuration error. Please check email settings.' };
    }


    // If you want AI-generated content, enable below; by default we use the hand-crafted template.
    // const emailContent = await generateInvitationEmail({ userName, inviteCode, companyName: companyName || '' });

    // Get email attachments with CID references
    const attachments = getInviteEmailAttachments();

    // Email content with simplified, clean layout and black/white theme
    let htmlContent = `

    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Helium OS</title>
      <style>
        body { margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #000000; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 32px 20px; }
        p { margin: 0 0 16px 0; font-size: 18px; text-align: left; }
        .footer { text-align: center; font-size: 14px; color: #666666; margin-top: 32px; }
        .header-image { text-align: center; margin-bottom: 24px; }
        .header-image img { max-width: 400px; height: auto; }
        @media (max-width: 600px) { .container { padding: 24px 14px; } }
      </style>
    </head>
    <body style="margin:0; padding:0; background-color:#ffffff;" bgcolor="#ffffff">
      <div class="container">
        <div class="header-image">
          <img src="cid:email-logo" alt="Helium OS" style="max-width: 400px; height: auto;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
          <div style="display: none; text-align: center; padding: 20px; background-color: #f0f0f0; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #000000; font-size: 24px;">Helium OS</h2>
            <p style="margin: 5px 0 0 0; color: #666666; font-size: 14px;">The Operating System for Business Intelligence</p>
          </div>
        </div>
        <h1 style="margin:0 0 16px; font-size: 28px; text-align: center;">
          Welcome to Helium OS
        </h1>
        <p>Dear ${userName},</p>

        <p>Congratulations! You have been selected to join Helium the OS for your business, our first-ever Public Beta experience for businesses. Your account has been credited with <strong><span style="font-size:18px; font-weight:800;">1500</span> free Helium credits</strong> to explore and experience the power of Helium.</p>

        <p style="font-weight: bold;">Your Invite Code:</p>
        <div style="text-align: center; margin: 16px 0 8px;">
          <div style="color: #333; padding: 12px 24px; font-size: 24px; font-weight: bold; font-family: monospace; display: inline-block; letter-spacing: 2px; white-space: nowrap; width: fit-content; margin: 0 auto;">
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

    // Default subject line; may be overridden by AI-generated content
    let subject = 'Welcome to Helium OS - Your Invitation is Here!';

    // Plain text version for email clients that don't support HTML
    let textContent = `Dear ${userName},

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

    // Keep the custom template by default. To switch to AI content, uncomment the block above.

    // Attachments are already prepared above using getInviteEmailAttachments()

    // Send email
    console.log('Sending email to:', email);
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM}" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
      attachments
    });

    console.log('Email sent:', info.messageId);

    // Save the invite code to the database with 7-day expiration (so it's trackable after email)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    if (!supabaseAdmin) {
      console.error('Supabase admin client not available');
      return { success: false, message: 'Database configuration error' };
    }

    const { error: insertError } = await supabaseAdmin
      .from('invite_codes')
      .insert({
        code: inviteCode,
        is_used: false,
        max_uses: 1,
        current_uses: 0,
        expires_at: expiresAt.toISOString(),
        email_sent_to: [email],
      });

    if (insertError) {
      // If it already exists, just append the email for tracking
      console.warn('Invite code insert failed, attempting to append email:', insertError);
      try { await addEmailToInviteCode(inviteCode, email); } catch {}
    }

    // Update the database to mark the user as notified (only if userId provided)
    if (userId) {
      await updateWaitlistUser(userId, {
        isNotified: true,
        notifiedAt: new Date()
      });
    }
    
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
    console.error('Validation failed:', validation.error);
    return { success: false, message: 'Invalid form data.' };
  }

  const { firstName, email, inviteCode } = validation.data;

  try {
    // Validate required environment variables
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SENDER_EMAIL', 'SMTP_FROM'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars);
      return { success: false, message: `Missing email configuration: ${missingVars.join(', ')}` };
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
      return { success: false, message: 'SMTP configuration error. Please check email settings.' };
    }

    // Get email attachments with CID references
    const attachments = getInviteEmailAttachments();

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
    .header-image { text-align: center; margin-bottom: 24px; }
    .header-image img { max-width: 400px; height: auto; }
    @media (max-width: 600px) { .container { padding: 24px 14px; } }
  </style>
    </head>
<body style="margin:0; padding:0; background-color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0; padding:0; background-color:#ffffff;">
    <tr>
      <td align="center">
        <div class="container">
          <div class="header-image">
            <img src="cid:email-logo" alt="Helium OS" style="max-width: 400px; height: auto;" />
          </div>
          <h1 style="margin:0 0 16px; font-size: 28px; text-align: center;">Welcome to Helium OS</h1>
          <p>Dear ${firstName},</p>

          <p>Congratulations! You have been selected to join Helium OS for your business, our first-ever Public Beta experience for businesses. Your account has been credited with <strong><span style="font-size:18px; font-weight:800;">1500</span> free Helium credits</strong> to explore and experience the power of Helium.</p>

          <p style="font-weight: bold;">Your Invite Code:</p>
          <div style="text-align: center; margin: 16px 0 8px;">
            <div style="color: #333; padding: 12px 24px; font-size: 24px; font-weight: bold; font-family: monospace; display: inline-block; letter-spacing: 2px; white-space: nowrap; width: fit-content; margin: 0 auto;">
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

    // Attachments are already prepared above using getInviteEmailAttachments()

    // Send email
    console.log('Sending email to:', email);
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM}" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: 'Welcome to Helium OS - Your Invitation is Here!',
      text: textContent,
      html: emailContent,
      attachments
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


// Delete waitlist user
const deleteWaitlistSchema = z.object({
  userId: z.string(),
});

export async function deleteWaitlistUserAction(formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());
  const validation = deleteWaitlistSchema.safeParse(rawFormData);

  if (!validation.success) {
    return { success: false, message: 'Invalid form data.' };
  }

  const { userId } = validation.data;

  try {
    if (!supabaseAdmin) {
      console.error('Supabase admin client not available');
      return { success: false, message: 'Database configuration error' };
    }

    const { error } = await supabaseAdmin
      .from('waitlist')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Error deleting waitlist user:', error);
      return { success: false, message: 'Failed to delete user.' };
    }

    revalidatePath('/');
    return { success: true, message: 'User deleted successfully.' };
  } catch (err) {
    console.error('Unexpected error deleting waitlist user:', err);
    return { success: false, message: 'An error occurred while deleting the user.' };
  }
}
