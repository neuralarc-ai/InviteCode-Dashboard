import { getAppConfig } from '@/utils/config';

export type DashboardMetrics = {
  readonly totalUsers: number;
  readonly totalCredits: number;
  readonly totalPurchased: number;
  readonly totalUsed: number;
  readonly externalCredits: number;
  readonly internalCredits: number;
};

export type DashboardUser = {
  readonly id: string;
  readonly fullName: string;
  readonly preferredName: string | null;
  readonly email: string | null;
  readonly createdAt: string | null;
};

export type DashboardCreditTransaction = {
  readonly id: string;
  readonly userId: string;
  readonly userName: string;
  readonly email: string | null;
  readonly totalPurchasedCredits: number;
  readonly totalUsedCredits: number;
  readonly netCredits: number;
  readonly netAmountDollars: number;
  readonly status: 'Purchased' | 'Used';
  readonly direction: 'in' | 'out';
  readonly occurredAt: string;
  readonly description?: string | null;
  readonly usageType?: string | null;
};

export type DashboardSummaryResponse = {
  readonly metrics: DashboardMetrics;
  readonly recentUsers: readonly DashboardUser[];
  readonly recentTransactions: readonly DashboardCreditTransaction[];
};

type DashboardSummaryApiResponse =
  | {
      readonly success: true;
      readonly data: DashboardSummaryResponse;
    }
  | {
      readonly success: false;
      readonly message?: string;
    };

export async function fetchDashboardSummary(signal?: AbortSignal): Promise<DashboardSummaryResponse> {
  const { apiBaseUrl } = getAppConfig();

  const response = await fetch(`${apiBaseUrl}/api/dashboard-summary`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Dashboard summary request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as DashboardSummaryApiResponse;

  if (!payload.success) {
    throw new Error(payload.message ?? 'Failed to load dashboard summary');
  }

  return payload.data;
}


