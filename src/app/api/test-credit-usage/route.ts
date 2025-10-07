import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Testing credit usage data fetch...');
    console.log('Environment check:');
    console.log('- SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('- SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Test 1: Basic connection test
    console.log('Test 1: Basic connection test...');
    const { data: testData, error: testError } = await supabase
      .from('credit_usage')
      .select('count', { count: 'exact', head: true });

    console.log('Basic count test result:', { testData, testError });

    // Test 2: Try to fetch actual data
    console.log('Test 2: Fetching actual data...');
    const { data, error, count } = await supabase
      .from('credit_usage')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('Data fetch result:', { data, error, count });
    console.log('Data length:', data?.length);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint,
          testResults: {
            basicCount: { data: testData, error: testError },
            dataFetch: { data, error, count }
          }
        },
        { status: 500 }
      );
    }

    console.log(`Found ${count} total records, returning ${data?.length || 0} records`);

    return NextResponse.json({
      success: true,
      data: data || [],
      count: count || 0,
      message: `Successfully fetched ${data?.length || 0} credit usage records`,
      testResults: {
        basicCount: { data: testData, error: testError },
        dataFetch: { data, error, count }
      }
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Unexpected error occurred',
        details: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}
