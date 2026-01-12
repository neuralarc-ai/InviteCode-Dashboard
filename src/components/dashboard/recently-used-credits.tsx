"use client";

import { useCreditUsage } from "@/hooks/use-realtime-data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Zap, ExternalLink } from "lucide-react";
import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import * as adventurer from "@dicebear/adventurer";
import Link from "next/link";
import { useRecentCreditUsage } from "@/hooks/use-recent-credit-usage";
import { generateAvatar } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";

export function RecentlyUsedCredits() {
  const { recentUsage, isLoading, hasUsage } = useRecentCreditUsage();

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };


  if (isLoading) {
    return (
      <div className="space-y-4 mt-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Recently Used Credits
            </h2>
            <p className="text-sm text-muted-foreground">
              Latest credit consumption activities
            </p>
          </div>
        </div>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="w-full h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Recently Used Credits
          </h2>
          <p className="text-sm text-muted-foreground">
            Latest credit consumption activities
          </p>
        </div>
        <Button variant="outline" size="sm" className="hidden sm:flex">
          <ExternalLink className="mr-2 h-4 w-4" />
          View All
        </Button>
      </div>

      <div className="grid gap-4">
        {recentUsage.map((usage) => (
          <div
            key={usage.id}
            className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(
                    generateAvatar(usage.userId)
                  )}`}
                  alt={usage.userName}
                />
                <AvatarFallback>
                  {usage.userName?.substring(0, 2).toUpperCase() || "US"}
                </AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">
                  {usage.userName}
                </p>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {usage.userEmail}
                </p>
                <p className="text-xs text-muted-foreground">
                  {usage.description || "Usage"} • {getTimeAgo(usage.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 font-bold text-lg">
                <Zap className="h-4 w-4 fill-white text-white" />
                {Math.round(usage.amountDollars * 100)}
              </div>
              <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5">
                {usage.subscriptionTier || "Standard"}
              </Badge>
            </div>
          </div>
        ))}
        {recentUsage.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            No recent credit usage found.
          </div>
        )}
      </div>
    </div>
  );
}
