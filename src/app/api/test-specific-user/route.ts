import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const specificUserId = 'b240530d-c844-453b-b916-07e37aaa372f';
    console.log('Testing specific user:', specificUserId);
    
    // Get the specific user from auth
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching users from auth:', authError);
      return NextResponse.json({ 
        success: false, 
        error: authError.message 
      }, { status: 500 });
    }

    const specificUser = authUsers?.users?.find(user => user.id === specificUserId);
    
    if (!specificUser) {
      // Check if this user exists in usage_logs but not in auth
      const { data: usageLogs, error: usageError } = await supabaseAdmin
        .from('usage_logs')
        .select('user_id')
        .eq('user_id', specificUserId)
        .limit(1);
      
      const existsInUsageLogs = usageLogs && usageLogs.length > 0;
      
      return NextResponse.json({ 
        success: false, 
        message: `User ${specificUserId} not found in auth table`,
        existsInUsageLogs,
        usageLogsCount: usageLogs?.length || 0,
        suggestion: existsInUsageLogs ? 
          'This user exists in usage_logs but was deleted from auth.users. This is why the name is not showing.' :
          'This user does not exist in either table.'
      });
    }

    console.log('Found specific user:', {
      id: specificUser.id,
      email: specificUser.email,
      metadata: specificUser.user_metadata,
      raw_metadata: JSON.stringify(specificUser.user_metadata, null, 2)
    });

    // Test our name extraction logic
    let fullName = null;
    
    // Try different metadata fields
    if (specificUser.user_metadata?.full_name) {
      fullName = specificUser.user_metadata.full_name;
      console.log('Found name from full_name:', fullName);
    } else if (specificUser.user_metadata?.name) {
      fullName = specificUser.user_metadata.name;
      console.log('Found name from name:', fullName);
    } else if (specificUser.user_metadata?.display_name) {
      fullName = specificUser.user_metadata.display_name;
      console.log('Found name from display_name:', fullName);
    } else if (specificUser.user_metadata?.first_name && specificUser.user_metadata?.last_name) {
      fullName = `${specificUser.user_metadata.first_name} ${specificUser.user_metadata.last_name}`;
      console.log('Found name from first_name + last_name:', fullName);
    } else if (specificUser.user_metadata?.first_name) {
      fullName = specificUser.user_metadata.first_name;
      console.log('Found name from first_name:', fullName);
    } else if (specificUser.user_metadata?.last_name) {
      fullName = specificUser.user_metadata.last_name;
      console.log('Found name from last_name:', fullName);
    }
    
    // If no name found in metadata, try to extract from email
    if (!fullName && specificUser.email) {
      const emailName = specificUser.email.split('@')[0];
      console.log('Email name part:', emailName);
      // If email name looks like a real name (not just random characters)
      if (emailName.length > 2 && /^[a-zA-Z]/.test(emailName)) {
        fullName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        console.log('Extracted name from email:', fullName);
      }
    }
    
    // Final fallback
    if (!fullName) {
      fullName = specificUser.email;
      console.log('Using email as fallback name:', fullName);
    }

    // Test the cached API endpoint
    let cachedApiResult = null;
    try {
      const cachedResponse = await fetch(`${request.nextUrl.origin}/api/fetch-user-emails-cached`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: [specificUserId] }),
      });
      
      if (cachedResponse.ok) {
        cachedApiResult = await cachedResponse.json();
        console.log('Cached API result for specific user:', cachedApiResult);
      } else {
        console.error('Cached API failed:', cachedResponse.status);
      }
    } catch (cachedError) {
      console.error('Cached API error:', cachedError);
    }

    // Test the original API endpoint
    let originalApiResult = null;
    try {
      const originalResponse = await fetch(`${request.nextUrl.origin}/api/fetch-user-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: [specificUserId] }),
      });
      
      if (originalResponse.ok) {
        originalApiResult = await originalResponse.json();
        console.log('Original API result for specific user:', originalApiResult);
      } else {
        console.error('Original API failed:', originalResponse.status);
      }
    } catch (originalError) {
      console.error('Original API error:', originalError);
    }

    return NextResponse.json({ 
      success: true,
      userId: specificUserId,
      userFound: true,
      userData: {
        id: specificUser.id,
        email: specificUser.email,
        metadata: specificUser.user_metadata,
        extractedName: fullName
      },
      cachedApiResult,
      originalApiResult,
      message: `Analysis complete for user ${specificUserId}`
    });

  } catch (error) {
    console.error('Error in test-specific-user API:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
