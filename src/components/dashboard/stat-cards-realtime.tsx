'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, Users, CreditCard, TrendingUp, UserPlus } from 'lucide-react';
import { useGlobal } from "@/contexts/global-context";
import { useCreditBalances, useCreditPurchases, useSubscriptions } from '@/hooks/use-realtime-data';
import { supabase } from '@/lib/supabase';
import { formatCurrency, getUserType } from '@/lib/utils';

export function StatCardsRealtime() {
  const { creditBalances, loading: balancesLoading } = useCreditBalances();
  const { userProfiles, userProfilesLoading: usersLoading } = useGlobal();
  const { creditPurchases, loading: purchasesLoading } = useCreditPurchases();
  const { subscriptions, loading: subscriptionsLoading } = useSubscriptions();
  const [externalCredits, setExternalCredits] = React.useState<number>(0);
  const [internalCredits, setInternalCredits] = React.useState<number>(0);
  const [usageCreditsLoading, setUsageCreditsLoading] = React.useState(true);

  const loading = balancesLoading || usersLoading || purchasesLoading || subscriptionsLoading;

  // Fetch external and internal credits from usage logs (matching usage logs page calculation)
  React.useEffect(() => {
    const fetchUsageCredits = async () => {
      try {
        setUsageCreditsLoading(true);
        // Fetch both external and internal user totals in parallel
        const [externalResponse, internalResponse] = await Promise.all([
          fetch('/api/usage-logs-aggregated', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              page: 1,
              limit: 1,
              searchQuery: '',
              activityFilter: 'all',
              userTypeFilter: 'external',
            }),
          }),
          fetch('/api/usage-logs-aggregated', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              page: 1,
              limit: 1,
              searchQuery: '',
              activityFilter: 'all',
              userTypeFilter: 'internal',
            }),
          }),
        ]);

        const externalData = await externalResponse.json();
        const internalData = await internalResponse.json();

        const externalCost = externalData.success ? (externalData.grandTotalCost || 0) : 0;
        const internalCost = internalData.success ? (internalData.grandTotalCost || 0) : 0;

        // Calculate credits as cost × 100 (matching usage logs page)
        setExternalCredits(externalCost * 100);
        setInternalCredits(internalCost * 100);
      } catch (error) {
        console.error('Error fetching usage credits:', error);
        setExternalCredits(0);
        setInternalCredits(0);
      } finally {
        setUsageCreditsLoading(false);
      }
    };

    fetchUsageCredits();
    
    // Refresh every 30 seconds to keep it updated (fallback)
    const interval = setInterval(fetchUsageCredits, 30000);

    // Subscribe to usage_logs changes to update credits in real-time
    const subscription = supabase
      .channel('dashboard_stats_usage_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'usage_logs',
        },
        () => {
          // Debounce updates to avoid excessive API calls
          console.log('Real-time update: Refreshing dashboard credits...');
          fetchUsageCredits();
        }
      )
      .subscribe();
    
    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  // Calculate stats from credit balances and user profiles
  const stats = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter out internal users (only count external users)
    const externalUserProfiles = userProfiles.filter(profile => {
      const userType = getUserType(profile.email);
      return userType === 'external';
    });

    const paidUserIds = new Set([
      ...creditPurchases.map(purchase => purchase.userId),
      ...subscriptions.map(sub => sub.userId)
    ]);

    // Helper function to calculate subscription amount based on plan
    const getSubscriptionAmount = (sub: typeof subscriptions[0]): number => {
      const planName = (sub.planName || '').toLowerCase();
      const planType = (sub.planType || '').toLowerCase();
      const planInfo = `${planName} ${planType}`.toLowerCase();
      
      let amount = 0;
      // Check planType first for monthly subscriptions
      if (planType === 'seed') {
        amount = 5; // Monthly seed subscription: $5
      }
      else if (planType === 'edge') {
        amount = 10; // Monthly edge subscription: $10
      }
      // Other plans - keep existing values
      else if (planInfo.includes('quantum')) {
        amount = 149.99;
      }
      else if (planInfo.includes('monthly_basic_inferred')) {
        amount = 7.99;
      }
      // Fallback: if planType is not set but planName contains seed/edge
      else if (planName.includes('seed') && !planInfo.includes('quantum')) {
        amount = 5; // Monthly seed price
      }
      else if (planName.includes('edge') && !planInfo.includes('quantum')) {
        amount = 10; // Monthly edge price
      }
      
      return amount;
    };

    // Calculate total revenue from credit purchases (completed payments only)
    // Note: API already filters by completed status, but we filter again for safety
    const creditPurchaseRevenue = creditPurchases
      .filter(purchase => purchase.status === 'completed' && purchase.amountDollars > 0)
      .reduce((sum, purchase) => sum + (purchase.amountDollars || 0), 0);

    // Separate subscriptions into initial subscriptions and renewals
    // A renewal is identified when createdAt !== updatedAt (subscription was updated after creation)
    const activeSubscriptions = subscriptions.filter(sub => {
      const status = (sub.status || '').toLowerCase();
      return status === 'active' || status === 'trialing';
    });

    // Initial subscriptions: subscriptions where createdAt === updatedAt (or very close, within 1 second)
    const initialSubscriptions = activeSubscriptions.filter(sub => {
      if (!sub.createdAt || !sub.updatedAt) return false;
      const timeDiff = Math.abs(sub.updatedAt.getTime() - sub.createdAt.getTime());
      // Consider it initial if created and updated within 1 second (1000ms)
      return timeDiff <= 1000;
    });

    // Renewals: subscriptions where createdAt !== updatedAt (updated after creation)
    const renewals = activeSubscriptions.filter(sub => {
      if (!sub.createdAt || !sub.updatedAt) return false;
      const timeDiff = Math.abs(sub.updatedAt.getTime() - sub.createdAt.getTime());
      // Consider it a renewal if updated more than 1 second after creation
      return timeDiff > 1000;
    });

    // Calculate revenue from initial subscriptions
    const initialSubscriptionRevenue = initialSubscriptions.reduce((sum, sub) => {
      return sum + getSubscriptionAmount(sub);
    }, 0);

    // Calculate revenue from renewals
    const renewalRevenue = renewals.reduce((sum, sub) => {
      return sum + getSubscriptionAmount(sub);
    }, 0);

    // Total subscription revenue (for backward compatibility)
    const subscriptionRevenue = initialSubscriptionRevenue + renewalRevenue;

    // Total Helium Revenue = Credit Purchases + Initial Subscriptions + Renewals
    const totalRevenue = creditPurchaseRevenue + initialSubscriptionRevenue + renewalRevenue;

    // Filter paid user IDs to only include external users
    const externalPaidUserIds = new Set(
      Array.from(paidUserIds).filter(userId => {
        const profile = userProfiles.find(p => p.userId === userId);
        return profile && getUserType(profile.email) === 'external';
      })
    );

    return {
      totalUsers: externalUserProfiles.length,
      totalCredits: creditBalances.reduce((sum, balance) => sum + Math.round(balance.balanceDollars * 100), 0),
      newUsersToday: externalUserProfiles.filter(user => user.createdAt >= today).length,
      paidUsers: externalPaidUserIds.size,
      totalBalance: creditBalances.reduce((sum, balance) => sum + balance.balanceDollars, 0),
      totalRevenue: totalRevenue,
      creditPurchaseRevenue: creditPurchaseRevenue,
      initialSubscriptionRevenue: initialSubscriptionRevenue,
      renewalRevenue: renewalRevenue,
      subscriptionRevenue: subscriptionRevenue, // Total for backward compatibility
    };
  }, [userProfiles, creditBalances, creditPurchases, subscriptions]);

  // Format credits with 3 decimal places to match usage logs page format
  const formatCredits = (credits: number): string => {
    return credits.toLocaleString('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      description: 'Registered users',
    },
    {
      title: 'Total Credits',
      value: stats.totalCredits.toLocaleString(),
      icon: CreditCard,
      description: usageCreditsLoading 
        ? 'Loading...' 
        : (
          <>
            External: {formatCredits(externalCredits)}
            <br />
            Internal: {formatCredits(internalCredits)}
          </>
        ),
    },
    {
      title: 'New Users Today',
      value: stats.newUsersToday.toLocaleString(),
      icon: UserPlus,
      description: 'Registered today',
    },
    {
      title: 'Paid Users',
      value: stats.paidUsers.toLocaleString(),
      icon: DollarSign,
      description: 'Made a purchase',
    },
    // {
    //   title: 'Helium Revenue',
    //   value: formatCurrency(stats.totalRevenue),
    //   icon: TrendingUp,
    //   description: (
    //     <>
    //       Purchases: {formatCurrency(stats.creditPurchaseRevenue)}
    //       <br />
    //       Subscriptions: {formatCurrency(stats.initialSubscriptionRevenue)}
    //       <br />
    //       Renewals: {formatCurrency(stats.renewalRevenue)}
    //     </>
    //   ),
    // },
  ];

  const themeColors = ['primary', 'secondary', 'muted', 'accent', 'primary'];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-4">
      {statCards.map((stat, index) => (
        <Card key={stat.title} className="group bg-background border-primary/20 hover:border-primary/70 glare-effect hover:scale-[1.03] duration-500 transition-all ease-in-out">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">{stat.title}</CardTitle>
            <stat.icon className={` group-hover:text-primary duration-700 ease-in-out transition-all`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold text-${themeColors[index]}`}>{stat.value}</div>
            <p className="text-lg text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
