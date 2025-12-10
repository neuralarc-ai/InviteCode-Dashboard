import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching credit balances...');
    
    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('Supabase Admin client not available');
      return NextResponse.json({
        success: false,
        message: 'Server configuration error: Admin client not available'
      }, { status: 500 });
    }

    // Fetch credit balances using admin client (bypasses RLS)
    let balancesData: any[] = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;
    let balancesError = null;

    try {
      while (hasMore) {
        console.log(`API: Fetching credit balances range ${from}-${from + limit - 1}...`);
        const { data, error } = await supabaseAdmin
          .from('credit_balance')
          .select('*')
          .range(from, from + limit - 1);

        if (error) {
          balancesError = error;
          break;
        }

        if (data && data.length > 0) {
          balancesData = [...balancesData, ...data];
          if (data.length < limit) {
            hasMore = false;
          } else {
            from += limit;
          }
        } else {
          hasMore = false;
        }
      }
    } catch (err: any) {
      console.error('Unexpected error fetching credit balances:', err);
      balancesError = { message: err.message } as any;
    }

    if (balancesError) {
      console.error('Error fetching credit balances:', balancesError);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch credit balances',
        error: balancesError.message
      }, { status: 500 });
    }

    if (!balancesData || balancesData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0
      });
    }

    // Fetch most recent purchase dates for each user
    const userIds = balancesData.map(b => b.user_id);
    const userIdToLatestPurchase = new Map<string, Date>();

    try {
      const { data: purchasesData, error: purchasesError } = await supabaseAdmin
        .from('credit_purchases')
        .select('user_id, completed_at, created_at')
        .eq('status', 'completed')
        .in('user_id', userIds)
        .order('completed_at', { ascending: false, nullsFirst: false });

      if (!purchasesError && purchasesData) {
        purchasesData.forEach(purchase => {
          const purchaseDate = purchase.completed_at 
            ? new Date(purchase.completed_at) 
            : new Date(purchase.created_at);
          
          const userId = purchase.user_id;
          const existingDate = userIdToLatestPurchase.get(userId);
          
          // Keep the most recent purchase date
          if (!existingDate || purchaseDate > existingDate) {
            userIdToLatestPurchase.set(userId, purchaseDate);
          }
        });
        console.log(`Mapped ${userIdToLatestPurchase.size} most recent purchase dates`);
      }
    } catch (err) {
      console.warn('Failed to fetch purchase dates:', err);
    }

    // Sort balances by most recent purchase date (then by last_updated as fallback)
    const data = balancesData.sort((a, b) => {
      const aPurchaseDate = userIdToLatestPurchase.get(a.user_id);
      const bPurchaseDate = userIdToLatestPurchase.get(b.user_id);
      
      // If both have purchase dates, sort by purchase date (most recent first)
      if (aPurchaseDate && bPurchaseDate) {
        return bPurchaseDate.getTime() - aPurchaseDate.getTime();
      }
      
      // If only one has a purchase date, prioritize it
      if (aPurchaseDate && !bPurchaseDate) {
        return -1;
      }
      if (!aPurchaseDate && bPurchaseDate) {
        return 1;
      }
      
      // If neither has purchase date, sort by last_updated (most recent first)
      const aLastUpdated = a.last_updated ? new Date(a.last_updated).getTime() : 0;
      const bLastUpdated = b.last_updated ? new Date(b.last_updated).getTime() : 0;
      return bLastUpdated - aLastUpdated;
    });

    console.log(`API: Fetched ${data?.length || 0} credit balances, sorted by most recent purchase`);

    // Transform the data to match the frontend format
    const transformedData = data?.map((row: any) => ({
      userId: row.user_id,
      balanceDollars: parseFloat(row.balance_dollars) || 0,
      totalPurchased: parseFloat(row.total_purchased) || 0,
      totalUsed: parseFloat(row.total_used) || 0,
      lastUpdated: row.last_updated ? new Date(row.last_updated).toISOString() : new Date().toISOString(),
      metadata: row.metadata || {}
    })) || [];

    // Reuse userIds from earlier (already fetched for purchase dates)
    // userIds is already defined above for fetching purchase dates
    const userIdToEmail = new Map<string, string>();
    const userIdToName = new Map<string, string>();

    if (userIds.length > 0) {
      // Step 1: Fetch user emails from auth.users
      try {
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (authError) {
          console.warn('Error fetching auth users:', authError);
        } else if (authUsers?.users) {
          authUsers.users.forEach(user => {
            if (user.email && userIds.includes(user.id)) {
              userIdToEmail.set(user.id, user.email);
              // Try to get name from auth metadata as fallback
              const authName = 
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.user_metadata?.display_name ||
                (user.user_metadata?.first_name && user.user_metadata?.last_name
                  ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                  : user.user_metadata?.first_name || user.user_metadata?.last_name);
              if (authName) {
                userIdToName.set(user.id, authName);
              }
            }
          });
          console.log(`Mapped ${userIdToEmail.size} user emails from auth.users`);
        }
      } catch (err) {
        console.warn('Failed to fetch user emails from auth.users:', err);
      }

      // Step 2: Fetch user names from user_profiles table (highest priority)
      try {
        const { data: profilesData, error: profilesError } = await supabaseAdmin
          .from('user_profiles')
          .select('user_id, full_name, preferred_name')
          .in('user_id', userIds);

        if (profilesError) {
          console.warn('Error fetching user profiles:', profilesError);
        } else if (profilesData) {
          profilesData.forEach((profile) => {
            const displayName = profile.preferred_name || profile.full_name;
            if (displayName) {
              userIdToName.set(profile.user_id, displayName);
            }
          });
          console.log(`Mapped ${profilesData.length} user names from user_profiles`);
        }
      } catch (err) {
        console.warn('Failed to fetch user profiles:', err);
      }

      // Step 3: Fallback to waitlist table for names (if email matches)
      if (userIdToName.size < userIds.length && userIdToEmail.size > 0) {
        try {
          const emails = Array.from(userIdToEmail.values());
          const { data: waitlistData, error: waitlistError } = await supabaseAdmin
            .from('waitlist')
            .select('email, full_name')
            .in('email', emails);

          if (waitlistError) {
            console.warn('Error fetching waitlist names:', waitlistError);
          } else if (waitlistData) {
            // Create email to name mapping
            const emailToName = new Map<string, string>();
            waitlistData.forEach((user) => {
              if (user.full_name) {
                emailToName.set(user.email, user.full_name);
              }
            });

            // Map names back to user IDs
            userIdToEmail.forEach((email, userId) => {
              const name = emailToName.get(email);
              if (name && !userIdToName.has(userId)) {
                userIdToName.set(userId, name);
              }
            });
            console.log(`Mapped ${emailToName.size} user names from waitlist`);
          }
        } catch (err) {
          console.warn('Failed to fetch waitlist names:', err);
        }
      }
    }

    // Add user email and name to each balance
    // Priority for name: user_profiles > auth metadata > waitlist > email username > User ID
    const balancesWithUsers = transformedData.map(balance => {
      const email = userIdToEmail.get(balance.userId) || 'Email not available';
      let userName = userIdToName.get(balance.userId);
      
      // If no name found, try to extract from email
      if (!userName && email !== 'Email not available') {
        const emailName = email.split('@')[0];
        // If email name looks reasonable (not too short, starts with letter)
        if (emailName.length > 2 && /^[a-zA-Z]/.test(emailName)) {
          userName = emailName.charAt(0).toUpperCase() + emailName.slice(1).replace(/[._-]/g, ' ');
        }
      }
      
      // Final fallback
      if (!userName) {
        userName = `User ${balance.userId.slice(0, 8)}`;
      }

      return {
        ...balance,
        userEmail: email,
        userName: userName
      };
    });

    return NextResponse.json({
      success: true,
      data: balancesWithUsers,
      count: balancesWithUsers.length
    });

  } catch (error) {
    console.error('Error in credit balances API:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

