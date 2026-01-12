import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Helper to determine user type
const getUserType = (email: string | undefined): 'internal' | 'external' => {
  if (!email) return 'external';
  const lower = email.toLowerCase();
  if (lower.endsWith('@he2.ai') || lower.endsWith('@neuralarc.ai')) return 'internal';
  return 'external';
};

// Fallback function for JS aggregation if SQL function is broken
async function fetchAndAggregateManually(
  page: number, 
  limit: number, 
  searchQuery: string, 
  activityFilter: string, 
  userTypeFilter: string, 
  sortBy: string,
  timeRange: string
) {
  
  // 1. Fetch raw usage logs
  let query = supabaseAdmin.from('usage_logs').select('*');
  const now = new Date();

  // Apply DB-level filtering if possible
  if (timeRange === 'weekly') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', weekAgo);
  } else if (timeRange === 'monthly') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', monthAgo);
  }

  const { data: usageLogs, error: usageError } = await query;
  
  if (usageError) throw usageError;
  if (!usageLogs) return { data: [], totalCount: 0, grandTotalTokens: 0, grandTotalCost: 0 };

  // 2. Fetch completed payments
  const { data: payments } = await supabaseAdmin
    .from('credit_purchases')
    .select('user_id')
    .eq('status', 'completed');
  
  const payingUserIds = new Set(payments?.map(p => p.user_id) || []);

  // 3. Aggregate data
  const userStats = new Map();

  usageLogs.forEach(log => {
    if (!userStats.has(log.user_id)) {
      userStats.set(log.user_id, {
        user_id: log.user_id,
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        total_tokens: 0,
        total_estimated_cost: 0,
        usage_count: 0,
        earliest_activity: new Date(log.created_at),
        latest_activity: new Date(log.created_at),
        has_completed_payment: payingUserIds.has(log.user_id)
      });
    }
    
    const stats = userStats.get(log.user_id);
    stats.total_prompt_tokens += (log.total_prompt_tokens || 0);
    stats.total_completion_tokens += (log.total_completion_tokens || 0);
    stats.total_tokens += (log.total_tokens || 0);
    stats.total_estimated_cost += (log.estimated_cost || 0);
    stats.usage_count += 1;
    
    const logDate = new Date(log.created_at);
    if (logDate < stats.earliest_activity) stats.earliest_activity = logDate;
    if (logDate > stats.latest_activity) stats.latest_activity = logDate;
  });

  // 4. Transform to array and calculate activity levels
  let aggregatedUsers = Array.from(userStats.values()).map(user => {
    const daysSinceLastActivity = Math.floor((now.getTime() - user.latest_activity.getTime()) / (1000 * 60 * 60 * 24));
    
    let activity_level = 'inactive';
    if (daysSinceLastActivity <= 2) activity_level = 'high';
    else if (daysSinceLastActivity === 3) activity_level = 'medium';
    else if (daysSinceLastActivity > 3) activity_level = 'low';

    // Calculate scores (simplified version of SQL logic)
    const recency_score = Math.max(0, 100 - (daysSinceLastActivity * 2));
    const frequency_score = Math.min(100, user.usage_count * 5);
    const volume_score = Math.min(100, user.total_tokens / 1000000);
    const activity_score = Math.floor(recency_score * 0.5 + frequency_score * 0.3 + volume_score * 0.2);

    return {
      ...user,
      days_since_last_activity: daysSinceLastActivity,
      activity_level,
      activity_score,
      // Default names until fetched
      user_name: `User ${user.user_id.slice(0, 8)}`,
      user_email: `user-${user.user_id.slice(0, 8)}@unknown.com`,
      user_type: 'external' // Will resolve later
    };
  });

  // 5. Fetch user details (names/emails) - Batch fetch
  const userIds = aggregatedUsers.map(u => u.user_id);
  
  // Try to get profiles for names
  const { data: profiles } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, full_name')
    .in('user_id', userIds);
    
  const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

  // Fetch emails from auth.users (Paginated)
  const userIdToEmail = new Map<string, string>();
  if (supabaseAdmin) {
    let pageNum = 1;
    const perPage = 1000;
    let hasMoreUsers = true;
    
    try {
      while (hasMoreUsers) {
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
          page: pageNum,
          perPage: perPage
        });
        
        if (authError || !authUsers?.users || authUsers.users.length === 0) {
          hasMoreUsers = false;
          break;
        }
        
        authUsers.users.forEach(user => {
          if (user.email) {
             userIdToEmail.set(user.id, user.email);
          }
        });
        
        if (authUsers.users.length < perPage) {
          hasMoreUsers = false;
        }
        pageNum++;
      }
    } catch (err) {
      console.error('Error fetching auth users in fallback:', err);
    }
  }

  // Update users with email and type
  aggregatedUsers.forEach(u => {
    // Name
    if (profileMap.has(u.user_id)) {
      u.user_name = profileMap.get(u.user_id);
    }
    
    // Email & Type
    const email = userIdToEmail.get(u.user_id);
    if (email) {
      u.user_email = email;
      u.user_type = getUserType(email);
    }
  });
  
  // 6. Apply filters
  aggregatedUsers = aggregatedUsers.filter(user => {
    // Activity Filter
    if (activityFilter !== 'all' && user.activity_level !== activityFilter) return false;
    
    // User Type Filter
    if (userTypeFilter !== 'all' && user.user_type !== userTypeFilter) return false;
    
    // Search Filter (basic implementation)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (user.user_name).toLowerCase();
      return name.includes(q) || user.user_id.includes(q);
    }
    
    return true;
  });

  // 7. Calculate Grand Totals (based on filtered data)
  const grandTotalTokens = aggregatedUsers.reduce((sum, u) => sum + u.total_tokens, 0);
  const grandTotalCost = aggregatedUsers.reduce((sum, u) => sum + u.total_estimated_cost, 0);
  const totalCount = aggregatedUsers.length;

  // 8. Sort
  aggregatedUsers.sort((a, b) => {
    if (sortBy === 'activity_score') return b.activity_score - a.activity_score;
    if (sortBy === 'usage_count') return b.usage_count - a.usage_count;
    if (sortBy === 'total_cost') return b.total_estimated_cost - a.total_estimated_cost;
    return b.latest_activity.getTime() - a.latest_activity.getTime(); // latest_activity default
  });

  // 9. Paginate
  const paginatedData = aggregatedUsers.slice((page - 1) * limit, page * limit);

  // Add total_count to each row to match RPC format
  const resultData = paginatedData.map(u => ({
    ...u,
    total_count: totalCount,
    grand_total_tokens: grandTotalTokens,
    grand_total_cost: grandTotalCost
  }));

  return {
    data: resultData,
    totalCount,
    grandTotalTokens,
    grandTotalCost
  };
}

