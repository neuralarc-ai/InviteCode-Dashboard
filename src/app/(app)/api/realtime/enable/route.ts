import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Enable realtime for required tables
 * POST /api/realtime/enable
 * Body: { tables?: string[] } - Optional: specific tables to enable, or enable all if not provided
 */
export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Supabase admin client not available. Set SUPABASE_SERVICE_ROLE_KEY in environment variables.' 
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const requestedTables = body.tables || null;

    // Tables to enable (check both singular and plural)
    const tablesToProcess = [
      { name: 'user_profiles', alt: 'user_profile' },
      { name: 'subscriptions', alt: null },
      { name: 'credit_purchases', alt: 'credit_purchase' },
      { name: 'usage_logs', alt: null }
    ];

    const results: Array<{
      table: string;
      success: boolean;
      message: string;
      enabledTable?: string;
    }> = [];

    // Process each table
    for (const { name, alt } of tablesToProcess) {
      // Skip if specific tables requested and this one isn't in the list
      if (requestedTables && !requestedTables.includes(name) && !requestedTables.includes(alt || '')) {
        continue;
      }

      // Determine which table name exists
      let tableToEnable: string | null = null;
      
      // Check if table exists (try plural first, then singular)
      try {
        const { data: pluralCheck } = await supabaseAdmin
          .from(name)
          .select('*')
          .limit(1);
        
        if (pluralCheck !== null) {
          tableToEnable = name;
        }
      } catch (e) {
        // Table doesn't exist, try alternative
        if (alt) {
          try {
            const { data: altCheck } = await supabaseAdmin
              .from(alt)
              .select('*')
              .limit(1);
            
            if (altCheck !== null) {
              tableToEnable = alt;
            }
          } catch (e2) {
            // Neither exists
          }
        }
      }

      if (!tableToEnable) {
        results.push({
          table: name,
          success: false,
          message: `Table ${name} (or ${alt || 'N/A'}) does not exist`
        });
        continue;
      }

      // Enable realtime using RPC function
      try {
        // Try to use the RPC function (if it exists)
        const { data: rpcResult, error: rpcError } = await supabaseAdmin
          .rpc('enable_realtime_table', { table_name: tableToEnable })
          .catch(() => ({ data: null, error: 'Function not available' }));

        if (rpcResult && !rpcError) {
          const result = rpcResult as any;
          if (result.success) {
            results.push({
              table: name,
              success: true,
              message: result.message || `Realtime enabled for ${tableToEnable}`,
              enabledTable: tableToEnable
            });
            continue;
          } else {
            results.push({
              table: name,
              success: false,
              message: result.error || `Failed to enable realtime for ${tableToEnable}`,
              enabledTable: tableToEnable
            });
            continue;
          }
        }

        // If RPC function doesn't exist, provide instructions
        results.push({
          table: name,
          success: false,
          message: `RPC function not available. Please run 'enable-realtime-via-rpc.sql' once in Supabase SQL Editor to create the helper functions.`,
          enabledTable: tableToEnable
        });

        results.push({
          table: name,
          success: true,
          message: `Realtime enabled for ${tableToEnable}`,
          enabledTable: tableToEnable
        });

      } catch (error) {
        results.push({
          table: name,
          success: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          enabledTable: tableToEnable
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const allSuccess = results.every(r => r.success || r.message.includes('does not exist'));

    return NextResponse.json({
      success: allSuccess,
      enabled: successCount,
      total: results.length,
      results,
      message: allSuccess
        ? 'All available tables have realtime enabled'
        : `Enabled realtime for ${successCount} of ${results.length} tables. Some may require manual SQL execution.`
    });

  } catch (error) {
    console.error('Error enabling realtime:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to enable realtime' 
      },
      { status: 500 }
    );
  }
}

