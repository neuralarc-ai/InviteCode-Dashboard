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
import { generateAvatar } from "@/lib/utils";
import Link from "next/link";
import { useRecentCreditUsage } from "@/hooks/use-recent-credit-usage";
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
    if (diffInHours < 24) return `${diffInHours} h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} d ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 mt-6 sm:mt-8">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Recently Used Credits
            </h2>
            <p className="text-sm text-muted-foreground">
              Latest credit consumption activities
            </p>
          </div>
        </div>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="w-full h-[88px] sm:h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 mt-6 sm:mt-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
            Recently Used Credits
          </h2>
          <p className="text-sm text-muted-foreground">
            Latest credit consumption activities
          </p>
        </div>
        {/* <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex shrink-0"
          asChild
        >
          <Link href="/usage">
            <ExternalLink className="mr-2 h-4 w-4" />
            View All
          </Link>
        </Button> */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden shrink-0"
          asChild
        >
          <Link href="/usage">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {recentUsage.map((usage) => (
          <div
            key={usage.id}
            className={`
              grid grid-cols-1 sm:grid-cols-[1fr_auto] 
              gap-3 sm:gap-4 
              p-4 sm:p-5 
              rounded-xl border bg-card/50 hover:bg-card/80 
              border-primary/10 hover:border-primary/40 
              transition-all duration-300 group
            `}
          >
            {/* Left / Main content */}
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <Avatar className="h-10 w-10 sm:h-11 sm:w-11 border border-border shrink-0">
                <AvatarImage
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(
                    generateAvatar(usage.userId)
                  )}`}
                  alt={usage.userName}
                />
                <AvatarFallback className="text-xs sm:text-sm">
                  {usage.userName?.substring(0, 2).toUpperCase() || "US"}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
                <p className="text-sm sm:text-base font-medium leading-tight truncate">
                  {usage.userName}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {usage.userEmail}
                </p>
                <p className="text-xs text-muted-foreground">
                  {usage.description || "Usage"} • {getTimeAgo(usage.createdAt)}
                </p>
              </div>
            </div>

            {/* Right / Credits + Tier */}
            <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1.5 justify-end">
              <div className="flex items-center gap-1.5 font-bold text-base sm:text-lg text-white group-hover:text-primary transition-colors">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 fill-white group-hover:fill-primary transition-colors" />
                {Math.round(usage.amountDollars * 100).toLocaleString()}
              </div>
              <Badge
                variant="secondary"
                className="text-[10px] sm:text-xs px-2.5 py-0 h-5 sm:h-6 whitespace-nowrap"
              >
                {usage.subscriptionTier || "Standard"}
              </Badge>
            </div>
          </div>
        ))}

        {recentUsage.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm sm:text-base">
            No recent credit usage found.
          </div>
        )}
      </div>
    </div>
  );
}
