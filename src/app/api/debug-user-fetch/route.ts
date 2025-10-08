import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('Debug user fetch - comprehensive test...');
    
    // Get sample user IDs from usage_logs table
    const { data: sampleLogs, error: logsError } = await supabaseAdmin
      .from('usage_logs')
      .select('user_id')
      .limit(20);

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

    // Get all auth users
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

    // Test the original API endpoint
    let originalApiResult = null;
    try {
      const originalResponse = await fetch(`${request.nextUrl.origin}/api/fetch-user-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds }),
      });
      
      if (originalResponse.ok) {
        originalApiResult = await originalResponse.json();
        console.log('Original API result:', originalApiResult);
      } else {
        console.error('Original API failed:', originalResponse.status);
      }
    } catch (originalError) {
      console.error('Original API error:', originalError);
    }

    // Analyze user data
    const userAnalysis = userIds.map(userId => {
      const authUser = matchingUsers.find(u => u.id === userId);
      const cachedUser = cachedApiResult?.find((u: any) => u.id === userId);
      const originalUser = originalApiResult?.find((u: any) => u.id === userId);
      
      return {
        userId,
        inAuthTable: !!authUser,
        authUserEmail: authUser?.email || null,
        authUserMetadata: authUser?.user_metadata || null,
        cachedApiFound: !!cachedUser,
        cachedApiName: cachedUser?.full_name || null,
        originalApiFound: !!originalUser,
        originalApiName: originalUser?.full_name || null,
      };
    });

    return NextResponse.json({ 
      success: true,
      summary: {
        totalUserIds: userIds.length,
        totalAuthUsers: authUsers?.users?.length || 0,
        matchingUsers: matchingUsers.length,
        cachedApiResults: cachedApiResult?.length || 0,
        originalApiResults: originalApiResult?.length || 0,
      },
      userAnalysis,
      sampleUserIds: userIds,
      matchingUsers: matchingUsers.map(user => ({
        id: user.id,
        email: user.email,
        metadata: user.user_metadata,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email
      })),
      cachedApiResult,
      originalApiResult,
      message: `Analysis complete for ${userIds.length} user IDs`
    });

  } catch (error) {
    console.error('Error in debug-user-fetch API:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
