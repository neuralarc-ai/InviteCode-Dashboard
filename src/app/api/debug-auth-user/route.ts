import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const specificUserId = 'b240530d-c844-453b-b916-07e37aaa372f';
    console.log('Debugging auth user:', specificUserId);
    
    // Get ALL auth users and search for our specific user
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json({ 
        success: false, 
        error: authError.message 
      }, { status: 500 });
    }

    console.log('Total auth users fetched:', authUsers?.users?.length || 0);

    // Search for the specific user
    const specificUser = authUsers?.users?.find(user => user.id === specificUserId);
    
    if (!specificUser) {
      // Let's check if the user ID exists but with different casing or format
      const allUserIds = authUsers?.users?.map(user => user.id) || [];
      const similarIds = allUserIds.filter(id => 
        id.toLowerCase().includes(specificUserId.toLowerCase().slice(0, 8))
      );
      
      // Check if user exists in usage_logs
      const { data: usageLogs, error: usageError } = await supabaseAdmin
        .from('usage_logs')
        .select('user_id, created_at')
        .eq('user_id', specificUserId)
        .limit(5);
      
      const existsInUsageLogs = usageLogs && usageLogs.length > 0;
      
      return NextResponse.json({ 
        success: false, 
        message: `User ${specificUserId} not found in auth table`,
        totalAuthUsers: authUsers?.users?.length || 0,
        similarUserIds: similarIds,
        allUserIds: allUserIds.slice(0, 10), // First 10 for debugging
        existsInUsageLogs,
        usageLogsCount: usageLogs?.length || 0,
        usageLogDates: usageLogs?.map(log => log.created_at) || [],
        suggestion: existsInUsageLogs ? 
          'This user exists in usage_logs but is not accessible via auth.admin.listUsers(). The user might be soft-deleted, suspended, or there might be a permissions issue.' :
          'This user does not exist in either table.'
      });
    }

    // User found - let's analyze all possible name sources
    console.log('Found specific user:', {
      id: specificUser.id,
      email: specificUser.email,
      display_name: specificUser.display_name,
      raw_user: specificUser
    });

    // Test all possible name extraction methods
    const nameSources = {
      user_display_name: specificUser.display_name,
      user_email: specificUser.email,
      metadata_full_name: specificUser.user_metadata?.full_name,
      metadata_name: specificUser.user_metadata?.name,
      metadata_display_name: specificUser.user_metadata?.display_name,
      metadata_first_name: specificUser.user_metadata?.first_name,
      metadata_last_name: specificUser.user_metadata?.last_name,
      metadata_given_name: specificUser.user_metadata?.given_name,
      metadata_family_name: specificUser.user_metadata?.family_name,
      metadata_preferred_username: specificUser.user_metadata?.preferred_username,
      metadata_nickname: specificUser.user_metadata?.nickname,
    };

    // Determine the best name to use
    let bestName = null;
    let nameSource = null;

    if (specificUser.display_name) {
      bestName = specificUser.display_name;
      nameSource = 'user.display_name';
    } else if (specificUser.user_metadata?.full_name) {
      bestName = specificUser.user_metadata.full_name;
      nameSource = 'user_metadata.full_name';
    } else if (specificUser.user_metadata?.name) {
      bestName = specificUser.user_metadata.name;
      nameSource = 'user_metadata.name';
    } else if (specificUser.user_metadata?.display_name) {
      bestName = specificUser.user_metadata.display_name;
      nameSource = 'user_metadata.display_name';
    } else if (specificUser.user_metadata?.first_name && specificUser.user_metadata?.last_name) {
      bestName = `${specificUser.user_metadata.first_name} ${specificUser.user_metadata.last_name}`;
      nameSource = 'user_metadata.first_name + last_name';
    } else if (specificUser.user_metadata?.given_name && specificUser.user_metadata?.family_name) {
      bestName = `${specificUser.user_metadata.given_name} ${specificUser.user_metadata.family_name}`;
      nameSource = 'user_metadata.given_name + family_name';
    } else if (specificUser.email) {
      bestName = specificUser.email;
      nameSource = 'user.email (fallback)';
    }

    return NextResponse.json({ 
      success: true,
      userId: specificUserId,
      userFound: true,
      userData: {
        id: specificUser.id,
        email: specificUser.email,
        display_name: specificUser.display_name,
        metadata: specificUser.user_metadata,
        bestName,
        nameSource
      },
      nameSources,
      totalAuthUsers: authUsers?.users?.length || 0,
      message: `User found! Best name: "${bestName}" from ${nameSource}`
    });

  } catch (error) {
    console.error('Error in debug-auth-user API:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
