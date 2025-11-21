import * as React from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { CircleDollarSign, HandCoins } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { useCreditUsage, useCreditPurchases } from '@/hooks/use-realtime-data';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Transaction {
  userId: string;
  userName: string;
  userEmail: string;
  amountDollars: number;
  date: Date;
  type: 'used' | 'purchased';
}

export function RecentCreditTransactions() {
  const theme = useColorScheme();
  const colors = Colors[theme];
  const { creditUsage, loading: usageLoading, error: usageError } = useCreditUsage();
  const { creditPurchases, loading: purchasesLoading, error: purchasesError } = useCreditPurchases();
  const [filterType, setFilterType] = React.useState<'all' | 'used' | 'purchased'>('purchased');

  const loading = usageLoading || purchasesLoading;
  const error = usageError || purchasesError;

  // Combine credit usage and purchases into a single transactions list
  const recentTransactions = React.useMemo(() => {
    const transactions: Transaction[] = [];

    // Add credit usage transactions (these are deductions/used)
    // Note: creditUsage contains aggregated data (one entry per user with total usage)
    // We treat each user's aggregate as a transaction entry
    creditUsage.forEach(usage => {
      // Only add if there's actual usage (amount > 0)
      if (usage.totalAmountDollars > 0) {
        transactions.push({
          userId: usage.userId,
          userName: usage.userName || `User ${usage.userId.slice(0, 8)}`,
          userEmail: usage.userEmail || 'Email not available',
          amountDollars: usage.totalAmountDollars,
          date: usage.latestCreatedAt,
          type: 'used',
        });
      }
    });

    // Add credit purchase transactions (these are additions)
    // These are individual purchase transactions
    creditPurchases.forEach(purchase => {
      // Only add if there's an actual purchase amount
      if (purchase.amountDollars > 0) {
        transactions.push({
          userId: purchase.userId,
          userName: purchase.userName || `User ${purchase.userId.slice(0, 8)}`,
          userEmail: purchase.userEmail || 'Email not available',
          amountDollars: purchase.amountDollars,
          // Use completedAt if available, otherwise createdAt
          date: purchase.completedAt || purchase.createdAt,
          type: 'purchased',
        });
      }
    });

    // Sort by date (most recent first) and take top 5
    return transactions
      .sort((a, b) => {
        // Ensure dates are valid Date objects
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [creditUsage, creditPurchases]);

  // Filter transactions based on filterType state
  const filteredTransactions = React.useMemo(() => {
    if (filterType === 'used') {
      return recentTransactions.filter(transaction => transaction.type === 'used');
    }
    if (filterType === 'purchased') {
      return recentTransactions.filter(transaction => transaction.type === 'purchased');
    }
    return recentTransactions;
  }, [recentTransactions, filterType]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCredits = (amountDollars: number): string => {
    const credits = Math.round(amountDollars * 100);
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(credits);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerRowLeft}>
            <View style={[styles.iconBadge, { backgroundColor: colors.badgeBackground }]}>
              <RemixIcon name="money-dollar-circle-line" size={18} color={colors.iconAccent} />
            </View>
            <ThemedText
              type="subtitle"
              style={styles.title}
              lightColor={colors.textPrimary}
              darkColor={colors.textPrimary}>
              Recent Credit Transactions
            </ThemedText>
            </View>
            <View style={styles.headerIcons}>
              <View style={styles.iconButtonContainer}>
                <CircleDollarSign size={20} color={colors.iconAccent} />
              </View>
              <View style={styles.iconButtonContainer}>
                <HandCoins size={20} color={colors.iconAccent} />
              </View>
            </View>
          </View>
          <ThemedText
            style={styles.subtitle}
            lightColor={colors.textSecondary}
            darkColor={colors.textSecondary}>
            Latest 5 credit transactions
          </ThemedText>
        </View>
        <View style={styles.content}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.iconAccent} />
            <ThemedText
              style={styles.loadingText}
              lightColor={colors.textSecondary}
              darkColor={colors.textSecondary}>
              Loading transactions...
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerRowLeft}>
            <View style={[styles.iconBadge, { backgroundColor: colors.badgeBackground }]}>
              <RemixIcon name="money-dollar-circle-line" size={18} color={colors.iconAccent} />
            </View>
            <ThemedText
              type="subtitle"
              style={styles.title}
              lightColor={colors.textPrimary}
              darkColor={colors.textPrimary}>
              Recent Credit Transactions
            </ThemedText>
            </View>
            <View style={styles.headerIcons}>
              <View style={styles.iconButtonContainer}>
                <CircleDollarSign size={20} color={colors.iconAccent} />
              </View>
              <View style={styles.iconButtonContainer}>
                <HandCoins size={20} color={colors.iconAccent} />
              </View>
            </View>
          </View>
          <ThemedText
            style={styles.subtitle}
            lightColor={colors.textSecondary}
            darkColor={colors.textSecondary}>
            Latest 5 credit transactions
          </ThemedText>
        </View>
        <View style={styles.content}>
          <ThemedText
            style={styles.errorText}
            lightColor={colors.highlightText}
            darkColor={colors.highlightText}>
            Error loading recent transactions: {error}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerRowLeft}>
          <View style={[styles.iconBadge, { backgroundColor: colors.badgeBackground }]}>
            <RemixIcon name="money-dollar-circle-line" size={18} color={colors.iconAccent} />
          </View>
          <ThemedText
            type="subtitle"
            style={styles.title}
            lightColor={colors.textPrimary}
            darkColor={colors.textPrimary}>
            Recent Credit Transactions
          </ThemedText>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => setFilterType(filterType === 'purchased' ? 'all' : 'purchased')}
              activeOpacity={0.7}
              style={[
                styles.iconButton,
                { backgroundColor: '#E9DFD3' },
                filterType === 'purchased' && { backgroundColor: colors.activeTabBackground },
              ]}>
              <CircleDollarSign
                size={20}
                color={filterType === 'purchased' ? colors.highlightText : colors.iconAccent}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilterType(filterType === 'used' ? 'all' : 'used')}
              activeOpacity={0.7}
              style={[
                styles.iconButton,
                { backgroundColor: '#E9DFD3' },
                filterType === 'used' && { backgroundColor: colors.activeTabBackground },
              ]}>
              <HandCoins
                size={20}
                color={filterType === 'used' ? colors.highlightText : colors.iconAccent}
              />
            </TouchableOpacity>
          </View>
        </View>
          <ThemedText
            style={styles.subtitle}
            lightColor={colors.textSecondary}
            darkColor={colors.textSecondary}>
            {filterType === 'used'
              ? 'Used credit transactions only'
              : filterType === 'purchased'
              ? 'Purchased credit transactions only'
              : 'Latest 5 credit transactions'}
          </ThemedText>
        </View>
        <View style={styles.content}>
          {filteredTransactions.length > 0 ? (
            <View style={styles.transactionList}>
              {filteredTransactions.map((transaction) => {
              const isUsage = transaction.type === 'used';
              return (
                <View
                  key={`${transaction.userId}-${transaction.date.getTime()}`}
                  style={[styles.transactionItem, { borderBottomColor: colors.divider }]}>
                  <View
                    style={[
                      styles.transactionIcon,
                      {
                        backgroundColor: isUsage
                          ? colors.transactionNegativeIconBackground
                          : colors.transactionPositiveIconBackground,
                      },
                    ]}>
                    <RemixIcon
                      name={isUsage ? 'arrow-down-circle-line' : 'arrow-up-circle-line'}
                      size={20}
                      color={isUsage ? colors.transactionNegativeIcon : colors.transactionPositiveIcon}
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <View style={styles.transactionHeader}>
                      <ThemedText
                        type="defaultSemiBold"
                        style={styles.transactionName}
                        lightColor={colors.textPrimary}
                        darkColor={colors.textPrimary}>
                        {transaction.userName}
                      </ThemedText>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isUsage
                              ? colors.transactionNegativeBadgeBackground
                              : colors.transactionPositiveBadgeBackground,
                          },
                        ]}>
                        <ThemedText
                          type="defaultSemiBold"
                          style={styles.statusText}
                          lightColor={
                            isUsage ? colors.transactionNegativeBadgeText : colors.transactionPositiveBadgeText
                          }
                          darkColor={
                            isUsage ? colors.transactionNegativeBadgeText : colors.transactionPositiveBadgeText
                          }>
                          {isUsage ? 'Used' : 'Purchased'}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.transactionAmountRow}>
                      <ThemedText
                        style={styles.amountText}
                        lightColor={colors.textSecondary}
                        darkColor={colors.textSecondary}>
                        {formatCurrency(Math.abs(transaction.amountDollars))}
                      </ThemedText>
                      <ThemedText
                        style={styles.creditsText}
                        lightColor={colors.textSecondary}
                        darkColor={colors.textSecondary}>
                        ({formatCredits(Math.abs(transaction.amountDollars))} credits)
                      </ThemedText>
                    </View>
                    <View style={styles.transactionDateRow}>
                      <RemixIcon name="calendar-line" size={14} color={colors.textSecondary} />
                      <ThemedText
                        style={styles.dateText}
                        lightColor={colors.textSecondary}
                        darkColor={colors.textSecondary}>
                        {formatDate(transaction.date)}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText
                    type="defaultSemiBold"
                    style={styles.creditChange}
                    lightColor={isUsage ? colors.transactionNegativeText : colors.transactionPositiveText}
                    darkColor={isUsage ? colors.transactionNegativeText : colors.transactionPositiveText}>
                    {isUsage ? '-' : '+'}
                    {formatCredits(Math.abs(transaction.amountDollars))}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <ThemedText
              style={styles.emptyText}
              lightColor={colors.textSecondary}
              darkColor={colors.textSecondary}>
              No credit transactions found
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  header: {
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 14,
  },
  content: {
    gap: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorText: {
    textAlign: 'center',
    paddingVertical: 40,
    fontSize: 14,
  },
  transactionList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionDetails: {
    flex: 1,
    gap: 6,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  transactionName: {
    fontSize: 16,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  transactionAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amountText: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  creditsText: {
    fontSize: 14,
  },
  transactionDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
  },
  creditChange: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

