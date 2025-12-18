'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import type { CreditUsage, CreditUsageGrouped } from '@/lib/types';
import { dbOperations } from '@/lib/db';

export function useCreditUsage() {
  const [creditUsage, setCreditUsage] = useState<CreditUsageGrouped[]>([]);
  const [rawUsage, setRawUsage] = useState<CreditUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Grouping Logic
  const groupUsageData = useCallback((rawData: CreditUsage[]): CreditUsageGrouped[] => {
      const grouped = rawData.reduce((acc: Record<string, CreditUsageGrouped>, usage) => {
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
        
        // Add unique values
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

      return Object.values(grouped).sort((a, b) => b.totalAmountDollars - a.totalAmountDollars);
  }, []);

  const fetchCreditUsage = async () => {
    try {
      console.log('Fetching credit usage...');
      
      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('credit_usage')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < pageSize) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }

      if (allData.length === 0) {
        setRawUsage([]);
        setCreditUsage([]);
        await dbOperations.clear('credit_usage');
        setLoading(false);
        return;
      }

      // Optimization: Compare with cache to avoid re-fetching names/emails
      const cachedRaw = await dbOperations.getAll('credit_usage');
      const cachedMap = new Map(cachedRaw.map(c => [c.id, c]));

      const missingUserIds = new Set<string>();
      const transformedUsage: CreditUsage[] = [];

      allData.forEach(row => {
          const cached = cachedMap.get(row.id);
          if (cached) {
              transformedUsage.push(cached);
          } else {
              // Need to transform and potentially fetch user info
              // For now, basic transform, then collect userIds
              missingUserIds.add(row.user_id);
              transformedUsage.push({
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
                  userEmail: 'Email not available', // Placeholder
                  userName: `User ${row.user_id.slice(0, 8)}`, // Placeholder
              });
          }
      });

      // Fetch metadata for new items
      if (missingUserIds.size > 0) {
           const userIds = Array.from(missingUserIds);
           // ... logic to fetch emails/names ...
           // reusing logic from original hook but compacted
           const userIdToEmail = new Map<string, string>();
           const userIdToName = new Map<string, string>();

           // 1. Fetch Emails API
           try {
                const response = await fetch('/api/fetch-user-emails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userIds }),
                });
                if (response.ok) {
                    const userData = await response.json();
                    userData.forEach((u: any) => userIdToEmail.set(u.id, u.email));
                }
           } catch (e) { console.warn(e); }

           // 2. Fetch Names (User Profiles)
           try {
               const { data: profiles } = await supabase.from('user_profiles').select('user_id, full_name, preferred_name').in('user_id', userIds);
               profiles?.forEach(p => {
                   const name = p.preferred_name || p.full_name;
                   if (name) userIdToName.set(p.user_id, name);
               });
           } catch (e) { console.warn(e); }

           // Apply
           transformedUsage.forEach(usage => {
               if (missingUserIds.has(usage.userId)) {
                   if (userIdToEmail.has(usage.userId)) usage.userEmail = userIdToEmail.get(usage.userId)!;
                   if (userIdToName.has(usage.userId)) usage.userName = userIdToName.get(usage.userId)!;
               }
           });
      }

      setRawUsage(transformedUsage);
      setCreditUsage(groupUsageData(transformedUsage));
      setError(null);
      
      await dbOperations.putAll('credit_usage', transformedUsage);

    } catch (err) {
      console.error('Error fetching credit usage:', err);
      setError(`Failed to fetch credit usage: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshCreditUsage = async () => {
    setLoading(true);
    await fetchCreditUsage();
  };

  useEffect(() => {
    // 1. Load Cache
    const loadCache = async () => {
        try {
            const cached = await dbOperations.getAll('credit_usage');
            if (cached && cached.length > 0) {
                setRawUsage(cached);
                setCreditUsage(groupUsageData(cached));
                setLoading(false);
            }
        } catch (e) { console.warn(e); }
    };
    loadCache();
    
    // 2. Fetch Fresh
    fetchCreditUsage();

    // 3. Realtime
    const subscription = supabase
      .channel('credit_usage_changes_optimized')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'credit_usage' },
        async (payload) => {
             console.log('Real-time credit usage update (Delta):', payload);
             if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                  // For simple logic, assume we might miss user email/name on immediate insert 
                  // or we can fetch it single-item style.
                  // For now, let's insert with defaults and let next refresh fix it or try to fetch.
                  const row = payload.new;
                  const newUsage: CreditUsage = {
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
                      userEmail: 'Fetching...', 
                      userName: 'Fetching...', 
                  };

                  // Ideally fetch metadata here
                  // Update state
                  setRawUsage(prev => {
                      const updated = payload.eventType === 'INSERT' 
                        ? [newUsage, ...prev] 
                        : prev.map(u => u.id === newUsage.id ? newUsage : u);
                      // Side effect: update grouped
                      setCreditUsage(groupUsageData(updated));
                      // Side effect: update DB
                      dbOperations.put('credit_usage', newUsage);
                      return updated;
                  });

             } else if (payload.eventType === 'DELETE') {
                  const deletedId = payload.old.id;
                  setRawUsage(prev => {
                      const updated = prev.filter(u => u.id !== deletedId);
                      setCreditUsage(groupUsageData(updated));
                      dbOperations.delete('credit_usage', deletedId);
                      return updated;
                  });
             }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [groupUsageData]);

  return { creditUsage, rawUsage, loading, error, refreshCreditUsage };
}


