import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import nodemailer from 'nodemailer';
import { createCreditsHtmlTemplate } from '@/lib/email-templates';
import { createEmailAttachments, EMAIL_IMAGES, getImageBase64 } from '@/lib/email-utils';

// Default credits added email content (matching email-customization-dialog.tsx)
const defaultCreditsAddedContent = `Credits Added to Your Account

Greetings from Helium,

We're excited to inform you that credits have been added to your Helium account. These credits are now available for you to use across all platform features.

You can check your credit balance in your account dashboard at any time. If you have any questions about your credits or how to use them, please feel free to reach out to our support team.

Thank you for being a valued member of the Helium community.

Thanks,
The Helium Team`;

// Default email subject for credits added
const defaultCreditsAddedSubject = 'Credits Added to Your Account';

export async function POST(request: NextRequest) {
  try {
    const { userId, creditsToAdd, notes } = await request.json();

    // Validate required fields
    if (!userId || creditsToAdd === undefined) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: userId and creditsToAdd are required'
      }, { status: 400 });
    }

    if (typeof creditsToAdd !== 'number' || creditsToAdd <= 0) {
      return NextResponse.json({
        success: false,
        message: 'creditsToAdd must be a positive number'
      }, { status: 400 });
    }

    console.log('Assigning credits:', { userId, creditsToAdd, notes });

    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('Supabase Admin client not available');
      return NextResponse.json({
        success: false,
        message: 'Server configuration error: Admin client not available'
      }, { status: 500 });
    }

    // First, let's test if the table exists and is accessible
    console.log('Testing table access...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('credit_balance')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('Table access error:', testError);
      return NextResponse.json({
        success: false,
        message: `Database error: ${testError.message}`,
        error: testError
      }, { status: 500 });
    }

    console.log('Table access successful, checking existing balance...');

    // Check if user already has a credit balance record
    const { data: existingBalance, error: fetchError } = await supabaseAdmin
      .from('credit_balance')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching existing balance:', fetchError);
      return NextResponse.json({
        success: false,
        message: 'Failed to check existing credit balance',
        error: fetchError
      }, { status: 500 });
    }

    let result;
    const now = new Date().toISOString();

    if (existingBalance) {
      // Update existing balance
      const newBalanceDollars = (existingBalance.balance_dollars || 0) + creditsToAdd;
      const newTotalPurchased = (existingBalance.total_purchased || 0) + creditsToAdd;
      
      // Update metadata with assignment info
      const updatedMetadata = {
        ...existingBalance.metadata,
        last_assignment: {
          amount: creditsToAdd,
          timestamp: now,
          notes: notes || null
        }
      };

      const { data, error } = await supabaseAdmin
        .from('credit_balance')
        .update({
          balance_dollars: newBalanceDollars,
          total_purchased: newTotalPurchased,
          last_updated: now,
          metadata: updatedMetadata
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating credit balance:', error);
        return NextResponse.json({
          success: false,
          message: 'Failed to update credit balance',
          error: error
        }, { status: 500 });
      }

      result = data;
      console.log('Updated existing credit balance:', result);
    } else {
      // Create new balance record
      const insertData = {
        user_id: userId,
        balance_dollars: creditsToAdd,
        total_purchased: creditsToAdd,
        total_used: 0,
        last_updated: now,
        metadata: {
          initial_assignment: {
            amount: creditsToAdd,
            timestamp: now,
            notes: notes || null
          }
        }
      };

      console.log('Attempting to insert:', insertData);

      const { data, error } = await supabaseAdmin
        .from('credit_balance')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating credit balance:', error);
        return NextResponse.json({
          success: false,
          message: 'Failed to create credit balance',
          error: error,
          insertData: insertData
        }, { status: 500 });
      }

      result = data;
      console.log('Created new credit balance:', result);
    }

    // Send credits email to user after successful assignment
    try {
      // Get user email from auth.users
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (authError || !authUser?.user?.email) {
        console.warn('Could not fetch user email for credits notification:', authError);
        // Don't fail the entire operation if email fetch fails
      } else {
        // Validate required environment variables for email
        const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SENDER_EMAIL', 'SMTP_FROM'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length === 0) {
          // Create email transporter
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });

          // Get images as base64 for email (for template generation, but we'll use CID for sending)
          const logoBase64 = getImageBase64('email-logo.png');
          const creditsBodyBase64 = getImageBase64('1Kcredits.png');

          // Create credits email template using the same default content as email customization dialog
          // Use CID references for SMTP attachments
          const emailContent = createCreditsHtmlTemplate({
            logoBase64: logoBase64, // Used for template generation, but CID will be used in final HTML
            creditsBodyBase64: creditsBodyBase64, // Used for template generation, but CID will be used in final HTML
            textContent: defaultCreditsAddedContent,
            useCid: true, // Use CID references for SMTP
          });

          // Get attachments for CID references
          const attachments = createEmailAttachments([
            EMAIL_IMAGES.logo,
            EMAIL_IMAGES.creditsBody,
          ]);

          // Use the default subject from email customization dialog
          const emailSubject = defaultCreditsAddedSubject;
          const textContent = defaultCreditsAddedContent;

          await transporter.sendMail({
            from: `"${process.env.SMTP_FROM}" <${process.env.SENDER_EMAIL}>`,
            to: authUser.user.email,
            subject: emailSubject,
            text: textContent,
            html: emailContent,
            attachments: attachments.length > 0 ? attachments : undefined,
          });

          console.log(`Credits email sent to ${authUser.user.email}`);

          // Mark user as credits email sent and assigned
          try {
            // Also update user_profiles metadata to mark credits as assigned
            const { data: profile, error: profileError } = await supabaseAdmin
              .from('user_profiles')
              .select('user_id, metadata')
              .eq('user_id', userId)
              .single();

            if (!profileError && profile) {
              const updatedMetadata = {
                ...(profile.metadata || {}),
                credits_email_sent_at: now,
                credits_assigned: true
              };

              await supabaseAdmin
                .from('user_profiles')
                .update({
                  metadata: updatedMetadata,
                  updated_at: now
                })
                .eq('user_id', userId);
            }

            // Also call the mark endpoint for consistency
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/mark-credits-email-sent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userIds: [userId] }),
            });
          } catch (markError) {
            console.warn('Failed to mark user as sent:', markError);
            // Don't fail the operation if marking fails
          }
        } else {
          console.warn('Email configuration missing, skipping credits email notification');
        }
      }
    } catch (emailError) {
      console.error('Error sending credits email:', emailError);
      // Don't fail the credit assignment if email fails
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${creditsToAdd} credits to user`,
      data: {
        userId: result.user_id,
        balanceDollars: result.balance_dollars,
        totalPurchased: result.total_purchased,
        totalUsed: result.total_used,
        lastUpdated: result.last_updated,
        metadata: result.metadata
      }
    });

  } catch (error) {
    console.error('Error in credit assignment API:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('Supabase Admin client not available');
      return NextResponse.json({
        success: false,
        message: 'Server configuration error: Admin client not available'
      }, { status: 500 });
    }

    let query = supabaseAdmin
      .from('credit_balance')
      .select('*')
      .order('last_updated', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching credit balances:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch credit balances'
      }, { status: 500 });
    }

    const transformedData = data?.map((row: any) => ({
      userId: row.user_id,
      balanceDollars: row.balance_dollars,
      totalPurchased: row.total_purchased,
      totalUsed: row.total_used,
      lastUpdated: new Date(row.last_updated),
      metadata: row.metadata
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Error in credit balance fetch API:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
