import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured');
    }

    // Fetch completed purchases with admin client to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('credit_purchases')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
    });
  } catch (err) {
    console.error('Error fetching credit purchases (admin):', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch credit purchases',
        data: [],
      },
      { status: 500 }
    );
  }
}




