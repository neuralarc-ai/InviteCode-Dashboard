import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG USAGE LOGS AGGREGATION ===');
    console.log('Using high limit (100000) to fetch ALL usage logs...');
    
    // Step 1: Fetch all usage logs using pagination to bypass Supabase's 1000 row limit
    let allLogs: any[] = [];
    let hasMore = true;
    let currentPage = 0;
    const pageSize = 1000;
    let count = 0;

    console.log('Fetching all usage logs using pagination...');
    
    while (hasMore) {
      const offset = currentPage * pageSize;
      console.log(`Fetching page ${currentPage + 1}, offset ${offset}...`);
      
      const { data: pageData, error: pageError, count: pageCount } = await supabase
        .from('usage_logs')
        .select('*', { count: currentPage === 0 ? 'exact' : undefined })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (pageError) {
        console.error('Error fetching page:', pageError);
        return NextResponse.json({ success: false, message: pageError.message }, { status: 500 });
      }

      if (currentPage === 0) {
        count = pageCount || 0;
        console.log('Total count from database:', count);
      }

      if (!pageData || pageData.length === 0) {
        hasMore = false;
        console.log('No more data, stopping pagination');
      } else {
        allLogs = [...allLogs, ...pageData];
        console.log(`Fetched ${pageData.length} records, total so far: ${allLogs.length}`);
        
        if (pageData.length < pageSize) {
          hasMore = false;
          console.log('Reached end of data');
        }
      }
      
      currentPage++;
    }

    const logsError = null;

    if (logsError) {
      console.error('Error fetching usage logs:', logsError);
      return NextResponse.json({ success: false, message: logsError.message }, { status: 500 });
    }

    console.log('Total usage logs fetched:', allLogs?.length || 0);
    console.log('Total count from database:', count);

    // Step 2: Get unique user IDs
    const uniqueUserIds = [...new Set(allLogs?.map(log => log.user_id) || [])];
    console.log('Unique user IDs found:', uniqueUserIds.length);
    console.log('Sample user IDs:', uniqueUserIds.slice(0, 10));

    // Step 3: Test user data fetching
    let userDataCount = 0;
    try {
      const response = await fetch(`${request.nextUrl.origin}/api/fetch-user-emails-cached`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: uniqueUserIds }), // Test with all users
      });

      if (response.ok) {
        const userData = await response.json();
        userDataCount = userData.length;
        console.log('User data fetched successfully:', userDataCount, 'users');
        console.log('Sample user data:', userData.slice(0, 3));
      } else {
        console.error('Failed to fetch user data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }

    // Step 4: Simulate aggregation
    const aggregatedUsers = uniqueUserIds.length;
    console.log('Simulated aggregated users:', aggregatedUsers);

    return NextResponse.json({
      success: true,
      summary: {
        totalUsageLogs: allLogs?.length || 0,
        totalCountFromDB: count || 0,
        uniqueUserIds: uniqueUserIds.length,
        userDataFetched: userDataCount,
        simulatedAggregatedUsers: aggregatedUsers,
      },
      sampleUserIds: uniqueUserIds.slice(0, 10),
      message: 'Debug analysis complete. Check console for detailed logs.'
    });

  } catch (error) {
    console.error('Error in debug usage logs aggregation:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
