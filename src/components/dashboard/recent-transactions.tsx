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
} from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";
import { useRecentTransactions } from "@/hooks/use-recent-transactions";

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

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
          <div
            key={i}
            className="h-20 w-full animate-pulse rounded-lg bg-muted/50"
          />
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
                {tx.source === "subscription" ? (
                  <RefreshCw className="h-5 w-5 text-blue-500" />
                ) : (
                  <CreditCard className="h-5 w-5 text-green-500" />
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
                  ? `${getDaysSinceCreation(tx.userId)} days`
                  : "N/A"}
              </p>
            </div>
            <div className="flex items-center justify-end gap-4 ">
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
