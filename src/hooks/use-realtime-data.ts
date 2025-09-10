'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { WaitlistUser, DashboardStats, InviteCode } from '@/lib/types';

export function useWaitlistUsers() {
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch
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

  return { users, loading, error };
}

export function useInviteCodes() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch
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

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { codes, loading, error };
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
