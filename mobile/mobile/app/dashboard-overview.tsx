import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, type ReactElement } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import RemixIcon, { type IconName } from 'react-native-remix-icon';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/providers/auth-context';
import { useDashboardSummary } from '@/hooks/use-dashboard-summary';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type MetricCard = {
  readonly title: string;
  readonly value: string;
  readonly subtitle: string;
  readonly icon: IconName;
  readonly footer?: string;
};

type RecentUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly joinedAt: string;
  readonly preferredName: string | null;
};

type RecentTransaction = {
  readonly id: string;
  readonly userName: string;
  readonly email: string | null;
  readonly status: 'Purchased' | 'Used';
  readonly direction: 'in' | 'out';
  readonly netAmountLabel: string;
  readonly netCreditsLabel: string;
  readonly occurredAtLabel: string;
  readonly purchasedCreditsLabel: string;
  readonly usedCreditsLabel: string;
  readonly hasPurchases: boolean;
  readonly hasUsage: boolean;
};


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 24,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.8,
  },
  headerTitle: {
    fontSize: 28,
  },
  metricsGrid: {
    gap: 16,
  },
  metricsLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  loadingHint: {
    fontSize: 14,
  },
  metricCard: {
    borderRadius: 22,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 5,
  },
  metricIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTitle: {
    fontSize: 15,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  metricSubtitle: {
    fontSize: 14,
  },
  section: {
    borderRadius: 24,
    padding: 20,
    gap: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  sectionHeader: {
    gap: 6,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
  },
  sectionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  recentUserList: {
    gap: 14,
  },
  emptyStateText: {
    textAlign: 'center',
    fontSize: 14,
  },
  errorCard: {
    borderRadius: 20,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 3,
  },
  errorTitle: {
    fontSize: 16,
  },
  errorSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryLabel: {
    fontSize: 15,
  },
  recentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 18,
  },
  userDetails: {
    flex: 1,
    gap: 6,
  },
  userName: {
    fontSize: 16,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userMetaIcon: {
    marginRight: 2,
  },
  userMetaText: {
    fontSize: 13,
  },
  transactionList: {
    gap: 16,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  transactionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionIconBadgePositive: {
    // Background color applied inline
  },
  transactionIconBadgeNegative: {
    // Background color applied inline
  },
  transactionDetails: {
    flex: 1,
    gap: 6,
  },
  transactionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  transactionUserName: {
    fontSize: 16,
  },
  transactionStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  transactionStatusBadgePositive: {
    // Background color applied inline
  },
  transactionStatusBadgeNegative: {
    // Background color applied inline
  },
  transactionStatusText: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  transactionStatusTextPositive: {
    // Color applied inline
  },
  transactionStatusTextNegative: {
    // Color applied inline
  },
  transactionAmountLabel: {
    fontSize: 14,
  },
  transactionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionMetaIcon: {
    marginRight: 2,
  },
  transactionMetaText: {
    fontSize: 13,
  },
  transactionBreakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  transactionBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionBreakdownText: {
    fontSize: 12,
  },
  transactionCreditsDelta: {
    fontSize: 16,
  },
  transactionCreditsDeltaPositive: {
    // Color applied inline
  },
  transactionCreditsDeltaNegative: {
    // Color applied inline
  },
});

export default function DashboardOverviewScreen(): ReactElement {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const {
    data: summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    refresh,
  } = useDashboardSummary();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const formatCredits = useCallback((value: number) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  }, []);

  const formatCount = useCallback((value: number) => {
    return value.toLocaleString('en-US');
  }, []);

  const formatJoinedAt = useCallback((isoString: string | null) => {
    if (!isoString) {
      return 'Join date unavailable';
    }

    try {
      const date = new Date(isoString);
      return `Joined ${new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)}`;
    } catch (error) {
      console.warn('Failed to format join date', { isoString, error });
      return 'Join date unavailable';
    }
  }, []);

  const formatTransactionOccurredAt = useCallback((isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    } catch (error) {
      console.warn('Failed to format transaction timestamp', { isoString, error });
      return 'Timestamp unavailable';
    }
  }, []);

  const metrics = useMemo<readonly MetricCard[]>(() => {
    if (!summary) {
      return [];
    }

    const { metrics: summaryMetrics } = summary;

    return [
      {
        title: 'Total Users',
        value: formatCount(summaryMetrics.totalUsers),
        subtitle: 'Registered users',
        icon: 'team-line',
      },
      {
        title: 'Total Credits',
        value: formatCount(summaryMetrics.totalCredits),
        subtitle: `External: ${formatCredits(summaryMetrics.externalCredits)} | Internal: ${formatCredits(summaryMetrics.internalCredits)}`,
        icon: 'database-2-line',
      },
      {
        title: 'Total Purchased',
        value: formatCount(summaryMetrics.totalPurchased),
        subtitle: 'Credits purchased',
        icon: 'shopping-bag-3-line',
      },
      {
        title: 'Total Used',
        value: formatCount(summaryMetrics.totalUsed),
        subtitle: 'Credits used',
        icon: 'line-chart-line',
      },
    ];
  }, [formatCredits, formatCount, summary]);

  const recentUsers = useMemo<readonly RecentUser[]>(() => {
    if (!summary) {
      return [];
    }

    return summary.recentUsers.map((user) => ({
      id: user.id,
      name: user.fullName,
      preferredName: user.preferredName,
      email: user.email ?? 'Email unavailable',
      joinedAt: formatJoinedAt(user.createdAt ?? null),
    }));
  }, [formatJoinedAt, summary]);

  const recentTransactions = useMemo<readonly RecentTransaction[]>(() => {
    if (!summary) {
      return [];
    }

    return summary.recentTransactions.map((transaction) => {
      const netCreditsAbsolute = Math.abs(transaction.netCredits);
      const netAmountAbsolute = Math.abs(transaction.netAmountDollars);

      return {
        id: transaction.id,
        userName: transaction.userName,
        email: transaction.email,
        status: transaction.status,
        direction: transaction.direction,
        netAmountLabel: `$${netAmountAbsolute.toFixed(2)} (${formatCount(netCreditsAbsolute)} credits)`,
        netCreditsLabel: `${transaction.direction === 'in' ? '+' : '-'}${formatCount(netCreditsAbsolute)}`,
        occurredAtLabel: formatTransactionOccurredAt(transaction.occurredAt),
        purchasedCreditsLabel: formatCount(transaction.totalPurchasedCredits),
        usedCreditsLabel: formatCount(transaction.totalUsedCredits),
        hasPurchases: transaction.totalPurchasedCredits > 0,
        hasUsage: transaction.totalUsedCredits > 0,
      };
    });
  }, [formatCount, formatTransactionOccurredAt, summary]);

  const handleBackToMenu = useCallback(() => {
    router.back();
  }, [router]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent, { backgroundColor: colors.background }]}>
        <ThemedText
          type="title"
          style={styles.loadingText}
          lightColor={colors.textPrimary}
          darkColor={colors.textPrimary}>
          Loading dashboard...
        </ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={handleBackToMenu}
              accessibilityRole="button"
              accessibilityLabel="Navigate back to main dashboard menu"
              style={({ pressed }) => [
                styles.backButton,
                { backgroundColor: colors.cardBackground },
                pressed ? styles.backButtonPressed : undefined,
              ]}>
              <RemixIcon name="arrow-left-line" size={22} color={colors.textPrimary} />
            </Pressable>
            <ThemedText
              type="title"
              style={styles.headerTitle}
              lightColor={colors.headerText}
              darkColor={colors.headerText}>
              Dashboard
            </ThemedText>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          {isSummaryLoading && metrics.length === 0 ? (
            <View style={styles.metricsLoading}>
              <ActivityIndicator color={colors.iconAccent} />
              <ThemedText
                style={styles.loadingHint}
                lightColor={colors.textSecondary}
                darkColor={colors.textSecondary}>
                Fetching analytics...
              </ThemedText>
            </View>
          ) : (
            metrics.map((metric) => (
              <MetricCardComponent key={metric.title} metric={metric} colors={colors} />
            ))
          )}
        </View>

        {summaryError ? (
          <View style={[styles.errorCard, { backgroundColor: colors.cardBackground }]}>
            <ThemedText
              type="defaultSemiBold"
              style={styles.errorTitle}
              lightColor={colors.highlightText}
              darkColor={colors.highlightText}>
              Unable to load dashboard data
            </ThemedText>
            <ThemedText
              style={styles.errorSubtitle}
              lightColor={colors.textSecondary}
              darkColor={colors.textSecondary}>
              {summaryError}
            </ThemedText>
            <Pressable
              onPress={refresh}
              accessibilityRole="button"
              accessibilityLabel="Retry loading dashboard data"
              style={({ pressed }) => [
                styles.retryButton,
                { backgroundColor: colors.cardBackground },
                pressed ? styles.retryButtonPressed : undefined,
              ]}>
              <RemixIcon name="refresh-line" size={18} color={colors.iconAccent} />
              <ThemedText
                type="defaultSemiBold"
                style={styles.retryLabel}
                lightColor={colors.iconAccent}
                darkColor={colors.iconAccent}>
                Try Again
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: colors.badgeBackground }]}>
                <RemixIcon name="user-follow-line" size={18} color={colors.iconAccent} />
              </View>
              <ThemedText
                type="subtitle"
                style={styles.sectionTitle}
                lightColor={colors.textPrimary}
                darkColor={colors.textPrimary}>
                Recent Users
              </ThemedText>
            </View>
            <ThemedText
              style={styles.sectionSubtitle}
              lightColor={colors.textSecondary}
              darkColor={colors.textSecondary}>
              Latest 5 registered users
            </ThemedText>
          </View>

          <View style={styles.recentUserList}>
            {isSummaryLoading && recentUsers.length === 0 ? (
              <View style={styles.metricsLoading}>
                <ActivityIndicator color={colors.iconAccent} />
                <ThemedText
                  style={styles.loadingHint}
                  lightColor={colors.textSecondary}
                  darkColor={colors.textSecondary}>
                  Loading latest users...
                </ThemedText>
              </View>
            ) : recentUsers.length > 0 ? (
              recentUsers.map((user) => <RecentUserRow key={user.id} user={user} colors={colors} />)
            ) : (
              <ThemedText
                style={styles.emptyStateText}
                lightColor={colors.textSecondary}
                darkColor={colors.textSecondary}>
                No recent users available.
              </ThemedText>
            )}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: colors.badgeBackground }]}>
                <RemixIcon name="money-dollar-circle-line" size={18} color={colors.iconAccent} />
              </View>
              <ThemedText
                type="subtitle"
                style={styles.sectionTitle}
                lightColor={colors.textPrimary}
                darkColor={colors.textPrimary}>
                Recent Credit Transactions
              </ThemedText>
            </View>
            <ThemedText
              style={styles.sectionSubtitle}
              lightColor={colors.textSecondary}
              darkColor={colors.textSecondary}>
              Latest 5 credit transactions
            </ThemedText>
          </View>

          <View style={styles.transactionList}>
            {isSummaryLoading && recentTransactions.length === 0 ? (
              <View style={styles.metricsLoading}>
                <ActivityIndicator color={colors.iconAccent} />
                <ThemedText
                  style={styles.loadingHint}
                  lightColor={colors.textSecondary}
                  darkColor={colors.textSecondary}>
                  Loading recent transactions...
                </ThemedText>
              </View>
            ) : recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <RecentTransactionRow key={transaction.id} transaction={transaction} colors={colors} />
              ))
            ) : (
              <ThemedText
                style={styles.emptyStateText}
                lightColor={colors.textSecondary}
                darkColor={colors.textSecondary}>
                No recent credit transactions available.
              </ThemedText>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const MetricCardComponent = memo(({ metric, colors }: { readonly metric: MetricCard; colors: typeof Colors.light }): ReactElement => {
  const { title, value, subtitle, icon } = metric;

  return (
    <View style={[styles.metricCard, { backgroundColor: colors.cardBackground }]}>
      <View style={[styles.metricIconBadge, { backgroundColor: colors.badgeBackground }]}>
        <RemixIcon name={icon} size={22} color={colors.iconAccent} />
      </View>
      <ThemedText
        type="defaultSemiBold"
        style={styles.metricTitle}
        lightColor={colors.textSecondary}
        darkColor={colors.textSecondary}>
        {title}
      </ThemedText>
      <ThemedText
        type="title"
        style={styles.metricValue}
        lightColor={title === 'Total Users' ? colors.highlightText : colors.textPrimary}
        darkColor={title === 'Total Users' ? colors.highlightText : colors.textPrimary}>
        {value}
      </ThemedText>
      <ThemedText
        style={styles.metricSubtitle}
        lightColor={colors.textSecondary}
        darkColor={colors.textSecondary}>
        {subtitle}
      </ThemedText>
    </View>
  );
});
MetricCardComponent.displayName = 'MetricCardComponent';

const RecentUserRow = memo(({ user, colors }: { readonly user: RecentUser; colors: typeof Colors.light }): ReactElement => {
  const displayName = user.preferredName && user.preferredName.trim().length > 0 ? user.preferredName : user.name;
  const avatarLabel = displayName.trim().length > 0 ? displayName.trim().charAt(0).toUpperCase() : '?';

  return (
    <View style={[styles.recentUserRow, { borderBottomColor: colors.divider }]}>
      <View style={[styles.avatarCircle, { backgroundColor: colors.avatarBackground }]}>
        <ThemedText
          type="defaultSemiBold"
          style={styles.avatarLabel}
          lightColor={colors.avatarText}
          darkColor={colors.avatarText}>
          {avatarLabel}
        </ThemedText>
      </View>
      <View style={styles.userDetails}>
        <ThemedText
          type="defaultSemiBold"
          style={styles.userName}
          lightColor={colors.textPrimary}
          darkColor={colors.textPrimary}>
          {displayName}
        </ThemedText>
        <View style={styles.userMetaRow}>
          <RemixIcon name="mail-line" size={16} color={colors.textSecondary} style={styles.userMetaIcon} />
          <ThemedText
            style={styles.userMetaText}
            lightColor={colors.textSecondary}
            darkColor={colors.textSecondary}>
            {user.email}
          </ThemedText>
        </View>
        <View style={styles.userMetaRow}>
          <RemixIcon name="calendar-line" size={16} color={colors.textSecondary} style={styles.userMetaIcon} />
          <ThemedText
            style={styles.userMetaText}
            lightColor={colors.textSecondary}
            darkColor={colors.textSecondary}>
            {user.joinedAt}
          </ThemedText>
        </View>
      </View>
    </View>
  );
});
RecentUserRow.displayName = 'RecentUserRow';

const RecentTransactionRow = memo(({ transaction, colors }: { readonly transaction: RecentTransaction; colors: typeof Colors.light }): ReactElement => {
  const isIncoming = transaction.direction === 'in';
  const iconName = isIncoming ? 'arrow-up-line' : 'arrow-down-line';

  return (
    <View style={[styles.transactionRow, { borderBottomColor: colors.divider }]}>
      <View
        style={[
          styles.transactionIconBadge,
          {
            backgroundColor: isIncoming ? colors.transactionPositiveIconBackground : colors.transactionNegativeIconBackground,
          },
        ]}>
        <RemixIcon
          name={iconName}
          size={20}
          color={isIncoming ? colors.transactionPositiveIcon : colors.transactionNegativeIcon}
        />
      </View>
      <View style={styles.transactionDetails}>
        <View style={styles.transactionHeaderRow}>
          <ThemedText
            type="defaultSemiBold"
            style={styles.transactionUserName}
            lightColor={colors.textPrimary}
            darkColor={colors.textPrimary}>
            {transaction.userName}
          </ThemedText>
          <View
            style={[
              styles.transactionStatusBadge,
              {
                backgroundColor: isIncoming ? colors.transactionPositiveBadgeBackground : colors.transactionNegativeBadgeBackground,
              },
            ]}>
            <ThemedText
              type="defaultSemiBold"
              style={styles.transactionStatusText}
              lightColor={isIncoming ? colors.transactionPositiveBadgeText : colors.transactionNegativeBadgeText}
              darkColor={isIncoming ? colors.transactionPositiveBadgeText : colors.transactionNegativeBadgeText}>
              {transaction.status}
            </ThemedText>
          </View>
        </View>

        <ThemedText
          style={styles.transactionAmountLabel}
          lightColor={colors.textSecondary}
          darkColor={colors.textSecondary}>
          {transaction.netAmountLabel}
        </ThemedText>

        <View style={styles.transactionMetaRow}>
          <RemixIcon name="calendar-line" size={16} color={colors.textSecondary} style={styles.transactionMetaIcon} />
          <ThemedText
            style={styles.transactionMetaText}
            lightColor={colors.textSecondary}
            darkColor={colors.textSecondary}>
            {transaction.occurredAtLabel}
          </ThemedText>
        </View>

        <View style={styles.transactionBreakdownRow}>
          {transaction.hasPurchases ? (
            <View style={styles.transactionBreakdownItem}>
              <RemixIcon name="arrow-up-circle-line" size={14} color={colors.transactionPositiveText} />
              <ThemedText
                style={styles.transactionBreakdownText}
                lightColor={colors.transactionPositiveText}
                darkColor={colors.transactionPositiveText}>
                {`+${transaction.purchasedCreditsLabel} credits purchased`}
              </ThemedText>
            </View>
          ) : null}
          {transaction.hasUsage ? (
            <View style={styles.transactionBreakdownItem}>
              <RemixIcon name="arrow-down-circle-line" size={14} color={colors.transactionNegativeText} />
              <ThemedText
                style={styles.transactionBreakdownText}
                lightColor={colors.transactionNegativeText}
                darkColor={colors.transactionNegativeText}>
                {`-${transaction.usedCreditsLabel} credits used`}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      <ThemedText
        type="defaultSemiBold"
        style={styles.transactionCreditsDelta}
        lightColor={isIncoming ? colors.transactionPositiveText : colors.transactionNegativeText}
        darkColor={isIncoming ? colors.transactionPositiveText : colors.transactionNegativeText}>
        {transaction.netCreditsLabel}
      </ThemedText>
    </View>
  );
});
RecentTransactionRow.displayName = 'RecentTransactionRow';

