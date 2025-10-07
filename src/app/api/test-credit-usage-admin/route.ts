import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Testing credit usage with admin client...');
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Service role key not configured',
          message: 'SUPABASE_SERVICE_ROLE_KEY environment variable is missing'
        },
        { status: 500 }
      );
    }

    // Test with admin client (bypasses RLS)
    const { data, error, count } = await supabaseAdmin
      .from('credit_usage')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('Admin client result:', { data, error, count });

    if (error) {
      console.error('Admin client error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          errorCode: error.code,
          errorDetails: error.details
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: count || 0,
      message: `Admin client found ${data?.length || 0} credit usage records`,
      usingServiceRole: true
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Unexpected error occurred',
        details: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

