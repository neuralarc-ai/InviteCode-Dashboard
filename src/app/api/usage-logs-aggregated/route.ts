import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { page = 1, limit = 10, searchQuery = '', activityFilter = 'all', userTypeFilter = 'external' } = await request.json();
    
    console.log('API: Fetching aggregated usage logs', { page, limit, searchQuery, activityFilter, userTypeFilter });
    
    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('Supabase Admin client not available - Service role key not configured');
      throw new Error('Server configuration error: Admin client not available');
    }
    
    // Use Supabase RPC function for server-side aggregation
    // This is much faster than fetching all data and aggregating client-side
    const { data: aggregatedData, error: rpcError } = await supabaseAdmin
      .rpc('get_aggregated_usage_logs', {
        search_query: searchQuery || '',
        activity_level_filter: activityFilter === 'all' ? '' : activityFilter,
        page_number: page,
        page_size: limit,
        user_type_filter: userTypeFilter
      });

    if (rpcError) {
      console.error('RPC error:', rpcError);
      throw rpcError;
    }

    console.log('API: Aggregated data fetched', { dataLength: aggregatedData?.length });

    // Extract metadata from the first row (all rows have the same values for these)
    const totalCount = aggregatedData && aggregatedData.length > 0 ? aggregatedData[0].total_count : 0;
    const grandTotalTokens = aggregatedData && aggregatedData.length > 0 ? aggregatedData[0].grand_total_tokens : 0;
    const grandTotalCost = aggregatedData && aggregatedData.length > 0 ? aggregatedData[0].grand_total_cost : 0;

    console.log('Totals:', { totalCount, grandTotalTokens, grandTotalCost });

    return NextResponse.json({
      success: true,
      data: aggregatedData || [],
      totalCount: Number(totalCount) || 0,
      grandTotalTokens: Number(grandTotalTokens) || 0,
      grandTotalCost: Number(grandTotalCost) || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching aggregated usage logs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch usage logs',
        data: [],
        totalCount: 0
      },
      { status: 500 }
    );
  }
}

