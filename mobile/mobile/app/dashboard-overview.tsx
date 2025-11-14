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

const palette = {
  background: '#F5ECE4',
  headerText: '#1A1A1A',
  primaryText: '#1F1F1F',
  secondaryText: '#5C5C5C',
  cardBackground: '#F6E8DC',
  highlightText: '#C3473D',
  iconAccent: '#C3473D',
  divider: '#E4D5CA',
  badgeBackground: '#EDD5C5',
  avatarBackground: '#F0CFC2',
  avatarText: '#643022',
  transactionNegativeIconBackground: '#FAD9D9',
  transactionNegativeIcon: '#B2383B',
  transactionPositiveIconBackground: '#DFF3E3',
  transactionPositiveIcon: '#2F7A3D',
  transactionNegativeBadgeBackground: '#F5CFCF',
  transactionNegativeBadgeText: '#B2383B',
  transactionPositiveBadgeBackground: '#D6F0DA',
  transactionPositiveBadgeText: '#2F7A3D',
  transactionNegativeText: '#B2383B',
  transactionPositiveText: '#2F7A3D',
} as const;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
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
    backgroundColor: palette.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.8,
  },
  headerTitle: {
    fontSize: 28,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: palette.cardBackground,
  },
  logoutButtonPressed: {
    opacity: 0.8,
  },
  logoutText: {
    fontSize: 16,
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
    backgroundColor: palette.cardBackground,
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
    backgroundColor: palette.badgeBackground,
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
    backgroundColor: palette.cardBackground,
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
    backgroundColor: palette.badgeBackground,
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
    backgroundColor: palette.cardBackground,
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
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: palette.divider,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.avatarBackground,
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
    borderBottomColor: palette.divider,
  },
  transactionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionIconBadgePositive: {
    backgroundColor: palette.transactionPositiveIconBackground,
  },
  transactionIconBadgeNegative: {
    backgroundColor: palette.transactionNegativeIconBackground,
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
    backgroundColor: palette.transactionPositiveBadgeBackground,
  },
  transactionStatusBadgeNegative: {
    backgroundColor: palette.transactionNegativeBadgeBackground,
  },
  transactionStatusText: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  transactionStatusTextPositive: {
    color: palette.transactionPositiveBadgeText,
  },
  transactionStatusTextNegative: {
    color: palette.transactionNegativeBadgeText,
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
    color: palette.transactionPositiveText,
  },
  transactionCreditsDeltaNegative: {
    color: palette.transactionNegativeText,
  },
});

