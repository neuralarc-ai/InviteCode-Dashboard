import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabase';
import { createDowntimeHtmlTemplate, createUptimeHtmlTemplate, createInactiveHtmlTemplate, createPartialHtmlTemplate } from '@/lib/email-templates';
import { createEmailAttachments, EMAIL_IMAGES } from '@/lib/email-utils';

export async function POST(request: NextRequest) {
  try {
    // Parse request body for custom email content and selected users
    let customEmailData = null;
    let selectedUserIds: string[] | null = null;
    try {
      const body = await request.json();
      
      // Debug logging - comprehensive request logging
      console.log('=== Bulk Email Request Received ===');
      console.log('Request body:', {
        hasSubject: !!body.subject,
        subjectLength: body.subject?.length || 0,
        hasTextContent: !!body.textContent,
        textContentLength: body.textContent?.length || 0,
        hasHtmlContent: !!body.htmlContent,
        htmlContentLength: body.htmlContent?.length || 0,
        hasSelectedUserIds: !!body.selectedUserIds,
        selectedUserIds: body.selectedUserIds || null,
        selectedUserIdsCount: body.selectedUserIds?.length || 0,
        hasIndividualEmail: !!body.individualEmail,
        individualEmail: body.individualEmail || null
      });
      
      // Check if this is actually an individual email request (should use different endpoint)
      if (body.individualEmail) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Individual email address provided. Please use /api/send-individual-email endpoint instead.',
            hint: 'Use the "Send to Individual" button for individual emails'
          },
          { status: 400 }
        );
      }
      
      // Validate email content if provided
      if (body.subject || body.textContent || body.htmlContent) {
        // If any email content is provided, all should be provided
        if (!body.subject || !body.textContent || !body.htmlContent) {
          const missingFields = [];
          if (!body.subject || body.subject.trim().length === 0) missingFields.push('subject');
          if (!body.textContent || body.textContent.trim().length === 0) missingFields.push('textContent');
          if (!body.htmlContent || body.htmlContent.trim().length === 0) missingFields.push('htmlContent');
          
          return NextResponse.json(
            { 
              success: false, 
              message: `Missing required email content fields: ${missingFields.join(', ')}`,
              missingFields
            },
            { status: 400 }
          );
        }
        
        customEmailData = {
          subject: body.subject.trim(),
          textContent: body.textContent.trim(),
          htmlContent: body.htmlContent.trim()
        };
      }
      // Check if specific users are selected
      if (body.selectedUserIds && Array.isArray(body.selectedUserIds) && body.selectedUserIds.length > 0) {
        selectedUserIds = body.selectedUserIds;
        console.log(`=== Sending to ${body.selectedUserIds.length} selected user(s) ===`);
        console.log('Selected user IDs:', selectedUserIds);
      } else {
        console.log('=== Sending to all users ===');
      }
    } catch (parseError) {
      // If no JSON body or parsing fails, continue with default content
      console.log('No custom email data provided, using defaults');
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

    // Validate selected user IDs if provided
    if (selectedUserIds && selectedUserIds.length > 0) {
      // Validate that all selectedUserIds are valid UUIDs or non-empty strings
      const invalidIds = selectedUserIds.filter(id => !id || typeof id !== 'string' || id.trim().length === 0);
      if (invalidIds.length > 0) {
        console.error('Invalid user IDs provided:', invalidIds);
        return NextResponse.json(
          { 
            success: false, 
            message: `Invalid user ID(s) provided: ${invalidIds.join(', ')}`,
            details: {
              invalidIds,
              totalSelected: selectedUserIds.length,
              validIds: selectedUserIds.filter(id => id && typeof id === 'string' && id.trim().length > 0)
            }
          },
          { status: 400 }
        );
      }
      
      // Remove duplicates
      const uniqueUserIds = Array.from(new Set(selectedUserIds));
      if (uniqueUserIds.length !== selectedUserIds.length) {
        console.log(`Removed ${selectedUserIds.length - uniqueUserIds.length} duplicate user ID(s)`);
        selectedUserIds = uniqueUserIds;
      }
    }

    // Fetch users from user_profiles table
    // If selectedUserIds is provided, only fetch those users; otherwise fetch all
    console.log('=== Querying user_profiles table ===');
    let query = supabaseAdmin
      .from('user_profiles')
      .select('user_id, full_name')
      .not('user_id', 'is', null);
    
    if (selectedUserIds && selectedUserIds.length > 0) {
      // Only fetch selected users
      console.log(`Filtering by ${selectedUserIds.length} selected user ID(s):`, selectedUserIds);
      query = query.in('user_id', selectedUserIds);
    } else {
      console.log('Fetching all users from user_profiles');
    }
    
    const { data: userProfiles, error: dbError } = await query;
    
    console.log('Query result:', {
      userProfilesFound: userProfiles?.length || 0,
      hasError: !!dbError,
      error: dbError || null
    });

    if (dbError) {
      console.error('Database error when fetching user profiles:', {
        error: dbError,
        selectedUserIds,
        selectedUserIdsCount: selectedUserIds?.length || 0
      });
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to fetch user profiles from database',
          error: dbError.message || 'Database query failed',
          details: {
            selectedUserIds: selectedUserIds || null,
            selectedUserIdsCount: selectedUserIds?.length || 0
          }
        },
        { status: 500 }
      );
    }

    if (!userProfiles || userProfiles.length === 0) {
      const message = selectedUserIds 
        ? `No users found matching the ${selectedUserIds.length} selected user ID(s). Please ensure the users exist in the database.` 
        : 'No users found to send emails to. The database appears to be empty or users could not be fetched.';
      
      console.error('Bulk email error - No users found:', {
        message,
        selectedUserIds: selectedUserIds || null,
        selectedUserIdsCount: selectedUserIds?.length || 0,
        queryType: selectedUserIds ? 'selected users' : 'all users'
      });
      
      const errorResponse = { 
        success: false, 
        message,
        details: {
          selectedUserIds: selectedUserIds || null,
          selectedUserIdsCount: selectedUserIds?.length || 0,
          queryType: selectedUserIds ? 'selected users' : 'all users'
        }
      };
      
      console.log('Returning error response:', JSON.stringify(errorResponse, null, 2));
      
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    console.log(`Found ${userProfiles.length} user profile(s) matching the query`);

    // Get user IDs to fetch emails from auth.users
    const userIds = userProfiles.map(profile => profile.user_id);
    
    console.log('=== Fetching emails from auth.users ===');
    console.log('Looking for user IDs:', userIds);
    console.log('User profiles found:', userProfiles.map(p => ({ user_id: p.user_id, full_name: p.full_name })));
    
    // Create a map of user_id to email
    const userIdToEmail = new Map<string, string>();
    
    // Fetch emails from auth.users - try to get specific users first, then fallback to listUsers
    console.log('Attempting to fetch specific users by ID...');
    
    // Try fetching each user individually first (more reliable for specific users)
    const userFetchPromises = userIds.map(async (userId) => {
      try {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!userError && userData?.user) {
          const user = userData.user;
          if (user.email) {
            userIdToEmail.set(user.id, user.email);
            console.log(`✓ Fetched user ${user.id} -> ${user.email}`);
            return { id: user.id, email: user.email, found: true };
          } else {
            console.warn(`⚠ User ${user.id} found but has no email`);
            return { id: user.id, email: null, found: true, noEmail: true };
          }
        } else {
          console.warn(`⚠ Could not fetch user ${userId}:`, userError?.message || 'Unknown error');
          return { id: userId, found: false, error: userError?.message };
        }
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        return { id: userId, found: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
    
    const fetchResults = await Promise.all(userFetchPromises);
    const foundUsers = fetchResults.filter(r => r.found && r.email);
    const foundWithoutEmail = fetchResults.filter(r => r.found && !r.email);
    const notFoundUsers = fetchResults.filter(r => !r.found);
    
    console.log(`Individual fetch results:`, {
      foundWithEmail: foundUsers.length,
      foundWithoutEmail: foundWithoutEmail.length,
      notFound: notFoundUsers.length,
      results: fetchResults
    });
    
    // If we still have missing users, try listUsers as fallback (handles pagination)
    const missingUserIds = userIds.filter(id => !userIdToEmail.has(id));
    if (missingUserIds.length > 0) {
      console.log(`Still missing ${missingUserIds.length} user(s), trying listUsers() as fallback...`);
      
      // Fetch all users with pagination
      let allAuthUsers: any[] = [];
      let page = 1;
      const perPage = 1000; // Supabase default is 50, but we can request more
      
      while (true) {
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage
        });
        
        if (authError) {
          console.error(`Error fetching auth users page ${page}:`, authError);
          break;
        }
        
        if (!authUsers?.users || authUsers.users.length === 0) {
          break;
        }
        
        allAuthUsers = allAuthUsers.concat(authUsers.users);
        console.log(`Fetched page ${page}: ${authUsers.users.length} users (total so far: ${allAuthUsers.length})`);
        
        // Check if we got all users (if returned count is less than perPage, we're done)
        if (authUsers.users.length < perPage) {
          break;
        }
        
        page++;
      }
      
      console.log(`Fetched ${allAuthUsers.length} total auth users from system (across all pages)`);
      
      // Map remaining user IDs to emails
      const matchedUsers: Array<{ id: string; email: string }> = [];
      const unmatchedUserIds: string[] = [];
      
      allAuthUsers.forEach(user => {
        if (missingUserIds.includes(user.id)) {
          if (user.email) {
            userIdToEmail.set(user.id, user.email);
            matchedUsers.push({ id: user.id, email: user.email });
            console.log(`✓ Matched user ${user.id} -> ${user.email} (from listUsers)`);
          } else {
            console.warn(`⚠ User ${user.id} found in auth but has no email`);
            unmatchedUserIds.push(user.id);
          }
        }
      });
      
      // Check which user IDs we're still looking for but didn't find
      const stillNotFoundUserIds = missingUserIds.filter(id => !userIdToEmail.has(id) && !unmatchedUserIds.includes(id));
      
      if (stillNotFoundUserIds.length > 0) {
        console.error('❌ User IDs still not found in auth.users after pagination:', stillNotFoundUserIds);
        // Check if any of these IDs exist in the fetched users (maybe ID format mismatch)
        stillNotFoundUserIds.forEach(id => {
          const similarId = allAuthUsers.find(u => u.id.toLowerCase() === id.toLowerCase());
          if (similarId) {
            console.warn(`⚠ Found similar ID (case mismatch?): ${similarId.id} for search ${id}`);
          }
        });
      }
      
      console.log(`Email matching summary after listUsers:`, {
        totalUserProfiles: userProfiles.length,
        matchedWithEmail: userIdToEmail.size,
        matchedWithoutEmail: unmatchedUserIds.length,
        notFoundInAuth: stillNotFoundUserIds.length,
        matchedUsers,
        unmatchedUserIds,
        notFoundUserIds: stillNotFoundUserIds
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
      // Get detailed information about why emails weren't found
      const userProfileDetails = userProfiles.map(profile => ({
        user_id: profile.user_id,
        full_name: profile.full_name,
        hasEmailInAuth: userIdToEmail.has(profile.user_id),
        email: userIdToEmail.get(profile.user_id) || null
      }));
      
      console.error('Bulk email error - No users with valid emails:', {
        userProfilesCount: userProfiles.length,
        userProfileDetails,
        userIds: userProfiles.map(p => p.user_id),
        selectedUserIds: selectedUserIds || null,
        totalAuthUsers: authUsers?.users?.length || 0
      });
      
      // Check if users exist in auth but don't have emails
      const usersInAuthWithoutEmail = userProfiles
        .filter(profile => {
          const authUser = authUsers?.users?.find(u => u.id === profile.user_id);
          return authUser && !authUser.email;
        })
        .map(p => p.user_id);
      
      // Check if users don't exist in auth at all
      const usersNotInAuth = userProfiles
        .filter(profile => !authUsers?.users?.find(u => u.id === profile.user_id))
        .map(p => p.user_id);
      
      let errorMessage = 'No users with valid emails found. ';
      if (usersNotInAuth.length > 0) {
        errorMessage += `The following user ID(s) were not found in the authentication system: ${usersNotInAuth.join(', ')}. `;
      }
      if (usersInAuthWithoutEmail.length > 0) {
        errorMessage += `The following user ID(s) exist in auth but have no email address: ${usersInAuthWithoutEmail.join(', ')}. `;
      }
      errorMessage += 'Please ensure the selected users have valid email addresses in the authentication system.';
      
      return NextResponse.json(
        { 
          success: false, 
          message: errorMessage,
          details: {
            userProfilesFound: userProfiles.length,
            userProfileDetails,
            selectedUserIds: selectedUserIds || null,
            selectedUserIdsCount: selectedUserIds?.length || 0,
            usersNotInAuth,
            usersInAuthWithoutEmail
          }
        },
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

    // Email template - use custom content if provided, otherwise use defaults
    const emailSubject = customEmailData?.subject || 'Scheduled Downtime: Helium will be unavailable for 1 hour';
    
    // Use CID references for images (useCid defaults to true)
    const emailContent = customEmailData?.htmlContent || createDowntimeHtmlTemplate({
      useCid: true, // Use CID references for SMTP MIME attachments
      textContent: `Scheduled Downtime: Helium will be unavailable for 1 hour

Greetings from Helium,

We wanted to let you know that Helium will be temporarily unavailable for 1 hour as we perform scheduled maintenance and upgrades.

During this window, you won't be able to access Helium. Once the maintenance is complete, you'll be able to log back in and experience the platform as usual.

We appreciate your patience and understanding as we work to make Helium even better for you.

Thanks,
The Helium Team`
    });

    // Get email attachments dynamically based on CID references in final HTML content
    const attachments: Array<{
      filename: string;
      content: Buffer;
      cid: string;
      contentType: string;
      contentDisposition?: string;
    }> = [];

    // Detect which attachments are needed based on CID references in the final email content
    if (emailContent.includes('cid:email-logo')) {
      attachments.push(...createEmailAttachments([EMAIL_IMAGES.logo]));
    }
    
    // Attach uptime or downtime body image based on what's referenced
    if (emailContent.includes('cid:uptime-body')) {
      attachments.push(...createEmailAttachments([EMAIL_IMAGES.uptimeBody]));
    }
    if (emailContent.includes('cid:downtime-body')) {
      attachments.push(...createEmailAttachments([EMAIL_IMAGES.downtimeBody]));
    }
    
    // Attach credits body if present
    if (emailContent.includes('cid:credits-body')) {
      attachments.push(...createEmailAttachments([EMAIL_IMAGES.creditsBody]));
    }
    
    // Attach updates body if present
    if (emailContent.includes('cid:updates-body')) {
      attachments.push(...createEmailAttachments([EMAIL_IMAGES.updatesBody]));
    }
    
    // Attach inactive body if present
    if (emailContent.includes('cid:inactive-body')) {
      attachments.push(...createEmailAttachments([EMAIL_IMAGES.inactiveBody]));
    }
    
    // Attach partial body if present
    if (emailContent.includes('cid:partial-body')) {
      attachments.push(...createEmailAttachments([EMAIL_IMAGES.partialBody]));
    }

    // Plain text version
    const textContent = customEmailData?.textContent || `Scheduled Downtime: Helium will be unavailable for 1 hour

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
          attachments: attachments.length > 0 ? attachments : undefined, // Attach images as MIME parts with CID references
        });

        console.log(`Email sent to ${profile.email}:`, info.messageId);
        successCount++;
        
        // If this is a credits email, mark user as sent
        // Check for credits-related content in multiple ways
        const isCreditsEmail = emailContent.includes('cid:credits-body') || 
                               emailContent.includes('credits-body') ||
                               emailSubject.toLowerCase().includes('credit') ||
                               emailSubject.toLowerCase().includes('credits') ||
                               textContent.toLowerCase().includes('credit') ||
                               textContent.toLowerCase().includes('credits');
        
        if (isCreditsEmail) {
          try {
            // Directly update the database instead of making HTTP call
            const now = new Date().toISOString();
            
            // Fetch existing profile to preserve metadata
            const { data: existingProfile } = await supabaseAdmin
              .from('user_profiles')
              .select('user_id, metadata')
              .eq('user_id', profile.userId)
              .single();
            
            if (existingProfile) {
              const updatedMetadata = {
                ...(existingProfile.metadata || {}),
                credits_email_sent_at: now,
                ...(existingProfile.metadata?.credits_assigned !== undefined 
                  ? { credits_assigned: existingProfile.metadata.credits_assigned } 
                  : {})
              };

              const { error: updateError } = await supabaseAdmin
                .from('user_profiles')
                .update({
                  metadata: updatedMetadata,
                  updated_at: now
                })
                .eq('user_id', profile.userId);
              
              if (updateError) {
                console.warn(`Failed to mark user ${profile.userId} as sent:`, updateError);
              } else {
                console.log(`Marked user ${profile.userId} as credits email sent`);
              }
            }
          } catch (markError) {
            console.warn(`Failed to mark user ${profile.userId} as sent:`, markError);
          }
        }
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
    console.error('Bulk email unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to send bulk emails due to an unexpected error',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          errorType: error instanceof Error ? error.constructor.name : typeof error
        }
      },
      { status: 500 }
    );
  }
}