export async function POST(request: Request) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      searchQuery = '', 
      activityFilter = 'all', 
      userTypeFilter = 'external',
      sortBy = 'latest_activity',
      timeRange = 'all'
    } = await request.json();

    if (!supabaseAdmin) {
      throw new Error('Server configuration error: Admin client not available');
    }
    
    // If a specific time range is requested, prioritize manual JS aggregation
    // to ensure correct filtering without relying on DB function updates.
    if (timeRange !== 'all') {
      const fallbackResult = await fetchAndAggregateManually(
        page, limit, searchQuery, activityFilter, userTypeFilter, sortBy, timeRange
      );
      
      return NextResponse.json({
        success: true,
        data: fallbackResult.data,
        totalCount: fallbackResult.totalCount,
        grandTotalTokens: fallbackResult.grandTotalTokens,
        grandTotalCost: fallbackResult.grandTotalCost,
        page,
        limit,
      });
    }
    
    // Use Supabase RPC function for server-side aggregation
    const { data: aggregatedData, error: rpcError } = await supabaseAdmin
      .rpc('get_aggregated_usage_logs', {
        search_query: searchQuery || '',
        activity_level_filter: activityFilter === 'all' ? '' : activityFilter,
        page_number: page,
        page_size: limit,
        user_type_filter: userTypeFilter,
        sort_by: sortBy,
        time_range: timeRange
      });

    if (rpcError) {
      // Check for function signature mismatch or missing function errors
      const isSignatureError = 
        rpcError.message.includes('function get_aggregated_usage_logs') ||
        rpcError.message.includes('argument') || 
        rpcError.message.includes('does not exist') ||
        rpcError.message.includes('ambiguous') || // Also catch the ambiguous column error
        rpcError.code === '42883' || 
        rpcError.code === 'PGRST202' ||
        rpcError.code === '42702'; // Ambiguous column code

      if (isSignatureError) {
        
        try {
          const fallbackResult = await fetchAndAggregateManually(
            page, limit, searchQuery, activityFilter, userTypeFilter, sortBy, timeRange
          );
          
          return NextResponse.json({
            success: true,
            data: fallbackResult.data,
            totalCount: fallbackResult.totalCount,
            grandTotalTokens: fallbackResult.grandTotalTokens,
            grandTotalCost: fallbackResult.grandTotalCost,
            page,
            limit,
          });
        } catch (fallbackError) {
          console.error('Manual fallback failed:', fallbackError);
          // If even fallback fails, rethrow the original error
          throw rpcError;
        }
      }
      
      throw rpcError;
    }


    return createResponse(aggregatedData, page, limit);
    
  } catch (error) {
    console.error('Error fetching aggregated usage logs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch usage logs',
        details: error, 
        data: [],
        totalCount: 0
      },
      { status: 500 }
    );
  }
}

function sortData(data: any[] | null, sortBy: string) {
  if (!data || sortBy === 'latest_activity') return data;
  
  return [...data].sort((a: any, b: any) => {
    if (sortBy === 'activity_score') return (b.activity_score || 0) - (a.activity_score || 0);
    if (sortBy === 'usage_count') return (b.usage_count || 0) - (a.usage_count || 0);
    if (sortBy === 'total_cost') return (b.total_estimated_cost || 0) - (a.total_estimated_cost || 0);
    return 0;
  });
}

function createResponse(data: any[] | null, page: number, limit: number) {
  // Extract metadata from the first row (all rows have the same values for these)
  const totalCount = data && data.length > 0 ? data[0].total_count : 0;
  const grandTotalTokens = data && data.length > 0 ? data[0].grand_total_tokens : 0;
  const grandTotalCost = data && data.length > 0 ? data[0].grand_total_cost : 0;

  return NextResponse.json({
    success: true,
    data: data || [],
    totalCount: Number(totalCount) || 0,
    grandTotalTokens: Number(grandTotalTokens) || 0,
    grandTotalCost: Number(grandTotalCost) || 0,
    page,
    limit,
  });
}
