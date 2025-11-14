import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { getAppConfig } from '@/utils/config';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type CreditPurchase = {
  readonly id: string;
  readonly userId: string;
  readonly amountDollars: number;
  readonly stripePaymentIntentId: string | null;
  readonly stripeChargeId: string | null;
  readonly status: string;
  readonly description: string | null;
  readonly metadata: Record<string, any>;
  readonly createdAt: string;
  readonly completedAt: string | null;
  readonly expiresAt: string | null;
  readonly userEmail: string;
  readonly userName: string;
};

export function PurchasedCreditsTable(): ReactElement {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const [creditPurchases, setCreditPurchases] = useState<readonly CreditPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchCreditPurchases = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { apiBaseUrl } = getAppConfig();
      const response = await fetch(`${apiBaseUrl}/api/credit-purchases`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = await response.json();

      if (!payload.success) {
        throw new Error(payload.message ?? 'Failed to load credit purchases');
      }

      console.log('Mobile: Received credit purchases data:', payload.data?.length || 0);
      if (payload.data && payload.data.length > 0) {
        console.log('Mobile: Sample purchase data:', {
          id: payload.data[0].id,
          userEmail: payload.data[0].userEmail,
          userName: payload.data[0].userName,
          userId: payload.data[0].userId,
        });
      }

      const transformedPurchases = (payload.data || []).map((purchase: any) => {
        const email = purchase.userEmail || 'Email not available';
        const name = purchase.userName || 'Unknown User';
        
        // Log if we're missing data
        if (email === 'Email not available' || name === 'Unknown User') {
          console.log(`Mobile: Missing data for purchase ${purchase.id}, userId: ${purchase.userId}, email: ${email}, name: ${name}`);
        }
        
        return {
          id: purchase.id,
          userId: purchase.userId,
          amountDollars: parseFloat(purchase.amountDollars) || 0,
          stripePaymentIntentId: purchase.stripePaymentIntentId,
          stripeChargeId: purchase.stripeChargeId,
          status: purchase.status,
          description: purchase.description,
          metadata: purchase.metadata || {},
          createdAt: purchase.createdAt,
          completedAt: purchase.completedAt,
          expiresAt: purchase.expiresAt,
          userEmail: email,
          userName: name,
        };
      });

      console.log(`Mobile: Transformed ${transformedPurchases.length} purchases`);
      setCreditPurchases(transformedPurchases);
    } catch (err) {
      console.error('Error fetching credit purchases:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credit purchases');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreditPurchases();
  }, [fetchCreditPurchases]);

  // Format date - matches web version format: "MMM dd, yyyy HH:mm"
  const formatDate = useCallback((dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      // Format: "MMM dd, yyyy HH:mm" (e.g., "Nov 13, 2025 23:12")
      const month = date.toLocaleString('en-US', { month: 'short' });
      const day = date.getDate();
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${month} ${day}, ${year} ${hours}:${minutes}`;
    } catch {
      return '-';
    }
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const totalPurchases = creditPurchases.length;
    const totalAmount = creditPurchases.reduce((sum, purchase) => sum + purchase.amountDollars, 0);
    const averagePurchase = totalPurchases > 0 ? totalAmount / totalPurchases : 0;
    
    return {
      totalPurchases,
      totalAmount,
      averagePurchase,
    };
  }, [creditPurchases]);

  // Pagination
  const totalPages = Math.ceil(creditPurchases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPurchases = useMemo(() => {
    return creditPurchases.slice(startIndex, endIndex);
  }, [creditPurchases, startIndex, endIndex]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const goToPrevious = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backButton, { backgroundColor: colors.cardBackground }, pressed && styles.backButtonPressed]}>
                <RemixIcon name="arrow-left-line" size={22} color={colors.textPrimary} />
              </Pressable>
              <ThemedText type="title" style={styles.headerTitle} lightColor={colors.headerText} darkColor={colors.headerText}>
                Purchased Credits
              </ThemedText>
            </View>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.highlightText} />
            <ThemedText type="default" style={styles.loadingText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              Loading...
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backButton, { backgroundColor: colors.cardBackground }, pressed && styles.backButtonPressed]}>
                <RemixIcon name="arrow-left-line" size={22} color={colors.textPrimary} />
              </Pressable>
              <ThemedText type="title" style={styles.headerTitle} lightColor={colors.headerText} darkColor={colors.headerText}>
                Purchased Credits
              </ThemedText>
            </View>
          </View>
          <View style={styles.errorContainer}>
            <ThemedText type="default" style={styles.errorText} lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>
              {error}
            </ThemedText>
            <Pressable onPress={fetchCreditPurchases} style={[styles.retryButton, { backgroundColor: colors.highlightText }]}>
              <ThemedText type="defaultSemiBold" style={styles.retryButtonText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                Retry
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, { backgroundColor: colors.cardBackground }, pressed && styles.backButtonPressed]}>
              <RemixIcon name="arrow-left-line" size={22} color={colors.textPrimary} />
            </Pressable>
            <ThemedText type="title" style={styles.headerTitle} lightColor={colors.headerText} darkColor={colors.headerText}>
              Purchased Credits
            </ThemedText>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <ThemedText type="defaultSemiBold" style={styles.statTitle} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              Total Completed Purchases
            </ThemedText>
            <ThemedText type="title" style={styles.statValue} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
              {stats.totalPurchases}
            </ThemedText>
            <ThemedText type="default" style={styles.statSubtitle} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              Successfully completed
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <ThemedText type="defaultSemiBold" style={styles.statTitle} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              Total Revenue
            </ThemedText>
            <ThemedText type="title" style={styles.statValue} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
              ${stats.totalAmount.toFixed(2)}
            </ThemedText>
            <ThemedText type="default" style={styles.statSubtitle} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              From completed payments
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <ThemedText type="defaultSemiBold" style={styles.statTitle} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              Average Purchase
            </ThemedText>
            <ThemedText type="title" style={styles.statValue} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
              ${stats.averagePurchase.toFixed(2)}
            </ThemedText>
            <ThemedText type="default" style={styles.statSubtitle} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              Per transaction
            </ThemedText>
          </View>
        </View>

        {/* Purchases Table Card */}
        <View style={[styles.tableCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.tableCardHeader}>
            <ThemedText type="subtitle" style={styles.tableCardTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
              Completed Credit Purchases
            </ThemedText>
            <ThemedText type="default" style={styles.tableCardDescription} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              All successfully completed credit purchases from users ({stats.totalPurchases} total)
            </ThemedText>
          </View>

          {/* Purchases List */}
          {currentPurchases.length === 0 ? (
            <View style={styles.emptyContainer}>
              <RemixIcon name="shopping-cart-line" size={48} color={colors.textSecondary} />
              <ThemedText type="default" style={styles.emptyText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                {creditPurchases.length === 0
                  ? 'No completed credit purchases found'
                  : 'No purchases on this page'}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.purchasesList}>
              {currentPurchases.map((purchase) => (
                <View key={purchase.id} style={[styles.purchaseCard, { backgroundColor: colors.rowBackground, borderColor: colors.divider }]}>
                  <View style={styles.purchaseHeader}>
                    <View style={styles.userInfo}>
                      <View style={[styles.avatarContainer, { backgroundColor: colors.avatarBackground }]}>
                        <RemixIcon name="user-line" size={20} color={colors.iconAccent} />
                      </View>
                      <View style={styles.userDetails}>
                        <ThemedText type="defaultSemiBold" style={styles.userName} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                          {purchase.userName || purchase.userEmail || 'Unknown User'}
                        </ThemedText>
                        <View style={styles.emailRow}>
                          <RemixIcon name="mail-line" size={14} color={colors.textSecondary} />
                          <ThemedText type="default" style={styles.userEmail} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                            {purchase.userEmail}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.purchaseDetails, { borderTopColor: colors.divider }]}>
                    <View style={styles.purchaseRow}>
                      <ThemedText type="default" style={styles.purchaseLabel} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                        Amount
                      </ThemedText>
                      <ThemedText type="defaultSemiBold" style={styles.purchaseValue} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                        ${purchase.amountDollars.toFixed(2)}
                      </ThemedText>
                    </View>
                    <View style={styles.purchaseRow}>
                      <ThemedText type="default" style={styles.purchaseLabel} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                        Description
                      </ThemedText>
                      <ThemedText type="default" style={styles.purchaseValue} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                        {purchase.description || '-'}
                      </ThemedText>
                    </View>
                    <View style={styles.purchaseRow}>
                      <ThemedText type="default" style={styles.purchaseLabel} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                        Payment Intent
                      </ThemedText>
                      {purchase.stripePaymentIntentId ? (
                        <View style={[styles.paymentIntentBadge, { backgroundColor: colors.badgeBackground }]}>
                          <ThemedText type="default" style={styles.paymentIntentText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                            {purchase.stripePaymentIntentId.slice(-8)}
                          </ThemedText>
                        </View>
                      ) : (
                        <ThemedText type="default" style={styles.purchaseValue} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                          -
                        </ThemedText>
                      )}
                    </View>
                    <View style={styles.purchaseRow}>
                      <ThemedText type="default" style={styles.purchaseLabel} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                        Created
                      </ThemedText>
                      <View style={styles.dateRow}>
                        <RemixIcon name="calendar-line" size={14} color={colors.textSecondary} />
                        <ThemedText type="default" style={styles.dateText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                          {formatDate(purchase.createdAt)}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.purchaseRow}>
                      <ThemedText type="default" style={styles.purchaseLabel} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                        Completed
                      </ThemedText>
                      <View style={styles.dateRow}>
                        <RemixIcon name="calendar-check-line" size={14} color={colors.textSecondary} />
                        <ThemedText type="default" style={styles.dateText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                          {formatDate(purchase.completedAt)}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={[styles.pagination, { borderTopColor: colors.divider }]}>
              <ThemedText type="default" style={styles.paginationText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                Showing {startIndex + 1} to {Math.min(endIndex, creditPurchases.length)} of {creditPurchases.length} purchases
              </ThemedText>
              <View style={styles.paginationButtons}>
                <Pressable
                  onPress={goToPrevious}
                  disabled={currentPage === 1}
                  style={({ pressed }) => [
                    styles.paginationButton,
                    { backgroundColor: colors.rowBackground, borderColor: colors.divider },
                    currentPage === 1 && styles.paginationButtonDisabled,
                    pressed && !(currentPage === 1) && styles.paginationButtonPressed,
                  ]}>
                  <RemixIcon name="arrow-left-s-line" size={16} color={currentPage === 1 ? colors.textSecondary : colors.textPrimary} />
                  <ThemedText
                    type="defaultSemiBold"
                    style={styles.paginationButtonText}
                    lightColor={currentPage === 1 ? colors.textSecondary : colors.textPrimary}
                    darkColor={currentPage === 1 ? colors.textSecondary : colors.textPrimary}>
                    Previous
                  </ThemedText>
                </Pressable>
                <View style={styles.pageNumbers}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber: number;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }

                    return (
                      <Pressable
                        key={pageNumber}
                        onPress={() => goToPage(pageNumber)}
                        style={({ pressed }) => [
                          styles.pageNumberButton,
                          {
                            backgroundColor: currentPage === pageNumber ? colors.highlightText : colors.rowBackground,
                            borderColor: currentPage === pageNumber ? colors.highlightText : colors.divider,
                          },
                          pressed && styles.pageNumberButtonPressed,
                        ]}>
                        <ThemedText
                          type="defaultSemiBold"
                          style={styles.pageNumberText}
                          lightColor={currentPage === pageNumber ? colors.iconAccentLight : colors.textPrimary}
                          darkColor={currentPage === pageNumber ? colors.iconAccentLight : colors.textPrimary}>
                          {pageNumber}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  onPress={goToNext}
                  disabled={currentPage === totalPages}
                  style={({ pressed }) => [
                    styles.paginationButton,
                    { backgroundColor: colors.rowBackground, borderColor: colors.divider },
                    currentPage === totalPages && styles.paginationButtonDisabled,
                    pressed && !(currentPage === totalPages) && styles.paginationButtonPressed,
                  ]}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={styles.paginationButtonText}
                    lightColor={currentPage === totalPages ? colors.textSecondary : colors.textPrimary}
                    darkColor={currentPage === totalPages ? colors.textSecondary : colors.textPrimary}>
                    Next
                  </ThemedText>
                  <RemixIcon name="arrow-right-s-line" size={16} color={currentPage === totalPages ? colors.textSecondary : colors.textPrimary} />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    fontWeight: '700',
  },
  statsGrid: {
    gap: 16,
  },
  statCard: {
    borderRadius: 22,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 5,
    // Background color applied inline
  },
  statTitle: {
    fontSize: 15,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  statSubtitle: {
    fontSize: 14,
  },
  tableCard: {
    borderRadius: 24,
    padding: 20,
    gap: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
    // Background color applied inline
  },
  tableCardHeader: {
    gap: 6,
  },
  tableCardTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  tableCardDescription: {
    fontSize: 14,
  },
  purchasesList: {
    gap: 12,
  },
  purchaseCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 16,
    // Background and border colors applied inline
  },
  purchaseHeader: {
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    // Background color applied inline
  },
  userDetails: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 16,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  purchaseDetails: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    // Border color applied inline
  },
  purchaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  purchaseLabel: {
    fontSize: 14,
  },
  purchaseValue: {
    fontSize: 14,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  paymentIntentBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    // Background color applied inline
  },
  paymentIntentText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    // Background color applied inline
  },
  retryButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  pagination: {
    marginTop: 16,
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    // Border color applied inline
  },
  paginationText: {
    fontSize: 14,
    textAlign: 'center',
  },
  paginationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    // Border and background colors applied inline
  },
  paginationButtonPressed: {
    opacity: 0.7,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
  },
  paginationButtonTextDisabled: {
    // Color applied inline
  },
  pageNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageNumberButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Border and background colors applied inline
  },
  pageNumberButtonActive: {
    // Background and border colors applied inline
  },
  pageNumberButtonPressed: {
    opacity: 0.7,
  },
  pageNumberText: {
    fontSize: 14,
  },
  pageNumberTextActive: {
    color: '#FFFFFF',
  },
});

