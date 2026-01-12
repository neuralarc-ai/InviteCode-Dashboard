// src/hooks/use-recent-credit-usage.ts
import { useMemo } from "react";
import { useCreditUsage } from "@/hooks/use-realtime-data";
import { createAvatar } from "@dicebear/core";
import * as adventurer from "@dicebear/adventurer";

export interface RecentCreditUsage {
  id: string;
  userId: string;
  userName: string | undefined;
  userEmail: string | undefined;
  description: string | undefined;
  amountDollars: number;
  creditsUsed: number; // Transformed from amountDollars * 100
  createdAt: Date;
  subscriptionTier: string | undefined;
  timeAgo: string; // Formatted "time ago" string
  avatarUrl: string; // Generated avatar data URL
}

export function useRecentCreditUsage(limit: number = 5) {
  const { rawUsage, loading } = useCreditUsage();

  const recentUsage = useMemo(() => {
    // Sort by date (most recent first) and take top N
    return rawUsage
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((usage) => {
        // Calculate time ago
        const now = new Date();
        const diffInMinutes = Math.floor(
          (now.getTime() - usage.createdAt.getTime()) / (1000 * 60)
        );

        let timeAgo = "";
        if (diffInMinutes < 1) {
          timeAgo = "Just now";
        } else if (diffInMinutes < 60) {
          timeAgo = `${diffInMinutes} min ago`;
        } else {
          const diffInHours = Math.floor(diffInMinutes / 60);
          if (diffInHours < 24) {
            timeAgo = `${diffInHours} hours ago`;
          } else {
            const diffInDays = Math.floor(diffInHours / 24);
            timeAgo = `${diffInDays} days ago`;
          }
        }

        // Generate avatar
        const avatarSvg = createAvatar(adventurer, {
          seed: usage.userId,
          size: 128,
        }).toString();
        const avatarUrl = `data:image/svg+xml;utf8,${encodeURIComponent(
          avatarSvg
        )}`;

        // Calculate credits used (amountDollars * 100)
        const creditsUsed = Math.round(usage.amountDollars * 100);

        return {
          id: usage.id,
          userId: usage.userId,
          userName: usage.userName,
          userEmail: usage.userEmail,
          description: usage.description,
          amountDollars: usage.amountDollars,
          creditsUsed,
          createdAt: usage.createdAt,
          subscriptionTier: usage.subscriptionTier,
          timeAgo,
          avatarUrl,
        };
      });
  }, [rawUsage, limit]);

  return {
    recentUsage,
    isLoading: loading,
    hasUsage: recentUsage.length > 0,
  };
}
