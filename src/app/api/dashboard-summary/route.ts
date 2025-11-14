import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase';

type AggregatedUsageParams = {
  readonly userType: 'internal' | 'external';
};

async function fetchUsageCreditTotals({ userType }: AggregatedUsageParams): Promise<number> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client unavailable while fetching usage totals', { userType });
    return 0;
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('get_aggregated_usage_logs', {
      page_number: 1,
      page_size: 1,
      search_query: '',
      activity_level_filter: '',
      user_type_filter: userType,
    });

    if (error) {
      console.error(`Failed to fetch ${userType} usage totals`, { error });
      return 0;
    }

    const grandTotalCost = data && data.length > 0 ? Number(data[0].grand_total_cost) || 0 : 0;

    return grandTotalCost * 100; // Convert dollars to credits
  } catch (error) {
    console.error(`Unexpected error fetching ${userType} usage totals`, { error });
    return 0;
  }
}

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: 'Server configuration error: Supabase admin client unavailable',
        },
        { status: 500 },
      );
    }

    const adminClient = supabaseAdmin;

    const [
      creditBalancesResult,
      totalUsersResult,
      recentProfilesResult,
      externalCredits,
      internalCredits,
      creditUsageEntriesResult,
      creditPurchaseEntriesResult,
    ] = await Promise.all([
      adminClient
        .from('credit_balance')
        .select('balance_dollars, total_purchased, total_used'),
      adminClient.from('user_profiles').select('user_id', { head: true, count: 'exact' }),
      adminClient
        .from('user_profiles')
        .select('user_id, full_name, preferred_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      fetchUsageCreditTotals({ userType: 'external' }),
      fetchUsageCreditTotals({ userType: 'internal' }),
      adminClient
        .from('credit_usage')
        .select('id, user_id, amount_dollars, usage_type, description, created_at'),
      adminClient
        .from('credit_purchases')
        .select('id, user_id, amount_dollars, description, created_at, completed_at'),
    ]);

    if (creditBalancesResult.error) {
      console.error('Failed to fetch credit balances for dashboard summary', {
        error: creditBalancesResult.error,
      });
    }

    if (totalUsersResult.error) {
      console.error('Failed to fetch total user count for dashboard summary', {
        error: totalUsersResult.error,
      });
    }

    if (recentProfilesResult.error) {
      console.error('Failed to fetch recent users for dashboard summary', {
        error: recentProfilesResult.error,
      });
    }

    if (creditUsageEntriesResult.error) {
      console.error('Failed to fetch recent credit usage entries for dashboard summary', {
        error: creditUsageEntriesResult.error,
      });
    }

    if (creditPurchaseEntriesResult.error) {
      console.error('Failed to fetch recent credit purchases for dashboard summary', {
        error: creditPurchaseEntriesResult.error,
      });
    }

    type CreditBalanceRow = {
      readonly balance_dollars: number | string | null;
      readonly total_purchased: number | string | null;
      readonly total_used: number | string | null;
    };

    const creditBalances: readonly CreditBalanceRow[] = creditBalancesResult.error
      ? []
      : ((creditBalancesResult.data as readonly CreditBalanceRow[] | null) ?? []);

    const totals = creditBalances.reduce(
      (acc, balance): { readonly totalCredits: number; readonly totalPurchased: number; readonly totalUsed: number } => {
        const balanceDollars = Number(balance.balance_dollars ?? 0) || 0;
        const totalPurchased = Number(balance.total_purchased ?? 0) || 0;
        const totalUsed = Number(balance.total_used ?? 0) || 0;

        return {
          totalCredits: acc.totalCredits + Math.round(balanceDollars * 100),
          totalPurchased: acc.totalPurchased + Math.round(totalPurchased * 100),
          totalUsed: acc.totalUsed + Math.round(totalUsed * 100),
        };
      },
      {
        totalCredits: 0,
        totalPurchased: 0,
        totalUsed: 0,
      },
    );

    type UserProfileRow = {
      readonly user_id: string;
      readonly full_name: string | null;
      readonly preferred_name: string | null;
      readonly created_at?: string | null;
    };

    const recentProfiles: readonly UserProfileRow[] =
      recentProfilesResult.error || !recentProfilesResult.data ? [] : recentProfilesResult.data;

    const isNonEmptyString = (value: string | null | undefined): value is string =>
      typeof value === 'string' && value.trim().length > 0;

    const recentUserIds = recentProfiles.map((profile) => profile.user_id).filter(isNonEmptyString);

    type CreditUsageEntry = {
      readonly id: string;
      readonly user_id: string | null;
      readonly amount_dollars: number | string | null;
      readonly usage_type: string | null;
      readonly description: string | null;
      readonly created_at: string | null;
    };

    type CreditPurchaseEntry = {
      readonly id: string;
      readonly user_id: string | null;
      readonly amount_dollars: number | string | null;
      readonly description: string | null;
      readonly created_at: string | null;
      readonly completed_at: string | null;
    };

    const creditUsageEntries: readonly CreditUsageEntry[] =
      creditUsageEntriesResult.error || !creditUsageEntriesResult.data
        ? []
        : (creditUsageEntriesResult.data as unknown as readonly CreditUsageEntry[]);

    const creditPurchaseEntries: readonly CreditPurchaseEntry[] =
      creditPurchaseEntriesResult.error || !creditPurchaseEntriesResult.data
        ? []
        : (creditPurchaseEntriesResult.data as unknown as readonly CreditPurchaseEntry[]);

    const allTransactionUserIds = [
      ...creditUsageEntries.map((entry) => entry.user_id).filter(isNonEmptyString),
      ...creditPurchaseEntries.map((entry) => entry.user_id).filter(isNonEmptyString),
    ];

    const uniqueUserIds: readonly string[] = Array.from(new Set([...recentUserIds, ...allTransactionUserIds]));

    const emailMap = new Map<string, string>();

    if (uniqueUserIds.length > 0) {
      await Promise.all(
        uniqueUserIds.map(async (userId) => {
          if (!adminClient) {
            return;
          }

          try {
            const { data, error } = await adminClient.auth.admin.getUserById(userId);

            if (!error && data?.user?.email) {
              emailMap.set(userId, data.user.email);
            }
          } catch (error) {
            console.warn('Failed to fetch auth user for recent users list', {
              userId,
              error,
            });
          }
        }),
      );
    }

    const profileMap = new Map<
      string,
      {
        readonly fullName: string | null;
        readonly preferredName: string | null;
      }
    >();

    recentProfiles.forEach((profile) => {
      profileMap.set(profile.user_id, {
        fullName: profile.full_name ?? null,
        preferredName: profile.preferred_name ?? null,
      });
    });

    const missingProfileIds = uniqueUserIds.filter((userId) => !profileMap.has(userId));

    if (missingProfileIds.length > 0) {
      const { data: additionalProfiles, error: additionalProfilesError } = await adminClient
        .from('user_profiles')
        .select('user_id, full_name, preferred_name')
        .in('user_id', missingProfileIds);

      if (additionalProfilesError) {
        console.warn('Failed to fetch additional profiles for transactions', {
          error: additionalProfilesError,
        });
      } else {
        (additionalProfiles as readonly UserProfileRow[] | null)?.forEach((profile) => {
          profileMap.set(profile.user_id, {
            fullName: profile.full_name ?? null,
            preferredName: profile.preferred_name ?? null,
          });
        });
      }
    }

    const recentUsers = recentProfiles.map((profile) => ({
      id: profile.user_id,
      fullName: profile.preferred_name || profile.full_name || 'Unknown user',
      preferredName: profile.preferred_name || null,
      email: emailMap.get(profile.user_id) ?? null,
      createdAt: profile.created_at ?? null,
    }));

    const resolveLatestActivity = (current: string | null, candidate: string | null): string | null => {
      if (!candidate || Number.isNaN(Date.parse(candidate))) {
        return current;
      }

      if (!current || Number.isNaN(Date.parse(current))) {
        return candidate;
      }

      return new Date(candidate).getTime() > new Date(current).getTime() ? candidate : current;
    };

    type UserTransactionAggregate = {
      totalPurchasedDollars: number;
      totalUsedDollars: number;
      latestActivity: string | null;
      latestUsageDescription: string | null;
      latestUsageType: string | null;
    };

    const userTransactionAggregates = new Map<string, UserTransactionAggregate>();

    creditUsageEntries.forEach((entry) => {
      const userId = entry.user_id;
      if (!userId) {
        return;
      }

      const existing = userTransactionAggregates.get(userId) ?? {
        totalPurchasedDollars: 0,
        totalUsedDollars: 0,
        latestActivity: null,
        latestUsageDescription: null,
        latestUsageType: null,
      };

      const amount = Number(entry.amount_dollars ?? 0) || 0;
      const createdAt = entry.created_at ?? null;
      const latestActivity = resolveLatestActivity(existing.latestActivity, createdAt);

      const shouldUpdateMetadata =
        !existing.latestActivity ||
        (!!createdAt && new Date(createdAt).getTime() >= new Date(existing.latestActivity).getTime());

      userTransactionAggregates.set(userId, {
        totalPurchasedDollars: existing.totalPurchasedDollars,
        totalUsedDollars: existing.totalUsedDollars + amount,
        latestActivity,
        latestUsageDescription: shouldUpdateMetadata ? entry.description ?? null : existing.latestUsageDescription,
        latestUsageType: shouldUpdateMetadata ? entry.usage_type ?? null : existing.latestUsageType,
      });
    });

    creditPurchaseEntries.forEach((entry) => {
      const userId = entry.user_id;
      if (!userId) {
        return;
      }

      const existing = userTransactionAggregates.get(userId) ?? {
        totalPurchasedDollars: 0,
        totalUsedDollars: 0,
        latestActivity: null,
        latestUsageDescription: null,
        latestUsageType: null,
      };

      const amount = Number(entry.amount_dollars ?? 0) || 0;
      const completedAt = entry.completed_at ?? entry.created_at ?? null;
      const latestActivity = resolveLatestActivity(existing.latestActivity, completedAt);

      userTransactionAggregates.set(userId, {
        totalPurchasedDollars: existing.totalPurchasedDollars + amount,
        totalUsedDollars: existing.totalUsedDollars,
        latestActivity,
        latestUsageDescription: existing.latestUsageDescription,
        latestUsageType: existing.latestUsageType,
      });
    });

    const recentTransactions = Array.from(userTransactionAggregates.entries())
      .map(([userId, aggregate]) => {
        const profile = profileMap.get(userId);
        const email = emailMap.get(userId) ?? null;

        const totalPurchasedCredits = Math.round(aggregate.totalPurchasedDollars * 100);
        const totalUsedCredits = Math.round(aggregate.totalUsedDollars * 100);
        const netCredits = totalPurchasedCredits - totalUsedCredits;
        const netAmountDollars = aggregate.totalPurchasedDollars - aggregate.totalUsedDollars;
        const direction = netCredits >= 0 ? 'in' : 'out';
        const status: 'Purchased' | 'Used' = netCredits >= 0 ? 'Purchased' : 'Used';

        const occurredAt =
          aggregate.latestActivity && !Number.isNaN(Date.parse(aggregate.latestActivity))
            ? aggregate.latestActivity
            : new Date().toISOString();

        return {
          id: userId,
          userId,
          userName: profile?.preferredName || profile?.fullName || email || 'Unknown user',
          email,
          totalPurchasedCredits,
          totalUsedCredits,
          netCredits,
          netAmountDollars,
          status,
          direction,
          occurredAt,
          description: aggregate.latestUsageDescription,
          usageType: aggregate.latestUsageType,
        };
      })
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalUsers: totalUsersResult.error ? 0 : totalUsersResult.count ?? 0,
          totalCredits: totals.totalCredits,
          totalPurchased: totals.totalPurchased,
          totalUsed: totals.totalUsed,
          externalCredits,
          internalCredits,
        },
        recentUsers,
        recentTransactions,
      },
    });
  } catch (error) {
    console.error('Error generating dashboard summary', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate dashboard summary',
      },
      { status: 500 },
    );
  }
}


