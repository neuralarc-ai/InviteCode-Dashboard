"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent
} from "@/components/ui/card";
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
    // Assuming balanceDollars corresponds to credits (e.g. 1 dollar = 100 credits, or just display raw balance)
    // The image shows "1473 CREDITS".
    // In credit-assignment-dialog, we saw "100 credits = $1.00".
    // So if balanceDollars is stored, credits = balanceDollars * 100.
    // Let's check useCreditBalances hook output again.
    // It returns `balanceDollars`.
    // Wait, the hook `useCreditBalances` returns `balanceDollars`.
    // If the requirement is to show "Credits", I should multiply by 100.
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
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Recently Onboarded Users
            </h2>
            <p className="text-sm text-muted-foreground">
              New users who joined in the last 7 days
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="aspect-square  rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (recentUsers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Recently Onboarded Users
            </h2>
            <p className="text-sm text-muted-foreground">
              New users who joined in the last 7 days
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <User className="h-12 w-12 mb-4 opacity-50" />
            <p>No new users in the last 7 days.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Recently Onboarded Users
          </h2>
          <p className="text-sm text-muted-foreground">
            New users who joined in the last 7 days
          </p>
        </div>
        <Link href="/users">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <ExternalLink className="mr-2 h-4 w-4" />
            View All
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {recentUsers.map((user) => (
          <Card
            key={user.id}
            className="overflow-hidden bg-card/50 backdrop-blur hover:bg-card/80 transition-colors"
          >
            <CardContent className="p-6 flex flex-col items-center">
              <div className="mb-4 rounded-full border-2 border-border p-1 bg-background">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(
                      generateAvatar(user.userId)
                    )}`}
                    alt={user.fullName}
                  />
                  <AvatarFallback>
                    {user.fullName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="text-center mb-6 space-y-1">
                <h3 className="font-semibold truncate w-full max-w-[200px] text-lg leading-none">
                  {user.fullName}
                </h3>
                <p className="text-xs text-muted-foreground truncate w-full max-w-[200px]">
                  {user.email}
                </p>
              </div>

              <div className="w-full flex items-center justify-between text-sm mt-auto pt-4 border-t border-border/50">
                <div className="flex flex-col items-start">
                  <span className="font-bold">
                    {getDaysAgo(user.createdAt)}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Joined
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-bold">{getCredits(user.userId)}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Credits
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
