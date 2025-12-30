import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Check realtime status for required tables
 * GET /api/realtime/status
 */
export async function GET() {
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

    // Tables to check (handling both singular and plural variations)
    const tablesToCheck = [
      'user_profiles',
      'user_profile',
      'subscriptions',
      'credit_purchases',
      'credit_purchase',
      'usage_logs'
    ];

    // Try to query using RPC function
    let enabledTables: string[] = [];
    let statusData: any = null;
    
    try {
      // Use the check_realtime_status RPC function (if it exists)
      const { data, error } = await supabaseAdmin
        .rpc('check_realtime_status', { table_names: tablesToCheck })
        .catch(() => ({ data: null, error: 'Function not available' }));

      if (data && !error) {
        statusData = data as any;
        enabledTables = statusData.enabled_tables || [];
      } else {
        // Fallback: Try the older function name
        const { data: altData, error: altError } = await supabaseAdmin
          .rpc('check_realtime_tables', { table_names: tablesToCheck })
          .catch(() => ({ data: null, error: 'Function not available' }));

        if (altData && !altError) {
          enabledTables = Array.isArray(altData) ? altData : [];
        } else {
          console.warn('RPC function not available. Please run enable-realtime-via-rpc.sql to create helper functions.');
        }
      }
    } catch (e) {
      console.warn('Could not query realtime status:', e);
    }

    // Expected tables (normalize to check what we actually have)
    const expectedTables = [
      { name: 'user_profiles', alt: 'user_profile' },
      { name: 'subscriptions', alt: null },
      { name: 'credit_purchases', alt: 'credit_purchase' },
      { name: 'usage_logs', alt: null }
    ];

    const status = expectedTables.map(({ name, alt }) => {
      const isEnabled = enabledTables.includes(name) || (alt && enabledTables.includes(alt));
      return {
        table: name,
        alternative: alt,
        enabled: isEnabled,
        enabledTable: enabledTables.includes(name) ? name : (alt && enabledTables.includes(alt) ? alt : null)
      };
    });

    const allEnabled = status.every(s => s.enabled);
    const enabledCount = status.filter(s => s.enabled).length;

    return NextResponse.json({
      success: true,
      allEnabled,
      enabledCount,
      totalTables: status.length,
      status,
      enabledTables,
      message: allEnabled 
        ? 'All tables have realtime enabled' 
        : `${enabledCount} of ${status.length} tables have realtime enabled`
    });

  } catch (error) {
    console.error('Error checking realtime status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to check realtime status' 
      },
      { status: 500 }
    );
  }
}

