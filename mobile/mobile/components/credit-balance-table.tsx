import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { getAppConfig } from '@/utils/config';
import { CreditAssignmentDialog } from '@/components/credit-assignment-dialog';

const palette = {
  background: '#F5ECE4',
  cardBackground: '#FFFFFF',
  headerText: '#1A1A1A',
  primaryText: '#1F1F1F',
  secondaryText: '#5C5C5C',
  searchBackground: '#FFFFFF',
  searchBorder: '#E4D5CA',
  rowBackground: '#FFFFFF',
  rowBorder: '#E4D5CA',
  buttonPrimary: '#C3473D',
  buttonSecondary: '#E4D5CA',
  divider: '#E4D5CA',
} as const;

type CreditBalance = {
  readonly userId: string;
  readonly balanceDollars: number;
  readonly totalPurchased: number;
  readonly totalUsed: number;
  readonly lastUpdated: Date;
  readonly userEmail?: string;
  readonly userName?: string;
};

export function CreditBalanceTable(): ReactElement {
  const router = useRouter();
  const [creditBalances, setCreditBalances] = useState<readonly CreditBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<{ userId: string; userName: string; userEmail: string } | null>(null);
  const rowsPerPage = 10;

  const fetchCreditBalances = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { apiBaseUrl } = getAppConfig();
      const response = await fetch(`${apiBaseUrl}/api/credit-balances`, {
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
        throw new Error(payload.message ?? 'Failed to load credit balances');
      }

      const transformedBalances = (payload.data || []).map((balance: any) => ({
        userId: balance.userId,
        balanceDollars: parseFloat(balance.balanceDollars) || 0,
        totalPurchased: parseFloat(balance.totalPurchased) || 0,
        totalUsed: parseFloat(balance.totalUsed) || 0,
        lastUpdated: balance.lastUpdated ? new Date(balance.lastUpdated) : new Date(),
        userEmail: balance.userEmail || 'Email not available',
        userName: balance.userName || `User ${balance.userId.slice(0, 8)}`,
      }));

      setCreditBalances(transformedBalances);
    } catch (err) {
      console.error('Error fetching credit balances:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credit balances');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreditBalances();
  }, [fetchCreditBalances]);

  // Format currency
  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format credits (Balance × 100)
  const formatCredits = (balanceDollars: number | null | undefined): string => {
    if (balanceDollars === null || balanceDollars === undefined || isNaN(balanceDollars)) {
      return '0';
    }
    const credits = Math.round(balanceDollars * 100);
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(credits);
  };

  // Format date
  const formatDate = (date: Date | null | undefined): string => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return 'N/A';
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Filter balances
  const filteredBalances = useMemo(() => {
    if (!searchQuery.trim()) return creditBalances;
    
    const searchLower = searchQuery.toLowerCase();
    return creditBalances.filter((balance) =>
      balance.userEmail?.toLowerCase().includes(searchLower) ||
      balance.userName?.toLowerCase().includes(searchLower) ||
      balance.userId.toLowerCase().includes(searchLower)
    );
  }, [creditBalances, searchQuery]);

  const paginatedBalances = useMemo(() => {
    return filteredBalances.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [filteredBalances, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredBalances.length / rowsPerPage);

  const handleAssignCredits = useCallback((balance: CreditBalance) => {
    setSelectedBalance({
      userId: balance.userId,
      userName: balance.userName || `User ${balance.userId.slice(0, 8)}`,
      userEmail: balance.userEmail || 'Email not available',
    });
    setCreditDialogOpen(true);
  }, []);

  const handleCreditAssignmentSuccess = useCallback(() => {
    fetchCreditBalances();
    setCreditDialogOpen(false);
  }, [fetchCreditBalances]);

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
                Credit Balances
              </ThemedText>
            </View>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.buttonPrimary} />
            <ThemedText type="default" style={styles.loadingText}>
              Loading credit balances...
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
                Credit Balances
              </ThemedText>
            </View>
          </View>
          <View style={styles.errorContainer}>
            <ThemedText type="default" style={styles.errorText}>
              {error}
            </ThemedText>
            <Pressable onPress={fetchCreditBalances} style={styles.retryButton}>
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
              Credit Balances ({filteredBalances.length})
            </ThemedText>
          </View>
        </View>
        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <RemixIcon name="search-line" size={20} color={palette.secondaryText} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by user email or name..."
              placeholderTextColor={palette.secondaryText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable
            onPress={fetchCreditBalances}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.refreshButtonPressed]}>
            <RemixIcon name="refresh-line" size={20} color={palette.primaryText} />
          </Pressable>
        </View>

        {/* Balance List */}
        {paginatedBalances.length === 0 ? (
          <View style={styles.emptyContainer}>
            <RemixIcon name="user-line" size={48} color={palette.secondaryText} />
            <ThemedText type="default" style={styles.emptyText}>
              {searchQuery ? 'No credit balances found matching your search' : 'No credit balances found'}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.balancesList}>
            {paginatedBalances.map((balance) => (
              <View key={balance.userId} style={styles.balanceCard}>
                <View style={styles.balanceHeader}>
                  <View style={styles.userInfo}>
                    <View style={styles.avatarContainer}>
                      <RemixIcon name="user-line" size={20} color={palette.buttonPrimary} />
                    </View>
                    <View style={styles.userDetails}>
                      <ThemedText type="defaultSemiBold" style={styles.userName}>
                        {balance.userName}
                      </ThemedText>
                      <View style={styles.emailRow}>
                        <RemixIcon name="mail-line" size={14} color={palette.secondaryText} />
                        <ThemedText type="default" style={styles.userEmail}>
                          {balance.userEmail}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.balanceDetails}>
                  <View style={styles.balanceRow}>
                    <ThemedText type="default" style={styles.balanceLabel}>
                      Balance
                    </ThemedText>
                    <ThemedText type="defaultSemiBold" style={styles.balanceValue}>
                      {formatCurrency(balance.balanceDollars)}
                    </ThemedText>
                  </View>
                  <View style={styles.balanceRow}>
                    <ThemedText type="default" style={styles.balanceLabel}>
                      Credits
                    </ThemedText>
                    <ThemedText type="defaultSemiBold" style={styles.balanceValue}>
                      {formatCredits(balance.balanceDollars)}
                    </ThemedText>
                  </View>
                  <View style={styles.balanceRow}>
                    <ThemedText type="default" style={styles.balanceLabel}>
                      Total Purchased
                    </ThemedText>
                    <ThemedText type="default" style={styles.balanceValue}>
                      {formatCurrency(balance.totalPurchased)}
                    </ThemedText>
                  </View>
                  <View style={styles.balanceRow}>
                    <ThemedText type="default" style={styles.balanceLabel}>
                      Purchased Credits
                    </ThemedText>
                    <ThemedText type="defaultSemiBold" style={styles.balanceValue}>
                      {formatCredits(balance.totalPurchased)}
                    </ThemedText>
                  </View>
                  <View style={styles.balanceRow}>
                    <ThemedText type="default" style={styles.balanceLabel}>
                      Total Used
                    </ThemedText>
                    <ThemedText type="default" style={styles.balanceValue}>
                      {formatCurrency(balance.totalUsed)}
                    </ThemedText>
                  </View>
                  <View style={styles.balanceRow}>
                    <ThemedText type="default" style={styles.balanceLabel}>
                      Used Credits
                    </ThemedText>
                    <ThemedText type="defaultSemiBold" style={styles.balanceValue}>
                      {formatCredits(balance.totalUsed)}
                    </ThemedText>
                  </View>
                  <View style={styles.balanceRow}>
                    <ThemedText type="default" style={styles.balanceLabel}>
                      Last Updated
                    </ThemedText>
                    <View style={styles.dateRow}>
                      <RemixIcon name="calendar-line" size={14} color={palette.secondaryText} />
                      <ThemedText type="default" style={styles.dateText}>
                        {formatDate(balance.lastUpdated)}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                <Pressable
                  onPress={() => handleAssignCredits(balance)}
                  style={({ pressed }) => [
                    styles.assignButton,
                    pressed && styles.assignButtonPressed,
                  ]}>
                  <RemixIcon name="bank-card-line" size={16} color="#FFFFFF" />
                  <ThemedText type="defaultSemiBold" style={styles.assignButtonText}>
                    Assign Credits
                  </ThemedText>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.pagination}>
            <ThemedText type="default" style={styles.paginationText}>
              Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, filteredBalances.length)} of {filteredBalances.length} balances
            </ThemedText>
            <View style={styles.paginationButtons}>
              <Pressable
                onPress={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                style={({ pressed }) => [
                  styles.paginationButton,
                  page === 0 && styles.paginationButtonDisabled,
                  pressed && !(page === 0) && styles.paginationButtonPressed,
                ]}>
                <RemixIcon name="arrow-left-s-line" size={16} color={page === 0 ? palette.secondaryText : palette.primaryText} />
                <ThemedText
                  type="defaultSemiBold"
                  style={[
                    styles.paginationButtonText,
                    page === 0 && styles.paginationButtonTextDisabled,
                  ]}>
                  Previous
                </ThemedText>
              </Pressable>
              <ThemedText type="default" style={styles.paginationPageText}>
                Page {page + 1} of {totalPages}
              </ThemedText>
              <Pressable
                onPress={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
                style={({ pressed }) => [
                  styles.paginationButton,
                  page === totalPages - 1 && styles.paginationButtonDisabled,
                  pressed && !(page === totalPages - 1) && styles.paginationButtonPressed,
                ]}>
                <ThemedText
                  type="defaultSemiBold"
                  style={[
                    styles.paginationButtonText,
                    page === totalPages - 1 && styles.paginationButtonTextDisabled,
                  ]}>
                  Next
                </ThemedText>
                <RemixIcon name="arrow-right-s-line" size={16} color={page === totalPages - 1 ? palette.secondaryText : palette.primaryText} />
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Credit Assignment Dialog */}
      {selectedBalance && (
        <CreditAssignmentDialog
          open={creditDialogOpen}
          onOpenChange={setCreditDialogOpen}
          user={{
            id: selectedBalance.userId,
            userId: selectedBalance.userId,
            fullName: selectedBalance.userName,
            preferredName: selectedBalance.userName,
            email: selectedBalance.userEmail,
          } as any}
          onSuccess={handleCreditAssignmentSuccess}
        />
      )}
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
    backgroundColor: '#F6E8DC',
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
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F6E8DC',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  refreshButtonPressed: {
    opacity: 0.7,
  },
  searchContainer: {
    marginBottom: 8,
    gap: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.searchBackground,
    borderWidth: 1,
    borderColor: palette.searchBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: palette.primaryText,
  },
  balancesList: {
    gap: 12,
  },
  balanceCard: {
    backgroundColor: '#F6E8DC',
    borderRadius: 22,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 5,
  },
  balanceHeader: {
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
  balanceDetails: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: palette.secondaryText,
  },
  balanceValue: {
    fontSize: 14,
    color: palette.primaryText,
    fontFamily: 'monospace',
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
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.buttonPrimary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  assignButtonPressed: {
    opacity: 0.8,
  },
  assignButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
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
    backgroundColor: palette.buttonPrimary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  pagination: {
    marginTop: 24,
    gap: 16,
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
    gap: 16,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.searchBorder,
    backgroundColor: palette.cardBackground,
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
  paginationPageText: {
    fontSize: 14,
    color: palette.primaryText,
  },
});

