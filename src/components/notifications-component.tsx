"use client";
import React, { useState } from "react";
import { Button } from "./ui/button";
import {
  BadgeCheck,
  Bell,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  Zap,
  XCircle,
  Clock,
} from "lucide-react";
import CustomDialog from "./CustomDialog";
import { useRecentTransactions } from "@/hooks/use-recent-transactions";
import { useRecentOnboardedUsers } from "@/hooks/use-recent-onboard-users";
import { useRecentCreditUsage } from "@/hooks/use-recent-credit-usage";
import { useStripeTransactions } from "@/hooks/use-stripe-transactions";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card, CardContent } from "./ui/card";
import { useCreditBalances } from "@/hooks/use-realtime-data";
import { useCreditPurchases } from "@/hooks/realtime/use-credit-purchases";
import { useSubscriptions } from "@/hooks/realtime/use-subscriptions";
import { useGlobal } from "@/contexts/global-context";
import { formatCurrency, generateAvatar, getTimeAgo } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";
import { useAuth } from "./auth-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { StripeCharge } from "@/lib/types";

function Notifications() {
  const { isAuthenticated, isLoading } = useAuth();

  // Defense in depth: don't render if not authenticated
  if (!isAuthenticated || isLoading) {
    return null;
  }

  const {
    showNotifications,
    setShowNotifications,
    hasNotifications,
    setHasNotifications,
    tabNotifications,
    clearTabNotification,
  } = useGlobal();
  const { creditBalances } = useCreditBalances();
  const {
    transactions,
    isLoading: txnLoading,
    userMap,
  } = useRecentTransactions(5); // Get 5 most recent
  const { recentUsers, isLoading: userLoading } = useRecentOnboardedUsers(7, 5);
  const { recentUsage, isLoading: usageLoading } = useRecentCreditUsage(5);
  const {
    sortedCharges: stripeCharges,
    loading: stripeLoading,
    error: stripeError,
    refresh: refreshStripe,
  } = useStripeTransactions(5); // Fetch only 5 for notifications

  // Get refresh functions from global context
  const { refreshCreditPurchases } = useCreditPurchases();
  const { refreshSubscriptions } = useSubscriptions();
  const { refreshUserProfiles, refreshCreditUsage } = useGlobal();

  const [active, setActive] = useState<string>("users");

  const getDaysAgo = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  };

  const getCredits = (userId: string) => {
    const balance = creditBalances.find((b) => b.userId === userId);
    return balance ? Math.floor(balance.balanceDollars * 100) : 0;
  };

  const handleNotificationClick = () => {
    setShowNotifications(true);
    setHasNotifications(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setShowNotifications(open);
    if (!open) {
      // Reset to transactions tab when dialog closes
      setActive("users");
    }
  };

  const handleTabClick = (tabKey: string) => {
    setActive(tabKey);
    clearTabNotification(tabKey as "transactions" | "users" | "credits");
  };

  const handleRefresh = async (tab: string) => {
    try {
      switch (tab) {
        case "transactions":
          await Promise.all([
            refreshCreditPurchases(),
            refreshSubscriptions(),
            refreshUserProfiles(),
          ]);
          break;
        case "users":
          await refreshUserProfiles();
          break;
        case "credits":
          await refreshCreditUsage();
          break;
        case "stripe":
          refreshStripe();
          break;
      }
    } catch (error) {
      console.error(`Failed to refresh ${tab}:`, error);
    }
  };

  const formatStripeAmount = (amount: number): string => {
    // Stripe amounts are in cents, so divide by 100
    return formatCurrency(amount / 100);
  };

  const getStripeStatusBadge = (charge: StripeCharge) => {
    const status = charge.status.toLowerCase();
    const isRefunded = charge.refunded;

    if (isRefunded) {
      return (
        <Badge
          variant="secondary"
          className="bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30"
        >
          <XCircle className="h-3 w-3 mr-1" />
          Refunded
        </Badge>
      );
    }

    switch (status) {
      case "succeeded":
        return (
          <Badge
            variant="default"
            className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Succeeded
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="destructive"
            className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="capitalize">
            {status}
          </Badge>
        );
    }
  };

  const renderContent = () => {
    switch (active) {
      case "transactions":
        return (
          <div className="w-full flex flex-col gap-2">
            {txnLoading ? (
              [...Array(5)].map((_, i) => (
                <Skeleton key={i} className="w-full h-20 rounded-lg" />
              ))
            ) : transactions.length === 0 ? (
              <p>No transactions</p>
            ) : (
              transactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="w-full flex items-center justify-between gap-2 rounded-[12px] h-20 px-4 border bg-card/50 hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 aspect-square items-center justify-center rounded-lg border bg-background">
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
                  <div className="flex items-center justify-end gap-4 ">
                    <Badge variant={"secondary"} className="whitespace-nowrap">
                      {tx.type}
                    </Badge>
                    <div className="font-bold">{formatCurrency(tx.amount)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case "stripe":
        return (
          <div className="w-full flex flex-col gap-2">
            {stripeLoading ? (
              [...Array(5)].map((_, i) => (
                <Skeleton key={i} className="w-full h-20 rounded-lg" />
              ))
            ) : stripeError ? (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm text-red-500">{stripeError}</p>
              </div>
            ) : stripeCharges.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p>No Stripe transactions</p>
              </div>
            ) : (
              stripeCharges.slice(0, 5).map((charge) => {
                const createdDate = new Date(charge.created * 1000);
                const cardInfo = charge.paymentMethodDetails?.card;

                return (
                  <div
                    key={charge.id}
                    className="w-full flex items-center justify-between gap-2 rounded-[12px] min-h-20 px-4 py-3 border bg-card/50 hover:bg-card/80 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background">
                        <CreditCard className="h-5 w-5 text-brand-solar-pulse" />
                      </div>
                      <div className="grid gap-1 min-w-0 flex-1">
                        <p className="text-sm font-medium leading-none truncate">
                          {charge.description ||
                            `Charge ${charge.id.slice(-8)}`}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {charge.customerEmail || charge.id}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {cardInfo && (
                            <span>
                              {cardInfo.brand.toUpperCase()} ••••{" "}
                              {cardInfo.last4}
                            </span>
                          )}
                          <span>• {getTimeAgo(createdDate)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {getStripeStatusBadge(charge)}
                      <div className="font-bold text-lg whitespace-nowrap">
                        {formatStripeAmount(charge.amount)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      case "users":
        return (
          <div className="w-full grid grid-cols-2 gap-2">
            {userLoading ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} className="w-full aspect-square rounded-lg" />
              ))
            ) : recentUsers.length === 0 ? (
              <p>No recent users</p>
            ) : (
              recentUsers.map((user) => (
                <Card
                  key={user.id}
                  className="overflow-hidden bg-card/50 backdrop-blur hover:bg-card/80 transition-colors"
                >
                  <CardContent className="p-6 flex flex-col items-center">
                    <div className="mb-4 rounded-full border-2 border-border p-1 bg-background">
                      <Avatar className="h-20 w-20">
                        <AvatarImage
                          src={`data:image/svg+xml;utf8,${encodeURIComponent(
                            generateAvatar(user.userId),
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
                        <span className="font-bold">
                          {getCredits(user.userId)}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                          Credits
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        );
      case "credits":
        return (
          <div className="w-full flex flex-col items-center gap-2">
            {usageLoading ? (
              [...Array(5)].map((_, i) => (
                <Skeleton key={i} className="w-full h-20 rounded-lg" />
              ))
            ) : recentUsage.length === 0 ? (
              <p>No recent users</p>
            ) : (
              recentUsage.map((usage) => (
                <div
                  key={usage.id}
                  className="flex w-full items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={usage.avatarUrl} alt={usage.userName} />
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
                        {usage.description || "Usage"} • {usage.timeAgo}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 font-bold text-lg">
                      <Zap className="h-4 w-4 fill-white text-white" />
                      {usage.creditsUsed}
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-2 py-0 h-5"
                    >
                      {usage.subscriptionTier || "Standard"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const tabs = [
    {
      label: "Users",
      key: "users",
      header: "Recent Transactions",
      loading: txnLoading,
      url: "/transactions",
    },
    {
      label: "Credit Usage",
      key: "credits",
      header: "New Users",
      loading: userLoading,
      url: "/users",
    },
    {
      label: "Stripe",
      key: "stripe",
      header: "Stripe Transactions",
      loading: usageLoading,
      url: "/stripe-transactions",
    },
    {
      label: "Transactions",
      key: "transactions",
      header: "Credits Usage",
      loading: usageLoading,
      url: "/credits",
    },
  ];

  return (
    <div className="">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleNotificationClick}
            size={"icon"}
            variant={"outline"}
            className="relative"
          >
            {hasNotifications && (
              <div className="absolute -top-1 -right-1 aspect-square w-3 rounded-full bg-red-500 border-2 border-background" />
            )}
            <Bell />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">View Notifications</TooltipContent>
      </Tooltip>
      <CustomDialog
        hideOptions
        open={showNotifications}
        onOpenChange={handleDialogOpenChange}
        title="Notifications"
      >
        <div className="w-full flex flex-col items-center gap-5">
          <div className="w-full flex items-center justify-between gap-1 bg-foreground/10 p-1 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabClick(tab.key)}
                className={`relative w-full py-1  rounded-md ${
                  tab.key === active
                    ? "bg-primary text-background"
                    : "hover:bg-primary/10 border border-accent"
                }`}
              >
                {tab.label}
                {/* Red dot indicator for notifications */}
                {tabNotifications[tab.key as keyof typeof tabNotifications] && (
                  <div className="absolute -top-1 -right-1 aspect-square w-3 rounded-full bg-red-500 border border-background" />
                )}
              </button>
            ))}
          </div>
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {active === "transactions" && "Recent Transactions"}
                {active === "stripe" && "Stripe Transactions"}
                {active === "users" && "New Users"}
                {active === "credits" && "Credits Usage"}
              </h3>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleRefresh(active)}
                className="flex items-center gap-2"
                disabled={
                  (active === "transactions" && txnLoading) ||
                  (active === "users" && userLoading) ||
                  (active === "credits" && usageLoading) ||
                  (active === "stripe" && stripeLoading)
                }
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    (active === "transactions" && txnLoading) ||
                    (active === "users" && userLoading) ||
                    (active === "credits" && usageLoading) ||
                    (active === "stripe" && stripeLoading)
                      ? "animate-spin"
                      : ""
                  }`}
                />
              </Button>
            </div>
            {renderContent()}
          </div>
        </div>
      </CustomDialog>
    </div>
  );
}

export default Notifications;
