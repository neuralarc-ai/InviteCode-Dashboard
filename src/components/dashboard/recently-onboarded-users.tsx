"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCreditBalances } from "@/hooks/use-realtime-data";
import { useRecentOnboardedUsers } from "@/hooks/use-recent-onboard-users";
import { generateAvatar } from "@/lib/utils";
import { ExternalLink, User } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "../ui/skeleton";

export function RecentlyOnboardedUsers() {
  const { creditBalances, loading: loadingCredits } = useCreditBalances();
  const { recentUsers, isLoading, hasUsers } = useRecentOnboardedUsers();

  const getCredits = (userId: string) => {
    const balance = creditBalances.find((b) => b.userId === userId);
    return balance ? Math.floor(balance.balanceDollars * 100) : 0;
  };

  const getDaysAgo = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  };

  if (isLoading || loadingCredits) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Recently Onboarded Users
            </h2>
            <p className="text-sm text-muted-foreground">
              New users who joined in the last 7 days
            </p>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2  md:grid-cols-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[160px]  rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (recentUsers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Recently Onboarded Users
            </h2>
            <p className="text-sm text-muted-foreground">
              New users who joined in the last 7 days
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 sm:py-12 text-center text-muted-foreground">
            <User className="h-10 w-10 sm:h-12 sm:w-12 mb-4 opacity-50" />
            <p className="text-sm sm:text-base">
              No new users in the last 7 days.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
            Recently Onboarded Users
          </h2>
          <p className="text-sm text-muted-foreground">
            New users who joined in the last 7 days
          </p>
        </div>
        <Link href="/users" className="shrink-0">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <ExternalLink className="mr-2 h-4 w-4" />
            View All
          </Button>
          <Button variant="ghost" size="icon" className="sm:hidden">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {recentUsers.map((user) => (
          <Card
            key={user.id}
            className="
              overflow-hidden bg-card/50 backdrop-blur 
              hover:bg-card/80 transition-all duration-300 
              border-primary/20 hover:border-primary/50 
              hover:shadow-[0_4px_20px_rgba(112,185,215,0.08)]
              rounded-xl
            "
          >
            <CardContent className="p-4 sm:p-6 flex flex-col items-center h-full">
              <div className="mb-4 sm:mb-5 rounded-full border-2 border-border/60 p-1 bg-background">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                  <AvatarImage
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(
                      generateAvatar(user.userId)
                    )}`}
                    alt={user.fullName}
                  />
                  <AvatarFallback className="text-lg sm:text-xl">
                    {user.fullName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="text-center mb-5 sm:mb-6 space-y-1 w-full">
                <h3 className="font-semibold text-base sm:text-lg leading-tight truncate max-w-full">
                  {user.fullName}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-full">
                  {user.email}
                </p>
              </div>

              <div className="w-full mt-auto pt-4 sm:pt-5 border-t border-border/50 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-base sm:text-lg">
                      {getDaysAgo(user.createdAt)}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Joined
                    </span>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="font-bold text-base sm:text-lg">
                      {getCredits(user.userId).toLocaleString()}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Credits
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
