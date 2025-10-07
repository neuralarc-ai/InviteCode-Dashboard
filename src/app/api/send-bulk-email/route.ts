import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
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

    // Fetch all users from user_profiles table
    const { data: userProfiles, error: dbError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, full_name')
      .not('user_id', 'is', null);

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch user profiles' },
        { status: 500 }
      );
    }

    if (!userProfiles || userProfiles.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No users found to send emails to' },
        { status: 400 }
      );
    }

    // Get user IDs to fetch emails from auth.users
    const userIds = userProfiles.map(profile => profile.user_id);
    
    // Create a map of user_id to email
    const userIdToEmail = new Map<string, string>();
    
    // Fetch emails from auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch user emails' },
        { status: 500 }
      );
    }

    // Map user IDs to emails
    if (authUsers?.users) {
      authUsers.users.forEach(user => {
        if (user.email && userIds.includes(user.id)) {
          userIdToEmail.set(user.id, user.email);
        }
      });
    }

    console.log(`Found ${userIdToEmail.size} emails out of ${userProfiles.length} user profiles`);

    // Filter out users without emails and create combined data
    const usersWithEmails = userProfiles
      .map(profile => ({
        email: userIdToEmail.get(profile.user_id),
        fullName: profile.full_name,
        userId: profile.user_id
      }))
      .filter(user => user.email); // Only include users with emails

    if (usersWithEmails.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No users with valid emails found' },
        { status: 400 }
      );
    }

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

    // Email template
    const emailSubject = 'Scheduled Downtime: Helium will be unavailable for 1 hour';
    
    const emailContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Scheduled Downtime: Helium will be unavailable for 1 hour</h2>
        
        <p>Greetings from Helium,</p>
        
        <p>We wanted to let you know that Helium will be temporarily unavailable for 1 hour as we perform scheduled maintenance and upgrades.</p>
        
        <p>During this window, you won't be able to access Helium. Once the maintenance is complete, you'll be able to log back in and experience the platform as usual.</p>
        
        <p>We appreciate your patience and understanding as we work to make Helium even better for you.</p>
        
        <p>Thanks,<br>The Helium Team</p>
      </body>
    </html>
    `;

    // Plain text version
    const textContent = `Scheduled Downtime: Helium will be unavailable for 1 hour

Greetings from Helium,

We wanted to let you know that Helium will be temporarily unavailable for 1 hour as we perform scheduled maintenance and upgrades.

During this window, you won't be able to access Helium. Once the maintenance is complete, you'll be able to log back in and experience the platform as usual.

We appreciate your patience and understanding as we work to make Helium even better for you.

Thanks,
The Helium Team`;

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Send emails to all users
    for (const profile of usersWithEmails) {
      try {
        const info = await transporter.sendMail({
          from: `"${process.env.SMTP_FROM}" <${process.env.SENDER_EMAIL}>`,
          to: profile.email,
          subject: emailSubject,
          text: textContent,
          html: emailContent,
        });

        console.log(`Email sent to ${profile.email}:`, info.messageId);
        successCount++;
      } catch (emailError) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
        errors.push(`${profile.email}: ${emailError}`);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Emails processed: ${successCount} sent successfully, ${errorCount} failed`,
      details: {
        total: usersWithEmails.length,
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Bulk email error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send bulk emails' },
      { status: 500 }
    );
  }
}