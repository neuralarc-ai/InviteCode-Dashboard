import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing user fetch...');
    
    // Get some sample user IDs from usage_logs table
    const { data: sampleLogs, error: logsError } = await supabaseAdmin
      .from('usage_logs')
      .select('user_id')
      .limit(10);

    if (logsError) {
      console.error('Error fetching sample logs:', logsError);
      return NextResponse.json({ 
        success: false, 
        error: logsError.message 
      }, { status: 500 });
    }

    if (!sampleLogs || sampleLogs.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No usage logs found to test with' 
      });
    }

    const userIds = [...new Set(sampleLogs.map(log => log.user_id))];
    console.log('Sample user IDs from usage_logs:', userIds);

    // Test fetching users from auth
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching users from auth:', authError);
      return NextResponse.json({ 
        success: false, 
        error: authError.message 
      }, { status: 500 });
    }

    console.log('Total auth users:', authUsers?.users?.length);

    // Find matching users
    const matchingUsers = authUsers?.users?.filter(user => 
      userIds.includes(user.id)
    ) || [];

    console.log('Matching users found:', matchingUsers.length);

    // Test the cached API endpoint
    let cachedApiResult = null;
    try {
      const cachedResponse = await fetch(`${request.nextUrl.origin}/api/fetch-user-emails-cached`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds }),
      });
      
      if (cachedResponse.ok) {
        cachedApiResult = await cachedResponse.json();
        console.log('Cached API result:', cachedApiResult);
      } else {
        console.error('Cached API failed:', cachedResponse.status);
      }
    } catch (cachedError) {
      console.error('Cached API error:', cachedError);
    }

    const userData = matchingUsers.map(user => ({
      id: user.id,
      email: user.email || 'No email',
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'No name',
      raw_metadata: user.user_metadata
    }));

    return NextResponse.json({ 
      success: true,
      sampleUserIds: userIds,
      totalAuthUsers: authUsers?.users?.length || 0,
      matchingUsers: userData,
      cachedApiResult: cachedApiResult,
      message: `Found ${matchingUsers.length} matching users out of ${userIds.length} requested`
    });

  } catch (error) {
    console.error('Error in test-user-fetch API:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
