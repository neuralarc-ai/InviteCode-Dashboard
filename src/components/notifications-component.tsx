"use client";
import React, { useState } from "react";
import { Button } from "./ui/button";
import { BadgeCheck, Bell, CreditCard, RefreshCw, Zap } from "lucide-react";
import CustomDialog from "./CustomDialog";
import { Dialog, DialogContent } from "./ui/dialog";
import { useRecentTransactions } from "@/hooks/use-recent-transactions";
import { createAvatar } from "@dicebear/core";
import { useRecentOnboardedUsers } from "@/hooks/use-recent-onboard-users";
import { useRecentCreditUsage } from "@/hooks/use-recent-credit-usage";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card, CardContent } from "./ui/card";
import { useCreditBalances } from "@/hooks/use-realtime-data";
import { useCreditPurchases } from "@/hooks/realtime/use-credit-purchases";
import { useSubscriptions } from "@/hooks/realtime/use-subscriptions";
import { useGlobal } from "@/contexts/global-context";
import { formatCurrency, generateAvatar, getTimeAgo } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";

const tabs = [
  { label: "Transactions", key: "transactions" },
  { label: "Users", key: "users" },
  { label: "Credits", key: "credits" },
];

function Notifications() {
  const {
    showNotifications,
    setShowNotifications,
    hasNotifications,
    setHasNotifications,
  } = useGlobal();
  const { creditBalances, loading: loadingCredits } = useCreditBalances();
  const {
    transactions,
    isLoading: txnLoading,
    userMap,
  } = useRecentTransactions(5); // Get 5 most recent
  const { recentUsers, isLoading: userLoading } = useRecentOnboardedUsers(7, 5);
  const { recentUsage, isLoading: usageLoading } = useRecentCreditUsage(5);

  // Get refresh functions from global context
  const { refreshCreditPurchases } = useCreditPurchases();
  const { refreshSubscriptions } = useSubscriptions();
  const { refreshUserProfiles, refreshCreditUsage } = useGlobal();

  const [active, setActive] = useState<string>("transactions");

  const getDaysSinceCreation = (userId: string) => {
    const profile = userMap.get(userId);
    if (!profile || !profile.createdAt) return null;

    const now = new Date();
    const diffInMs = now.getTime() - profile.createdAt.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    return diffInDays;
  };

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
      setActive("transactions");
    }
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
      }
    } catch (error) {
      console.error(`Failed to refresh ${tab}:`, error);
    }
  };

  const renderContent = () => {
    switch (active) {
      case "transactions":
        return (
          <div className="w-full flex flex-col gap-2">
            {txnLoading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className="w-full h-20 rounded-lg" />
              ))
            ) : transactions.length === 0 ? (
              <p>No recent transactions</p>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-2 rounded-[12px] h-20 px-4 border bg-card/50 hover:bg-card/80 transition-colors"
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
              [...Array(3)].map((_, i) => (
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

  return (
    <div>
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
                onClick={() => setActive(tab.key)}
                className={`w-full py-1 rounded-md ${
                  tab.key === active
                    ? "bg-primary text-background"
                    : "hover:bg-primary/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {active === "transactions" && "Recent Transactions"}
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
                  (active === "credits" && usageLoading)
                }
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    (active === "transactions" && txnLoading) ||
                    (active === "users" && userLoading) ||
                    (active === "credits" && usageLoading)
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
