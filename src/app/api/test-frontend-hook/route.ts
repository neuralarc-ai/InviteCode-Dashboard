import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('=== TESTING FRONTEND HOOK LOGIC ===');
    
    // Simulate the exact same logic as the frontend hook
    let allData: any[] = [];
    let hasMore = true;
    let currentPage = 0;
    const pageSize = 1000;
    let totalCount = 0;

    console.log('Fetching all usage logs using pagination...');
    
    while (hasMore) {
      const offset = currentPage * pageSize;
      console.log(`Fetching page ${currentPage + 1}, offset ${offset}...`);
      
      const { data: pageData, error: pageError, count } = await supabase
        .from('usage_logs')
        .select('*', { count: currentPage === 0 ? 'exact' : undefined })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (pageError) {
        console.error('Error fetching page:', pageError);
        return NextResponse.json({ success: false, message: pageError.message }, { status: 500 });
      }

      if (currentPage === 0) {
        totalCount = count || 0;
        console.log('Total count from database:', totalCount);
      }

      if (!pageData || pageData.length === 0) {
        hasMore = false;
        console.log('No more data, stopping pagination');
      } else {
        allData = [...allData, ...pageData];
        console.log(`Fetched ${pageData.length} records, total so far: ${allData.length}`);
        
        if (pageData.length < pageSize) {
          hasMore = false;
          console.log('Reached end of data');
        }
      }
      
      currentPage++;
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(allData.map(log => log.user_id))];
    console.log('Unique user IDs found:', uniqueUserIds.length);

    // Test user data fetching
    let userDataCount = 0;
    try {
      const response = await fetch(`${request.nextUrl.origin}/api/fetch-user-emails-cached`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: uniqueUserIds }),
      });

      if (response.ok) {
        const userData = await response.json();
        userDataCount = userData.length;
        console.log('User data fetched successfully:', userDataCount, 'users');
      } else {
        console.error('Failed to fetch user data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }

    // Simulate aggregation
    const aggregatedUsers = uniqueUserIds.length;

    return NextResponse.json({
      success: true,
      summary: {
        totalUsageLogs: allData.length,
        totalCountFromDB: totalCount,
        uniqueUserIds: uniqueUserIds.length,
        userDataFetched: userDataCount,
        simulatedAggregatedUsers: aggregatedUsers,
        paginationPages: currentPage,
      },
      message: 'Frontend hook logic test complete. Check console for detailed logs.'
    });

  } catch (error) {
    console.error('Error in test frontend hook:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
