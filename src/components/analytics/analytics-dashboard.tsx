'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Activity, Eye, MousePointerClick, RefreshCw } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { Button } from '@/components/ui/button';

interface AnalyticsData {
  overview: {
    activeUsers: string;
    sessions: string;
    screenPageViews: string;
    engagementRate: string;
  };
  dailyUsers: {
    date: string;
    users: number;
  }[];
  topCountries: {
    country: string;
    users: number;
  }[];
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/analytics');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch analytics data');
      }

      setData(result.data);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-destructive font-medium">Failed to load analytics data</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={fetchData} variant="outline">Retry</Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        
        <Button onClick={fetchData} disabled={loading} size="sm" variant="outline">
           <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
           Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{data?.overview.activeUsers}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Total active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
               <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{data?.overview.sessions}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Total sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
               <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{data?.overview.screenPageViews}</div>
            )}
             <p className="text-xs text-muted-foreground mt-1">Total screen views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
               <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{data?.overview.engagementRate}</div>
            )}
             <p className="text-xs text-muted-foreground mt-1">Engaged sessions percentage</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        {/* Main Chart: Active Users Over Time */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
            <CardDescription>
              Daily active users over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-[250px] w-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.dailyUsers}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      minTickGap={30}
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `${value}`} 
                    />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', color: '#000000' }}
                        itemStyle={{ color: '#000000' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2} 
                      activeDot={{ r: 6 }} 
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Secondary Chart: Top Countries */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Countries</CardTitle>
            <CardDescription>
              User distribution by country
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-[300px] w-full">
               {loading ? (
                  <div className="flex items-center justify-center h-full">
                      <Skeleton className="h-[250px] w-full" />
                  </div>
               ) : (
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={data?.topCountries} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                     <XAxis type="number" hide />
                     <YAxis 
                       dataKey="country" 
                       type="category" 
                       width={100} 
                       tick={{ fontSize: 12 }} 
                       tickLine={false}
                       axisLine={false}
                     />
                     <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', color: '#000000' }}
                        itemStyle={{ color: '#000000' }}
                     />
                     <Bar dataKey="users" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={32} />
                   </BarChart>
                 </ResponsiveContainer>
               )}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

