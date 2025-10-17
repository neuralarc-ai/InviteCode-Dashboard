import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId, creditsToAdd, notes } = await request.json();

    // Validate required fields
    if (!userId || creditsToAdd === undefined) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: userId and creditsToAdd are required'
      }, { status: 400 });
    }

    if (typeof creditsToAdd !== 'number' || creditsToAdd <= 0) {
      return NextResponse.json({
        success: false,
        message: 'creditsToAdd must be a positive number'
      }, { status: 400 });
    }

    console.log('Assigning credits:', { userId, creditsToAdd, notes });

    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('Supabase Admin client not available');
      return NextResponse.json({
        success: false,
        message: 'Server configuration error: Admin client not available'
      }, { status: 500 });
    }

    // First, let's test if the table exists and is accessible
    console.log('Testing table access...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('credit_balance')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('Table access error:', testError);
      return NextResponse.json({
        success: false,
        message: `Database error: ${testError.message}`,
        error: testError
      }, { status: 500 });
    }

    console.log('Table access successful, checking existing balance...');

    // Check if user already has a credit balance record
    const { data: existingBalance, error: fetchError } = await supabaseAdmin
      .from('credit_balance')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching existing balance:', fetchError);
      return NextResponse.json({
        success: false,
        message: 'Failed to check existing credit balance',
        error: fetchError
      }, { status: 500 });
    }

    let result;
    const now = new Date().toISOString();

    if (existingBalance) {
      // Update existing balance
      const newBalanceDollars = (existingBalance.balance_dollars || 0) + creditsToAdd;
      const newTotalPurchased = (existingBalance.total_purchased || 0) + creditsToAdd;
      
      // Update metadata with assignment info
      const updatedMetadata = {
        ...existingBalance.metadata,
        last_assignment: {
          amount: creditsToAdd,
          timestamp: now,
          notes: notes || null
        }
      };

      const { data, error } = await supabaseAdmin
        .from('credit_balance')
        .update({
          balance_dollars: newBalanceDollars,
          total_purchased: newTotalPurchased,
          last_updated: now,
          metadata: updatedMetadata
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating credit balance:', error);
        return NextResponse.json({
          success: false,
          message: 'Failed to update credit balance',
          error: error
        }, { status: 500 });
      }

      result = data;
      console.log('Updated existing credit balance:', result);
    } else {
      // Create new balance record
      const insertData = {
        user_id: userId,
        balance_dollars: creditsToAdd,
        total_purchased: creditsToAdd,
        total_used: 0,
        last_updated: now,
        metadata: {
          initial_assignment: {
            amount: creditsToAdd,
            timestamp: now,
            notes: notes || null
          }
        }
      };

      console.log('Attempting to insert:', insertData);

      const { data, error } = await supabaseAdmin
        .from('credit_balance')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating credit balance:', error);
        return NextResponse.json({
          success: false,
          message: 'Failed to create credit balance',
          error: error,
          insertData: insertData
        }, { status: 500 });
      }

      result = data;
      console.log('Created new credit balance:', result);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${creditsToAdd} credits to user`,
      data: {
        userId: result.user_id,
        balanceDollars: result.balance_dollars,
        totalPurchased: result.total_purchased,
        totalUsed: result.total_used,
        lastUpdated: result.last_updated,
        metadata: result.metadata
      }
    });

  } catch (error) {
    console.error('Error in credit assignment API:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('Supabase Admin client not available');
      return NextResponse.json({
        success: false,
        message: 'Server configuration error: Admin client not available'
      }, { status: 500 });
    }

    let query = supabaseAdmin
      .from('credit_balance')
      .select('*')
      .order('last_updated', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching credit balances:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch credit balances'
      }, { status: 500 });
    }

    const transformedData = data?.map((row: any) => ({
      userId: row.user_id,
      balanceDollars: row.balance_dollars,
      totalPurchased: row.total_purchased,
      totalUsed: row.total_used,
      lastUpdated: new Date(row.last_updated),
      metadata: row.metadata
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Error in credit balance fetch API:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
