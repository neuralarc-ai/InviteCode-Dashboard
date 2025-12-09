'use client';

import { useEffect, useState } from 'react';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import type { WaitlistUser, DashboardStats, InviteCode, UserProfile, CreditUsageGrouped, CreditPurchase, UsageLog, CreditBalance } from '@/lib/types';

export function useWaitlistUsers() {
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch function
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('waitlist')
        .select('*')
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const transformedUsers = data?.map((row: any) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        company: row.company,
        phoneNumber: row.phone_number,
        countryCode: row.country_code,
        reference: row.reference,
        referralSource: row.referral_source,
        referralSourceOther: row.referral_source_other,
        userAgent: row.user_agent,
        ipAddress: row.ip_address,
        joinedAt: new Date(row.joined_at),
        notifiedAt: row.notified_at ? new Date(row.notified_at) : null,
        isNotified: row.is_notified,
        isArchived: row.is_archived || false,
      })) || [];

      setUsers(transformedUsers);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const refreshUsers = async () => {
    setLoading(true);
    await fetchUsers();
  };

  useEffect(() => {
    fetchUsers();

    // Set up real-time subscription
    const subscription = supabase
      .channel('waitlist_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waitlist',
        },
        (payload) => {
          console.log('Real-time update:', payload);
          fetchUsers(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { users, loading, error, refreshUsers };
}

export function useInviteCodes() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [sortedCodes, setSortedCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof InviteCode>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Initial fetch function
  const fetchCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedCodes = data?.map((row: any) => ({
        id: row.id,
        code: row.code,
        isUsed: row.is_used,
        usedBy: row.used_by,
        usedAt: row.used_at ? new Date(row.used_at) : null,
        createdAt: new Date(row.created_at),
        expiresAt: row.expires_at ? new Date(row.expires_at) : null,
        maxUses: row.max_uses,
        currentUses: row.current_uses,
        emailSentTo: row.email_sent_to || [],
        reminderSentAt: row.reminder_sent_at ? new Date(row.reminder_sent_at) : null,
        isArchived: row.is_archived || false,
      })) || [];

      setCodes(transformedCodes);
      setError(null);
    } catch (err) {
      console.error('Error fetching invite codes:', err);
      setError('Failed to fetch invite codes');
    } finally {
      setLoading(false);
    }
  };

  // Sort codes whenever codes or sort settings change
  useEffect(() => {
    const sorted = [...codes].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      // Handle null/undefined values
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      // Handle different data types
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDirection === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        return sortDirection === 'asc' ? (aVal === bVal ? 0 : aVal ? 1 : -1) : (aVal === bVal ? 0 : aVal ? -1 : 1);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Fallback to string comparison
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    
    setSortedCodes(sorted);
  }, [codes, sortField, sortDirection]);

  // Manual refresh function
  const refreshCodes = async () => {
    setLoading(true);
    await fetchCodes();
  };

  // Handle sort
  const handleSort = (field: keyof InviteCode) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Cleanup expired codes function
  const cleanupExpiredCodes = async () => {
    try {
      console.log('Cleaning up expired invite codes...');
      const response = await fetch('/api/cleanup-expired-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.deletedCount > 0) {
          console.log(`🧹 Cleaned up ${result.deletedCount} expired invite codes:`, result.deletedCodes);
          // Refresh the codes list after cleanup
          fetchCodes();
        }
      }
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
    }
  };

  useEffect(() => {
    fetchCodes();

    // Set up real-time subscription
    const subscription = supabase
      .channel('invite_codes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invite_codes',
        },
        (payload) => {
          console.log('Real-time invite codes update:', payload);
          fetchCodes(); // Refetch on any change
        }
      )
      .subscribe();

    // Set up periodic cleanup of expired codes (every 5 minutes)
    const cleanupInterval = setInterval(cleanupExpiredCodes, 5 * 60 * 1000);

    // Run cleanup once on mount
    cleanupExpiredCodes();

    return () => {
      subscription.unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, []);

  return { 
    codes: sortedCodes, 
    loading, 
    error, 
    refreshCodes,
    sortField,
    sortDirection,
    handleSort
  };
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCodes: 0,
    usageRate: 0,
    activeCodes: 0,
    emailsSent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total codes count
        const { count: totalCodes, error: codesError } = await supabase
          .from('invite_codes')
          .select('*', { count: 'exact', head: true });

        if (codesError) throw codesError;

        // Get used codes count
        const { count: usedCodes, error: usedError } = await supabase
          .from('invite_codes')
          .select('*', { count: 'exact', head: true })
          .eq('is_used', true);

        if (usedError) throw usedError;

        // Get active codes count (not used and not expired)
        const { count: activeCodes, error: activeError } = await supabase
          .from('invite_codes')
          .select('*', { count: 'exact', head: true })
          .eq('is_used', false)
          .or('expires_at.is.null,expires_at.gt.now()');

        if (activeError) throw activeError;

        // Get emails sent count
        const { count: emailsSent, error: emailsError } = await supabase
          .from('waitlist')
          .select('*', { count: 'exact', head: true })
          .eq('is_notified', true);

        if (emailsError) throw emailsError;

        const total = totalCodes || 0;
        const used = usedCodes || 0;
        const usageRate = total > 0 ? Math.round((used / total) * 100 * 10) / 10 : 0;

        setStats({
          totalCodes: total,
          usageRate,
          activeCodes: activeCodes || 0,
          emailsSent: emailsSent || 0,
        });
        setError(null);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to fetch statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Set up real-time subscriptions for both tables
    const inviteCodesSubscription = supabase
      .channel('invite_codes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invite_codes',
        },
        () => {
          fetchStats(); // Refetch on any change
        }
      )
      .subscribe();

    const waitlistSubscription = supabase
      .channel('waitlist_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waitlist',
        },
        () => {
          fetchStats(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      inviteCodesSubscription.unsubscribe();
      waitlistSubscription.unsubscribe();
    };
  }, []);

  return { stats, loading, error };
}


