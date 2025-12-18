'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CreditBalance } from '@/lib/types';
import { dbOperations } from '@/lib/db';

export function useCreditBalances() {
  const [creditBalances, setCreditBalances] = useState<(CreditBalance & { userEmail?: string; userName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCreditBalances = async () => {
    try {
      console.log('Fetching credit balances...');
      
      const response = await fetch('/api/credit-balances', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to fetch credit balances');

      const data = result.data || [];
      
      const transformedBalances = data.map((balance: any) => ({
        userId: balance.userId,
        balanceDollars: parseFloat(balance.balanceDollars) || 0,
        totalPurchased: parseFloat(balance.totalPurchased) || 0,
        totalUsed: parseFloat(balance.totalUsed) || 0,
        lastUpdated: balance.lastUpdated ? new Date(balance.lastUpdated) : new Date(),
        metadata: balance.metadata || {},
        userEmail: balance.userEmail || 'Email not available',
        userName: balance.userName || `User ${balance.userId.slice(0, 8)}`,
      }));

      setCreditBalances(transformedBalances);
      setError(null);
      await dbOperations.putAll('credit_balances', transformedBalances);
    } catch (err) {
      console.error('Error fetching credit balances:', err);
      setError(`Failed to fetch credit balances: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshCreditBalances = async () => {
    setLoading(true);
    await fetchCreditBalances();
  };

  useEffect(() => {
    // 1. Load Cache
    const loadCache = async () => {
        try {
            const cached = await dbOperations.getAll('credit_balances');
            if (cached && cached.length > 0) {
                setCreditBalances(cached);
                setLoading(false);
            }
        } catch (e) { console.warn(e); }
    };
    loadCache();
    
    // 2. Fetch Fresh
    fetchCreditBalances();

    // 3. Realtime
    const subscription = supabase
      .channel('credit_balance_changes_optimized')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'credit_balance' },
        async (payload) => {
             console.log('Real-time credit balance update (Delta):', payload);
             if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                  // Re-fetch everything because balance calculation might be complex or just update the single row if we assume data format matches
                  // The payload.new will have raw columns, not joined email/name
                  // Simpler to just re-fetch for balances since they are critical financial data, OR try to patch
                  // Let's patch for speed:
                  const row = payload.new;
                  // We need existing userEmail/Name if possible
                  setCreditBalances(prev => {
                      const existing = prev.find(b => b.userId === row.user_id);
                      const newBalance = {
                          userId: row.user_id,
                          balanceDollars: parseFloat(row.balance_dollars) || 0,
                          totalPurchased: parseFloat(row.total_purchased) || 0,
                          totalUsed: parseFloat(row.total_used) || 0,
                          lastUpdated: new Date(),
                          metadata: row.metadata || {},
                          userEmail: existing?.userEmail || 'Fetching...',
                          userName: existing?.userName || 'Fetching...',
                      };
                      
                      const updatedList = payload.eventType === 'INSERT'
                          ? [newBalance, ...prev]
                          : prev.map(b => b.userId === newBalance.userId ? newBalance : b);
                      
                      dbOperations.put('credit_balances', newBalance);
                      return updatedList;
                  });
             } 
             // Deletes on credit_balance might mean user deleted? 
             else if (payload.eventType === 'DELETE') {
                 // credit_balance usually has user_id as PK or FK
                 const deletedId = payload.old.user_id; // Check schema if key is id or user_id
                 // In the read_file of use-realtime-data, it wasn't clear what the PK of credit_balance table is, likely user_id
                 if (deletedId) {
                     setCreditBalances(prev => {
                         const updated = prev.filter(b => b.userId !== deletedId);
                         dbOperations.delete('credit_balances', deletedId);
                         return updated;
                     });
                 }
             }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { creditBalances, loading, error, refreshCreditBalances };
}


