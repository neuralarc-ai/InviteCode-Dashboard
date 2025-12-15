'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCreditUsage, useCreditPurchases } from '@/hooks/use-realtime-data';
import { DollarSign, Calendar, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface Transaction {
  userId: string;
  userName: string;
  userEmail: string;
  amountDollars: number;
  date: Date;
  type: 'used' | 'purchased';
}

export function RecentCreditTransactions() {
  const { rawUsage, loading: usageLoading, error: usageError } = useCreditUsage();
  const { creditPurchases, loading: purchasesLoading, error: purchasesError } = useCreditPurchases();

  const loading = usageLoading || purchasesLoading;
  const error = usageError || purchasesError;

  // Combine credit usage and purchases into a single transactions list
  const recentTransactions = React.useMemo(() => {
    const transactions: Transaction[] = [];

    // Add credit usage transactions (these are deductions/used)
    rawUsage.forEach(usage => {
      transactions.push({
        userId: usage.userId,
        userName: usage.userName || `User ${usage.userId.slice(0, 8)}`,
        userEmail: usage.userEmail || 'Email not available',
        amountDollars: usage.amountDollars,
        date: usage.createdAt,
        type: 'used',
      });
    });

    // Add credit purchase transactions (these are additions)
    creditPurchases.forEach(purchase => {
      transactions.push({
        userId: purchase.userId,
        userName: purchase.userName || `User ${purchase.userId.slice(0, 8)}`,
        userEmail: purchase.userEmail || 'Email not available',
        amountDollars: purchase.amountDollars,
        date: purchase.completedAt || purchase.createdAt,
        type: 'purchased',
      });
    });

    // Sort by date (most recent first) and take top 5
    return transactions
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
  }, [rawUsage, creditPurchases]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCredits = (amountDollars: number): string => {
    const credits = Math.round(amountDollars * 100);
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(credits);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recent Credit Consumption
          </CardTitle>
          <CardDescription>Latest 5 credit consumption</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted animate-pulse">
                <div className="h-8 w-8 bg-muted-foreground/20 rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
                  <div className="h-3 w-32 bg-muted-foreground/20 rounded" />
                </div>
                <div className="h-6 w-20 bg-muted-foreground/20 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recent Credit Consumption
          </CardTitle>
          <CardDescription>Latest 5 credit consumption</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            Error loading recent transactions: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Recent Credit Consumption
        </CardTitle>
        <CardDescription>Latest 5 credit consumption</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => {
              const isUsage = transaction.type === 'used';
              return (
                <div key={`${transaction.userId}-${transaction.date.getTime()}`} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className={`flex items-center justify-center h-8 w-8 rounded-full ${isUsage ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                    {isUsage ? (
                      <ArrowDownCircle className="h-4 w-4 text-red-400" />
                    ) : (
                      <ArrowUpCircle className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{transaction.userName}</p>
                      <Badge variant="outline" className={`text-xs ${isUsage ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>
                        {isUsage ? 'Used' : 'Purchased'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="font-mono">{formatCurrency(Math.abs(transaction.amountDollars))}</span>
                      <span className="text-muted-foreground">({formatCredits(Math.abs(transaction.amountDollars))} credits)</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {formatDate(transaction.date)}
                      </span>
                    </div>
                  </div>
                  <div className={`text-xs font-mono font-semibold ${isUsage ? 'text-red-400' : 'text-green-400'}`}>
                    {isUsage ? '-' : '+'}{formatCredits(Math.abs(transaction.amountDollars))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No credit transactions found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

