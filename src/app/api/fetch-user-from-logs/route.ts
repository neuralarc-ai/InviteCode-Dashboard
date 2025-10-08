import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json();
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ success: false, message: 'userIds array is required' }, { status: 400 });
    }

    console.log('Fetching user data from usage logs for IDs:', userIds.length, 'users');

    const userData: Array<{id: string, email: string, full_name: string}> = [];

    // For each user ID, try to get information from usage logs and other sources
    for (const userId of userIds) {
      console.log(`Processing user ${userId}...`);
      
      // Try to get user info from auth first
      let authUser = null;
      try {
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (!authError && authUsers?.users) {
          authUser = authUsers.users.find(user => user.id === userId);
        }
      } catch (authErr) {
        console.log(`Could not fetch auth user ${userId}:`, authErr);
      }

      if (authUser) {
        // User exists in auth - use standard name extraction
        let fullName = null;
        
        if (authUser.display_name) {
          fullName = authUser.display_name;
        } else if (authUser.user_metadata?.full_name) {
          fullName = authUser.user_metadata.full_name;
        } else if (authUser.user_metadata?.name) {
          fullName = authUser.user_metadata.name;
        } else if (authUser.user_metadata?.first_name && authUser.user_metadata?.last_name) {
          fullName = `${authUser.user_metadata.first_name} ${authUser.user_metadata.last_name}`;
        } else if (authUser.user_metadata?.given_name && authUser.user_metadata?.family_name) {
          fullName = `${authUser.user_metadata.given_name} ${authUser.user_metadata.family_name}`;
        } else if (authUser.email) {
          fullName = authUser.email;
        }

        userData.push({
          id: userId,
          email: authUser.email || `user-${userId.slice(0, 8)}@unknown.com`,
          full_name: fullName || `User ${userId.slice(0, 8)}`
        });
        
        console.log(`Added auth user ${userId}: ${fullName}`);
      } else {
        // User not in auth - create placeholder with usage info
        try {
          // Get usage stats for this user
          const { data: usageStats, error: usageError } = await supabaseAdmin
            .from('usage_logs')
            .select('created_at, total_tokens, estimated_cost')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

          const hasUsage = usageStats && usageStats.length > 0;
          const lastActivity = hasUsage ? usageStats[0].created_at : null;
          
          userData.push({
            id: userId,
            email: `user-${userId.slice(0, 8)}@unknown.com`,
            full_name: `User ${userId.slice(0, 8)} (Deleted)`
          });
          
          console.log(`Added placeholder user ${userId} (deleted from auth)`);
        } catch (usageErr) {
          console.log(`Could not fetch usage stats for ${userId}:`, usageErr);
          
          // Final fallback
          userData.push({
            id: userId,
            email: `user-${userId.slice(0, 8)}@unknown.com`,
            full_name: `User ${userId.slice(0, 8)} (Unknown)`
          });
        }
      }
    }

    console.log('Total user data returned:', userData.length);
    return NextResponse.json(userData);

  } catch (error) {
    console.error('Error in fetch-user-from-logs API:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
