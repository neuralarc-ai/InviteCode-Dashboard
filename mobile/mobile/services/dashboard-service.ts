import { usersApi, creditsApi, usageLogsApi } from './api-client';

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

/**
 * Fetch dashboard summary by aggregating data from multiple FastAPI endpoints.
 */
export async function fetchDashboardSummary(signal?: AbortSignal): Promise<DashboardSummaryResponse> {
  try {
    // Fetch data from multiple endpoints in parallel
    const [users, creditBalances, externalUsageLogs, internalUsageLogs] = await Promise.all([
      usersApi.getAll(),
      creditsApi.getBalances(),
      usageLogsApi.getAggregated({
        page: 1,
        limit: 1,
        search_query: '',
        activity_filter: 'all',
        user_type_filter: 'external',
      }),
      usageLogsApi.getAggregated({
        page: 1,
        limit: 1,
        search_query: '',
        activity_filter: 'all',
        user_type_filter: 'internal',
      }),
    ]);

    // Calculate metrics
    const totalUsers = users.length;
    
    // Calculate credit totals from balances
    const totals = creditBalances.reduce(
      (acc, balance) => ({
        totalCredits: acc.totalCredits + Math.round((balance.balance_dollars || 0) * 100),
        totalPurchased: acc.totalPurchased + Math.round((balance.total_purchased || 0) * 100),
        totalUsed: acc.totalUsed + Math.round((balance.total_used || 0) * 100),
      }),
      {
        totalCredits: 0,
        totalPurchased: 0,
        totalUsed: 0,
      }
    );

    // Get external and internal credits from usage logs
    const externalCredits = externalUsageLogs.success
      ? Math.round((externalUsageLogs.grand_total_cost || 0) * 100)
      : 0;
    const internalCredits = internalUsageLogs.success
      ? Math.round((internalUsageLogs.grand_total_cost || 0) * 100)
      : 0;

    // Get recent users (last 5, sorted by created_at)
    const sortedUsers = [...users].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const recentUsers: DashboardUser[] = sortedUsers.slice(0, 5).map((user) => ({
      id: user.user_id,
      fullName: user.full_name,
      preferredName: user.preferred_name,
      email: user.email,
      createdAt: user.created_at,
    }));

    // Create recent transactions from credit balances
    // Sort by last_updated and take top 5
    const sortedBalances = [...creditBalances]
      .filter((balance) => balance.user_id)
      .sort(
        (a, b) =>
          new Date(b.last_updated || 0).getTime() - new Date(a.last_updated || 0).getTime()
      )
      .slice(0, 5);

    const recentTransactions: DashboardCreditTransaction[] = sortedBalances.map((balance) => {
      const totalPurchasedCredits = Math.round((balance.total_purchased || 0) * 100);
      const totalUsedCredits = Math.round((balance.total_used || 0) * 100);
      const netCredits = totalPurchasedCredits - totalUsedCredits;
      const netAmountDollars = (balance.total_purchased || 0) - (balance.total_used || 0);
      const direction: 'in' | 'out' = netCredits >= 0 ? 'in' : 'out';
      const status: 'Purchased' | 'Used' = netCredits >= 0 ? 'Purchased' : 'Used';

      return {
        id: balance.user_id,
        userId: balance.user_id,
        userName: balance.user_name || balance.user_email || 'Unknown user',
        email: balance.user_email || null,
        totalPurchasedCredits,
        totalUsedCredits,
        netCredits,
        netAmountDollars,
        status,
        direction,
        occurredAt: balance.last_updated || new Date().toISOString(),
        description: null,
        usageType: null,
      };
    });

    return {
      metrics: {
        totalUsers,
        totalCredits: totals.totalCredits,
        totalPurchased: totals.totalPurchased,
        totalUsed: totals.totalUsed,
        externalCredits,
        internalCredits,
      },
      recentUsers,
      recentTransactions,
    };
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    throw new Error(
      error instanceof Error
        ? `Failed to load dashboard summary: ${error.message}`
        : 'Failed to load dashboard summary'
    );
  }
}


