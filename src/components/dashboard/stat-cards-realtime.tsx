'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, Users, CreditCard, TrendingUp } from 'lucide-react';
import { useCreditBalances, useUserProfiles } from '@/hooks/use-realtime-data';

export function StatCardsRealtime() {
  const { creditBalances, loading: balancesLoading } = useCreditBalances();
  const { userProfiles, loading: usersLoading } = useUserProfiles();
  const [externalCredits, setExternalCredits] = React.useState<number>(0);
  const [internalCredits, setInternalCredits] = React.useState<number>(0);
  const [usageCreditsLoading, setUsageCreditsLoading] = React.useState(true);

  const loading = balancesLoading || usersLoading;

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
    
    // Refresh every 30 seconds to keep it updated
    const interval = setInterval(fetchUsageCredits, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate stats from credit balances and user profiles
  const stats = {
    totalUsers: userProfiles.length,
    totalCredits: creditBalances.reduce((sum, balance) => sum + Math.round(balance.balanceDollars * 100), 0),
    totalPurchased: creditBalances.reduce((sum, balance) => sum + Math.round(balance.totalPurchased * 100), 0),
    totalUsed: creditBalances.reduce((sum, balance) => sum + Math.round(balance.totalUsed * 100), 0),
    totalBalance: creditBalances.reduce((sum, balance) => sum + balance.balanceDollars, 0),
  };

  // Format credits with 3 decimal places to match usage logs page format
  const formatCredits = (credits: number): string => {
    return credits.toLocaleString('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        : `External: ${formatCredits(externalCredits)} | Internal: ${formatCredits(internalCredits)}`,
    },
    {
      title: 'Total Purchased',
      value: stats.totalPurchased.toLocaleString(),
      icon: DollarSign,
      description: 'Credits purchased',
    },
    {
      title: 'Total Used',
      value: stats.totalUsed.toLocaleString(),
      icon: TrendingUp,
      description: 'Credits used',
    },
  ];

  const themeColors = ['primary', 'secondary', 'muted', 'accent'];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <Card key={stat.title} className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 text-${themeColors[index]}`} />
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
