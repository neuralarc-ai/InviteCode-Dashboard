// src/hooks/use-recent-transactions.ts
import { useMemo } from "react";
import { useGlobal } from "@/contexts/global-context";
import {
  useCreditPurchases,
  useSubscriptions,
} from "@/hooks/use-realtime-data";

export interface TransactionItem {
  id: string;
  userId: string;
  userName: string | undefined;
  userEmail: string | undefined;
  type: "Credit Purchase" | "Subscription" | "Renewal" | "Upgrade";
  description: string;
  amount: number;
  status: string;
  date: Date;
  source: "credit_purchase" | "subscription";
}

export function useRecentTransactions(limit: number = 10) {
  const { creditPurchases, loading: loadingPurchases } = useCreditPurchases();
  const { subscriptions, loading: loadingSubs } = useSubscriptions();
  const { userProfiles, userProfilesLoading: loadingProfiles } = useGlobal();

  // Map user profiles for quick lookup
  const userMap = new Map(userProfiles.map((u) => [u.userId, u]));

  const transactions = useMemo(() => {
    const items: TransactionItem[] = [];

    // Process Credit Purchases
    creditPurchases.forEach((purchase) => {
      // Use name from purchase record or fallback to profile or fallback to ID
      const profile = userMap.get(purchase.userId);
      const userName =
        purchase.userName !== "User not available"
          ? purchase.userName
          : profile?.fullName || `User ${purchase.userId.slice(0, 4)}`;

      items.push({
        id: `cp-${purchase.id}`,
        userId: purchase.userId,
        userName: userName,
        userEmail: purchase.userEmail,
        type: "Credit Purchase",
        description: purchase.description || "Credits",
        amount: purchase.amountDollars,
        status: purchase.status || "Success",
        date: new Date(purchase.createdAt),
        source: "credit_purchase",
      });
    });

    // Process Subscriptions
    // We treat the latest update as the transaction time
    subscriptions.forEach((sub) => {
      const profile = userMap.get(sub?.userId);
      const userName = profile?.fullName || `User ${sub?.userId?.slice(0, 4)}`;
      const userEmail = profile?.email || "Email not available";

      // Determine transaction type based on status/dates
      // This is an approximation since we don't have a transaction log for subs
      let type: TransactionItem["type"] = "Subscription";
      if (sub?.createdAt?.getTime() !== sub?.updatedAt?.getTime()) {
        type = "Renewal"; // or Upgrade
      }

      // Calculate price based on plan type and name
      // Monthly subscriptions: seed = $5, edge = $10
      let amount = 0;
      const planName = (sub?.planName || "").toLowerCase();
      const planType = (sub?.planType || "").toLowerCase();
      const planInfo = `${planName} ${planType}`.toLowerCase();

      // Check planType first for monthly subscriptions
      if (planType === "seed") {
        // Monthly seed subscription: $5
        amount = 5;
      } else if (planType === "edge") {
        // Monthly edge subscription: $10
        amount = 10;
      }
      // Other plans - keep existing values
      else if (planInfo.includes("quantum")) {
        amount = 149.99;
      } else if (planInfo.includes("monthly_basic_inferred")) {
        amount = 7.99;
      }
      // Fallback: if planType is not set but planName contains seed/edge
      else if (planName.includes("seed") && !planInfo.includes("quantum")) {
        amount = 5; // Monthly seed price
      } else if (planName.includes("edge") && !planInfo.includes("quantum")) {
        amount = 10; // Monthly edge price
      }

      items.push({
        id: `sub-${sub?.id}`,
        userId: sub?.userId,
        userName: userName,
        userEmail: userEmail,
        type: type,
        description: `${sub?.planName || "Plan"} ${sub?.planType || ""}`,
        amount: amount,
        status:
          sub?.status === "active" || sub?.status === "succeeded"
            ? "Success"
            : sub?.status || "Active",
        date: sub?.updatedAt
          ? new Date(sub.updatedAt)
          : sub?.createdAt
          ? new Date(sub.createdAt)
          : new Date(), // Using updated_at as the "transaction" time, fallback to created_at, then current date
        source: "subscription",
      });
    });

    console.log("items before sort and slice", items);

    // Sort by date descending and limit
    // Filter out any items with invalid dates before sorting
    const validItems = items.filter((item) => {
      const time = item.date.getTime();
      return !isNaN(time) && time > 0;
    });

    return validItems
      .sort((a, b) => {
        const aTime = a.date.getTime();
        const bTime = b.date.getTime();
        return bTime - aTime;
      })
      .slice(0, limit);
  }, [creditPurchases, subscriptions, userProfiles, limit]);

  console.log("transactions", transactions);

  const isLoading = loadingPurchases || loadingSubs || loadingProfiles;

  return {
    transactions,
    isLoading,
    userMap, // Also return userMap for components that need it
  };
}