export function useUserProfiles() {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableName, setTableName] = useState<string | null>(null);

  // Initial fetch function
  const fetchUserProfiles = async () => {
    try {
      console.log('Fetching user profiles...');
      
      // First, get user profiles - try both possible table names
      let profilesData = null;
      let profilesError = null;
      let detectedTableName = 'user_profiles';
      
      // Try user_profiles first
      const result1 = await supabase
        .from('user_profiles')
        // Select all columns so we can include country fields regardless of exact column name
        .select('*')
        .order('created_at', { ascending: false });
      
      if (result1.error && result1.error.message.includes('relation "public.user_profiles" does not exist')) {
        console.log('user_profiles table not found, trying user_profile...');
        // Try user_profile (singular)
        const result2 = await supabase
          .from('user_profile')
          // Select all columns so we can include country fields regardless of exact column name
          .select('*')
          .order('created_at', { ascending: false });
        
        profilesData = result2.data;
        profilesError = result2.error;
        detectedTableName = 'user_profile';
      } else {
        profilesData = result1.data;
        profilesError = result1.error;
      }

      console.log('Profiles query result:', { profilesData, profilesError, detectedTableName });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        const errorMessage =
          (profilesError as any)?.message ||
          (profilesError as any)?.details ||
          (profilesError as any)?.hint ||
          JSON.stringify(profilesError);

        // Don't throw if table doesn't exist - just set empty array
        if ((profilesError as any)?.message?.includes('does not exist')) {
          console.log('User profiles table does not exist, returning empty array');
          setUserProfiles([]);
          setError(null);
          setLoading(false);
          setTableName(null);
          return;
        }

        // Gracefully handle unknown/empty error objects
        setUserProfiles([]);
        setError(`Failed to fetch user profiles: ${errorMessage || 'Unknown error'}`);
        setLoading(false);
        setTableName(null);
        return;
      }

      // Store the detected table name for use in subscriptions
      setTableName(detectedTableName);

      if (!profilesData || profilesData.length === 0) {
        console.log('No user profiles found in database');
        setUserProfiles([]);
        setError(null);
        setLoading(false);
        return;
      }

      console.log(`Found ${profilesData.length} user profiles`);

      // Get user IDs to fetch emails from auth.users
      const userIds = profilesData.map(profile => profile.user_id);
      
      // Create a map of user_id to email
      const userIdToEmail = new Map<string, string>();
      
      // Try to fetch emails using a server-side API route
      try {
        const response = await fetch('/api/fetch-user-emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userIds }),
        });

        if (response.ok) {
          const userData = await response.json();
          userData.forEach((user: any) => {
            userIdToEmail.set(user.id, user.email);
          });
          console.log(`Mapped ${userIdToEmail.size} emails via API`);
        } else {
          console.warn('Failed to fetch emails via API:', response.status);
          
          // Fallback: try admin client if available
          if (supabaseAdmin) {
            try {
              const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
              
              if (authError) {
                console.warn('Could not fetch emails from auth.users:', authError);
              } else if (authUsers?.users) {
                authUsers.users.forEach(user => {
                  if (user.email) {
                    userIdToEmail.set(user.id, user.email);
                  }
                });
                console.log(`Mapped ${userIdToEmail.size} emails from auth.users`);
              }
            } catch (authErr) {
              console.warn('Failed to fetch auth users:', authErr);
            }
          } else {
            console.warn('Supabase admin client not available');
          }
        }
      } catch (err) {
        console.warn('Failed to fetch emails:', err);
      }

      const transformedProfiles = profilesData.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        fullName: row.full_name,
        preferredName: row.preferred_name,
        workDescription: row.work_description,
        personalReferences: row.personal_references,
        countryName: row.country_name || row.country || row.metadata?.countryName || row.metadata?.country || null,
        countryCode: row.country_code || row.countryCode || row.metadata?.countryCode || null,
        regionName: row.region || row.state || row.region_name || row.metadata?.region || row.metadata?.state || null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        avatarUrl: row.avatar_url,
        referralSource: row.referral_source,
        consentGiven: row.consent_given,
        consentDate: row.consent_date ? new Date(row.consent_date) : null,
        email: userIdToEmail.get(row.user_id) || 'Email not available',
        metadata: row.metadata || null, // Will be null if column doesn't exist
        planType: row.plan_type || 'seed', // Default to 'seed' if not present
        accountType: row.account_type || 'individual', // Default to 'individual' if not present
      }));

      console.log('Transformed profiles:', transformedProfiles);
      setUserProfiles(transformedProfiles);
      setError(null);
    } catch (err) {
      console.error('Error fetching user profiles:', err);
      setError(`Failed to fetch user profiles: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const refreshUserProfiles = async () => {
    setLoading(true);
    await fetchUserProfiles();
  };

  // Delete a single user profile
  const deleteUserProfile = async (profileId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`/api/delete-user-profile?profileId=${profileId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      // If profile was deleted successfully, treat as success even if auth deletion failed
      // The API returns success: true if profile was deleted, even if auth deletion failed
      if (result.success) {
        // Refresh the list after deletion
        await fetchUserProfiles();
        return { success: true, message: result.message || 'User profile deleted successfully' };
      }

      // Only throw error if profile deletion actually failed
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete user profile');
      }

      // If we get here, something unexpected happened
      throw new Error(result.message || 'Failed to delete user profile');
    } catch (err) {
      console.error('Error deleting user profile:', err);
      return { 
        success: false, 
        message: err instanceof Error ? err.message : 'Failed to delete user profile' 
      };
    }
  };

  // Bulk delete user profiles
  const bulkDeleteUserProfiles = async (profileIds: string[]): Promise<{ success: boolean; message: string; deletedCount?: number }> => {
    try {
      if (!profileIds || profileIds.length === 0) {
        return { success: false, message: 'No profiles selected for deletion' };
      }

      const response = await fetch('/api/bulk-delete-user-profiles', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profileIds }),
      });

      const result = await response.json();

      // Refresh the list after deletion (even if there were partial errors)
      await fetchUserProfiles();

      // If there were auth errors but some users were deleted, return partial success
      if (result.deletedCount > 0 && result.authDeleteErrors && result.authDeleteErrors.length > 0) {
        return {
          success: false, // Mark as failed because not all deletions succeeded
          message: result.message || 'Some users were deleted, but some failed',
          deletedCount: result.deletedCount,
          authDeleteErrors: result.authDeleteErrors,
          failedUserIds: result.failedUserIds
        };
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete user profiles');
      }

      return { 
        success: true, 
        message: result.message || 'User profiles deleted successfully',
        deletedCount: result.deletedCount 
      };
    } catch (err) {
      console.error('Error bulk deleting user profiles:', err);
      return { 
        success: false, 
        message: err instanceof Error ? err.message : 'Failed to delete user profiles' 
      };
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUserProfiles();
  }, []);

  // Set up real-time subscription when table name is detected
  useEffect(() => {
    if (!tableName) {
      return;
    }

    const subscription = supabase
      .channel(`user_profiles_changes_${tableName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
        },
        (payload) => {
          console.log('Real-time user profiles update:', payload);
          fetchUserProfiles(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [tableName]);

  return { userProfiles, loading, error, refreshUserProfiles, deleteUserProfile, bulkDeleteUserProfiles };
}

export function useCreditUsage() {
  const [creditUsage, setCreditUsage] = useState<CreditUsageGrouped[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch function
  const fetchCreditUsage = async () => {
    try {
      console.log('Fetching credit usage...');
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('Supabase Key (first 10 chars):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10));
      
      const { data, error, count } = await supabase
        .from('credit_usage')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      console.log('Raw query result:', { data, error, count });
      console.log('Data length:', data?.length);
      console.log('Error details:', error);

      if (error) {
        console.error('Error fetching credit usage:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('No credit usage found in database');
        setCreditUsage([]);
        setError(null);
        setLoading(false);
        return;
      }

      console.log(`Found ${data.length} credit usage records`);

      // Get user IDs to fetch emails and names
      const userIds = data.map(usage => usage.user_id);
      
      // Create maps for user data
      const userIdToEmail = new Map<string, string>();
      const userIdToName = new Map<string, string>();
      
      // Try to fetch emails using a server-side API route
      try {
        const response = await fetch('/api/fetch-user-emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userIds }),
        });

        if (response.ok) {
          const userData = await response.json();
          userData.forEach((user: any) => {
            userIdToEmail.set(user.id, user.email);
          });
          console.log(`Mapped ${userIdToEmail.size} emails via API`);
        } else {
          console.warn('Failed to fetch emails via API:', response.status);
        }
      } catch (err) {
        console.warn('Failed to fetch emails:', err);
      }

      // Fetch user names from user_profiles table
      try {
        const { data: profilesData, error: profilesError } = await supabase
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
          console.log(`Mapped ${userIdToName.size} user names from profiles`);
        }
      } catch (err) {
        console.warn('Failed to fetch user profiles:', err);
      }

      // Fallback: Try to get names from waitlist table using emails
      if (userIdToName.size === 0 && userIdToEmail.size > 0) {
        try {
          const emails = Array.from(userIdToEmail.values());
          const { data: waitlistData, error: waitlistError } = await supabase
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
              if (name) {
                userIdToName.set(userId, name);
              }
            });
            console.log(`Mapped ${userIdToName.size} user names from waitlist`);
          }
        } catch (err) {
          console.warn('Failed to fetch waitlist names:', err);
        }
      }

      // Final fallback: Try to get names from auth.users metadata if available
      if (userIdToName.size === 0 && supabaseAdmin) {
        try {
          const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
          
          if (authError) {
            console.warn('Could not fetch auth users for names:', authError);
          } else if (authUsers?.users) {
            authUsers.users.forEach(user => {
              if (user.user_metadata?.full_name || user.user_metadata?.name) {
                const name = user.user_metadata.full_name || user.user_metadata.name;
                userIdToName.set(user.id, name);
              }
            });
            console.log(`Mapped ${userIdToName.size} user names from auth metadata`);
          }
        } catch (authErr) {
          console.warn('Failed to fetch auth users for names:', authErr);
        }
      }

      const transformedUsage = data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        amountDollars: parseFloat(row.amount_dollars),
        threadId: row.thread_id,
        messageId: row.message_id,
        description: row.description,
        usageType: row.usage_type,
        createdAt: new Date(row.created_at),
        subscriptionTier: row.subscription_tier,
        metadata: row.metadata || {},
        userEmail: userIdToEmail.get(row.user_id) || 'Email not available',
        userName: userIdToName.get(row.user_id) || `User ${row.user_id.slice(0, 8)}`,
      }));

      // Group by user ID and combine totals
      const groupedUsage = transformedUsage.reduce((acc: Record<string, CreditUsageGrouped>, usage) => {
        const userId = usage.userId;
        
        if (!acc[userId]) {
          acc[userId] = {
            userId: userId,
            totalAmountDollars: 0,
            recordCount: 0,
            usageTypes: [],
            descriptions: [],
            threadIds: [],
            messageIds: [],
            subscriptionTier: usage.subscriptionTier,
            earliestCreatedAt: usage.createdAt,
            latestCreatedAt: usage.createdAt,
            metadata: usage.metadata,
            userEmail: usage.userEmail,
            userName: usage.userName,
          };
        }
        
        // Add to totals
        acc[userId].totalAmountDollars += usage.amountDollars;
        acc[userId].recordCount += 1;
        
        // Add unique values to arrays
        if (usage.usageType && !acc[userId].usageTypes.includes(usage.usageType)) {
          acc[userId].usageTypes.push(usage.usageType);
        }
        if (usage.description && !acc[userId].descriptions.includes(usage.description)) {
          acc[userId].descriptions.push(usage.description);
        }
        if (usage.threadId && !acc[userId].threadIds.includes(usage.threadId)) {
          acc[userId].threadIds.push(usage.threadId);
        }
        if (usage.messageId && !acc[userId].messageIds.includes(usage.messageId)) {
          acc[userId].messageIds.push(usage.messageId);
        }
        
        // Update date ranges
        if (usage.createdAt < acc[userId].earliestCreatedAt) {
          acc[userId].earliestCreatedAt = usage.createdAt;
        }
        if (usage.createdAt > acc[userId].latestCreatedAt) {
          acc[userId].latestCreatedAt = usage.createdAt;
        }
        
        return acc;
      }, {});

      const groupedArray = Object.values(groupedUsage).sort((a, b) => b.totalAmountDollars - a.totalAmountDollars);

      console.log('Grouped credit usage:', groupedArray);
      setCreditUsage(groupedArray);
      setError(null);
    } catch (err) {
      console.error('Error fetching credit usage:', err);
      setError(`Failed to fetch credit usage: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const refreshCreditUsage = async () => {
    setLoading(true);
    await fetchCreditUsage();
  };

  useEffect(() => {
    fetchCreditUsage();

    // Set up real-time subscription
    const subscription = supabase
      .channel('credit_usage_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_usage',
        },
        (payload) => {
          console.log('Real-time credit usage update:', payload);
          fetchCreditUsage(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { creditUsage, loading, error, refreshCreditUsage };
}

export function useCreditPurchases() {
  const [creditPurchases, setCreditPurchases] = useState<CreditPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch function
  const fetchCreditPurchases = async () => {
    try {
      console.log('Fetching credit purchases (via API)...');
      
      const response = await fetch('/api/credit-purchases', { method: 'GET' });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `HTTP error ${response.status}`);
      }

      const data = payload.data;

      if (!data || data.length === 0) {
        console.log('No credit purchases found in database');
        setCreditPurchases([]);
        setError(null);
        setLoading(false);
        return;
      }

      console.log(`Found ${data.length} credit purchase records`);

      // Get user IDs to fetch emails and names
      const userIds = data.map(purchase => purchase.user_id);
      
      // Create maps for user data
      const userIdToEmail = new Map<string, string>();
      const userIdToName = new Map<string, string>();
      
      // Try to fetch emails using a server-side API route
      try {
        console.log('Making API call to fetch user emails for userIds:', userIds);
        const response = await fetch('/api/fetch-user-emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userIds }),
        });

        console.log('API response status:', response.status);
        console.log('API response ok:', response.ok);

        if (response.ok) {
          const userData = await response.json();
          console.log('User data received from API:', userData);
          userData.forEach((user: any) => {
            userIdToEmail.set(user.id, user.email);
            userIdToName.set(user.id, user.full_name || user.email);
          });
          console.log('User email map:', Object.fromEntries(userIdToEmail));
          console.log('User name map:', Object.fromEntries(userIdToName));
        } else {
          const errorText = await response.text();
          console.error('API call failed with status:', response.status, 'Error:', errorText);
        }
      } catch (err) {
        console.error('Failed to fetch user emails for credit purchases:', err);
      }

      const transformedPurchases = data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        amountDollars: parseFloat(row.amount_dollars),
        stripePaymentIntentId: row.stripe_payment_intent_id,
        stripeChargeId: row.stripe_charge_id,
        status: row.status,
        description: row.description,
        metadata: row.metadata || {},
        createdAt: new Date(row.created_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : null,
        expiresAt: row.expires_at ? new Date(row.expires_at) : null,
        userEmail: userIdToEmail.get(row.user_id) || 'Email not available',
        userName: userIdToName.get(row.user_id) || 'User not available',
      }));

      console.log('Transformed credit purchases:', transformedPurchases);
      setCreditPurchases(transformedPurchases);
      setError(null);
    } catch (err) {
      console.error('Error fetching credit purchases:', err);
      setError(`Failed to fetch credit purchases: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const refreshCreditPurchases = async () => {
    setLoading(true);
    await fetchCreditPurchases();
  };

  useEffect(() => {
    fetchCreditPurchases();

    // Set up real-time subscription
    const subscription = supabase
      .channel('credit_purchases_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_purchases',
        },
        (payload) => {
          console.log('Real-time credit purchases update:', payload);
          fetchCreditPurchases(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { creditPurchases, loading, error, refreshCreditPurchases };
}

// Server-side aggregation for usage logs (no client-side caching needed)
export function useUsageLogs() {
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [grandTotalTokens, setGrandTotalTokens] = useState(0);
  const [grandTotalCost, setGrandTotalCost] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Show 10 users per page
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [userTypeFilter, setUserTypeFilter] = useState<'internal' | 'external'>('external'); // Default to external users
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false); // Track background updates

  // Cache clearing function (kept for backward compatibility but not used)
  const clearActivityCache = () => {
    console.log('🧹 Cache clear requested (using server-side aggregation now)');
  };

  // Get cache statistics (kept for backward compatibility)
  const getCacheStats = () => {
    return {
      cacheSize: 0,
      hitRate: 'N/A (Server-side)',
      avgCalculationTime: 'N/A',
      totalCalculations: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  };

  // Send activity reminder email (preset template)
  const sendActivityReminder = async (userEmail: string, userName: string, activityLevel: string) => {
    try {
      console.log(`Sending preset activity reminder to ${userName} (${userEmail}) - Activity Level: ${activityLevel}`);
      
      const response = await fetch('/api/send-activity-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          userName,
          activityLevel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      const result = await response.json();
      console.log('Preset activity reminder sent successfully:', result);
      return { success: true, message: result.message };
    } catch (error) {
      console.error('Error sending preset activity reminder:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send email' 
      };
    }
  };

  // Send custom reminder email
  const sendCustomReminder = async (userEmail: string, userName: string, activityLevel: string, customSubject: string, customMessage: string) => {
    try {
      console.log(`Sending custom reminder to ${userName} (${userEmail}) - Activity Level: ${activityLevel}`);
      console.log(`Custom subject: ${customSubject}`);
      console.log(`Custom message: ${customMessage.substring(0, 100)}...`);
      
      const response = await fetch('/api/send-custom-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          userName,
          activityLevel,
          customSubject,
          customMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send custom email');
      }

      const result = await response.json();
      console.log('Custom reminder sent successfully:', result);
      return { success: true, message: result.message };
    } catch (error) {
      console.error('Error sending custom reminder:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send custom email' 
      };
    }
  };

  // Enhance custom email content
  const enhanceCustomEmail = async (userName: string, activityLevel: string, currentSubject: string, currentMessage: string) => {
    try {
      console.log(`Enhancing email for ${userName} - Activity Level: ${activityLevel}`);
      
      // Create enhanced content based on activity level and user context
      const enhancedContent = generateEnhancedEmailContent(userName, activityLevel, currentSubject, currentMessage);
      
      return { 
        success: true, 
        enhancedSubject: enhancedContent.subject,
        enhancedMessage: enhancedContent.message
      };
    } catch (error) {
      console.error('Error enhancing email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to enhance email' 
      };
    }
  };

  // Generate enhanced email content
  const generateEnhancedEmailContent = (userName: string, activityLevel: string, currentSubject: string, currentMessage: string) => {
    const activityContext = {
      medium: {
        urgency: "moderate",
        tone: "encouraging",
        suggestions: ["explore new features", "check out recent updates", "reconnect with the community"]
      },
      low: {
        urgency: "gentle",
        tone: "supportive", 
        suggestions: ["take your time", "we're here when you're ready", "no pressure to return"]
      }
    };

    const context = activityContext[activityLevel as keyof typeof activityContext] || activityContext.medium;
    
    // Enhanced subject lines
    const enhancedSubjects = {
      medium: [
        `🌟 ${userName}, your AI journey awaits!`,
        `✨ Ready to rediscover Helium, ${userName}?`,
        `🚀 ${userName}, let's reignite your creativity!`,
        `💡 ${userName}, new possibilities are waiting!`
      ],
      low: [
        `💙 ${userName}, we're thinking of you`,
        `🤗 ${userName}, no rush - we'll be here`,
        `🌱 ${userName}, your growth matters to us`,
        `☕ ${userName}, take your time, we understand`
      ]
    };

    // Enhanced message templates
    const enhancedMessages = {
      medium: `Hi ${userName}! 👋

We've been thinking about you and noticed you haven't been as active on Helium recently. We completely understand that life gets busy, but we wanted to reach out because we genuinely miss having you as part of our community! 

Your current activity level is ${activityLevel}, and we think you might love exploring some of the exciting new features we've added since you last visited. 

Here's what's new that might interest you:
✨ Enhanced AI capabilities with better responses
🎨 New creative tools for your projects  
📊 Improved analytics to track your progress
🤝 A more vibrant community of creators

We believe in your potential and would love to see you back in action. Whether you're looking to ${context.suggestions[0]}, ${context.suggestions[1]}, or just want to ${context.suggestions[2]}, we're here to support you every step of the way.

Remember, every great journey has its pauses - and that's perfectly okay! When you're ready to continue, we'll be here with open arms and exciting new possibilities.

Take care, and we hope to see you back soon! 🌟

With warm regards,
The Helium Team 💙`,

      low: `Hello ${userName}, 💙

We hope this message finds you well. We've noticed you haven't been active on Helium lately, and we wanted to reach out - not to pressure you, but simply to let you know that you're missed and valued.

Your current activity level is ${activityLevel}, and we want you to know that there's absolutely no rush to return. Life has its seasons, and we understand that sometimes you need to step back and focus on other things.

When you're ready (and only when you're ready), we'll be here with:
🌱 A welcoming community that understands
☕ A platform that adapts to your pace
💡 Tools that grow with your needs
🤗 Support without any pressure

We believe in the power of taking breaks and coming back when the time feels right. Your journey with AI and creativity is uniquely yours, and we respect that completely.

Whether you return tomorrow, next month, or next year, know that you'll always have a place here at Helium. We're not going anywhere, and we'll be excited to welcome you back whenever you're ready.

Take all the time you need. We're here when you are. 💙

With understanding and care,
The Helium Team 🌟`
    };

    const subjects = enhancedSubjects[activityLevel as keyof typeof enhancedSubjects] || enhancedSubjects.medium;
    const messages = enhancedMessages[activityLevel as keyof typeof enhancedMessages] || enhancedMessages.medium;
    
    return {
      subject: subjects[Math.floor(Math.random() * subjects.length)],
      message: messages
    };
  };

  // Optimized fetch function using server-side aggregation
  const fetchUsageLogs = async (
    page: number = 1,
    limit: number = itemsPerPage,
    search: string = searchQuery,
    silent: boolean = false,
    userType: 'internal' | 'external' = userTypeFilter,
    activity: string = activityFilter
  ) => {
    try {
      // Silent loading: don't show loading spinner for background updates
      if (!silent) {
        setLoading(true);
        setIsBackgroundRefreshing(false);
      } else {
        setIsBackgroundRefreshing(true); // Show subtle indicator for background updates
      }
      setError(null);
      
      console.log(`⚡ Fetching usage logs (${silent ? 'silent' : 'normal'}) - page ${page}, limit ${limit}...`);
      console.log('Fetch started at:', new Date().toISOString());
      
      // Use server-side aggregation API for much faster performance
      const response = await fetch('/api/usage-logs-aggregated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page,
          limit,
          searchQuery: search,
          activityFilter: activity,
          userTypeFilter: userType,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch usage logs');
      }

      console.log('API response:', result);
      console.log('Data length:', result.data?.length);
      console.log('Total count:', result.totalCount);
      console.log('Grand totals:', { tokens: result.grandTotalTokens, cost: result.grandTotalCost });

      // Store grand totals even if no data
      setGrandTotalTokens(result.grandTotalTokens || 0);
      setGrandTotalCost(result.grandTotalCost || 0);

      if (!result.data || result.data.length === 0) {
        console.log('No usage logs found');
        setUsageLogs([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const deriveActivityLevel = (daysSince: number | null | undefined) => {
        if (daysSince === null || daysSince === undefined) return 'inactive';
        if (daysSince <= 2) return 'high';
        if (daysSince === 3) return 'medium';
        if (daysSince > 3) return 'low';
        return 'inactive';
      };

      // Transform the data from snake_case to camelCase and re-derive activity level on the client
      const transformedLogs = result.data.map((row: any) => {
        const daysSince = row.days_since_last_activity as number | null | undefined;
        return {
          userId: row.user_id,
          userName: row.user_name,
          userEmail: row.user_email,
          totalPromptTokens: parseInt(row.total_prompt_tokens),
          totalCompletionTokens: parseInt(row.total_completion_tokens),
          totalTokens: parseInt(row.total_tokens),
          totalEstimatedCost: parseFloat(row.total_estimated_cost),
          usageCount: parseInt(row.usage_count),
          earliestActivity: new Date(row.earliest_activity),
          latestActivity: new Date(row.latest_activity),
          hasCompletedPayment: row.has_completed_payment,
          daysSinceLastActivity: daysSince ?? null,
          activityScore: row.activity_score,
          activityLevel: deriveActivityLevel(daysSince),
          userType: row.user_type as 'internal' | 'external',
        };
      });

      // Enforce activity filter client-side to avoid server bucketing mismatches
      const filteredLogs =
        activityFilter && activityFilter !== 'all'
          ? transformedLogs.filter((log) => log.activityLevel === activityFilter)
          : transformedLogs;

      console.log('Transformed logs:', transformedLogs.length, 'users');
      console.log('Filtered logs after activity filter:', filteredLogs.length, 'users');
      console.log('User type filter:', userType);
      console.log('Sample data:', transformedLogs.slice(0, 2));
      
      setUsageLogs(filteredLogs);
      // Keep totalCount in sync with what we actually render
      setTotalCount(filteredLogs.length);
      setCurrentPage(page);
      setLoading(false);
      setIsBackgroundRefreshing(false); // Clear background refresh indicator
      
      console.log('=== FETCH COMPLETED (OPTIMIZED) ===');
      console.log('Fetch completed at:', new Date().toISOString());
      console.log('Final result:', {
        displayedUsers: transformedLogs.length,
        totalCount: result.totalCount,
        currentPage: page,
        totalPages: Math.ceil(result.totalCount / limit),
        searchQuery: search,
        activityFilter,
        userTypeFilter: userType,
        silent,
      });
    } catch (err) {
      console.error('Error fetching usage logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch usage logs');
      setLoading(false);
      setIsBackgroundRefreshing(false); // Clear background refresh indicator
    }
  };

  // Search function
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
    fetchUsageLogs(1, itemsPerPage, query, false, userTypeFilter, activityFilter);
  };

  // Activity filter function
  const handleActivityFilter = (filter: string) => {
    setActivityFilter(filter);
    setCurrentPage(1); // Reset to first page when filtering
    fetchUsageLogs(1, itemsPerPage, searchQuery, false, userTypeFilter, filter);
  };

  // User type filter function
  const handleUserTypeFilter = (filter: 'internal' | 'external') => {
    setUserTypeFilter(filter);
    setCurrentPage(1); // Reset to first page when filtering
    // Pass the new filter value directly to ensure immediate update
    fetchUsageLogs(1, itemsPerPage, searchQuery, false, filter, activityFilter);
  };

  // Refresh function
  const refreshUsageLogs = () => {
    console.log('=== FORCE REFRESH USAGE LOGS ===');
    console.log('Current page:', currentPage);
    console.log('Items per page:', itemsPerPage);
    console.log('Search query:', searchQuery);
    fetchUsageLogs(currentPage, itemsPerPage, searchQuery, false, userTypeFilter, activityFilter);
  };

  // Load specific page
  const loadPage = (page: number) => {
    fetchUsageLogs(page, itemsPerPage, searchQuery, false, userTypeFilter, activityFilter);
  };

  // Load next page
  const loadNextPage = () => {
    if (currentPage < Math.ceil(totalCount / itemsPerPage)) {
      fetchUsageLogs(currentPage + 1, itemsPerPage, searchQuery, false, userTypeFilter, activityFilter);
    }
  };

  // Load previous page
  const loadPreviousPage = () => {
    if (currentPage > 1) {
      fetchUsageLogs(currentPage - 1, itemsPerPage, searchQuery, false, userTypeFilter, activityFilter);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUsageLogs(1, itemsPerPage, searchQuery, false, userTypeFilter, activityFilter);
  }, []);

  // Set up real-time subscription for usage_logs and credit_purchases changes
  useEffect(() => {
    let updateTimeout: NodeJS.Timeout | null = null;

    // Debounced update function for smooth real-time updates
    const debouncedUpdate = () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      
      updateTimeout = setTimeout(() => {
        console.log('🔄 Silent background refresh triggered by real-time event');
        // Use silent mode to avoid loading spinner on real-time updates
    fetchUsageLogs(currentPage, itemsPerPage, searchQuery, true, userTypeFilter, activityFilter);
      }, 500); // 500ms debounce to batch rapid changes
    };

    const usageLogsSubscription = supabase
      .channel('usage_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'usage_logs',
        },
        (payload) => {
          console.log('=== REAL-TIME UPDATE (USAGE LOGS) ===');
          console.log('Event type:', payload.eventType);
          console.log('Affected record:', payload.new || payload.old);
          
          // Only refresh if the change affects current filter
          const record = payload.new || payload.old;
          if (record) {
            // Silent background update without loading spinner
            debouncedUpdate();
          }
        }
      )
      .subscribe();

    const creditPurchasesSubscription = supabase
      .channel('credit_purchases_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'credit_purchases',
        },
        (payload) => {
          console.log('=== REAL-TIME UPDATE (CREDIT PURCHASES) ===');
          console.log('Event type:', payload.eventType);
          
          // Only refresh if it's a completed payment (affects has_completed_payment)
          const newRecord = payload.new as any;
          if (newRecord?.status === 'completed' || payload.eventType === 'DELETE') {
            console.log('Status:', newRecord?.status);
            // Silent background update without loading spinner
            debouncedUpdate();
          }
        }
      )
      .subscribe();

    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      usageLogsSubscription.unsubscribe();
      creditPurchasesSubscription.unsubscribe();
    };
  }, [currentPage, searchQuery, userTypeFilter, activityFilter]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return { 
    usageLogs, 
    loading, 
    error, 
    refreshUsageLogs,
    loadPage,
    loadNextPage,
    loadPreviousPage,
    currentPage,
    totalPages,
    totalCount,
    grandTotalTokens,
    grandTotalCost,
    hasNextPage,
    hasPreviousPage,
    itemsPerPage,
    searchQuery,
    handleSearch,
    activityFilter,
    handleActivityFilter,
    userTypeFilter,
    handleUserTypeFilter,
    isBackgroundRefreshing,
    clearActivityCache,
    getCacheStats,
    sendActivityReminder,
    sendCustomReminder,
    enhanceCustomEmail
  };
}

