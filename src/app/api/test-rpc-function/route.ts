import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('=== Testing RPC Function ===');
    
    // Check if admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin client not available',
        fix: 'Add SUPABASE_SERVICE_ROLE_KEY to .env file'
      }, { status: 500 });
    }

    console.log('✅ Admin client available');

    // Test the RPC function
    console.log('Calling get_aggregated_usage_logs...');
    const { data, error } = await supabaseAdmin.rpc('get_aggregated_usage_logs', {
      search_query: '',
      activity_level_filter: '',
      page_number: 1,
      page_size: 10
    });

    console.log('RPC Response:', { data: data?.length, error });

    if (error) {
      console.error('❌ RPC Error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        hint: error.hint || 'Check if function exists in database'
      }, { status: 500 });
    }

    console.log('✅ RPC call successful!');
    console.log('Sample data:', data?.[0]);

    return NextResponse.json({
      success: true,
      message: 'RPC function works!',
      recordCount: data?.length || 0,
      totalCount: data?.[0]?.total_count || 0,
      sampleRecord: data?.[0] || null
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

