import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchDashboardSummary, type DashboardSummaryResponse } from '@/services/dashboard-service';

type DashboardSummaryState = {
  readonly data: DashboardSummaryResponse | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
};

export const useDashboardSummary = (): DashboardSummaryState => {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadSummary = useCallback(async () => {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      setError(null);

      const summary = await fetchDashboardSummary(controller.signal);
      setData(summary);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      console.error('Failed to load dashboard summary', err);
      setError(err instanceof Error ? err.message : 'Unable to load dashboard summary');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [loadSummary]);

  const refresh = useCallback(async () => {
    await loadSummary();
  }, [loadSummary]);

  return useMemo(
    () => ({
      data,
      isLoading,
      error,
      refresh,
    }),
    [data, error, isLoading, refresh],
  );
};