export function useCreditBalances() {
  const [creditBalances, setCreditBalances] = useState<(CreditBalance & { userEmail?: string; userName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch function - using API route with admin client to bypass RLS
  const fetchCreditBalances = async () => {
    try {
      console.log('Fetching credit balances via API...');
      
      const response = await fetch('/api/credit-balances', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch credit balances');
      }

      console.log(`API: Fetched ${result.data?.length || 0} credit balances`);

      if (!result.data || result.data.length === 0) {
        console.log('No credit balances found in database');
        setCreditBalances([]);
        setError(null);
        setLoading(false);
        return;
      }

      // Transform the data to ensure proper Date objects
      const transformedBalances = result.data.map((balance: any) => ({
        userId: balance.userId,
        balanceDollars: parseFloat(balance.balanceDollars) || 0,
        totalPurchased: parseFloat(balance.totalPurchased) || 0,
        totalUsed: parseFloat(balance.totalUsed) || 0,
        lastUpdated: balance.lastUpdated ? new Date(balance.lastUpdated) : new Date(),
        metadata: balance.metadata || {},
        userEmail: balance.userEmail || 'Email not available',
        userName: balance.userName || `User ${balance.userId.slice(0, 8)}`,
      }));

      console.log('Transformed credit balances:', transformedBalances);
      setCreditBalances(transformedBalances);
      setError(null);
    } catch (err) {
      console.error('Error fetching credit balances:', err);
      setError(`Failed to fetch credit balances: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const refreshCreditBalances = async () => {
    setLoading(true);
    await fetchCreditBalances();
  };

  useEffect(() => {
    fetchCreditBalances();

    // Set up real-time subscription
    const subscription = supabase
      .channel('credit_balance_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_balance',
        },
        (payload) => {
          console.log('Real-time credit balance update:', payload);
          fetchCreditBalances(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { creditBalances, loading, error, refreshCreditBalances };
}
