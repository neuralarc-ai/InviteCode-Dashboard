import { useCallback, useEffect, useState } from 'react';
import { usersApi, creditsApi, usageLogsApi } from '@/services/api-client';

export type UserProfile = {
  readonly id: string;
  readonly userId: string;
  readonly fullName: string;
  readonly preferredName: string | null;
  readonly email: string | null;
  readonly createdAt: Date;
};

export type CreditUsageGrouped = {
  readonly userId: string;
  readonly totalAmountDollars: number;
  readonly recordCount: number;
  readonly latestCreatedAt: Date;
  readonly userEmail: string;
  readonly userName: string;
};

export type CreditPurchase = {
  readonly id: string;
  readonly userId: string;
  readonly amountDollars: number;
  readonly status: string;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
  readonly userEmail: string;
  readonly userName: string;
};

export function useUserProfiles() {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const users = await usersApi.getAll();

      const transformedProfiles: UserProfile[] = users.map((user) => ({
        id: user.id,
        userId: user.user_id,
        fullName: user.full_name,
        preferredName: user.preferred_name,
        email: user.email,
        createdAt: new Date(user.created_at),
      }));

      setUserProfiles(transformedProfiles);
    } catch (err) {
      console.error('Error fetching user profiles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfiles();
    // Only fetch once on mount - no polling
  }, [fetchUserProfiles]);

  return { userProfiles, loading, error, refreshUserProfiles: fetchUserProfiles };
}

export function useCreditUsage() {
  const [creditUsage, setCreditUsage] = useState<CreditUsageGrouped[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCreditUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get usage logs aggregated data to calculate daily usage
      // API has a maximum limit of 100
      const usageLogsResponse = await usageLogsApi.getAggregated({
        page: 1,
        limit: 100, // API maximum limit
        search_query: '',
        activity_filter: 'all',
        user_type_filter: 'external',
      });

      if (!usageLogsResponse.success || !usageLogsResponse.data) {
        // If no data, set empty array but don't treat as error
        setCreditUsage([]);
        return;
      }

      // Transform usage logs to CreditUsageGrouped format
      // Note: This gives us user-level aggregates, not individual transactions
      // For daily charts, we'll use the latest_activity date
      const transformedUsage: CreditUsageGrouped[] = usageLogsResponse.data.map((log) => ({
        userId: log.user_id,
        totalAmountDollars: log.total_estimated_cost,
        recordCount: log.usage_count,
        latestCreatedAt: new Date(log.latest_activity),
        userEmail: log.user_email,
        userName: log.user_name,
      }));

      setCreditUsage(transformedUsage);
    } catch (err) {
      console.error('Error fetching credit usage:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch credit usage';
      setError(errorMessage);
      // Set empty array on error so charts can still render
      setCreditUsage([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreditUsage();
    // Only fetch once on mount - no polling
  }, [fetchCreditUsage]);

  return { creditUsage, loading, error, refreshCreditUsage: fetchCreditUsage };
}

export function useCreditPurchases() {
  const [creditPurchases, setCreditPurchases] = useState<CreditPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCreditPurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get completed purchases
      const purchases = await creditsApi.getPurchases('completed');

      const transformedPurchases: CreditPurchase[] = purchases.map((purchase) => ({
        id: purchase.id,
        userId: purchase.user_id,
        amountDollars: purchase.amount_dollars,
        status: purchase.status,
        createdAt: new Date(purchase.created_at),
        completedAt: purchase.completed_at ? new Date(purchase.completed_at) : null,
        userEmail: purchase.user_email || 'Email not available',
        userName: purchase.user_name || 'User not available',
      }));

      setCreditPurchases(transformedPurchases);
    } catch (err) {
      console.error('Error fetching credit purchases:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch credit purchases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreditPurchases();
    // Only fetch once on mount - no polling
  }, [fetchCreditPurchases]);

  return { creditPurchases, loading, error, refreshCreditPurchases: fetchCreditPurchases };
}

