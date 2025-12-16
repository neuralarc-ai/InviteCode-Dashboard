"use client"

import { useCreditPurchases, useSubscriptions, useUserProfiles } from '@/hooks/use-realtime-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, RefreshCw, ArrowUpCircle, ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import Link from 'next/link';

interface TransactionItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'Credit Purchase' | 'Subscription' | 'Renewal' | 'Upgrade';
  description: string;
  amount: number;
  status: string;
  date: Date;
  source: 'credit_purchase' | 'subscription';
}

export function RecentTransactions() {
  const { creditPurchases, loading: loadingPurchases } = useCreditPurchases();
  const { subscriptions, loading: loadingSubs } = useSubscriptions();
  const { userProfiles, loading: loadingProfiles } = useUserProfiles();

  const transactions = useMemo(() => {
    const items: TransactionItem[] = [];

    // Map user profiles for quick lookup
    const userMap = new Map(userProfiles.map(u => [u.userId, u]));

    // Process Credit Purchases
    creditPurchases.forEach(purchase => {
      // Use name from purchase record or fallback to profile or fallback to ID
      const profile = userMap.get(purchase.userId);
      const userName = purchase.userName !== 'User not available' ? purchase.userName : (profile?.fullName || `User ${purchase.userId.slice(0, 4)}`);
      
      items.push({
        id: `cp-${purchase.id}`,
        userId: purchase.userId,
        userName: userName,
        userEmail: purchase.userEmail,
        type: 'Credit Purchase',
        description: purchase.description || 'Credits',
        amount: purchase.amountDollars,
        status: purchase.status || 'Success',
        date: new Date(purchase.createdAt),
        source: 'credit_purchase'
      });
    });

    // Process Subscriptions
    // We treat the latest update as the transaction time
    subscriptions.forEach(sub => {
      const profile = userMap.get(sub.userId);
      const userName = profile?.fullName || `User ${sub.userId.slice(0, 4)}`;
      const userEmail = profile?.email || 'Email not available';

      // Determine transaction type based on status/dates
      // This is an approximation since we don't have a transaction log for subs
      let type: TransactionItem['type'] = 'Subscription';
      if (sub.createdAt.getTime() !== sub.updatedAt.getTime()) {
        type = 'Renewal'; // or Upgrade
      }

      // Estimate price based on plan (Placeholder logic)
      let amount = 0;
      const planInfo = `${sub.planName || ''} ${sub.planType || ''}`.toLowerCase();
      if (planInfo.includes('quantum')) amount = 149.99;
      else if (planInfo.includes('edge')) amount = 299.99;
      else if (planInfo.includes('monthly_basic_inferred')) amount = 7.99;
      else if (planInfo.includes('seed')) amount = 0;
      
      items.push({
        id: `sub-${sub.id}`,
        userId: sub.userId,
        userName: userName,
        userEmail: userEmail,
        type: type,
        description: `${sub.planName || 'Plan'} ${sub.planType || ''}`,
        amount: amount,
        status: (sub.status === 'active' || sub.status === 'succeeded') ? 'Success' : (sub.status || 'Active'),
        date: new Date(sub.updatedAt), // Using updated_at as the "transaction" time
        source: 'subscription'
      });
    });

    // Sort by date descending
    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);
  }, [creditPurchases, subscriptions, userProfiles]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  const isLoading = loadingPurchases || loadingSubs || loadingProfiles;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Recent Transactions</h2>
            <p className="text-sm text-muted-foreground">Latest payment and subscription activities</p>
          </div>
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 w-full animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Recent Transactions</h2>
          <p className="text-sm text-muted-foreground">Latest payment and subscription activities</p>
        </div>
        
      </div>

      <div className="grid gap-4">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between p-2 rounded-[12px] h-20 px-4 border bg-card/50 hover:bg-card/80 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                {tx.source === 'subscription' ? (
                  <RefreshCw className="h-5 w-5 text-blue-500" />
                ) : (
                  <CreditCard className="h-5 w-5 text-green-500" />
                )}
              </div>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">{tx.userName}</p>
                <p className="text-xs text-muted-foreground">
                  {tx.type} • {tx.description} • {getTimeAgo(tx.date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="font-bold">{formatCurrency(tx.amount)}</div>
              <Badge variant={tx.status.toLowerCase() === 'success' ? 'default' : 'secondary'} className="capitalize">
                <div className={`mr-1 h-1.5 w-1.5 rounded-full ${
                    tx.status.toLowerCase() === 'success'
                    ? 'bg-green-500' 
                    : 'bg-gray-500'
                }`} />
                {tx.status}
              </Badge>
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
                No recent transactions found.
            </div>
        )}
      </div>
    </div>
  );
}

