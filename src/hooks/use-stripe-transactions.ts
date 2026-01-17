import { useState, useEffect, useCallback, useMemo } from 'react';
import { StripeCharge } from '@/lib/types';

type Environment = 'test' | 'production';
export type SortField = 'created' | 'amount' | 'status' | 'description' | 'customerEmail';
export type SortDirection = 'asc' | 'desc';

interface UseStripeTransactionsReturn {
  charges: StripeCharge[];
  sortedCharges: StripeCharge[];
  loading: boolean;
  error: string | null;
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  hasMore: boolean;
  canGoBack: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
  setSortField: (field: SortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  fetchCharges: (direction?: 'next' | 'prev') => void;
  refresh: () => void;
}

export function useStripeTransactions(limit: number = 10): UseStripeTransactionsReturn {
  const [charges, setCharges] = useState<StripeCharge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<Environment>('test');
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [lastChargeId, setLastChargeId] = useState<string | null>(null);
  const [firstChargeId, setFirstChargeId] = useState<string | null>(null);
  const [paginationHistory, setPaginationHistory] = useState<string[]>([]); // Track first charge IDs for back navigation
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchCharges = useCallback(
    async (direction: 'next' | 'prev' | undefined = undefined) => {
      setLoading(true);
      setError(null);

      try {
        // Build query parameters
        const params = new URLSearchParams({
          environment,
          limit: limit.toString(),
        });

        // Handle pagination
        if (direction === 'next' && lastChargeId) {
          // Store current first charge ID before going to next page
          if (firstChargeId) {
            setPaginationHistory((prev) => [...prev, firstChargeId]);
          }
          params.append('starting_after', lastChargeId);
        } else if (direction === 'prev' && paginationHistory.length > 0) {
          // Use the last entry in history as ending_before
          const prevFirstId = paginationHistory[paginationHistory.length - 1];
          params.append('ending_before', prevFirstId);
          setPaginationHistory((prev) => prev.slice(0, -1));
        }

        const response = await fetch(`/api/stripe-transactions?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch Stripe transactions');
        }

        setCharges(result.data || []);
        setHasMore(result.hasMore || false);
        setLastChargeId(result.lastChargeId || null);
        setFirstChargeId(result.firstChargeId || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setCharges([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [environment, limit, lastChargeId, firstChargeId, paginationHistory]
  );

  // Refresh function that resets pagination
  const refresh = useCallback(() => {
    setPaginationHistory([]);
    setLastChargeId(null);
    setFirstChargeId(null);
    fetchCharges();
  }, [fetchCharges]);

  // Fetch charges when environment changes
  useEffect(() => {
    setPaginationHistory([]);
    setLastChargeId(null);
    setFirstChargeId(null);
    fetchCharges();
  }, [environment]); // Only depend on environment, fetchCharges will be recreated

  // Handle environment change
  const handleSetEnvironment = useCallback((env: Environment) => {
    setEnvironment(env);
    setCharges([]);
    setError(null);
    setPaginationHistory([]);
    setLastChargeId(null);
    setFirstChargeId(null);
  }, []);

  // Sort charges based on sortField and sortDirection
  const sortedCharges = useMemo(() => {
    if (!charges || charges.length === 0) return [];

    return [...charges].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'created':
          aValue = a.created;
          bValue = b.created;
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case 'description':
          aValue = (a.description || '').toLowerCase();
          bValue = (b.description || '').toLowerCase();
          break;
        case 'customerEmail':
          aValue = (a.customerEmail || '').toLowerCase();
          bValue = (b.customerEmail || '').toLowerCase();
          break;
        default:
          return 0;
      }

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Compare values
      let comparison = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [charges, sortField, sortDirection]);

  return {
    charges,
    sortedCharges,
    loading,
    error,
    environment,
    setEnvironment: handleSetEnvironment,
    hasMore,
    canGoBack: paginationHistory.length > 0,
    sortField,
    sortDirection,
    setSortField,
    setSortDirection,
    fetchCharges,
    refresh,
  };
}
