'use client';

import { useEffect, useState } from 'react';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import type { UserProfile } from '@/lib/types';
import { dbOperations } from '@/lib/db';
import { getNameFromEmail } from '@/lib/utils';

export function useUserProfiles() {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableName, setTableName] = useState<string | null>(null);

  // Helper to fetch emails
  const fetchEmailsForUsers = async (userIds: string[]): Promise<Map<string, string>> => {
      const userIdToEmail = new Map<string, string>();
      if (userIds.length === 0) return userIdToEmail;

      try {
        const response = await fetch('/api/fetch-user-emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds }),
        });

        if (response.ok) {
          const userData = await response.json();
          userData.forEach((user: any) => {
            userIdToEmail.set(user.id, user.email);
          });
        } else {
            // Fallback to admin if available
             if (supabaseAdmin) {
                try {
                    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
                    if (authUsers?.users) {
                        authUsers.users.forEach(user => {
                            if (userIds.includes(user.id) && user.email) {
                                userIdToEmail.set(user.id, user.email);
                            }
                        });
                    }
                } catch (e) { console.warn(e); }
             }
        }
      } catch (e) {
        console.warn('Failed to fetch emails', e);
      }
      return userIdToEmail;
  };

  const transformRow = (row: any, email?: string): UserProfile => {
    // Determine the full name - use email extraction if name is missing, empty, or just "User"
    let fullName = row.full_name;
    const emailValue = email || 'Email not available';
    
    // Check if fullName is missing, empty, or just "User" (case-insensitive)
    if (!fullName || fullName.trim() === '' || fullName.trim().toLowerCase() === 'user') {
      // Extract name from email only if email is available and valid
      if (email && email !== 'Email not available' && email.includes('@')) {
        fullName = getNameFromEmail(email);
      } else {
        // If email is not available, keep the original value or use a fallback
        fullName = fullName || 'User';
      }
    }
    
    return {
      id: row.id,
      userId: row.user_id,
      fullName: fullName,
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
      email: emailValue,
      metadata: row.metadata || null,
      planType: row.plan_type || 'seed',
      accountType: row.account_type || 'individual',
    };
  };

  // Initial fetch function
  const fetchUserProfiles = async () => {
    try {
      console.log('Fetching user profiles...');
      
      let profilesData: any[] = [];
      let detectedTableName = 'user_profiles';
      
      const fetchAllProfiles = async (table: string) => {
        let allRows: any[] = [];
        let from = 0;
        const limit = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .range(from, from + limit - 1)
            .order('created_at', { ascending: false });
            
          if (error) throw error;
          
          if (data && data.length > 0) {
            allRows = [...allRows, ...data];
            if (data.length < limit) hasMore = false;
            else from += limit;
          } else {
            hasMore = false;
          }
        }
        return allRows;
      };

      try {
        profilesData = await fetchAllProfiles('user_profiles');
        detectedTableName = 'user_profiles';
      } catch (err: any) {
        if (err.message && err.message.includes('relation "public.user_profiles" does not exist')) {
          profilesData = await fetchAllProfiles('user_profile');
          detectedTableName = 'user_profile';
        } else {
          throw err;
        }
      }

      setTableName(detectedTableName);

      if (!profilesData || profilesData.length === 0) {
        setUserProfiles([]);
        await dbOperations.clear('user_profiles');
        setLoading(false);
        return;
      }

      // Optimization: Check against cache to avoid fetching emails for unchanged profiles
      const cachedProfiles = await dbOperations.getAll('user_profiles');
      const cachedMap = new Map(cachedProfiles.map(p => [p.userId, p]));
      
      const profilesToFetchEmail: string[] = [];
      const transformedProfiles: UserProfile[] = [];

      profilesData.forEach(row => {
          const cached = cachedMap.get(row.user_id);
          // Check if cached exists and update time matches (if updated_at exists)
          // Note: row.updated_at is string, cached.updatedAt is Date
          const rowUpdated = new Date(row.updated_at).getTime();
          const cachedUpdated = cached?.updatedAt?.getTime();

          if (cached && rowUpdated === cachedUpdated && cached.email !== 'Email not available') {
              transformedProfiles.push(cached);
          } else {
              profilesToFetchEmail.push(row.user_id);
              // Push a placeholder, will update later
              transformedProfiles.push(transformRow(row));
          }
      });

      // Fetch emails for needing profiles
      if (profilesToFetchEmail.length > 0) {
          console.log(`Fetching emails for ${profilesToFetchEmail.length} users`);
          const emailMap = await fetchEmailsForUsers(profilesToFetchEmail);
          
          // Update transformedProfiles - re-transform rows with emails to get proper names
          for (let i = 0; i < transformedProfiles.length; i++) {
              const p = transformedProfiles[i];
              if (profilesToFetchEmail.includes(p.userId)) {
                  const email = emailMap.get(p.userId);
                  if (email) {
                      // Find the original row data to re-transform with email
                      const originalRow = profilesData.find(r => r.user_id === p.userId);
                      if (originalRow) {
                          // Re-transform with email to get proper name extraction
                          transformedProfiles[i] = transformRow(originalRow, email);
                      } else {
                          // Fallback: just update email and name
                          transformedProfiles[i] = { 
                              ...p, 
                              email,
                              fullName: (p.fullName && p.fullName.trim() !== '' && p.fullName.trim().toLowerCase() !== 'user') 
                                ? p.fullName 
                                : getNameFromEmail(email)
                          };
                      }
                  }
              }
          }
      }

      setUserProfiles(transformedProfiles);
      setError(null);
      
      // Update cache
      await dbOperations.putAll('user_profiles', transformedProfiles);

    } catch (err) {
      console.error('Error fetching user profiles:', err);
      setError(`Failed to fetch user profiles: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserProfiles = async () => {
    setLoading(true);
    await fetchUserProfiles();
  };

  const deleteUserProfile = async (profileId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`/api/delete-user-profile?profileId=${profileId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        // Update local state and IDB immediately
        setUserProfiles(prev => prev.filter(p => p.id !== profileId));
        await dbOperations.delete('user_profiles', profileId);
        return { success: true, message: result.message || 'User profile deleted successfully' };
      }
      if (!response.ok) throw new Error(result.message || 'Failed to delete user profile');
      throw new Error(result.message || 'Failed to delete user profile');
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to delete user profile' };
    }
  };

  const bulkDeleteUserProfiles = async (profileIds: string[]): Promise<{ success: boolean; message: string; deletedCount?: number; authDeleteErrors?: any[]; failedUserIds?: string[] }> => {
    try {
        if (!profileIds || profileIds.length === 0) return { success: false, message: 'No profiles selected' };
        
        const response = await fetch('/api/bulk-delete-user-profiles', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileIds }),
        });
        const result = await response.json();

        // Optimistic update
        const successfulDeletes = profileIds.filter(id => !result.failedUserIds?.includes(id));
        if (successfulDeletes.length > 0) {
             setUserProfiles(prev => prev.filter(p => !successfulDeletes.includes(p.id)));
             // Delete from IDB
             const db = await import('@/lib/db').then(m => m.getDB()); // Dynamic import or just use dbOperations if available
             // But dbOperations doesn't have bulk delete by keys easily exposed as one op, so loop
             for (const id of successfulDeletes) {
                 await dbOperations.delete('user_profiles', id);
             }
        }

        if (result.deletedCount > 0 && result.authDeleteErrors?.length > 0) {
            return {
                success: false,
                message: result.message || 'Partial success',
                deletedCount: result.deletedCount,
                authDeleteErrors: result.authDeleteErrors,
                failedUserIds: result.failedUserIds
            };
        }

        if (!response.ok || !result.success) throw new Error(result.message);

        return { success: true, message: result.message, deletedCount: result.deletedCount };
    } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : 'Failed' };
    }
  };

  useEffect(() => {
    // 1. Load Cache
    const loadCache = async () => {
        try {
            const cached = await dbOperations.getAll('user_profiles');
            if (cached && cached.length > 0) {
                // Show cached data immediately for better UX
                setUserProfiles(cached);
                // DON'T set loading = false here - wait for fresh data
                // This prevents showing incorrect cached count before fresh data arrives
            }
        } catch (e) { console.warn(e); }
    };
    loadCache();
    
    // 2. Fetch Fresh
    fetchUserProfiles();
  }, []);

  useEffect(() => {
    if (!tableName) return;

    const subscription = supabase
      .channel(`user_profiles_changes_${tableName}_optimized`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
        },
        async (payload) => {
          try {
            console.log('Real-time user profiles update (Delta):', payload);
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                // Fetch email for this user
                const userId = payload.new.user_id;
                const emailMap = await fetchEmailsForUsers([userId]);
                const email = emailMap.get(userId);
                const newProfile = transformRow(payload.new, email);
                
                if (payload.eventType === 'INSERT') {
                    setUserProfiles(prev => [newProfile, ...prev]);
                    await dbOperations.put('user_profiles', newProfile);
                } else {
                    setUserProfiles(prev => prev.map(p => p.id === newProfile.id ? newProfile : p));
                    await dbOperations.put('user_profiles', newProfile);
                }

            } else if (payload.eventType === 'DELETE') {
                const deletedId = payload.old.id;
                setUserProfiles(prev => prev.filter(p => p.id !== deletedId));
                await dbOperations.delete('user_profiles', deletedId);
            }
          } catch (error) {
            console.error('Error handling realtime update for user_profiles:', error);
            setError(`Realtime update error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to user_profiles realtime changes');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Only log once to prevent spam
          console.warn('⚠️ Realtime not available for user_profiles. This is normal if realtime isn\'t enabled. The app will still work with manual refresh.');
          // DO NOT set error state or unsubscribe here - it can cause issues
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [tableName]);

  return { userProfiles, loading, error, refreshUserProfiles, deleteUserProfile, bulkDeleteUserProfiles };
}






