import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('Creating test usage logs...');
    
    // Sample usage log data
    const testUsageLogs = [
      {
        user_id: '00000000-0000-0000-0000-000000000001',
        thread_id: '11111111-1111-1111-1111-111111111111',
        message_id: '22222222-2222-2222-2222-222222222222',
        total_prompt_tokens: 150,
        total_completion_tokens: 75,
        total_tokens: 225,
        estimated_cost: 0.0045,
        content: { model: 'gpt-4', temperature: 0.7 }
      },
      {
        user_id: '00000000-0000-0000-0000-000000000002',
        thread_id: '33333333-3333-3333-3333-333333333333',
        message_id: '44444444-4444-4444-4444-444444444444',
        total_prompt_tokens: 200,
        total_completion_tokens: 100,
        total_tokens: 300,
        estimated_cost: 0.006,
        content: { model: 'gpt-3.5-turbo', temperature: 0.5 }
      },
      {
        user_id: '00000000-0000-0000-0000-000000000001',
        thread_id: '55555555-5555-5555-5555-555555555555',
        message_id: '66666666-6666-6666-6666-666666666666',
        total_prompt_tokens: 300,
        total_completion_tokens: 150,
        total_tokens: 450,
        estimated_cost: 0.009,
        content: { model: 'gpt-4', temperature: 0.8 }
      }
    ];

    // Insert test data
    const { data, error } = await supabase
      .from('usage_logs')
      .insert(testUsageLogs)
      .select();

    if (error) {
      console.error('Error creating test usage logs:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      }, { status: 500 });
    }

    console.log('Test usage logs created successfully:', data);

    return NextResponse.json({ 
      success: true, 
      message: `Created ${data.length} test usage logs`,
      data: data
    });

  } catch (error) {
    console.error('Error in create-test-usage-logs API:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
