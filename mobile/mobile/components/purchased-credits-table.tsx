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

const palette = {
  background: '#F5ECE4',
  cardBackground: '#F6E8DC',
  headerText: '#1A1A1A',
  primaryText: '#1F1F1F',
  secondaryText: '#5C5C5C',
  divider: '#E4D5CA',
  highlightText: '#C3473D',
  iconAccent: '#C3473D',
} as const;

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
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
                <RemixIcon name="arrow-left-line" size={22} color={palette.primaryText} />
              </Pressable>
              <ThemedText type="title" style={styles.headerTitle}>
                Purchased Credits
              </ThemedText>
            </View>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.iconAccent} />
            <ThemedText type="default" style={styles.loadingText}>
              Loading...
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
                <RemixIcon name="arrow-left-line" size={22} color={palette.primaryText} />
              </Pressable>
              <ThemedText type="title" style={styles.headerTitle}>
                Purchased Credits
              </ThemedText>
            </View>
          </View>
          <View style={styles.errorContainer}>
            <ThemedText type="default" style={styles.errorText}>
              {error}
            </ThemedText>
            <Pressable onPress={fetchCreditPurchases} style={styles.retryButton}>
              <ThemedText type="defaultSemiBold" style={styles.retryButtonText}>
                Retry
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
              <RemixIcon name="arrow-left-line" size={22} color={palette.primaryText} />
            </Pressable>
            <ThemedText type="title" style={styles.headerTitle}>
              Purchased Credits
            </ThemedText>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <ThemedText type="defaultSemiBold" style={styles.statTitle}>
              Total Completed Purchases
            </ThemedText>
            <ThemedText type="title" style={styles.statValue}>
              {stats.totalPurchases}
            </ThemedText>
            <ThemedText type="default" style={styles.statSubtitle}>
              Successfully completed
            </ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText type="defaultSemiBold" style={styles.statTitle}>
              Total Revenue
            </ThemedText>
            <ThemedText type="title" style={styles.statValue}>
              ${stats.totalAmount.toFixed(2)}
            </ThemedText>
            <ThemedText type="default" style={styles.statSubtitle}>
              From completed payments
            </ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText type="defaultSemiBold" style={styles.statTitle}>
              Average Purchase
            </ThemedText>
            <ThemedText type="title" style={styles.statValue}>
              ${stats.averagePurchase.toFixed(2)}
            </ThemedText>
            <ThemedText type="default" style={styles.statSubtitle}>
              Per transaction
            </ThemedText>
          </View>
        </View>

        {/* Purchases Table Card */}
        <View style={styles.tableCard}>
          <View style={styles.tableCardHeader}>
            <ThemedText type="subtitle" style={styles.tableCardTitle}>
              Completed Credit Purchases
            </ThemedText>
            <ThemedText type="default" style={styles.tableCardDescription}>
              All successfully completed credit purchases from users ({stats.totalPurchases} total)
            </ThemedText>
          </View>

          {/* Purchases List */}
          {currentPurchases.length === 0 ? (
            <View style={styles.emptyContainer}>
              <RemixIcon name="shopping-cart-line" size={48} color={palette.secondaryText} />
              <ThemedText type="default" style={styles.emptyText}>
                {creditPurchases.length === 0
                  ? 'No completed credit purchases found'
                  : 'No purchases on this page'}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.purchasesList}>
              {currentPurchases.map((purchase) => (
                <View key={purchase.id} style={styles.purchaseCard}>
                  <View style={styles.purchaseHeader}>
                    <View style={styles.userInfo}>
                      <View style={styles.avatarContainer}>
                        <RemixIcon name="user-line" size={20} color={palette.iconAccent} />
                      </View>
                      <View style={styles.userDetails}>
                        <ThemedText type="defaultSemiBold" style={styles.userName}>
                          {purchase.userName || purchase.userEmail || 'Unknown User'}
                        </ThemedText>
                        <View style={styles.emailRow}>
                          <RemixIcon name="mail-line" size={14} color={palette.secondaryText} />
                          <ThemedText type="default" style={styles.userEmail}>
                            {purchase.userEmail}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.purchaseDetails}>
                    <View style={styles.purchaseRow}>
                      <ThemedText type="default" style={styles.purchaseLabel}>
                        Amount
                      </ThemedText>
                      <ThemedText type="defaultSemiBold" style={styles.purchaseValue}>
                        ${purchase.amountDollars.toFixed(2)}
                      </ThemedText>
                    </View>
                    <View style={styles.purchaseRow}>
                      <ThemedText type="default" style={styles.purchaseLabel}>
                        Description
                      </ThemedText>
                      <ThemedText type="default" style={styles.purchaseValue}>
                        {purchase.description || '-'}
                      </ThemedText>
                    </View>
                    <View style={styles.purchaseRow}>
                      <ThemedText type="default" style={styles.purchaseLabel}>
                        Payment Intent
                      </ThemedText>
                      {purchase.stripePaymentIntentId ? (
                        <View style={styles.paymentIntentBadge}>
                          <ThemedText type="default" style={styles.paymentIntentText}>
                            {purchase.stripePaymentIntentId.slice(-8)}
                          </ThemedText>
                        </View>
                      ) : (
                        <ThemedText type="default" style={styles.purchaseValue}>
                          -
                        </ThemedText>
                      )}
                    </View>
                    <View style={styles.purchaseRow}>
                      <ThemedText type="default" style={styles.purchaseLabel}>
                        Created
                      </ThemedText>
                      <View style={styles.dateRow}>
                        <RemixIcon name="calendar-line" size={14} color={palette.secondaryText} />
                        <ThemedText type="default" style={styles.dateText}>
                          {formatDate(purchase.createdAt)}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.purchaseRow}>
                      <ThemedText type="default" style={styles.purchaseLabel}>
                        Completed
                      </ThemedText>
                      <View style={styles.dateRow}>
                        <RemixIcon name="calendar-check-line" size={14} color={palette.secondaryText} />
                        <ThemedText type="default" style={styles.dateText}>
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
            <View style={styles.pagination}>
              <ThemedText type="default" style={styles.paginationText}>
                Showing {startIndex + 1} to {Math.min(endIndex, creditPurchases.length)} of {creditPurchases.length} purchases
              </ThemedText>
              <View style={styles.paginationButtons}>
                <Pressable
                  onPress={goToPrevious}
                  disabled={currentPage === 1}
                  style={({ pressed }) => [
                    styles.paginationButton,
                    currentPage === 1 && styles.paginationButtonDisabled,
                    pressed && !(currentPage === 1) && styles.paginationButtonPressed,
                  ]}>
                  <RemixIcon name="arrow-left-s-line" size={16} color={currentPage === 1 ? palette.secondaryText : palette.primaryText} />
                  <ThemedText
                    type="defaultSemiBold"
                    style={[
                      styles.paginationButtonText,
                      currentPage === 1 && styles.paginationButtonTextDisabled,
                    ]}>
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
                          currentPage === pageNumber && styles.pageNumberButtonActive,
                          pressed && styles.pageNumberButtonPressed,
                        ]}>
                        <ThemedText
                          type="defaultSemiBold"
                          style={[
                            styles.pageNumberText,
                            currentPage === pageNumber && styles.pageNumberTextActive,
                          ]}>
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
                    currentPage === totalPages && styles.paginationButtonDisabled,
                    pressed && !(currentPage === totalPages) && styles.paginationButtonPressed,
                  ]}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={[
                      styles.paginationButtonText,
                      currentPage === totalPages && styles.paginationButtonTextDisabled,
                    ]}>
                    Next
                  </ThemedText>
                  <RemixIcon name="arrow-right-s-line" size={16} color={currentPage === totalPages ? palette.secondaryText : palette.primaryText} />
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
    backgroundColor: palette.background,
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
    backgroundColor: palette.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.headerText,
  },
  statsGrid: {
    gap: 16,
  },
  statCard: {
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
  statTitle: {
    fontSize: 15,
    color: palette.secondaryText,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: palette.primaryText,
  },
  statSubtitle: {
    fontSize: 14,
    color: palette.secondaryText,
  },
  tableCard: {
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
  tableCardHeader: {
    gap: 6,
  },
  tableCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.primaryText,
  },
  tableCardDescription: {
    fontSize: 14,
    color: palette.secondaryText,
  },
  purchasesList: {
    gap: 12,
  },
  purchaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.divider,
    gap: 16,
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
    backgroundColor: '#F0CFC2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 16,
    color: palette.primaryText,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userEmail: {
    fontSize: 14,
    color: palette.secondaryText,
  },
  purchaseDetails: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
  purchaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  purchaseLabel: {
    fontSize: 14,
    color: palette.secondaryText,
  },
  purchaseValue: {
    fontSize: 14,
    color: palette.primaryText,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  paymentIntentBadge: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paymentIntentText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: palette.primaryText,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 14,
    color: palette.secondaryText,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: palette.secondaryText,
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
    color: palette.secondaryText,
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
    backgroundColor: palette.highlightText,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
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
    borderTopColor: palette.divider,
  },
  paginationText: {
    fontSize: 14,
    color: palette.secondaryText,
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
    borderColor: palette.divider,
    backgroundColor: '#FFFFFF',
  },
  paginationButtonPressed: {
    opacity: 0.7,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    color: palette.primaryText,
  },
  paginationButtonTextDisabled: {
    color: palette.secondaryText,
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
    borderColor: palette.divider,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumberButtonActive: {
    backgroundColor: palette.highlightText,
    borderColor: palette.highlightText,
  },
  pageNumberButtonPressed: {
    opacity: 0.7,
  },
  pageNumberText: {
    fontSize: 14,
    color: palette.primaryText,
  },
  pageNumberTextActive: {
    color: '#FFFFFF',
  },
});

