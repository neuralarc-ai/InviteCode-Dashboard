'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useCreditUsage, useUserProfiles, useCreditPurchases } from '@/hooks/use-realtime-data';
import { TrendingUp, Users } from 'lucide-react';

// Generate user registration data for the last 7 days
const generateUserRegistrationData = (users: any[]) => {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const count = users.filter(user => {
      const userDate = new Date(user.createdAt);
      return userDate >= date && userDate <= dayEnd;
    }).length;
    
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count,
    };
  });
  return last7Days;
};

// Generate credit usage data for the last 7 days
const generateCreditUsageData = (creditUsage: any[], creditPurchases: any[]) => {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Get usage transactions for this day
    const dayUsage = creditUsage.filter(transaction => {
      const transactionDate = new Date(transaction.latestCreatedAt);
      return transactionDate >= date && transactionDate <= dayEnd;
    });
    
    const used = dayUsage.reduce((sum, t) => sum + Math.round(t.totalAmountDollars * 100), 0);
    
    // Get purchase transactions for this day
    const dayPurchases = creditPurchases.filter(purchase => {
      const purchaseDate = purchase.completedAt ? new Date(purchase.completedAt) : new Date(purchase.createdAt);
      return purchaseDate >= date && purchaseDate <= dayEnd;
    });
    
    const purchased = dayPurchases.reduce((sum, p) => sum + Math.round(p.amountDollars * 100), 0);
    
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      used,
      purchased,
    };
  });
  return last7Days;
};


export function AnalyticsCharts() {
  const { userProfiles, loading: usersLoading, error: usersError } = useUserProfiles();
  const { creditUsage, loading: creditLoading, error: creditError } = useCreditUsage();
  const { creditPurchases, loading: purchasesLoading, error: purchasesError } = useCreditPurchases();

  const userData = React.useMemo(() => generateUserRegistrationData(userProfiles), [userProfiles]);
  const creditData = React.useMemo(() => generateCreditUsageData(creditUsage, creditPurchases), [creditUsage, creditPurchases]);

  if (usersLoading || creditLoading || purchasesLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Registration Trends
            </CardTitle>
            <CardDescription>Daily user registrations over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Credit Usage Trends
            </CardTitle>
            <CardDescription>Daily credit usage over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (usersError || creditError || purchasesError) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Registration Trends
            </CardTitle>
            <CardDescription>Daily user registrations over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-destructive">
              Error loading chart data
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Credit Usage Trends
            </CardTitle>
            <CardDescription>Daily credit usage over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-destructive">
              Error loading chart data
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Registration Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Registration Trends
            </CardTitle>
            <CardDescription>Daily user registrations over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                registrations: {
                  label: 'User Registrations',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => `Date: ${value}`}
                        formatter={(value) => [value, 'Registrations']}
                      />
                    }
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--chart-1))" 
                    radius={[4, 4, 0, 0]}
                    className="fill-primary"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Credit Usage Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Credit Usage Trends
            </CardTitle>
            <CardDescription>Daily credit usage over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                used: {
                  label: 'Credits Used',
                },
                purchased: {
                  label: 'Credits Purchased',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={creditData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => `Date: ${value}`}
                      />
                    }
                  />
                  <Line 
                    type="monotone" 
                    dataKey="used" 
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 2, r: 4 }}
                    name="Credits Used"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="purchased" 
                    stroke="hsl(var(--chart-4))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-4))', strokeWidth: 2, r: 4 }}
                    name="Credits Purchased"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