export default function DashboardOverviewScreen(): ReactElement {
  const router = useRouter();
  const { isAuthenticated, isLoading, signOut } = useAuth();
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

  const handleLogout = useCallback(async () => {
    const correlationId = `dashboard-overview-logout-${Date.now()}`;

    console.info('Dashboard overview requested logout', {
      correlationId,
      timestamp: new Date().toISOString(),
    });

    await signOut({ correlationId });
    router.replace('/login');
  }, [router, signOut]);

  const handleBackToMenu = useCallback(() => {
    router.back();
  }, [router]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <ThemedText
          type="title"
          style={styles.loadingText}
          lightColor={palette.primaryText}
          darkColor={palette.primaryText}>
          Loading dashboard...
        </ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
              style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : undefined]}>
              <RemixIcon name="arrow-left-line" size={22} color={palette.primaryText} />
            </Pressable>
            <ThemedText
              type="title"
              style={styles.headerTitle}
              lightColor={palette.headerText}
              darkColor={palette.headerText}>
              Dashboard
            </ThemedText>
          </View>
          <Pressable
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Sign out of dashboard"
            style={({ pressed }) => [styles.logoutButton, pressed ? styles.logoutButtonPressed : undefined]}>
            <RemixIcon name="logout-box-line" size={18} color={palette.primaryText} />
            <ThemedText
              type="defaultSemiBold"
              style={styles.logoutText}
              lightColor={palette.primaryText}
              darkColor={palette.primaryText}>
              Logout
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.metricsGrid}>
          {isSummaryLoading && metrics.length === 0 ? (
            <View style={styles.metricsLoading}>
              <ActivityIndicator color={palette.iconAccent} />
              <ThemedText
                style={styles.loadingHint}
                lightColor={palette.secondaryText}
                darkColor={palette.secondaryText}>
                Fetching analytics...
              </ThemedText>
            </View>
          ) : (
            metrics.map((metric) => <MetricCardComponent key={metric.title} metric={metric} />)
          )}
        </View>

        {summaryError ? (
          <View style={styles.errorCard}>
            <ThemedText
              type="defaultSemiBold"
              style={styles.errorTitle}
              lightColor={palette.highlightText}
              darkColor={palette.highlightText}>
              Unable to load dashboard data
            </ThemedText>
            <ThemedText
              style={styles.errorSubtitle}
              lightColor={palette.secondaryText}
              darkColor={palette.secondaryText}>
              {summaryError}
            </ThemedText>
            <Pressable
              onPress={refresh}
              accessibilityRole="button"
              accessibilityLabel="Retry loading dashboard data"
              style={({ pressed }) => [styles.retryButton, pressed ? styles.retryButtonPressed : undefined]}>
              <RemixIcon name="refresh-line" size={18} color={palette.iconAccent} />
              <ThemedText
                type="defaultSemiBold"
                style={styles.retryLabel}
                lightColor={palette.iconAccent}
                darkColor={palette.iconAccent}>
                Try Again
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconBadge}>
                <RemixIcon name="user-follow-line" size={18} color={palette.iconAccent} />
              </View>
              <ThemedText
                type="subtitle"
                style={styles.sectionTitle}
                lightColor={palette.primaryText}
                darkColor={palette.primaryText}>
                Recent Users
              </ThemedText>
            </View>
            <ThemedText
              style={styles.sectionSubtitle}
              lightColor={palette.secondaryText}
              darkColor={palette.secondaryText}>
              Latest 5 registered users
            </ThemedText>
          </View>

          <View style={styles.recentUserList}>
            {isSummaryLoading && recentUsers.length === 0 ? (
              <View style={styles.metricsLoading}>
                <ActivityIndicator color={palette.iconAccent} />
                <ThemedText
                  style={styles.loadingHint}
                  lightColor={palette.secondaryText}
                  darkColor={palette.secondaryText}>
                  Loading latest users...
                </ThemedText>
              </View>
            ) : recentUsers.length > 0 ? (
              recentUsers.map((user) => <RecentUserRow key={user.id} user={user} />)
            ) : (
              <ThemedText
                style={styles.emptyStateText}
                lightColor={palette.secondaryText}
                darkColor={palette.secondaryText}>
                No recent users available.
              </ThemedText>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconBadge}>
                <RemixIcon name="money-dollar-circle-line" size={18} color={palette.iconAccent} />
              </View>
              <ThemedText
                type="subtitle"
                style={styles.sectionTitle}
                lightColor={palette.primaryText}
                darkColor={palette.primaryText}>
                Recent Credit Transactions
              </ThemedText>
            </View>
            <ThemedText
              style={styles.sectionSubtitle}
              lightColor={palette.secondaryText}
              darkColor={palette.secondaryText}>
              Latest 5 credit transactions
            </ThemedText>
          </View>

          <View style={styles.transactionList}>
            {isSummaryLoading && recentTransactions.length === 0 ? (
              <View style={styles.metricsLoading}>
                <ActivityIndicator color={palette.iconAccent} />
                <ThemedText
                  style={styles.loadingHint}
                  lightColor={palette.secondaryText}
                  darkColor={palette.secondaryText}>
                  Loading recent transactions...
                </ThemedText>
              </View>
            ) : recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <RecentTransactionRow key={transaction.id} transaction={transaction} />
              ))
            ) : (
              <ThemedText
                style={styles.emptyStateText}
                lightColor={palette.secondaryText}
                darkColor={palette.secondaryText}>
                No recent credit transactions available.
              </ThemedText>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const MetricCardComponent = memo(({ metric }: { readonly metric: MetricCard }): ReactElement => {
  const { title, value, subtitle, icon } = metric;

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIconBadge}>
        <RemixIcon name={icon} size={22} color={palette.iconAccent} />
      </View>
      <ThemedText
        type="defaultSemiBold"
        style={styles.metricTitle}
        lightColor={palette.secondaryText}
        darkColor={palette.secondaryText}>
        {title}
      </ThemedText>
      <ThemedText
        type="title"
        style={styles.metricValue}
        lightColor={title === 'Total Users' ? palette.highlightText : palette.primaryText}
        darkColor={title === 'Total Users' ? palette.highlightText : palette.primaryText}>
        {value}
      </ThemedText>
      <ThemedText
        style={styles.metricSubtitle}
        lightColor={palette.secondaryText}
        darkColor={palette.secondaryText}>
        {subtitle}
      </ThemedText>
    </View>
  );
});
MetricCardComponent.displayName = 'MetricCardComponent';

