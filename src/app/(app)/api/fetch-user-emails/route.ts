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


    // Fetch emails from auth.users with pagination
    let allAuthUsers = [];
    let page = 1;
    const perPage = 1000; // Supabase default is 1000
    
    while (true) {
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
        break;
      }

      allAuthUsers = allAuthUsers.concat(authUsers.users);
      
      // If we got fewer users than perPage, we've reached the end
      if (authUsers.users.length < perPage) {
        break;
      }
      
      page++;
    }
    

    // Create array of user objects with id, email, and full_name
    const userData: Array<{id: string, email: string, full_name: string}> = [];
    
    if (allAuthUsers.length > 0) {
      allAuthUsers.forEach(user => {
        if (user.email && userIds.includes(user.id)) {
          // Try multiple sources for the user's name
          let fullName = null;
          
          // Try different metadata fields (expanded list)
          // Check if user has a display_name property directly (not in metadata)
          if (user.display_name) {
            fullName = user.display_name;
          } else if (user.user_metadata?.full_name) {
            fullName = user.user_metadata.full_name;
          } else if (user.user_metadata?.name) {
            fullName = user.user_metadata.name;
          } else if (user.user_metadata?.display_name) {
            fullName = user.user_metadata.display_name;
          } else if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
            fullName = `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
          } else if (user.user_metadata?.first_name) {
            fullName = user.user_metadata.first_name;
          } else if (user.user_metadata?.last_name) {
            fullName = user.user_metadata.last_name;
          } else if (user.user_metadata?.given_name) {
            fullName = user.user_metadata.given_name;
          } else if (user.user_metadata?.family_name) {
            fullName = user.user_metadata.family_name;
          } else if (user.user_metadata?.given_name && user.user_metadata?.family_name) {
            fullName = `${user.user_metadata.given_name} ${user.user_metadata.family_name}`;
          } else if (user.user_metadata?.preferred_username) {
            fullName = user.user_metadata.preferred_username;
          } else if (user.user_metadata?.nickname) {
            fullName = user.user_metadata.nickname;
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
          
          userData.push({
            id: user.id,
            email: user.email,
            full_name: fullName
          });
        }
      });
    }

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error in fetch-user-emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
