'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useWaitlistUsers, useInviteCodes } from '@/hooks/use-realtime-data';
import { TrendingUp, KeyRound } from 'lucide-react';

// Sample data for demonstration - replace with real data processing
const generateWaitlistData = (users: any[]) => {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: Math.floor(Math.random() * 10) + 1, // Replace with actual data
    };
  });
  return last7Days;
};

const generateInviteCodeData = (codes: any[]) => {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      used: Math.floor(Math.random() * 5), // Replace with actual data
      generated: Math.floor(Math.random() * 8) + 2,
    };
  });
  return last7Days;
};


export function AnalyticsCharts() {
  const { users, loading: usersLoading, error: usersError } = useWaitlistUsers();
  const { codes, loading: codesLoading, error: codesError } = useInviteCodes();

  const waitlistData = React.useMemo(() => generateWaitlistData(users), [users]);
  const inviteCodeData = React.useMemo(() => generateInviteCodeData(codes), [codes]);

  if (usersLoading || codesLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Waitlist Trends
            </CardTitle>
            <CardDescription>Daily waitlist signups over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Invite Code Usage
            </CardTitle>
            <CardDescription>Daily invite code usage over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (usersError || codesError) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Waitlist Trends
            </CardTitle>
            <CardDescription>Daily waitlist signups over the last 7 days</CardDescription>
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
              <KeyRound className="h-5 w-5" />
              Invite Code Usage
            </CardTitle>
            <CardDescription>Daily invite code usage over the last 7 days</CardDescription>
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
        {/* Waitlist Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Waitlist Trends
            </CardTitle>
            <CardDescription>Daily waitlist signups over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                waitlist: {
                  label: 'Waitlist Signups',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waitlistData}>
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
                        formatter={(value) => [value, 'Signups']}
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

        {/* Invite Code Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Invite Code Usage
            </CardTitle>
            <CardDescription>Daily invite code usage over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                used: {
                  label: 'Used Codes',
                },
                generated: {
                  label: 'Generated Codes',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={inviteCodeData}>
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
                  />
                  <Line 
                    type="monotone" 
                    dataKey="generated" 
                    stroke="hsl(var(--chart-4))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-4))', strokeWidth: 2, r: 4 }}
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
