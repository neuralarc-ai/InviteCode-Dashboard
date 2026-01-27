import { useState, useEffect, useCallback, useMemo } from "react";
import { StripeCharge } from "@/lib/types";

type Environment = "test" | "production";
export type SortField =
  | "created"
  | "amount"
  | "status"
  | "description"
  | "customerEmail";
export type SortDirection = "asc" | "desc";

interface UseStripeTransactionsReturn {
  charges: StripeCharge[];
  sortedCharges: StripeCharge[];
  loading: boolean;
  error: string | null;
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  setSortField: (field: SortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  refresh: () => void;
}

export function useStripeTransactions(
  limit: number = 100, // Fetch more data upfront for frontend pagination
  initialEnvironment: Environment = "production", // Allow setting initial environment
): UseStripeTransactionsReturn {
  const [charges, setCharges] = useState<StripeCharge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [environment, setEnvironment] =
    useState<Environment>(initialEnvironment);
  const [sortField, setSortField] = useState<SortField>("created");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchCharges = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query parameters - fetch all data upfront
      const params = new URLSearchParams({
        environment,
        limit: limit.toString(),
      });

      const response = await fetch(
        `/api/stripe-transactions?${params.toString()}`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch Stripe transactions");
      }

      setCharges(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setCharges([]);
    } finally {
      setLoading(false);
    }
  }, [environment, limit]);

  // Refresh function
  const refresh = useCallback(() => {
    fetchCharges();
  }, [fetchCharges]);

  // Fetch charges when environment changes
  useEffect(() => {
    fetchCharges();
  }, [environment, fetchCharges]);

  // Handle environment change
  const handleSetEnvironment = useCallback((env: Environment) => {
    setEnvironment(env);
    setCharges([]);
    setError(null);
  }, []);

  // Sort charges based on sortField and sortDirection
  const sortedCharges = useMemo(() => {
    if (!charges || charges.length === 0) return [];

    return [...charges].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "created":
          aValue = a.created;
          bValue = b.created;
          break;
        case "amount":
          aValue = a.amount;
          bValue = b.amount;
          break;
        case "status":
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case "description":
          aValue = (a.description || "").toLowerCase();
          bValue = (b.description || "").toLowerCase();
          break;
        case "customerEmail":
          aValue = (a.customerEmail || "").toLowerCase();
          bValue = (b.customerEmail || "").toLowerCase();
          break;
        default:
          return 0;
      }

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Compare values
      let comparison = 0;
      if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [charges, sortField, sortDirection]);

  return {
    charges,
    sortedCharges,
    loading,
    error,
    environment,
    setEnvironment: handleSetEnvironment,
    sortField,
    sortDirection,
    setSortField,
    setSortDirection,
    refresh,
  };
}
