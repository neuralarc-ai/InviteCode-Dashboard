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

    // Fetch emails from auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json(
        { error: 'Failed to fetch auth users' },
        { status: 500 }
      );
    }

    console.log('Total auth users found:', authUsers?.users?.length || 0);

    // Create array of user objects with id, email, and full_name
    const userData: Array<{id: string, email: string, full_name: string}> = [];
    
    if (authUsers?.users) {
      authUsers.users.forEach(user => {
        console.log('Checking user:', user.id, 'Email:', user.email, 'In requested list:', userIds.includes(user.id));
        if (user.email && userIds.includes(user.id)) {
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email;
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
