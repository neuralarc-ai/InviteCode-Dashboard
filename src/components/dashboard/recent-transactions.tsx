"use client";

import {
  useCreditPurchases,
  useSubscriptions,
  useUserProfiles,
} from "@/hooks/use-realtime-data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  RefreshCw,
  ArrowUpCircle,
  ExternalLink,
  BadgeCheck,
} from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";
import { useRecentTransactions } from "@/hooks/use-recent-transactions";
import { formatCurrency, getTimeAgo } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";

interface TransactionItem {
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

export function RecentTransactions() {
  const { transactions, isLoading, userMap } = useRecentTransactions();

  

  const getDaysSinceCreation = (userId: string) => {
    const profile = userMap.get(userId);
    if (!profile || !profile.createdAt) return null;

    const now = new Date();
    const diffInMs = now.getTime() - profile.createdAt.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    return diffInDays;
  };

  // const isLoading = loadingPurchases || loadingSubs || loadingProfiles;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Recent Transactions
            </h2>
            <p className="text-sm text-muted-foreground">
              Latest payment and subscription activities
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Recent Transactions
          </h2>
          <p className="text-sm text-muted-foreground">
            Latest payment and subscription activities
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="grid grid-cols-3 gap-2 rounded-[12px] h-20 px-4 border bg-card/50 hover:bg-card/80 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                {tx.type === "Renewal" ? (
                  <RefreshCw className="h-5 w-5 text-indigo-500 " />
                ) : tx.type === "Subscription" ? (
                  <BadgeCheck className="h-5 w-5 text-emerald-500 " />
                ) : (
                  <CreditCard className="h-5 w-5 text-blue-500" />
                )}
              </div>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">
                  {tx.userName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tx.description} • {getTimeAgo(tx.date)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <p className="text-xs text-muted-foreground">
                {getDaysSinceCreation(tx.userId) !== null
                  ? getDaysSinceCreation(tx.userId) === 0
                    ? "Joined today"
                    : `Joined ${getDaysSinceCreation(tx.userId)} day${getDaysSinceCreation(tx.userId) === 1 ? '' : 's'} ago`
                  : "Join date unknown"}
              </p>
            </div>
            <div className="flex items-center justify-evenly gap-4 ">
              <Badge variant={"secondary"}>{tx.type}</Badge>
              <div className="font-bold">{formatCurrency(tx.amount)}</div>
              <Badge
                variant={
                  tx.status.toLowerCase() === "success"
                    ? "default"
                    : "secondary"
                }
                className="capitalize"
              >
                <div
                  className={`mr-1 h-1.5 w-1.5 rounded-full ${
                    tx.status.toLowerCase() === "success"
                      ? "bg-green-500"
                      : "bg-gray-500"
                  }`}
                />
                {tx.status}
              </Badge>
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            No recent transactions found.
          </div>
        )}
      </div>
    </div>
  );
}
