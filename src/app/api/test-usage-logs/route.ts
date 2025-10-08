import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing usage_logs table access...');
    
    // Test basic table access
    const { data, error, count } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact' })
      .limit(5);

    console.log('Usage logs test result:', { data, error, count });

    if (error) {
      console.error('Error accessing usage_logs table:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      count: count || 0,
      sampleData: data,
      message: `Found ${count || 0} usage log records`
    });

  } catch (error) {
    console.error('Error in test-usage-logs API:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
