'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Subscription } from '@/lib/types';
import { dbOperations } from '@/lib/db';

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      console.log('Fetching subscriptions...');
      
      const response = await fetch('/api/subscriptions', { method: 'GET' });
      const payload = await response.json();

      if (!response.ok || !payload.success) throw new Error(payload.error || `HTTP error ${response.status}`);

      const data = payload.data || [];

      const transformedSubscriptions = data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        stripeCustomerId: row.stripe_customer_id,
        status: row.status,
        currentPeriodStart: row.current_period_start ? new Date(row.current_period_start) : null,
        currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : null,
        trialEnd: row.trial_end ? new Date(row.trial_end) : null,
        planName: row.plan_name,
        planType: row.plan_type,
        monthlyCreditAllocation: row.monthly_credit_allocation,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));

      setSubscriptions(transformedSubscriptions);
      setError(null);
      await dbOperations.putAll('subscriptions', transformedSubscriptions);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(`Failed to fetch subscriptions: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscriptions = async () => {
    setLoading(true);
    await fetchSubscriptions();
  };

  useEffect(() => {
    // 1. Load Cache
    const loadCache = async () => {
        try {
            const cached = await dbOperations.getAll('subscriptions');
            if (cached && cached.length > 0) {
                setSubscriptions(cached);
                setLoading(false);
            }
        } catch (e) { console.warn(e); }
    };
    loadCache();
    
    // 2. Fetch Fresh
    fetchSubscriptions();

    // 3. Realtime
    const subscription = supabase
      .channel('subscriptions_changes_optimized')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        async (payload) => {
          try {
            console.log('Real-time subscriptions update (Delta):', payload);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                 const row = payload.new;
                 const newItem: Subscription = {
                   id: row.id,
                   userId: row.user_id,
                   stripeSubscriptionId: row.stripe_subscription_id,
                   stripeCustomerId: row.stripe_customer_id,
                   status: row.status,
                   currentPeriodStart: row.current_period_start ? new Date(row.current_period_start) : null,
                   currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : null,
                   trialEnd: row.trial_end ? new Date(row.trial_end) : null,
                   planName: row.plan_name,
                   planType: row.plan_type,
                   monthlyCreditAllocation: row.monthly_credit_allocation,
                   createdAt: new Date(row.created_at),
                   updatedAt: new Date(row.updated_at),
                 };
                 
                 setSubscriptions(prev => {
                     const updated = payload.eventType === 'INSERT' 
                       ? [newItem, ...prev]
                       : prev.map(s => s.id === newItem.id ? newItem : s);
                     dbOperations.put('subscriptions', newItem);
                     return updated;
                 });
            } else if (payload.eventType === 'DELETE') {
                 const deletedId = payload.old.id;
                 setSubscriptions(prev => {
                     const updated = prev.filter(s => s.id !== deletedId);
                     dbOperations.delete('subscriptions', deletedId);
                     return updated;
                 });
            }
          } catch (error) {
            console.error('Error handling realtime update for subscriptions:', error);
            setError(`Realtime update error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to subscriptions realtime changes');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // Only log once to prevent spam
          console.warn('⚠️ Realtime not available for subscriptions. This is normal if realtime isn\'t enabled. The app will still work with manual refresh.');
          // DO NOT set error state or unsubscribe here - it can cause issues
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { subscriptions, loading, error, refreshSubscriptions };
}






