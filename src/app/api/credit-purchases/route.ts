import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching credit purchases...');
    
    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('Supabase Admin client not available');
      return NextResponse.json({
        success: false,
        message: 'Server configuration error: Admin client not available'
      }, { status: 500 });
    }

    // Fetch credit purchases using admin client (bypasses RLS)
    // Only fetch completed purchases
    const { data: purchasesData, error: purchasesError } = await supabaseAdmin
      .from('credit_purchases')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (purchasesError) {
      console.error('Error fetching credit purchases:', purchasesError);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch credit purchases',
        error: purchasesError.message
      }, { status: 500 });
    }

    if (!purchasesData || purchasesData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0
      });
    }

    // Get user IDs to fetch emails and names
    const userIds = purchasesData.map(p => p.user_id);
    const userIdToEmail = new Map<string, string>();
    const userIdToName = new Map<string, string>();

    // Fetch user emails and names from auth.users with pagination
    // This uses the exact same logic as /api/fetch-user-emails to match web version exactly
    // The web version's useCreditPurchases hook only calls /api/fetch-user-emails,
    // which doesn't check user_profiles - it only checks auth.users metadata
    try {
      let allAuthUsers = [];
      let page = 1;
      const perPage = 1000;
      
      while (true) {
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
          page: page,
          perPage: perPage
        });

        if (authError) {
          console.error('Error fetching auth users:', authError);
          break;
        }

        if (!authUsers?.users || authUsers.users.length === 0) {
          break;
        }
        
        allAuthUsers = allAuthUsers.concat(authUsers.users);
        
        if (authUsers.users.length < perPage) {
          break;
        }
        
        page++;
      }

      // Process auth users to get emails and names (if not already set from user_profiles)
      // This matches the exact logic from /api/fetch-user-emails
      allAuthUsers.forEach((user) => {
        if (userIds.includes(user.id)) {
          // Set email
          if (user.email) {
            userIdToEmail.set(user.id, user.email);
          }

          // Set name using the exact same logic as /api/fetch-user-emails
          if (user.email) {
            let fullName: string | null = null;
            
            // Try different metadata fields (exact same order as fetch-user-emails)
            if (user.display_name) {
              fullName = user.display_name;
            } else if (user.user_metadata?.full_name) {
              fullName = user.user_metadata.full_name;
            } else if (user.user_metadata?.name) {
              fullName = user.user_metadata.name;
            } else if (user.user_metadata?.display_name) {
              fullName = user.user_metadata.display_name;
            } else if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
              fullName = `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
            } else if (user.user_metadata?.first_name) {
              fullName = user.user_metadata.first_name;
            } else if (user.user_metadata?.last_name) {
              fullName = user.user_metadata.last_name;
            } else if (user.user_metadata?.given_name) {
              fullName = user.user_metadata.given_name;
            } else if (user.user_metadata?.family_name) {
              fullName = user.user_metadata.family_name;
            } else if (user.user_metadata?.given_name && user.user_metadata?.family_name) {
              fullName = `${user.user_metadata.given_name} ${user.user_metadata.family_name}`;
            } else if (user.user_metadata?.preferred_username) {
              fullName = user.user_metadata.preferred_username;
            } else if (user.user_metadata?.nickname) {
              fullName = user.user_metadata.nickname;
            }
            
            // If no name found in metadata, try to extract from email
            if (!fullName && user.email) {
              const emailName = user.email.split('@')[0];
              if (emailName.length > 2 && /^[a-zA-Z]/.test(emailName)) {
                fullName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
              }
            }
            
            // Final fallback to email
            if (!fullName) {
              fullName = user.email;
            }
            
            if (fullName) {
              userIdToName.set(user.id, fullName);
            }
          }
        }
      });
      
      console.log(`API: Mapped ${userIdToEmail.size} emails and ${userIdToName.size} names from auth.users`);
    } catch (err) {
      console.warn('Failed to fetch user emails for credit purchases:', err);
    }

    // Log the maps for debugging
    console.log(`API: Mapped ${userIdToEmail.size} emails and ${userIdToName.size} names`);
    console.log('Sample userIds from purchases:', userIds.slice(0, 5));
    console.log('Sample email map:', Array.from(userIdToEmail.entries()).slice(0, 3));
    console.log('Sample name map:', Array.from(userIdToName.entries()).slice(0, 3));

    // Transform the data
    const transformedPurchases = purchasesData.map((purchase: any) => {
      const email = userIdToEmail.get(purchase.user_id) || 'Email not available';
      const name = userIdToName.get(purchase.user_id) || 'Unknown User';
      
      // Log if we're missing data for debugging
      if (email === 'Email not available' || name === 'Unknown User') {
        console.log(`Missing data for user_id: ${purchase.user_id}, email: ${email}, name: ${name}`);
      }
      
      return {
        id: purchase.id,
        userId: purchase.user_id,
        amountDollars: parseFloat(purchase.amount_dollars) || 0,
        stripePaymentIntentId: purchase.stripe_payment_intent_id,
        stripeChargeId: purchase.stripe_charge_id,
        status: purchase.status,
        description: purchase.description,
        metadata: purchase.metadata || {},
        createdAt: purchase.created_at,
        completedAt: purchase.completed_at,
        expiresAt: purchase.expires_at,
        userEmail: email,
        userName: name,
      };
    });

    console.log(`API: Returning ${transformedPurchases.length} transformed purchases`);

    return NextResponse.json({
      success: true,
      data: transformedPurchases,
      count: transformedPurchases.length
    });
  } catch (error) {
    console.error('Error in credit purchases fetch API:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

