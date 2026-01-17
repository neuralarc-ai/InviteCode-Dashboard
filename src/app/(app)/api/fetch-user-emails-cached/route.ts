import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Simple in-memory cache (in production, use Redis or similar)
const userCache = new Map<string, {id: string, email: string, full_name: string, cached_at: number}>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const { userIds, clearCache } = await request.json();
    
    // Handle cache clearing
    if (clearCache) {
      userCache.clear();
      console.log('Cache cleared');
      return NextResponse.json({ success: true, message: 'Cache cleared' });
    }
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ success: false, message: 'userIds array is required' }, { status: 400 });
    }

    console.log('Fetching user data for IDs:', userIds.length, 'users');

    const userData: Array<{id: string, email: string, full_name: string}> = [];
    const uncachedUserIds: string[] = [];

    // Check cache first
    const now = Date.now();
    for (const userId of userIds) {
      const cached = userCache.get(userId);
      if (cached && (now - cached.cached_at) < CACHE_DURATION) {
        userData.push({
          id: cached.id,
          email: cached.email,
          full_name: cached.full_name
        });
      } else {
        uncachedUserIds.push(userId);
      }
    }

    console.log('Cached users:', userData.length, 'Uncached users:', uncachedUserIds.length);

    // Fetch uncached users from database
    if (uncachedUserIds.length > 0) {
      // Fetch all users with pagination to handle large user lists
      let allAuthUsers = [];
      let page = 1;
      const perPage = 1000; // Supabase default is 1000
      
      while (true) {
        console.log(`Fetching auth users page ${page}...`);
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
          page: page,
          perPage: perPage
        });
        
        if (authError) {
          console.error('Error fetching users from auth:', authError);
          return NextResponse.json({ 
            success: false, 
            message: 'Failed to fetch user data',
            error: authError.message 
          }, { status: 500 });
        }
        
        if (!authUsers?.users || authUsers.users.length === 0) {
          console.log(`No more users found on page ${page}`);
          break;
        }
        
        allAuthUsers = allAuthUsers.concat(authUsers.users);
        console.log(`Fetched ${authUsers.users.length} users on page ${page}, total so far: ${allAuthUsers.length}`);
        
        // If we got fewer users than perPage, we've reached the end
        if (authUsers.users.length < perPage) {
          console.log('Reached end of users list');
          break;
        }
        
        page++;
      }
      
      console.log(`Total auth users fetched: ${allAuthUsers.length}`);

      if (allAuthUsers.length > 0) {
        console.log('Processing auth users:', allAuthUsers.length);
        console.log('Looking for uncached user IDs:', uncachedUserIds);
        
        // Create a map of found users
        const foundUserIds = new Set<string>();
        
        allAuthUsers.forEach(user => {
          console.log(`Processing user ${user.id}:`, {
            email: user.email,
            metadata: user.user_metadata,
            isInUncachedList: uncachedUserIds.includes(user.id)
          });
          
          if (user.email && uncachedUserIds.includes(user.id)) {
            foundUserIds.add(user.id);
            
            // Try multiple sources for the user's name
            let fullName = null;
            
            // Log all metadata fields for debugging
            console.log(`All metadata fields for user ${user.id}:`, Object.keys(user.user_metadata || {}));
            console.log(`Full metadata for user ${user.id}:`, JSON.stringify(user.user_metadata, null, 2));
            
            // Try different metadata fields (expanded list)
            // Check if user has a display_name property directly (not in metadata)
            if (user.display_name) {
              fullName = user.display_name;
              console.log(`Found name from user.display_name: ${fullName}`);
            } else if (user.user_metadata?.full_name) {
              fullName = user.user_metadata.full_name;
              console.log(`Found name from full_name: ${fullName}`);
            } else if (user.user_metadata?.name) {
              fullName = user.user_metadata.name;
              console.log(`Found name from name: ${fullName}`);
            } else if (user.user_metadata?.display_name) {
              fullName = user.user_metadata.display_name;
              console.log(`Found name from display_name: ${fullName}`);
            } else if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
              fullName = `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
              console.log(`Found name from first_name + last_name: ${fullName}`);
            } else if (user.user_metadata?.first_name) {
              fullName = user.user_metadata.first_name;
              console.log(`Found name from first_name: ${fullName}`);
            } else if (user.user_metadata?.last_name) {
              fullName = user.user_metadata.last_name;
              console.log(`Found name from last_name: ${fullName}`);
            } else if (user.user_metadata?.given_name) {
              fullName = user.user_metadata.given_name;
              console.log(`Found name from given_name: ${fullName}`);
            } else if (user.user_metadata?.family_name) {
              fullName = user.user_metadata.family_name;
              console.log(`Found name from family_name: ${fullName}`);
            } else if (user.user_metadata?.given_name && user.user_metadata?.family_name) {
              fullName = `${user.user_metadata.given_name} ${user.user_metadata.family_name}`;
              console.log(`Found name from given_name + family_name: ${fullName}`);
            } else if (user.user_metadata?.preferred_username) {
              fullName = user.user_metadata.preferred_username;
              console.log(`Found name from preferred_username: ${fullName}`);
            } else if (user.user_metadata?.nickname) {
              fullName = user.user_metadata.nickname;
              console.log(`Found name from nickname: ${fullName}`);
            }
            
            // If no name found in metadata, try to extract from email
            if (!fullName && user.email) {
              const emailName = user.email.split('@')[0];
              // If email name looks like a real name (not just random characters)
              if (emailName.length > 2 && /^[a-zA-Z]/.test(emailName)) {
                fullName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
              }
            }
            
            // Final fallback
            if (!fullName) {
              fullName = user.email;
            }
            
            const userInfo = {
              id: user.id,
              email: user.email,
              full_name: fullName
            };
            
            console.log('Adding user to data:', userInfo);
            userData.push(userInfo);
            
            // Cache the user data
            userCache.set(user.id, {
              ...userInfo,
              cached_at: now
            });
          }
        });
        
        // Check for missing users
        const missingUserIds = uncachedUserIds.filter(id => !foundUserIds.has(id));
        if (missingUserIds.length > 0) {
          console.log('Users not found in auth table:', missingUserIds);
          console.log('These users exist in usage_logs but were deleted from auth.users');
          
          // Add placeholder entries for missing users
          missingUserIds.forEach(userId => {
            const placeholderUser = {
              id: userId,
              email: `user-${userId.slice(0, 8)}@unknown.com`,
              full_name: `User ${userId.slice(0, 8)} (Deleted)`
            };
            userData.push(placeholderUser);
            
            // Cache the placeholder
            userCache.set(userId, {
              ...placeholderUser,
              cached_at: now
            });
          });
        }
      }
    }

    console.log('Total user data returned:', userData.length);
    return NextResponse.json(userData);

  } catch (error) {
    console.error('Error in fetch-user-emails-cached API:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
