'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DashboardStats } from '@/lib/types';

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
      .channel('invite_codes_stats_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invite_codes' },
        () => fetchStats()
      )
      .subscribe();

    const waitlistSubscription = supabase
      .channel('waitlist_stats_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'waitlist' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      inviteCodesSubscription.unsubscribe();
      waitlistSubscription.unsubscribe();
    };
  }, []);

  return { stats, loading, error };
}






