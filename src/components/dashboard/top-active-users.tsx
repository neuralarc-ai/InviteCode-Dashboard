"use client";

import { useGlobal } from "@/contexts/global-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import * as adventurer from "@dicebear/adventurer";
import type { CreditUsage } from "@/lib/types";
import { getUserType } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "../ui/badge";

// Activity status calculation - same logic as users-table-realtime.tsx
function calculateActivityStatusMap(
  rawUsage: CreditUsage[],
  activityWindowDays: number = 5,
): Map<string, boolean> {
  const now = new Date();
  const cutoffDate = new Date(
    now.getTime() - activityWindowDays * 24 * 60 * 60 * 1000,
  );

  const activityMap = new Map<string, boolean>();

  // Single pass through rawUsage array
  for (const usage of rawUsage) {
    if (usage.createdAt >= cutoffDate) {
      activityMap.set(usage.userId, true);
    }
  }

  return activityMap;
}

// Calculate usage statistics per user
function calculateUserStats(rawUsage: CreditUsage[]) {
  const userStatsMap = new Map<
    string,
    {
      userId: string;
      userName: string;
      userEmail: string;
      usageCount: number;
      totalCredits: number;
    }
  >();

  for (const usage of rawUsage) {
    const existing = userStatsMap.get(usage.userId);

    if (existing) {
      existing.usageCount += 1;
      existing.totalCredits += usage.amountDollars * 100; // Convert to credits
    } else {
      userStatsMap.set(usage.userId, {
        userId: usage.userId,
        userName: usage.userName || `User ${usage.userId.slice(0, 8)}`,
        userEmail: usage.userEmail || "Email not available",
        usageCount: 1,
        totalCredits: usage.amountDollars * 100,
      });
    }
  }

  return userStatsMap;
}

export function TopActiveUsers() {
  const { rawUsage, creditUsageLoading } = useGlobal();

  // Calculate activity status map using the same logic as users table
  const activityMap = useMemo(() => {
    return calculateActivityStatusMap(rawUsage || [], 5);
  }, [rawUsage]);

  // Calculate user statistics
  const userStats = useMemo(() => {
    return calculateUserStats(rawUsage || []);
  }, [rawUsage]);

  // Get only active users and sort by usage count
  const topActiveUsers = useMemo(() => {
    const activeUserIds = Array.from(activityMap.entries())
      .filter(([_, isActive]) => isActive)
      .map(([userId]) => userId);

    return activeUserIds
      .map((userId) => userStats.get(userId))
      .filter((user): user is NonNullable<typeof user> => user !== undefined)
      .filter((user) => getUserType(user.userEmail) === "external") // Filter to external users only
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);
  }, [activityMap, userStats]);

  if (creditUsageLoading && topActiveUsers.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Top 10 Highly Active Users
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Most engaged external users based on activity in the last 5 days
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full grid grid-cols-2  lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center space-y-4 p-4 border rounded-lg"
              >
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

  return (
    <Card className="w-full ">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top 10 Highly Active Users (External)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Most engaged external users based on activity in the last 5 days
          </p>
        </div>
        <Link href="/users">
          <Button variant="outline" size="sm" className="gap-2">
            View More
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {topActiveUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No active external users in the last 5 days
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {topActiveUsers.map((user, index) => (
              <div
                key={user.userId}
                className="relative flex hover:shadow-[0_0_30px_rgba(112,185,215,0.1)] hover:scale-[1.01] transition-all duration-300 ease-out flex-col items-center p-6 bg-card border rounded-lg border-primary/20 hover:border-primary/40"
              >
                {/* Rank Badge */}
                <div className="absolute top-4 left-4 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-background  text-sm font-bold border border-border">
                  {index + 1}
                </div>
              

                {/* Avatar */}
                <Avatar className="h-20 w-20 mb-4 ">
                  <AvatarImage
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(
                      createAvatar(adventurer, {
                        seed: user.userId,
                      }).toString(),
                    )}`}
                    alt={user.userName}
                  />
                  <AvatarFallback>
                    {user.userName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="text-center w-full mb-6">
                  <h3
                    className="font-semibold text-sm truncate w-full"
                    title={user.userName}
                  >
                    {user.userName}
                  </h3>
                  <p
                    className="text-xs text-muted-foreground truncate w-full"
                    title={user.userEmail}
                  >
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
                      {Math.round(user.totalCredits).toLocaleString()}
                    </div>
                    <div className="text-[10px] uppercase text-muted-foreground font-medium mt-1">
                      Credits
                    </div>
                  </div>
                </div>

                {/* Active Status Indicator */}
                <div className="mt-4 h-1 w-12 rounded-full bg-green-500" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
