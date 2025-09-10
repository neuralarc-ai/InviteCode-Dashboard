
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
    const emailContent = await generateInvitationEmail({
      userName,
      inviteCode,
      companyName: companyName || '',
    });

    // Here you would integrate with an email sending service (e.g., SendGrid, Mailgun)
    // For this example, we'll just log the content to the console
    console.log(`Email prepared for: ${email}`);
    console.log(`Subject: ${emailContent.subject}`);
    console.log(`Text Body: ${emailContent.bodyText}`);
    
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
    return { success: false, message: 'An error occurred while generating the email.' };
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

    // Email content with HTML and background image
    const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Helium OS</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
      <div style="background-image: url('https://he2.ai/images/Eamil_bg.png'); background-size: cover; background-position: center; background-repeat: no-repeat; min-height: 100vh; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.95); padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #333; font-size: 28px; margin-bottom: 20px; text-align: center;">Welcome to Helium OS</h1>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Dear ${firstName},
          </p>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Congratulations! You have been selected to join Helium the OS for your business, our first-ever Public Beta experience for businesses. Your account has been credited with 1500 free Helium credits to explore and experience the power of Helium.
          </p>
          
          <div style="text-align: center; margin: 30px 0; padding: 20px; background: #000; border-radius: 8px; border: 2px solid #455BFF; overflow: hidden;">
            <p style="color: #96FF45; font-size: 16px; margin-bottom: 10px; font-weight: bold;">Your Invite Code:</p>
            <div style="background: #455BFF; color: white; padding: 15px 30px; border-radius: 5px; font-size: 24px; font-weight: bold; font-family: monospace; display: inline-block; letter-spacing: 2px; white-space: nowrap;">
              ${inviteCode}
            </div>
            <p style="color: #74EEF4; font-size: 14px; margin-top: 15px;">
              Use this code to activate your account at <a href="https://he2.ai" style="color: #455BFF; text-decoration: none;">https://he2.ai</a>
            </p>
          </div>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Helium is designed to be the operating system for business intelligence, giving you a single, seamless layer to connect data, decisions, and workflows. As this is our first public beta, you may notice minor bugs or quirks. If you do, your feedback will help us make Helium even better.
          </p>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            You are not just testing a product. You are helping shape the future of business intelligence.
          </p>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Welcome to Helium OS. The future of work is here.
          </p>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Cheers,<br>
            Team Helium<br>
            <a href="https://he2.ai" style="color: #455BFF; text-decoration: none;">https://he2.ai</a>
          </p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #455BFF;">
            <p style="color: #74EEF4; font-size: 14px; margin: 0;">
              Helium AI by Neural Arc Inc. <a href="https://neuralarc.ai" style="color: #455BFF; text-decoration: none;">https://neuralarc.ai</a>
            </p>
          </div>
        </div>
      </div>
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

export async function sendTestEmailAction() {
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

    // Email content with HTML and background image
    const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Helium OS</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
      <div style="background-image: url('https://he2.ai/images/Eamil_bg.png'); background-size: cover; background-position: center; background-repeat: no-repeat; min-height: 100vh; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.95); padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #333; font-size: 28px; margin-bottom: 20px; text-align: center;">Welcome to Helium OS</h1>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Dear Aditya,
          </p>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Congratulations! You have been selected to join Helium the OS for your business, our first-ever Public Beta experience for businesses. Your account has been credited with 1500 free Helium credits to explore and experience the power of Helium.
          </p>
          
          <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 2px solid #7c3aed; overflow: hidden;">
            <p style="color: #333; font-size: 16px; margin-bottom: 10px; font-weight: bold;">Your Invite Code:</p>
            <div style="background: #7c3aed; color: white; padding: 15px 30px; border-radius: 5px; font-size: 24px; font-weight: bold; font-family: monospace; display: inline-block; letter-spacing: 2px; white-space: nowrap;">
              TEST123
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 15px;">
              Use this code to activate your account at <a href="https://he2.ai" style="color: #7c3aed; text-decoration: none;">https://he2.ai</a>
            </p>
          </div>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Helium is designed to be the operating system for business intelligence, giving you a single, seamless layer to connect data, decisions, and workflows. As this is our first public beta, you may notice minor bugs or quirks. If you do, your feedback will help us make Helium even better.
          </p>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            You are not just testing a product. You are helping shape the future of business intelligence.
          </p>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Welcome to Helium OS. The future of work is here.
          </p>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Cheers,<br>
            Team Helium<br>
            <a href="https://he2.ai" style="color: #455BFF; text-decoration: none;">https://he2.ai</a>
          </p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #455BFF;">
            <p style="color: #74EEF4; font-size: 14px; margin: 0;">
              Helium AI by Neural Arc Inc. <a href="https://neuralarc.ai" style="color: #455BFF; text-decoration: none;">https://neuralarc.ai</a>
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    // Plain text version for email clients that don't support HTML
    const textContent = `Dear Aditya,

Congratulations! You have been selected to join Helium the OS for your business, our first-ever Public Beta experience for businesses. Your account has been credited with 1500 free Helium credits to explore and experience the power of Helium.

Your Invite Code: TEST123

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
      to: 'aditya.kemdarne@neuralarc.ai',
      subject: 'Welcome to Helium OS - Your Invitation is Here! (Test Email)',
      text: textContent,
      html: emailContent,
    });

    console.log('Test email sent:', info.messageId);
    
    return { success: true, message: 'Test email sent to aditya.kemdarne@neuralarc.ai' };
  } catch (error) {
    console.error('Failed to send test email:', error);
    return { success: false, message: 'Failed to send test email. Please check your SMTP configuration.' };
  }
}
