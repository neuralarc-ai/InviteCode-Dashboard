'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CreditPurchase } from '@/lib/types';
import { dbOperations } from '@/lib/db';

export function useCreditPurchases() {
  const [creditPurchases, setCreditPurchases] = useState<CreditPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to fetch metadata (emails/names) - similar to other hooks
  const fetchMetadata = async (userIds: string[]) => {
      const userIdToEmail = new Map<string, string>();
      const userIdToName = new Map<string, string>();
      if (userIds.length === 0) return { userIdToEmail, userIdToName };

      try {
          const response = await fetch('/api/fetch-user-emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userIds }),
          });
          if (response.ok) {
              const userData = await response.json();
              userData.forEach((u: any) => {
                  userIdToEmail.set(u.id, u.email);
                  userIdToName.set(u.id, u.full_name || u.email);
              });
          }
      } catch (e) { console.warn(e); }
      return { userIdToEmail, userIdToName };
  };

  const fetchCreditPurchases = async () => {
    try {
      console.log('Fetching credit purchases...');
      
      const response = await fetch('/api/credit-purchases', { method: 'GET' });
      const payload = await response.json();

      if (!response.ok || !payload.success) throw new Error(payload.error || `HTTP error ${response.status}`);

      const data = payload.data || [];
      
      if (data.length === 0) {
        setCreditPurchases([]);
        await dbOperations.clear('credit_purchases');
        setLoading(false);
        return;
      }

      // Check cache to minimize metadata fetching
      const cached = await dbOperations.getAll('credit_purchases');
      const cachedMap = new Map(cached.map(c => [c.id, c]));
      
      const missingMetadataIds = new Set<string>();
      const transformedPurchases: CreditPurchase[] = [];

      data.forEach((row: any) => {
          const cachedItem = cachedMap.get(row.id);
          // If status changed or not cached, re-process
          if (cachedItem && cachedItem.status === row.status) {
              transformedPurchases.push(cachedItem);
          } else {
              missingMetadataIds.add(row.user_id);
              transformedPurchases.push({
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
                userEmail: 'Email not available',
                userName: 'User not available',
              });
          }
      });

      if (missingMetadataIds.size > 0) {
          const { userIdToEmail, userIdToName } = await fetchMetadata(Array.from(missingMetadataIds));
          transformedPurchases.forEach(p => {
              if (missingMetadataIds.has(p.userId)) {
                  if (userIdToEmail.has(p.userId)) p.userEmail = userIdToEmail.get(p.userId)!;
                  if (userIdToName.has(p.userId)) p.userName = userIdToName.get(p.userId)!;
              }
          });
      }

      setCreditPurchases(transformedPurchases);
      setError(null);
      await dbOperations.putAll('credit_purchases', transformedPurchases);

    } catch (err) {
      console.error('Error fetching credit purchases:', err);
      setError(`Failed to fetch credit purchases: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshCreditPurchases = async () => {
    setLoading(true);
    await fetchCreditPurchases();
  };

  useEffect(() => {
    // 1. Load Cache
    const loadCache = async () => {
        try {
            const cached = await dbOperations.getAll('credit_purchases');
            if (cached && cached.length > 0) {
                setCreditPurchases(cached);
                setLoading(false);
            }
        } catch (e) { console.warn(e); }
    };
    loadCache();
    
    // 2. Fetch Fresh
    fetchCreditPurchases();

    // 3. Realtime
    const subscription = supabase
      .channel('credit_purchases_changes_optimized')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'credit_purchases' },
        async (payload) => {
            console.log('Real-time credit purchases update (Delta):', payload);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const row = payload.new;
                // Basic transform without metadata fetch for speed
                const newItem: CreditPurchase = {
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
                    userEmail: 'Fetching...', 
                    userName: 'Fetching...',
                };

                setCreditPurchases(prev => {
                    const updated = payload.eventType === 'INSERT' 
                        ? [newItem, ...prev]
                        : prev.map(p => p.id === newItem.id ? newItem : p);
                    
                    dbOperations.put('credit_purchases', newItem);
                    return updated;
                });
            } else if (payload.eventType === 'DELETE') {
                const deletedId = payload.old.id;
                setCreditPurchases(prev => {
                    const updated = prev.filter(p => p.id !== deletedId);
                    dbOperations.delete('credit_purchases', deletedId);
                    return updated;
                });
            }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { creditPurchases, loading, error, refreshCreditPurchases };
}


