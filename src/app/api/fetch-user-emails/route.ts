import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'Invalid userIds array' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin client not available' },
        { status: 500 }
      );
    }

    console.log('Fetching emails for user IDs:', userIds);
    console.log('Number of user IDs requested:', userIds.length);

    // Fetch emails from auth.users with pagination
    let allAuthUsers = [];
    let page = 1;
    const perPage = 1000; // Supabase default is 1000
    
    while (true) {
      console.log(`Fetching auth users page ${page}...`);
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page: page,
        perPage: perPage
      });

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json(
        { error: 'Failed to fetch auth users' },
        { status: 500 }
      );
    }

      if (!authUsers?.users || authUsers.users.length === 0) {
        console.log(`No more users found on page ${page}`);
        break;
      }
      
      allAuthUsers = allAuthUsers.concat(authUsers.users);
      console.log(`Fetched ${authUsers.users.length} users on page ${page}, total so far: ${allAuthUsers.length}`);
      
      // If we got fewer users than perPage, we've reached the end
      if (authUsers.users.length < perPage) {
        console.log('Reached end of users list');
        break;
      }
      
      page++;
    }
    
    console.log('Total auth users found:', allAuthUsers.length);

    // Create array of user objects with id, email, and full_name
    const userData: Array<{id: string, email: string, full_name: string}> = [];
    
    if (allAuthUsers.length > 0) {
      allAuthUsers.forEach(user => {
        console.log('Checking user:', user.id, 'Email:', user.email, 'In requested list:', userIds.includes(user.id));
        if (user.email && userIds.includes(user.id)) {
          // Try multiple sources for the user's name
          let fullName = null;
          
          // Log all metadata fields for debugging
          console.log(`All metadata fields for user ${user.id}:`, Object.keys(user.user_metadata || {}));
          console.log(`Full metadata for user ${user.id}:`, JSON.stringify(user.user_metadata, null, 2));
          
          // Try different metadata fields (expanded list)
          // Check if user has a display_name property directly (not in metadata)
          if (user.display_name) {
            fullName = user.display_name;
            console.log(`Found name from user.display_name: ${fullName}`);
          } else if (user.user_metadata?.full_name) {
            fullName = user.user_metadata.full_name;
            console.log(`Found name from full_name: ${fullName}`);
          } else if (user.user_metadata?.name) {
            fullName = user.user_metadata.name;
            console.log(`Found name from name: ${fullName}`);
          } else if (user.user_metadata?.display_name) {
            fullName = user.user_metadata.display_name;
            console.log(`Found name from display_name: ${fullName}`);
          } else if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
            fullName = `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
            console.log(`Found name from first_name + last_name: ${fullName}`);
          } else if (user.user_metadata?.first_name) {
            fullName = user.user_metadata.first_name;
            console.log(`Found name from first_name: ${fullName}`);
          } else if (user.user_metadata?.last_name) {
            fullName = user.user_metadata.last_name;
            console.log(`Found name from last_name: ${fullName}`);
          } else if (user.user_metadata?.given_name) {
            fullName = user.user_metadata.given_name;
            console.log(`Found name from given_name: ${fullName}`);
          } else if (user.user_metadata?.family_name) {
            fullName = user.user_metadata.family_name;
            console.log(`Found name from family_name: ${fullName}`);
          } else if (user.user_metadata?.given_name && user.user_metadata?.family_name) {
            fullName = `${user.user_metadata.given_name} ${user.user_metadata.family_name}`;
            console.log(`Found name from given_name + family_name: ${fullName}`);
          } else if (user.user_metadata?.preferred_username) {
            fullName = user.user_metadata.preferred_username;
            console.log(`Found name from preferred_username: ${fullName}`);
          } else if (user.user_metadata?.nickname) {
            fullName = user.user_metadata.nickname;
            console.log(`Found name from nickname: ${fullName}`);
          }
          
          // If no name found in metadata, try to extract from email
          if (!fullName && user.email) {
            const emailName = user.email.split('@')[0];
            // If email name looks like a real name (not just random characters)
            if (emailName.length > 2 && /^[a-zA-Z]/.test(emailName)) {
              fullName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
            }
          }
          
          // Final fallback
          if (!fullName) {
            fullName = user.email;
          }
          
          console.log('Adding user:', user.id, 'Email:', user.email, 'Full name:', fullName);
          userData.push({
            id: user.id,
            email: user.email,
            full_name: fullName
          });
        }
      });
    }

    console.log(`Found ${userData.length} users out of ${userIds.length} requested users`);

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error in fetch-user-emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
