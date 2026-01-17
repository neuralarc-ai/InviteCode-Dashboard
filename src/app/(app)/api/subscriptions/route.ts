import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured');
    }

    // Fetch all subscriptions with admin client to bypass RLS
    const { data, error } = await supabaseAdmin
    .schema('basejump')
      .from('billing_subscriptions')
      .select(`*`)
      .order('created', { ascending: false });


    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
    });
  } catch (err) {
    console.error('Error fetching subscriptions (admin):', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch subscriptions',
        data: [],
      },
      { status: 500 }
    );
  }
}

