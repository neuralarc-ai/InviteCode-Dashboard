'use client';

import { useUsageLogs } from '@/hooks/use-realtime-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect } from 'react';
import { createAvatar } from '@dicebear/core';
import * as adventurer from '@dicebear/adventurer';

export function TopActiveUsers() {
  const { usageLogs, loading, handleSort } = useUsageLogs();

  // Load top users sorted by activity score on mount
  useEffect(() => {
    handleSort('activity_score');
  }, []);

  if (loading && usageLogs.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Top 10 Highly Active Users
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Most engaged users based on activity and credit usage
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center space-y-4 p-4 border rounded-lg">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 text-center w-full">
                  <Skeleton className="h-4 w-[100px] mx-auto" />
                  <Skeleton className="h-3 w-[140px] mx-auto" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Take top 10 users
  const topUsers = usageLogs.slice(0, 10);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top 10 Highly Active Users
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Most engaged users based on activity and credit usage
          </p>
        </div>
       
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {topUsers.map((user, index) => (
            <div 
              key={user.userId} 
              className="relative flex flex-col items-center p-6 bg-card border rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Rank Badge */}
              <div className="absolute top-4 left-4 flex items-center justify-center w-6 h-6 rounded-full bg-white text-black text-xs font-bold border border-border">
                {index + 1}
              </div>

              {/* Avatar */}
              <Avatar className="h-20 w-20 mb-4 ">
                <AvatarImage 
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(createAvatar(adventurer, { seed: user.userId }).toString())}`} 
                  alt={user.userName} 
                />
                <AvatarFallback>{user.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div className="text-center w-full mb-6">
                <h3 className="font-semibold text-sm truncate w-full" title={user.userName}>
                  {user.userName}
                </h3>
                <p className="text-xs text-muted-foreground truncate w-full" title={user.userEmail}>
                  {user.userEmail}
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between w-full pt-4 border-t border-border">
                <div className="text-center flex-1 border-r border-border">
                  <div className="text-lg font-bold">
                    {user.usageCount.toLocaleString()}
                  </div>
                  <div className="text-[10px] uppercase text-muted-foreground font-medium mt-1">
                    Sessions
                  </div>
                </div>
                <div className="text-center flex-1">
                  <div className="text-lg font-bold">
                    {Math.round(user.totalEstimatedCost * 100).toLocaleString()}
                  </div>
                  <div className="text-[10px] uppercase text-muted-foreground font-medium mt-1">
                    Credits
                  </div>
                </div>
              </div>
              
              {/* Active Status Indicator */}
              <div className={`mt-4 h-1 w-12 rounded-full ${
                user.activityLevel === 'high' ? 'bg-green-500' :
                user.activityLevel === 'medium' ? 'bg-yellow-500' :
                'bg-muted'
              }`} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

