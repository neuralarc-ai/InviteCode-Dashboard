import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('Analyzing orphaned users...');
    
    // Get all unique user IDs from usage_logs
    const { data: usageLogs, error: usageError } = await supabaseAdmin
      .from('usage_logs')
      .select('user_id')
      .limit(1000); // Limit to avoid memory issues

    if (usageError) {
      console.error('Error fetching usage logs:', usageError);
      return NextResponse.json({ 
        success: false, 
        error: usageError.message 
      }, { status: 500 });
    }

    if (!usageLogs || usageLogs.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No usage logs found' 
      });
    }

    const usageUserIds = [...new Set(usageLogs.map(log => log.user_id))];
    console.log('Unique user IDs in usage_logs:', usageUserIds.length);

    // Get all auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json({ 
        success: false, 
        error: authError.message 
      }, { status: 500 });
    }

    const authUserIds = new Set(authUsers?.users?.map(user => user.id) || []);
    console.log('Total auth users:', authUserIds.size);

    // Find orphaned users (exist in usage_logs but not in auth)
    const orphanedUserIds = usageUserIds.filter(userId => !authUserIds.has(userId));
    console.log('Orphaned user IDs:', orphanedUserIds.length);

    // Get detailed info about orphaned users
    const orphanedUserDetails = [];
    for (const userId of orphanedUserIds.slice(0, 10)) { // Limit to first 10 for performance
      const { data: userLogs, error: logError } = await supabaseAdmin
        .from('usage_logs')
        .select('*')
        .eq('user_id', userId)
        .limit(5);

      if (!logError && userLogs && userLogs.length > 0) {
        const totalTokens = userLogs.reduce((sum, log) => sum + (log.total_tokens || 0), 0);
        const totalCost = userLogs.reduce((sum, log) => sum + (parseFloat(log.estimated_cost) || 0), 0);
        
        orphanedUserDetails.push({
          userId,
          logCount: userLogs.length,
          totalTokens,
          totalCost,
          firstLogDate: userLogs[0]?.created_at,
          lastLogDate: userLogs[userLogs.length - 1]?.created_at,
        });
      }
    }

    return NextResponse.json({ 
      success: true,
      summary: {
        totalUsageLogs: usageLogs.length,
        uniqueUsersInUsageLogs: usageUserIds.length,
        totalAuthUsers: authUserIds.size,
        orphanedUsers: orphanedUserIds.length,
        orphanedPercentage: Math.round((orphanedUserIds.length / usageUserIds.length) * 100)
      },
      orphanedUserIds: orphanedUserIds.slice(0, 20), // First 20 for display
      orphanedUserDetails,
      recommendation: orphanedUserIds.length > 0 ? 
        'Consider cleaning up orphaned user references or implementing better user deletion cascades.' :
        'No orphaned users found. All usage logs have corresponding auth users.',
      message: `Found ${orphanedUserIds.length} orphaned users out of ${usageUserIds.length} total users`
    });

  } catch (error) {
    console.error('Error in fix-orphaned-users API:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
