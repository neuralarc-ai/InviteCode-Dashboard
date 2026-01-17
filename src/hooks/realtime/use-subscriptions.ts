"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Subscription } from "@/lib/types";
import { dbOperations } from "@/lib/db";

// Transformation function for Basejump to Subscription mapping
const transformSubscription = (row: any): Subscription => ({
  id: row.id,
  userId: row.account_id,
  stripeSubscriptionId: row.id, // Use subscription ID as identifier
  stripeCustomerId: row.billing_customer_id || "",
  status: row.status,
  currentPeriodStart: row.current_period_start
    ? new Date(row.current_period_start)
    : null,
  currentPeriodEnd: row.current_period_end
    ? new Date(row.current_period_end)
    : null,
  trialEnd: row.trial_end ? new Date(row.trial_end) : null,
  planName: row.plan_name,
  planType: row.metadata?.plan_type || null,
  monthlyCreditAllocation: null, // Not in new schema
  createdAt: new Date(row.created),
  updatedAt: null, // Not tracked in new schema
  metadata: row.metadata,
});

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {

      const response = await fetch("/api/subscriptions", { method: "GET" });
      const payload = await response.json();

      if (!response.ok || !payload.success)
        throw new Error(payload.error || `HTTP error ${response.status}`);

      const data = payload.data || [];

      // Apply transformation function to all records
      const transformedSubscriptions = data.map(transformSubscription);

      setSubscriptions(transformedSubscriptions);
      setError(null);
      await dbOperations.putAll("subscriptions", transformedSubscriptions);
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
      setError(
        `Failed to fetch subscriptions: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscriptions = async () => {
    setLoading(true);
    await fetchSubscriptions();
  };

  useEffect(() => {
    // 1. Load Cache
    const loadCache = async () => {
      try {
        const cached = await dbOperations.getAll("subscriptions");
        if (cached && cached.length > 0) {
          setSubscriptions(cached);
          setLoading(false);
        }
      } catch (e) {
        console.warn(e);
      }
    };
    loadCache();

    // 2. Fetch Fresh
    fetchSubscriptions();

    // 3. Realtime
    const subscription = supabase
      .channel("subscriptions_changes_optimized")
      .on(
        "postgres_changes",
        // Fixed typo: billin_subscriptions -> billing_subscriptions
        { event: "*", schema: "basejump", table: "billing_subscriptions" },
        async (payload) => {
          try {
            // console.log("Real-time subscriptions update (Delta):", payload);
            if (
              payload.eventType === "INSERT" ||
              payload.eventType === "UPDATE"
            ) {
              // Apply transformation function to new/updated records
              const transformedItem = transformSubscription(payload.new);

              setSubscriptions((prev) => {
                const updated =
                  payload.eventType === "INSERT"
                    ? [transformedItem, ...prev]
                    : prev.map((s) =>
                        s.id === transformedItem.id ? transformedItem : s
                      );
                dbOperations.put("subscriptions", transformedItem);
                return updated;
              });
            } else if (payload.eventType === "DELETE") {
              // Use correct id field for deletion
              const deletedId = payload.old.id;
              setSubscriptions((prev) => {
                const updated = prev.filter((s) => s.id !== deletedId);
                dbOperations.delete("subscriptions", deletedId);
                return updated;
              });
            }
          } catch (error) {
            console.error(
              "Error handling realtime update for subscriptions:",
              error
            );
            setError(
              `Realtime update error: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          // Only log once to prevent spam
          console.warn(
            "⚠️ Realtime not available for subscriptions. This is normal if realtime isn't enabled. The app will still work with manual refresh."
          );
          // DO NOT set error state or unsubscribe here - it can cause issues
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { subscriptions, loading, error, refreshSubscriptions };
}