const RecentUserRow = memo(({ user }: { readonly user: RecentUser }): ReactElement => {
  const displayName = user.preferredName && user.preferredName.trim().length > 0 ? user.preferredName : user.name;
  const avatarLabel = displayName.trim().length > 0 ? displayName.trim().charAt(0).toUpperCase() : '?';

  return (
    <View style={styles.recentUserRow}>
      <View style={styles.avatarCircle}>
        <ThemedText
          type="defaultSemiBold"
          style={styles.avatarLabel}
          lightColor={palette.avatarText}
          darkColor={palette.avatarText}>
          {avatarLabel}
        </ThemedText>
      </View>
      <View style={styles.userDetails}>
        <ThemedText
          type="defaultSemiBold"
          style={styles.userName}
          lightColor={palette.primaryText}
          darkColor={palette.primaryText}>
          {displayName}
        </ThemedText>
        <View style={styles.userMetaRow}>
          <RemixIcon name="mail-line" size={16} color={palette.secondaryText} style={styles.userMetaIcon} />
          <ThemedText
            style={styles.userMetaText}
            lightColor={palette.secondaryText}
            darkColor={palette.secondaryText}>
            {user.email}
          </ThemedText>
        </View>
        <View style={styles.userMetaRow}>
          <RemixIcon name="calendar-line" size={16} color={palette.secondaryText} style={styles.userMetaIcon} />
          <ThemedText
            style={styles.userMetaText}
            lightColor={palette.secondaryText}
            darkColor={palette.secondaryText}>
            {user.joinedAt}
          </ThemedText>
        </View>
      </View>
    </View>
  );
});
RecentUserRow.displayName = 'RecentUserRow';

const RecentTransactionRow = memo(({ transaction }: { readonly transaction: RecentTransaction }): ReactElement => {
  const isIncoming = transaction.direction === 'in';
  const iconName = isIncoming ? 'arrow-up-line' : 'arrow-down-line';

  return (
    <View style={styles.transactionRow}>
      <View
        style={[
          styles.transactionIconBadge,
          isIncoming ? styles.transactionIconBadgePositive : styles.transactionIconBadgeNegative,
        ]}>
        <RemixIcon
          name={iconName}
          size={20}
          color={isIncoming ? palette.transactionPositiveIcon : palette.transactionNegativeIcon}
        />
      </View>
      <View style={styles.transactionDetails}>
        <View style={styles.transactionHeaderRow}>
          <ThemedText
            type="defaultSemiBold"
            style={styles.transactionUserName}
            lightColor={palette.primaryText}
            darkColor={palette.primaryText}>
            {transaction.userName}
          </ThemedText>
          <View
            style={[
              styles.transactionStatusBadge,
              isIncoming ? styles.transactionStatusBadgePositive : styles.transactionStatusBadgeNegative,
            ]}>
            <ThemedText
              type="defaultSemiBold"
              style={[
                styles.transactionStatusText,
                isIncoming ? styles.transactionStatusTextPositive : styles.transactionStatusTextNegative,
              ]}
              lightColor={isIncoming ? palette.transactionPositiveBadgeText : palette.transactionNegativeBadgeText}
              darkColor={isIncoming ? palette.transactionPositiveBadgeText : palette.transactionNegativeBadgeText}>
              {transaction.status}
            </ThemedText>
          </View>
        </View>

        <ThemedText
          style={styles.transactionAmountLabel}
          lightColor={palette.secondaryText}
          darkColor={palette.secondaryText}>
          {transaction.netAmountLabel}
        </ThemedText>

        <View style={styles.transactionMetaRow}>
          <RemixIcon name="calendar-line" size={16} color={palette.secondaryText} style={styles.transactionMetaIcon} />
          <ThemedText
            style={styles.transactionMetaText}
            lightColor={palette.secondaryText}
            darkColor={palette.secondaryText}>
            {transaction.occurredAtLabel}
          </ThemedText>
        </View>

        <View style={styles.transactionBreakdownRow}>
          {transaction.hasPurchases ? (
            <View style={styles.transactionBreakdownItem}>
              <RemixIcon name="arrow-up-circle-line" size={14} color={palette.transactionPositiveText} />
              <ThemedText
                style={styles.transactionBreakdownText}
                lightColor={palette.transactionPositiveText}
                darkColor={palette.transactionPositiveText}>
                {`+${transaction.purchasedCreditsLabel} credits purchased`}
              </ThemedText>
            </View>
          ) : null}
          {transaction.hasUsage ? (
            <View style={styles.transactionBreakdownItem}>
              <RemixIcon name="arrow-down-circle-line" size={14} color={palette.transactionNegativeText} />
              <ThemedText
                style={styles.transactionBreakdownText}
                lightColor={palette.transactionNegativeText}
                darkColor={palette.transactionNegativeText}>
                {`-${transaction.usedCreditsLabel} credits used`}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      <ThemedText
        type="defaultSemiBold"
        style={[
          styles.transactionCreditsDelta,
          isIncoming ? styles.transactionCreditsDeltaPositive : styles.transactionCreditsDeltaNegative,
        ]}
        lightColor={isIncoming ? palette.transactionPositiveText : palette.transactionNegativeText}
        darkColor={isIncoming ? palette.transactionPositiveText : palette.transactionNegativeText}>
        {transaction.netCreditsLabel}
      </ThemedText>
    </View>
  );
});
RecentTransactionRow.displayName = 'RecentTransactionRow';

