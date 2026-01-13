// src/hooks/use-recent-onboarded-users.ts
import { useMemo } from "react";
import { useGlobal } from "@/contexts/global-context";
import { useCreditBalances } from "@/hooks/use-realtime-data";
import { createAvatar } from "@dicebear/core";
import * as adventurer from "@dicebear/adventurer";

export interface RecentOnboardedUser {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  createdAt: Date;
  credits: number; // Transformed from balanceDollars * 100
  daysAgo: string; // Formatted "days ago" string
  avatarUrl: string; // Generated avatar data URL
}

export function useRecentOnboardedUsers(
  daysBack: number = 7,
  limit: number = 8
) {
  const { userProfiles, userProfilesLoading: loadingProfiles } = useGlobal();
  const { creditBalances, loading: loadingCredits } = useCreditBalances();

  const recentUsers = useMemo(() => {
    if (!userProfiles) return [];

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    return userProfiles
      .filter((user) => new Date(user.createdAt) >= cutoffDate)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, limit)
      .map((user) => {
        // Get credit balance for user
        const balance = creditBalances.find((b) => b.userId === user.userId);
        const credits = balance ? Math.floor(balance.balanceDollars * 100) : 0;

        // Calculate days ago
        const diffTime = Math.abs(
          now.getTime() - new Date(user.createdAt).getTime()
        );
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const daysAgo =
          diffDays === 0
            ? "Today"
            : diffDays === 1
            ? "1 day ago"
            : `${diffDays} days ago`;

        // Generate avatar
        const avatarSvg = createAvatar(adventurer, {
          seed: user.userId,
          size: 128,
        }).toString();
        const avatarUrl = `data:image/svg+xml;utf8,${encodeURIComponent(
          avatarSvg
        )}`;

        return {
          id: user.id,
          userId: user.userId,
          fullName: user.fullName,
          email: user.email,
          createdAt: new Date(user.createdAt),
          credits,
          daysAgo,
          avatarUrl,
        };
      });
  }, [userProfiles, creditBalances, daysBack, limit]);

  const isLoading = loadingProfiles || loadingCredits;

  return {
    recentUsers,
    isLoading,
    hasUsers: recentUsers.length > 0,
  };
}
