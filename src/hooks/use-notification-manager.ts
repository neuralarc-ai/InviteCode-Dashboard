"use client";
import { useGlobal } from "@/contexts/global-context";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface NotificationEvent {
  type: "transaction" | "user_joined" | "credit_usage";
  data: any;
  timestamp: Date;
}

export function useNotificationManager() {
  const { setHasNotifications } = useGlobal();
  const lastNotificationTimes = useRef<Map<string, number>>(new Map());

  const shouldShowNotification = (type: string): boolean => {
    const now = Date.now();
    const lastTime = lastNotificationTimes.current.get(type) || 0;
    const diff = now - lastTime;

    if (diff < 30000) {
      return false;
    }

    lastNotificationTimes.current.set(type, now);
    return true;
  };

  const showTxnNotification = (data: any) => {
    if (!shouldShowNotification("transaction")) return false;
    const amount = data.amount_dollars || data.amount || 0;
    const userName = data.user_name || data.user_email || "A User";

    toast("New Transaction", {
      description: `${userName} made a $${amount} purchase`,
      duration: 5000,
    });

    setHasNotifications(true);
  };

  const showUserNotification = (data: any) => {
    if (!shouldShowNotification("user_joined")) return;

    const userName = data.full_name || data.email || "A New User";

    toast(`A New User Joined`, {
      description: `${userName} just joined the platform`,
      duration: 5000,
    });
    setHasNotifications(true);
  };

  const showCreditNotification = (data: any) => {
    if (!shouldShowNotification("credit_usage")) return;
    const userName = data.user_name || data.user_email || "A User";
    const credits = data.credits_used || data.amount || 0;

    toast(`Credits Used`, {
      description: `${userName} userd ${credits} credits`,
      duration: 5000,
    });

    setHasNotifications(true);
  };

  useEffect(() => {
    const creditPurchaseChannel = supabase
      .channel("notification_credit_purchases")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "credit_purchases",
        },
        (payload) => {
          console.log("New Credit Purchase", payload.new);
          showTxnNotification(payload.new);
        }
      )
      .subscribe();

    const userProfilesChannel = supabase
      .channel("notification_user_profiles")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_profiles",
        },
        (payload) => {
          console.log("New User Joined", payload.new);
          showUserNotification(payload.new);
        }
      )
      .subscribe();

    const creditUsageChannel = supabase
      .channel("notification_credit_usage")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "usage_logs",
        },
        (payload) => {
          console.log("Credit Usage", payload.new);
          showCreditNotification(payload.new);
        }
      )
      .subscribe();

    const subscriptionChannel = supabase
      .channel("notification_subscriptions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "subscriptions",
        },
        (payload) => {
          console.log("Subscription changes", payload.new);
          showTxnNotification(payload.new);
        }
      )
      .subscribe();

    return () => {
      creditPurchaseChannel.unsubscribe();
      userProfilesChannel.unsubscribe();
      creditUsageChannel.unsubscribe();
      subscriptionChannel.unsubscribe();
    };
  }, []);

  return null;
}
