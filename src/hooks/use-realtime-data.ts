'use client';

import { useEffect, useState } from 'react';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import type { WaitlistUser, DashboardStats, InviteCode, UserProfile, CreditUsageGrouped, CreditPurchase, UsageLog } from '@/lib/types';

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

  // Initial fetch function
  const fetchUserProfiles = async () => {
    try {
      console.log('Fetching user profiles...');
      
      // First, get user profiles - try both possible table names
      let profilesData = null;
      let profilesError = null;
      
      // Try user_profiles first
      const result1 = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (result1.error && result1.error.message.includes('relation "public.user_profiles" does not exist')) {
        console.log('user_profiles table not found, trying user_profile...');
        // Try user_profile (singular)
        const result2 = await supabase
          .from('user_profile')
          .select('*')
          .order('created_at', { ascending: false });
        
        profilesData = result2.data;
        profilesError = result2.error;
      } else {
        profilesData = result1.data;
        profilesError = result1.error;
      }

      console.log('Profiles query result:', { profilesData, profilesError });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

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
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        avatarUrl: row.avatar_url,
        referralSource: row.referral_source,
        consentGiven: row.consent_given,
        consentDate: row.consent_date ? new Date(row.consent_date) : null,
        email: userIdToEmail.get(row.user_id) || 'Email not available',
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

  useEffect(() => {
    fetchUserProfiles();

    // Set up real-time subscription
    const subscription = supabase
      .channel('user_profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
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
  }, []);

  return { userProfiles, loading, error, refreshUserProfiles };
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
      console.log('Fetching credit purchases...');
      
      const { data, error } = await supabase
        .from('credit_purchases')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Raw credit purchases query result:', { data, error });

      if (error) {
        console.error('Error fetching credit purchases:', error);
        throw error;
      }

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

// Activity level cache to avoid recalculation
const activityCache = new Map<string, { 
  level: string; 
  score: number; 
  daysSinceLastActivity: number; 
  lastCalculated: Date;
  userId: string;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const MAX_CACHE_SIZE = 1000; // Maximum cached users

// Performance monitoring
const performanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  calculationTime: 0,
  totalCalculations: 0
};

export function useUsageLogs() {
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Show 10 users per page
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState<string>('all');

  // Search function to filter users
  const searchUsers = (users: any[], query: string) => {
    if (!query.trim()) return users;
    
    const lowercaseQuery = query.toLowerCase();
    return users.filter(user => 
      user.userName?.toLowerCase().includes(lowercaseQuery) ||
      user.userEmail?.toLowerCase().includes(lowercaseQuery) ||
      user.userId?.toLowerCase().includes(lowercaseQuery)
    );
  };

  // Activity filter function
  const filterByActivity = (users: any[], filter: string) => {
    if (filter === 'all') return users;
    return users.filter(user => user.activityLevel === filter);
  };

  // Cached activity level calculation
  const getCachedActivityLevel = (userId: string, userData: any) => {
    const now = new Date();
    
    // Check cache first
    const cached = activityCache.get(userId);
    if (cached && (now.getTime() - cached.lastCalculated.getTime()) < CACHE_DURATION) {
      performanceMetrics.cacheHits++;
      console.log(`🎯 Cache HIT for user ${userId}: ${cached.level} (${cached.score})`);
      return {
        activityLevel: cached.level as 'high' | 'medium' | 'low' | 'inactive',
        daysSinceLastActivity: cached.daysSinceLastActivity,
        activityScore: cached.score
      };
    }
    
    // Cache miss - calculate new activity level
    performanceMetrics.cacheMisses++;
    const startTime = performance.now();
    
    const daysSinceLastActivity = Math.floor((now.getTime() - userData.latestActivity.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate activity score based on multiple factors
    const recencyScore = Math.max(0, 100 - (daysSinceLastActivity * 2)); // Recent = higher score
    const frequencyScore = Math.min(100, userData.usageCount * 5); // More sessions = higher score
    const volumeScore = Math.min(100, userData.totalTokens / 1000000); // More tokens = higher score
    
    const activityScore = Math.round((recencyScore * 0.5) + (frequencyScore * 0.3) + (volumeScore * 0.2));
    
    // Determine activity level
    let activityLevel: 'high' | 'medium' | 'low' | 'inactive';
    if (daysSinceLastActivity <= 7 && activityScore >= 70) {
      activityLevel = 'high';
    } else if (daysSinceLastActivity <= 30 && activityScore >= 40) {
      activityLevel = 'medium';
    } else if (daysSinceLastActivity <= 90 && activityScore >= 20) {
      activityLevel = 'low';
    } else {
      activityLevel = 'inactive';
    }
    
    const endTime = performance.now();
    performanceMetrics.calculationTime += (endTime - startTime);
    performanceMetrics.totalCalculations++;
    
    // Cache the result
    const cacheEntry = {
      level: activityLevel,
      score: activityScore,
      daysSinceLastActivity,
      lastCalculated: now,
      userId
    };
    
    // Manage cache size
    if (activityCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entries (simple LRU)
      const oldestKey = activityCache.keys().next().value;
      if (oldestKey) {
        activityCache.delete(oldestKey);
      }
    }
    
    activityCache.set(userId, cacheEntry);
    
    console.log(`🔄 Cache MISS for user ${userId}: ${activityLevel} (${activityScore}) - Calculated in ${(endTime - startTime).toFixed(2)}ms`);
    
    return {
      activityLevel,
      daysSinceLastActivity,
      activityScore
    };
  };

  // Clear cache function (for testing/debugging)
  const clearActivityCache = () => {
    activityCache.clear();
    performanceMetrics.cacheHits = 0;
    performanceMetrics.cacheMisses = 0;
    performanceMetrics.calculationTime = 0;
    performanceMetrics.totalCalculations = 0;
    console.log('🧹 Activity cache cleared');
  };

  // Get cache statistics
  const getCacheStats = () => {
    const hitRate = performanceMetrics.cacheHits / (performanceMetrics.cacheHits + performanceMetrics.cacheMisses) * 100;
    const avgCalculationTime = performanceMetrics.totalCalculations > 0 ? 
      performanceMetrics.calculationTime / performanceMetrics.totalCalculations : 0;
    
    return {
      cacheSize: activityCache.size,
      hitRate: hitRate.toFixed(1) + '%',
      avgCalculationTime: avgCalculationTime.toFixed(2) + 'ms',
      totalCalculations: performanceMetrics.totalCalculations,
      cacheHits: performanceMetrics.cacheHits,
      cacheMisses: performanceMetrics.cacheMisses
    };
  };

  // Send activity reminder email
  const sendActivityReminder = async (userEmail: string, userName: string, activityLevel: string) => {
    try {
      console.log(`Sending activity reminder to ${userName} (${userEmail}) - Activity Level: ${activityLevel}`);
      
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
      console.log('Activity reminder sent successfully:', result);
      return { success: true, message: result.message };
    } catch (error) {
      console.error('Error sending activity reminder:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send email' 
      };
    }
  };

  // Fetch function that gets ALL data for proper aggregation
  const fetchUsageLogs = async (page: number = 1, limit: number = itemsPerPage, search: string = searchQuery) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching usage logs - page ${page}, limit ${limit}...`);
      console.log('Fetching ALL usage logs for proper aggregation...');
      console.log('Fetch started at:', new Date().toISOString());
      
      // Fetch ALL usage logs using pagination to bypass Supabase's 1000 row limit
      let allData: any[] = [];
      let hasMore = true;
      let currentPageLoop = 0;
      const pageSize = 1000;
      let totalCountFromDB = 0;

      console.log('Fetching all usage logs using pagination...');
      
      while (hasMore) {
        const offset = currentPageLoop * pageSize;
        console.log(`Fetching page ${currentPageLoop + 1}, offset ${offset}...`);
        
        const { data: pageData, error: pageError, count } = await supabase
          .from('usage_logs')
          .select('*', { count: currentPageLoop === 0 ? 'exact' : undefined })
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (pageError) {
          console.error('Error fetching page:', pageError);
          throw pageError;
        }

        if (currentPageLoop === 0) {
          totalCountFromDB = count || 0;
          console.log('Total count from database:', totalCountFromDB);
        }

        if (!pageData || pageData.length === 0) {
          hasMore = false;
          console.log('No more data, stopping pagination');
        } else {
          allData = [...allData, ...pageData];
          console.log(`Fetched ${pageData.length} records, total so far: ${allData.length}`);
          
          if (pageData.length < pageSize) {
            hasMore = false;
            console.log('Reached end of data');
          }
        }
        
        currentPageLoop++;
      }

      const data = allData;
      console.log('Raw usage logs query result:', { data, error: null, count: totalCountFromDB });
      console.log('Data length:', data?.length);
      console.log('Total count:', totalCountFromDB);

      if (!data || data.length === 0) {
        console.log('No usage logs found in database');
        setUsageLogs([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      console.log(`Found ${data.length} usage log records`);

      // Get unique user IDs from ALL data
      const userIds = [...new Set(data.map(log => log.user_id))];
      console.log('Fetching user data for usage logs, user IDs:', userIds);
      console.log('Total unique user IDs found:', userIds.length);

      // Fetch payment status for all users
      let paymentStatusMap = new Map<string, boolean>();
      try {
        console.log('Fetching payment status for users...');
        const { data: creditPurchases, error: paymentError } = await supabase
          .from('credit_purchases')
          .select('user_id, status')
          .in('user_id', userIds);

        if (paymentError) {
          console.warn('Error fetching payment status:', paymentError);
        } else if (creditPurchases) {
          creditPurchases.forEach(purchase => {
            // User has completed payment if they have any 'completed' status
            if (purchase.status === 'completed') {
              paymentStatusMap.set(purchase.user_id, true);
            }
          });
          console.log('Payment status fetched for', paymentStatusMap.size, 'users with completed payments');
        }
      } catch (paymentErr) {
        console.warn('Failed to fetch payment status:', paymentErr);
      }

      // Fetch user emails and names via API
      let userData: Array<{id: string, email: string, full_name: string}> = [];
      if (userIds.length > 0) {
        try {
          console.log('Making API call to fetch user emails for userIds:', userIds);
          const response = await fetch('/api/fetch-user-emails-cached', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userIds }),
          });

          console.log('API response status:', response.status);
          console.log('API response ok:', response.ok);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('API call failed with status:', response.status, 'Error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          userData = await response.json();
          console.log('User data fetched for usage logs:', userData);
          console.log('User data length:', userData.length);
          console.log('User data sample:', userData.slice(0, 3));
          
          // If we didn't get all users, try to fetch missing ones
          const foundUserIds = userData.map(u => u.id);
          const missingUserIds = userIds.filter(id => !foundUserIds.includes(id));
          
          if (missingUserIds.length > 0) {
            console.log('Missing user IDs, trying fallback API:', missingUserIds);
            try {
              const fallbackResponse = await fetch('/api/fetch-user-emails', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userIds: missingUserIds }),
              });

              if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                console.log('Fallback API succeeded for missing users:', fallbackData);
                userData = [...userData, ...fallbackData];
              }
            } catch (fallbackError) {
              console.error('Fallback API also failed:', fallbackError);
            }
          }
        } catch (apiError) {
          console.error('Error fetching user data for usage logs:', apiError);
          // Try fallback to original API
          try {
            console.log('Trying fallback API...');
            const fallbackResponse = await fetch('/api/fetch-user-emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userIds }),
            });

            if (fallbackResponse.ok) {
              userData = await fallbackResponse.json();
              console.log('Fallback API succeeded:', userData);
            }
          } catch (fallbackError) {
            console.error('Fallback API also failed:', fallbackError);
            // Try final fallback API
            try {
              console.log('Trying final fallback API...');
              const finalFallbackResponse = await fetch('/api/fetch-user-from-logs', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userIds }),
              });

              if (finalFallbackResponse.ok) {
                userData = await finalFallbackResponse.json();
                console.log('Final fallback API succeeded:', userData);
              }
            } catch (finalFallbackError) {
              console.error('Final fallback API also failed:', finalFallbackError);
            }
          }
        }
      }

      // Transform the data and add user information
      const transformedLogs = data.map((row: any) => {
        const user = userData.find(u => u.id === row.user_id);
        console.log(`Processing log ${row.id}:`, {
          userId: row.user_id,
          foundUser: user,
          userName: user?.full_name,
          userEmail: user?.email
        });
        return {
          id: row.id,
          userId: row.user_id,
          threadId: row.thread_id,
          messageId: row.message_id,
          totalPromptTokens: row.total_prompt_tokens,
          totalCompletionTokens: row.total_completion_tokens,
          totalTokens: row.total_tokens,
          estimatedCost: row.estimated_cost ? parseFloat(row.estimated_cost) : null,
          content: row.content || {},
          createdAt: new Date(row.created_at),
          userEmail: user?.email || `user-${row.user_id.slice(0, 8)}@unknown.com`,
          userName: user?.full_name || `User ${row.user_id.slice(0, 8)}`,
        };
      });

      // Aggregate usage logs by user
      const aggregatedLogs = transformedLogs.reduce((acc: Record<string, any>, log) => {
        const userId = log.userId;
        
        if (!acc[userId]) {
          acc[userId] = {
            userId: userId,
            userName: log.userName,
            userEmail: log.userEmail,
            totalPromptTokens: 0,
            totalCompletionTokens: 0,
            totalTokens: 0,
            totalEstimatedCost: 0,
            usageCount: 0,
            earliestActivity: log.createdAt,
            latestActivity: log.createdAt,
            hasCompletedPayment: paymentStatusMap.get(userId) || false,
          };
        }
        
        // Aggregate the stats
        acc[userId].totalPromptTokens += log.totalPromptTokens || 0;
        acc[userId].totalCompletionTokens += log.totalCompletionTokens || 0;
        acc[userId].totalTokens += log.totalTokens || 0;
        acc[userId].totalEstimatedCost += log.estimatedCost || 0;
        acc[userId].usageCount += 1;
        
        // Update date ranges
        if (log.createdAt < acc[userId].earliestActivity) {
          acc[userId].earliestActivity = log.createdAt;
        }
        if (log.createdAt > acc[userId].latestActivity) {
          acc[userId].latestActivity = log.createdAt;
        }
        
        return acc;
      }, {});

      // Convert aggregated data back to array and calculate activity levels using cache
      const allAggregatedUsers = Object.values(aggregatedLogs).map((user: any) => {
        // Use cached activity level calculation
        const activityData = getCachedActivityLevel(user.userId, user);
        
        return {
          ...user,
          ...activityData
        };
      }).sort((a: any, b: any) => b.totalTokens - a.totalTokens);

      console.log('All aggregated usage logs:', allAggregatedUsers.length, 'users');
      console.log('Aggregated users sample:', allAggregatedUsers.slice(0, 3).map(u => ({ 
        userId: u.userId, 
        userName: u.userName, 
        totalTokens: u.totalTokens 
      })));
      console.log('All aggregated user names:', allAggregatedUsers.map(u => u.userName));
      
      // Apply search and activity filtering
      const searchFilteredUsers = searchUsers(allAggregatedUsers, search);
      const filteredUsers = filterByActivity(searchFilteredUsers, activityFilter);
      console.log('Search query:', search);
      console.log('Activity filter:', activityFilter);
      console.log('Filtered users after search and activity filter:', filteredUsers.length, 'out of', allAggregatedUsers.length);
      
      // Check for new users (compare with previous count if available)
      const previousUserCount = totalCount;
      if (allAggregatedUsers.length > previousUserCount) {
        const newUsersCount = allAggregatedUsers.length - previousUserCount;
        console.log(`🆕 NEW USERS DETECTED: ${newUsersCount} new users added to usage logs!`);
        console.log('New users:', allAggregatedUsers.slice(previousUserCount).map(u => u.userName));
      }
      
      // Apply pagination to the filtered data
      const offset = (page - 1) * limit;
      const paginatedUsers = filteredUsers.slice(offset, offset + limit);
      
      console.log('Paginated users:', paginatedUsers.length, 'out of', filteredUsers.length);
      console.log('Pagination details:', { page, limit, offset, totalUsers: filteredUsers.length });
      console.log('Paginated user names:', paginatedUsers.map(u => u.userName));
      
      setUsageLogs(paginatedUsers);
      setTotalCount(filteredUsers.length); // Use filtered count for pagination
      setCurrentPage(page);
      setLoading(false);
      
      console.log('=== FETCH COMPLETED ===');
      console.log('Fetch completed at:', new Date().toISOString());
      console.log('Final result:', {
        totalUsers: allAggregatedUsers.length,
        filteredUsers: filteredUsers.length,
        displayedUsers: paginatedUsers.length,
        currentPage: page,
        totalPages: Math.ceil(filteredUsers.length / limit),
        searchQuery: search
      });
      
      // Log performance metrics
      const stats = getCacheStats();
      console.log('🚀 Performance Metrics:', stats);
    } catch (err) {
      console.error('Error fetching usage logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch usage logs');
      setLoading(false);
    }
  };

  // Search function
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
    fetchUsageLogs(1, itemsPerPage, query);
  };

  // Activity filter function
  const handleActivityFilter = (filter: string) => {
    setActivityFilter(filter);
    setCurrentPage(1); // Reset to first page when filtering
    fetchUsageLogs(1, itemsPerPage, searchQuery);
  };

  // Refresh function
  const refreshUsageLogs = () => {
    console.log('=== FORCE REFRESH USAGE LOGS ===');
    console.log('Current page:', currentPage);
    console.log('Items per page:', itemsPerPage);
    console.log('Search query:', searchQuery);
    fetchUsageLogs(currentPage, itemsPerPage, searchQuery);
  };

  // Load specific page
  const loadPage = (page: number) => {
    fetchUsageLogs(page, itemsPerPage, searchQuery);
  };

  // Load next page
  const loadNextPage = () => {
    if (currentPage < Math.ceil(totalCount / itemsPerPage)) {
      fetchUsageLogs(currentPage + 1, itemsPerPage, searchQuery);
    }
  };

  // Load previous page
  const loadPreviousPage = () => {
    if (currentPage > 1) {
      fetchUsageLogs(currentPage - 1, itemsPerPage, searchQuery);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUsageLogs(1);
  }, []);

  // Set up real-time subscription for usage_logs and credit_purchases changes
  useEffect(() => {
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
          console.log('Usage log change detected:', payload);
          console.log('Event type:', payload.eventType);
          console.log('Current page:', currentPage);
          console.log('Search query:', searchQuery);
          console.log('Refreshing data...');
          fetchUsageLogs(currentPage, itemsPerPage, searchQuery);
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
          console.log('Credit purchase change detected:', payload);
          console.log('Event type:', payload.eventType);
          console.log('Current page:', currentPage);
          console.log('Search query:', searchQuery);
          console.log('Refreshing data...');
          fetchUsageLogs(currentPage, itemsPerPage, searchQuery);
        }
      )
      .subscribe();

    return () => {
      usageLogsSubscription.unsubscribe();
      creditPurchasesSubscription.unsubscribe();
    };
  }, [currentPage, searchQuery]);

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
    hasNextPage,
    hasPreviousPage,
    itemsPerPage,
    searchQuery,
    handleSearch,
    activityFilter,
    handleActivityFilter,
    clearActivityCache,
    getCacheStats,
    sendActivityReminder
  };
}
