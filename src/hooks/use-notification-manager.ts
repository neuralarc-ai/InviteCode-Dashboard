"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useGlobal } from "@/contexts/global-context";
import { supabase } from "@/lib/supabase";

interface NotificationEvent {
  type: "transaction" | "user_joined" | "credit_usage";
  data: any;
  timestamp: Date;
}

export function useNotificationManager() {
  const { toast } = useToast();
  const { setHasNotifications } = useGlobal();
  const lastNotificationTimes = useRef<Map<string, number>>(new Map());

  const shouldShowNotification = (type: string): boolean => {
    const now = Date.now();
    const lastTime = lastNotificationTimes.current.get(type) || 0;
    const timeDiff = now - lastTime;

    if (timeDiff < 30000) {
      return false;
    }

    lastNotificationTimes.current.set(type, now);
    return true;
  };

  const showTransactionNotification = (data: any) => {
    if (!shouldShowNotification("transaction")) return;

    const amount = data.amount_dollars || data.amount || 0;
    const userName = data.user_name || data.user_email || "A user";

    toast({
      title: "New Transaction",
      // description: `${userName} made a $${amount} purchase`,
      description: `A user just made a purchase`,
      duration: 5000,
    });

    setHasNotifications(true);
  };

  const showUserJoinedNotification = (data: any) => {
    if (!shouldShowNotification("user_joined")) return;

    const userName = data.full_name || data.email || "A new user";

    toast({
      title: "New User Joined",
      // description: `${userName} just joined the platform`,
      description: `A new user just joined the platform`,
      duration: 5000,
    });

    setHasNotifications(true);
  };

  const showCreditUsageNotification = (data: any) => {
    if (!shouldShowNotification("credit_usage")) return;

    const name = data.userName || data.user_name || "A user";
    const credits = data.credits_used || data.amount || 0;

    toast({
      title: "Credits Used",
      // description: `${name} used ${credits} credits`,
      description: `A user just used credits`,
      duration: 5000,
    });

    setHasNotifications(true);
  };

  useEffect(() => {
    const creditPurchasesChannel = supabase
      .channel("notification_credit_purchases")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "credit_purchases",
        },
        (payload) => {
          console.log("New credit purchase:", payload.new);
          showTransactionNotification(payload.new);
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
          console.log("New user joined:", payload.new);
          showUserJoinedNotification(payload.new);
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
          console.log("Credit usage:", payload.new);
          showCreditUsageNotification(payload.new);
        }
      )
      .subscribe();

    const subscriptionsChannel = supabase
      .channel("notification_subscriptions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
        },
        (payload) => {
          console.log("Subscription change:", payload.new);
          showTransactionNotification(payload.new);
        }
      )
      .subscribe();

    return () => {
      creditPurchasesChannel.unsubscribe();
      userProfilesChannel.unsubscribe();
      creditUsageChannel.unsubscribe();
      subscriptionsChannel.unsubscribe();
    };
  }, []);

  return null;
}
