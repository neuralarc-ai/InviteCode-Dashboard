'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { WaitlistUser } from '@/lib/types';
import { dbOperations } from '@/lib/db';

export function useWaitlistUsers() {
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transform row to WaitlistUser
  const transformRow = (row: any): WaitlistUser => ({
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
  });

  // Initial fetch function
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('waitlist')
        .select('*')
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const transformedUsers = data?.map(transformRow) || [];

      setUsers(transformedUsers);
      setError(null);
      
      // Update cache
      await dbOperations.clear('waitlist'); // Clear old cache to be safe or just putAll (putAll overwrites by key)
      await dbOperations.putAll('waitlist', transformedUsers);
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
    // 1. Load from Cache immediately
    const loadCache = async () => {
        try {
            const cached = await dbOperations.getAll('waitlist');
            if (cached && cached.length > 0) {
                // Sort cached data
                cached.sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime());
                setUsers(cached);
                setLoading(false); // Show content immediately
            }
        } catch (e) {
            console.warn('Failed to load waitlist from cache', e);
        }
    };
    loadCache();

    // 2. Fetch fresh data in background
    fetchUsers();

    // 3. Set up real-time subscription with Delta Updates
    const subscription = supabase
      .channel('waitlist_changes_optimized')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waitlist',
        },
        async (payload) => {
          console.log('Real-time update (Delta):', payload);
          
          if (payload.eventType === 'INSERT') {
            const newUser = transformRow(payload.new);
            setUsers(prev => [newUser, ...prev]);
            await dbOperations.put('waitlist', newUser);
          } else if (payload.eventType === 'UPDATE') {
            const updatedUser = transformRow(payload.new);
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
            await dbOperations.put('waitlist', updatedUser);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setUsers(prev => prev.filter(u => u.id !== deletedId));
            await dbOperations.delete('waitlist', deletedId);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { users, loading, error, refreshUsers };
}







