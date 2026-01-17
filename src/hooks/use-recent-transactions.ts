// // src/hooks/use-recent-transactions.ts
// import { useMemo } from "react";
// import { useGlobal } from "@/contexts/global-context";
// import {
//   useCreditPurchases,
//   useSubscriptions,
// } from "@/hooks/use-realtime-data";

// export interface TransactionItem {
//   id: string;
//   userId: string;
//   userName: string | undefined;
//   userEmail: string | undefined;
//   type: "Credit Purchase" | "Subscription" | "Renewal" | "Upgrade";
//   description: string;
//   amount: number;
//   status: string;
//   date: Date;
//   source: "credit_purchase" | "subscription";
// }

// export function useRecentTransactions(limit: number = 10) {
//   const { creditPurchases, loading: loadingPurchases } = useCreditPurchases();
//   const { subscriptions, loading: loadingSubs } = useSubscriptions();
//   const { userProfiles, userProfilesLoading: loadingProfiles } = useGlobal();


//   // Map user profiles for quick lookup
//   const userMap = new Map(userProfiles.map((u) => [u.userId, u]));

//   const transactions = useMemo(() => {
//     const items: TransactionItem[] = [];

//     // Process Credit Purchases
//     creditPurchases.forEach((purchase) => {
//       // Use name from purchase record or fallback to profile or fallback to ID
//       const profile = userMap.get(purchase.userId);
//       const userName =
//         purchase.userName !== "User not available"
//           ? purchase.userName
//           : profile?.fullName || `User ${purchase.userId.slice(0, 4)}`;

//       items.push({
//         id: `cp-${purchase.id}`,
//         userId: purchase.userId,
//         userName: userName,
//         userEmail: purchase.userEmail,
//         type: "Credit Purchase",
//         description: purchase.description || "Credits",
//         amount: purchase.amountDollars,
//         status: purchase.status || "Success",
//         date: new Date(purchase.createdAt),
//         source: "credit_purchase",
//       });
//     });

//     // Process Subscriptions
//     // We treat the latest update as the transaction time
//     subscriptions.forEach((sub) => {
//       const profile = userMap.get(sub?.userId);
//       const userName = profile?.fullName || `User ${sub?.userId?.slice(0, 4)}`;
//       const userEmail = profile?.email || "Email not available";

//       let type: TransactionItem["type"] = "Subscription";
//       if (sub?.createdAt?.getTime() !== sub?.updatedAt?.getTime()) {
//         type = "Renewal";
//       }

//       const cutoffDate = new Date("2026-01-15T00:00:00.000Z");
//       const createdAt = sub?.createdAt ? new Date(sub.createdAt) : null;
//       const isNewPricing = createdAt && createdAt >= cutoffDate;

//       let amount = 0;
//       const planName = (sub?.planName || "").toLowerCase();
//       const planType = (sub?.planType || "").toLowerCase();
//       const planInfo = `${planName} ${planType}`.toLowerCase();

//       if (isNewPricing) {
//         if (planType === "edge" || planName.includes("edge")) {
//           amount = 20;
//         } else if (planInfo.includes("quantum")) {
//           amount = 200;
//         }
//       }

//       if (amount === 0) {
//         if (planType === "seed") {
//           amount = 5;
//         } else if (planType === "edge") {
//           amount = 10;
//         } else if (planInfo.includes("quantum")) {
//           amount = 149.99;
//         } else if (planInfo.includes("monthly_basic_inferred")) {
//           amount = 7.99;
//         } else if (planName.includes("seed") && !planInfo.includes("quantum")) {
//           amount = 5;
//         } else if (planName.includes("edge") && !planInfo.includes("quantum")) {
//           amount = 10;
//         }
//       }

//       items.push({
//         id: `sub-${sub?.id}`,
//         userId: sub?.userId,
//         userName: userName,
//         userEmail: userEmail,
//         type: type,
//         description: `${sub?.planName || "Plan"} ${sub?.planType || ""}`,
//         amount: amount,
//         status:
//           sub?.status === "active" || sub?.status === "succeeded"
//             ? "Success"
//             : sub?.status || "Active",
//         date: sub?.updatedAt
//           ? new Date(sub.updatedAt)
//           : sub?.createdAt
//             ? new Date(sub.createdAt)
//             : new Date(),
//         source: "subscription",
//       });
//     });


//     // Sort by date descending and limit
//     // Filter out any items with invalid dates before sorting
//     const validItems = items.filter((item) => {
//       const time = item.date.getTime();
//       return !isNaN(time) && time > 0;
//     });


//     return validItems
//       .sort((a, b) => {
//         const aTime = a.date.getTime();
//         const bTime = b.date.getTime();
//         return bTime - aTime;
//       })
//       // .slice(0, limit)
//   }, [creditPurchases, subscriptions, userProfiles, limit]);


//   const isLoading = loadingPurchases || loadingSubs || loadingProfiles;

//   return {
//     transactions,
//     isLoading,
//     userMap, // Also return userMap for components that need it
//   };
// }


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
        // We'll use this for sorting — add userCreatedAt
        userCreatedAt: profile?.createdAt ? new Date(profile.createdAt) : null,
      } as TransactionItem & { userCreatedAt: Date | null });
    });

    // Process Subscriptions
    subscriptions.forEach((sub) => {
      const profile = userMap.get(sub?.userId);
      const userName = profile?.fullName || `User ${sub?.userId?.slice(0, 4)}`;
      const userEmail = profile?.email || "Email not available";

      let type: TransactionItem["type"] = "Subscription";
      if (sub?.createdAt?.getTime() !== sub?.updatedAt?.getTime()) {
        type = "Renewal";
      }

      const cutoffDate = new Date("2026-01-15T00:00:00.000Z");
      const createdAt = sub?.createdAt ? new Date(sub.createdAt) : null;
      const isNewPricing = createdAt && createdAt >= cutoffDate;

      let amount = 0;
      const planName = (sub?.planName || "").toLowerCase();
      const planType = (sub?.planType || "").toLowerCase();
      const planInfo = `${planName} ${planType}`.toLowerCase();

      if (isNewPricing) {
        if (planType === "edge" || planName.includes("edge")) {
          amount = 20;
        } else if (planInfo.includes("quantum")) {
          amount = 200;
        }
      }

      if (amount === 0) {
        if (planType === "seed") {
          amount = 5;
        } else if (planType === "edge") {
          amount = 10;
        } else if (planInfo.includes("quantum")) {
          amount = 149.99;
        } else if (planInfo.includes("monthly_basic_inferred")) {
          amount = 7.99;
        } else if (planName.includes("seed") && !planInfo.includes("quantum")) {
          amount = 5;
        } else if (planName.includes("edge") && !planInfo.includes("quantum")) {
          amount = 10;
        }
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
          : new Date(),
        source: "subscription",
        // Add this field for sorting
        userCreatedAt: profile?.createdAt ? new Date(profile.createdAt) : null,
      } as TransactionItem & { userCreatedAt: Date | null });
    });

    // Sort by user creation date (newest users first), descending
    const validItems = items.filter((item) => item.userCreatedAt !== null);

    return validItems.sort((a, b) => {
      // Both should have userCreatedAt because of the filter above
      const aTime = a.userCreatedAt!.getTime();
      const bTime = b.userCreatedAt!.getTime();
      return bTime - aTime; // newest → oldest
    });
    // .slice(0, limit)   ← still commented out — uncomment if you want only top N

  }, [creditPurchases, subscriptions, userProfiles, limit]);

  const isLoading = loadingPurchases || loadingSubs || loadingProfiles;

  return {
    transactions,
    isLoading,
    userMap,
  };
}