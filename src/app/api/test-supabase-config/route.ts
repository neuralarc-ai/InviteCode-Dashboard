import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Supabase configuration...');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment variables check:');
    console.log('- SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('- SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET (first 10 chars: ' + supabaseAnonKey.substring(0, 10) + '...)' : 'NOT SET');
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET (first 10 chars: ' + supabaseServiceKey.substring(0, 10) + '...)' : 'NOT SET');
    
    // Check if supabaseAdmin is available
    const adminClientAvailable = supabaseAdmin !== null;
    console.log('Admin client available:', adminClientAvailable);
    
    if (!adminClientAvailable) {
      return NextResponse.json({ 
        success: false, 
        message: 'Supabase admin client not available',
        config: {
          supabaseUrl: !!supabaseUrl,
          supabaseAnonKey: !!supabaseAnonKey,
          supabaseServiceKey: !!supabaseServiceKey,
          adminClientAvailable: false
        },
        suggestion: 'SUPABASE_SERVICE_ROLE_KEY environment variable is missing or invalid. This is required to access auth.users table.'
      });
    }
    
    // Test admin client access
    let authTestResult = null;
    let authTestError = null;
    
    try {
      console.log('Testing admin client access to auth.users...');
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) {
        authTestError = authError;
        console.error('Auth test failed:', authError);
      } else {
        authTestResult = {
          totalUsers: authUsers?.users?.length || 0,
          firstUser: authUsers?.users?.[0] ? {
            id: authUsers.users[0].id,
            email: authUsers.users[0].email,
            display_name: authUsers.users[0].display_name
          } : null
        };
        console.log('Auth test successful:', authTestResult);
      }
    } catch (testError) {
      authTestError = testError;
      console.error('Auth test exception:', testError);
    }
    
    // Test regular client access to usage_logs
    let usageLogsTestResult = null;
    let usageLogsTestError = null;
    
    try {
      console.log('Testing regular client access to usage_logs...');
      const { data: usageLogs, error: usageError } = await supabaseAdmin
        .from('usage_logs')
        .select('user_id')
        .limit(5);
      
      if (usageError) {
        usageLogsTestError = usageError;
        console.error('Usage logs test failed:', usageError);
      } else {
        usageLogsTestResult = {
          totalLogs: usageLogs?.length || 0,
          sampleUserIds: usageLogs?.map(log => log.user_id) || []
        };
        console.log('Usage logs test successful:', usageLogsTestResult);
      }
    } catch (testError) {
      usageLogsTestError = testError;
      console.error('Usage logs test exception:', testError);
    }
    
    return NextResponse.json({ 
      success: true,
      config: {
        supabaseUrl: !!supabaseUrl,
        supabaseAnonKey: !!supabaseAnonKey,
        supabaseServiceKey: !!supabaseServiceKey,
        adminClientAvailable
      },
      authTest: {
        success: !authTestError,
        result: authTestResult,
        error: authTestError?.message || null
      },
      usageLogsTest: {
        success: !usageLogsTestError,
        result: usageLogsTestResult,
        error: usageLogsTestError?.message || null
      },
      message: adminClientAvailable ? 
        'Supabase configuration looks good. Admin client can access auth.users.' :
        'Supabase admin client not available. Check SUPABASE_SERVICE_ROLE_KEY environment variable.'
    });

  } catch (error) {
    console.error('Error in test-supabase-config API:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
