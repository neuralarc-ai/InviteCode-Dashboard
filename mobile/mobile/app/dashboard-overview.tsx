import { usePathname, useRouter, type Href } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  Dimensions,
  TextInput,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import RemixIcon, { type IconName } from 'react-native-remix-icon';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/providers/auth-context';
import { useTheme } from '@/providers/theme-context';
import { useDashboardSummary } from '@/hooks/use-dashboard-summary';
import { useNewUsersNotification } from '@/hooks/use-new-users-notification';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AnalyticsCharts } from '@/components/analytics-charts';
import { RecentCreditTransactions } from '@/components/recent-credit-transactions';
import { CreditAssignmentDialog } from '@/components/credit-assignment-dialog';
import { creditsApi, usersApi } from '@/services/api-client';

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

type MenuItem = {
  readonly icon: IconName;
  readonly label: string;
  readonly route?: Href;
};

const menuItems: readonly MenuItem[] = [
  { icon: 'dashboard-line', label: 'Dashboard', route: '/dashboard-overview' as const },
  { icon: 'user-3-line', label: 'Users', route: '/users' as const },
  { icon: 'bank-card-line', label: 'Credits', route: '/credits' as const },
  { icon: 'shopping-cart-2-line', label: 'Paid Users', route: '/purchased-credits' as const },
  { icon: 'file-list-3-line', label: 'Usage Logs', route: '/usage-logs' as const },
] as const;


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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerThemeToggle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerThemeTogglePressed: {
    opacity: 0.8,
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
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonPressed: {
    opacity: 0.8,
  },
  headerTitle: {
    fontSize: 28,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    fontSize: 25,
    fontWeight: '600',
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
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionHeaderActions: {
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
  assignCreditButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignCreditButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  recentUserCheckboxContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxIndeterminateMark: {
    width: 10,
    height: 2,
    backgroundColor: '#FFFFFF',
  },
  assignCreditsSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  assignCreditsTitle: {
    fontSize: 16,
  },
  assignCreditsContent: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  assignCreditsInputContainer: {
    flex: 1,
    gap: 6,
  },
  assignCreditsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignCreditsInputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assignCreditsInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  assignCreditsInputWithSpinner: {
    flex: 1,
    paddingRight: 40,
  },
  assignCreditsSpinnerContainer: {
    position: 'absolute',
    right: 1,
    top: 1,
    bottom: 1,
    width: 32,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7,
    borderLeftWidth: 1,
    borderLeftColor: '#E4D5CA',
  },
  assignCreditsSpinnerButton: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  assignCreditsSpinnerButtonDisabled: {
    opacity: 0.5,
  },
  assignCreditsSpinnerDivider: {
    width: '100%',
    height: 1,
  },
  assignCreditsConversionText: {
    fontSize: 16,
    marginLeft: 4,
  },
  assignCreditsHelper: {
    fontSize: 12,
    lineHeight: 16,
  },
  assignCreditsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 8,
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
  drawerOverlay: {
    flex: 1,
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 280,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: -2, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  drawerContent: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dropdownLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingBottom: 1,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  dropdownLogoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    borderRadius: 12,
    marginVertical: 2,
  },
  dropdownItemPressed: {
    opacity: 0.7,
  },
  dropdownItemIcon: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  dropdownFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  dropdownThemeToggle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  dropdownThemeTogglePressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  dropdownLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  dropdownLogoutButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  dropdownLogoutLabel: {
    fontSize: 14,
    fontWeight: '400',
  },
  dropdownBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  dropdownBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  dropdownBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default function DashboardOverviewScreen(): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const { colorScheme, toggleTheme } = useTheme();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const { newUsersCount, newPaidUsersCount } = useNewUsersNotification();
  const {
    data: summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    refresh,
  } = useDashboardSummary();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const drawerTranslateX = useSharedValue(280);
  const [assignCreditsDialogOpen, setAssignCreditsDialogOpen] = useState(false);
  const [userToAssignCredits, setUserToAssignCredits] = useState<RecentUser | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkCreditsInput, setBulkCreditsInput] = useState('');
  const [isAssigningBulkCredits, setIsAssigningBulkCredits] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isMenuOpen) {
      drawerTranslateX.value = withTiming(0, { duration: 300 });
    } else {
      drawerTranslateX.value = withTiming(280, { duration: 300 });
    }
  }, [isMenuOpen, drawerTranslateX]);

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

  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const drawerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: drawerTranslateX.value }],
    };
  });

  const handleMenuItemPress = useCallback(
    (item: MenuItem) => {
      handleMenuClose();
      if (item.route && item.route !== pathname) {
        router.push(item.route);
      }
    },
    [handleMenuClose, pathname, router],
  );

  const handleLogout = useCallback(async () => {
    const correlationId = `dashboard-logout-${Date.now()}`;

    console.info('Admin requested logout', {
      correlationId,
      timestamp: new Date().toISOString(),
    });

    handleMenuClose();
    await signOut({ correlationId });
    router.replace('/login');
  }, [handleMenuClose, router, signOut]);

  const handleAssignCredits = useCallback((user: RecentUser) => {
    setUserToAssignCredits(user);
    setAssignCreditsDialogOpen(true);
  }, []);

  const handleCreditAssignmentSuccess = useCallback(() => {
    setAssignCreditsDialogOpen(false);
    setUserToAssignCredits(null);
    refresh();
  }, [refresh]);

  const handleToggleSelect = useCallback((userId: string) => {
    setSelectedUserIds((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(userId)) {
        newSelection.delete(userId);
      } else {
        newSelection.add(userId);
      }
      return newSelection;
    });
  }, []);

  const handleBulkAssignCredits = useCallback(async () => {
    if (selectedUserIds.size === 0) {
      return;
    }

    const creditsValue = parseFloat(bulkCreditsInput);
    if (isNaN(creditsValue) || creditsValue < 1) {
      return;
    }

    setIsAssigningBulkCredits(true);

    try {
      // Get selected users
      const selectedUsers = recentUsers.filter(user => selectedUserIds.has(user.id));

      // Convert credits to dollars (100 credits = $1.00)
      const dollarsToAdd = creditsValue / 100;

      // Assign credits to each selected user
      const promises = selectedUsers.map(user =>
        creditsApi.assign(user.id, dollarsToAdd, `Bulk assignment: ${creditsValue} credits`)
      );

      await Promise.all(promises);

      // Clear selection and input
      setSelectedUserIds(new Set());
      setBulkCreditsInput('');
      await refresh();
    } catch (err) {
      console.error('Error bulk assigning credits:', err);
    } finally {
      setIsAssigningBulkCredits(false);
    }
  }, [selectedUserIds, bulkCreditsInput, recentUsers, refresh]);

  const handleSelectAllRecentUsers = useCallback(() => {
    const allUserIds = new Set(recentUsers.map((user) => user.id));
    if (
      selectedUserIds.size === recentUsers.length &&
      recentUsers.every((user) => selectedUserIds.has(user.id))
    ) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(allUserIds);
    }
  }, [recentUsers, selectedUserIds]);

  const isAllRecentUsersSelected =
    recentUsers.length > 0 &&
    recentUsers.every((user) => selectedUserIds.has(user.id));
  const isSomeRecentUsersSelected = recentUsers.some((user) => selectedUserIds.has(user.id));

  const handleBulkDeleteRecentUsers = useCallback(async () => {
    if (selectedUserIds.size === 0) {
      return;
    }

    setIsDeleting(true);

    try {
      // Get selected user IDs
      const userIds = Array.from(selectedUserIds);

      await usersApi.bulkDelete(userIds);

      // Clear selection
      setSelectedUserIds(new Set());
      await refresh();
    } catch (err) {
      console.error('Error bulk deleting users:', err);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedUserIds, refresh]);

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
            <ThemedText
              type="title"
              style={styles.headerTitle}
              lightColor={colors.headerText}
              darkColor={colors.headerText}>
              Dashboard
            </ThemedText>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={toggleTheme}
              accessibilityRole="button"
              accessibilityLabel={colorScheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.headerThemeToggle,
                { backgroundColor: colors.cardBackground },
                pressed ? styles.headerThemeTogglePressed : undefined,
              ]}>
              <RemixIcon
                name={colorScheme === 'dark' ? 'sun-line' : 'moon-line'}
                size={20}
                color={colors.textPrimary}
              />
            </Pressable>
            <Pressable
              onPress={handleMenuToggle}
              accessibilityRole="button"
              accessibilityLabel="Open menu"
              style={({ pressed }) => [
                styles.menuButton,
                { backgroundColor: colors.cardBackground },
                pressed ? styles.menuButtonPressed : undefined,
              ]}>
              <RemixIcon name="menu-line" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        <Modal
          visible={isMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={handleMenuClose}>
          <View style={styles.drawerOverlay}>
            <BlurView
              intensity={20}
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}>
              <Pressable style={StyleSheet.absoluteFill} onPress={handleMenuClose} />
            </BlurView>
            <Animated.View
              style={[
                styles.drawerContainer,
                drawerAnimatedStyle,
                { backgroundColor: colors.cardBackground },
              ]}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={(e) => {
                  e.stopPropagation();
                }}
              />
              <View style={styles.drawerContent}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}>
                  {menuItems.map((item) => {
                    const isActive = item.route === pathname;
                    const badgeCount =
                      item.label === 'Users' ? newUsersCount : item.label === 'Paid Users' ? newPaidUsersCount : 0;
                    return (
                      <Pressable
                        key={item.label}
                        onPress={() => handleMenuItemPress(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Navigate to ${item.label}${badgeCount > 0 ? `, ${badgeCount} new` : ''}`}
                        style={({ pressed }) => [
                          styles.dropdownItem,
                          isActive ? { backgroundColor: colors.activeBackground } : undefined,
                          pressed ? styles.dropdownItemPressed : undefined,
                        ]}>
                        <View style={styles.dropdownItemIcon}>
                          <RemixIcon
                            name={item.icon}
                            size={20}
                            color={isActive ? colors.activeText : colors.textPrimary}
                          />
                        </View>
                        <ThemedText
                          type="default"
                          style={styles.dropdownItemLabel}
                          lightColor={isActive ? colors.activeText : colors.textPrimary}
                          darkColor={isActive ? colors.activeText : colors.textPrimary}>
                          {item.label}
                        </ThemedText>
                        {badgeCount > 0 ? (
                          <View style={[styles.dropdownBadge, { backgroundColor: '#22C55E' }]}>
                            {badgeCount > 9 ? (
                              <View style={styles.dropdownBadgeDot} />
                            ) : (
                              <ThemedText
                                type="defaultSemiBold"
                                style={styles.dropdownBadgeText}
                                lightColor="#FFFFFF"
                                darkColor="#FFFFFF">
                                {badgeCount}
                              </ThemedText>
                            )}
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <View style={[styles.dropdownFooter, { borderTopColor: colors.divider, marginTop: 16 }]}>
                  <Pressable
                    onPress={handleLogout}
                    accessibilityRole="button"
                    accessibilityLabel="Log out of admin dashboard"
                    style={({ pressed }) => [
                      styles.dropdownLogoutButton,
                      pressed ? styles.dropdownLogoutButtonPressed : undefined,
                    ]}>
                    <RemixIcon name="logout-box-r-line" size={15} color={colors.textPrimary} />
                    <ThemedText
                      type="default"
                      style={styles.dropdownLogoutLabel}
                      lightColor={colors.textPrimary}
                      darkColor={colors.textPrimary}>
                      Logout
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>

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

        {/* Recent Credit Transactions Section */}
        <RecentCreditTransactions />

        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleLeft}>
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
              <View style={styles.sectionHeaderActions}>
                <Pressable onPress={handleSelectAllRecentUsers} style={styles.checkboxContainer}>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: isAllRecentUsersSelected || (isSomeRecentUsersSelected && !isAllRecentUsersSelected) ? colors.buttonPrimary : colors.textSecondary },
                      isAllRecentUsersSelected ? { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary } : undefined,
                      isSomeRecentUsersSelected && !isAllRecentUsersSelected ? { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary } : undefined,
                    ]}>
                    {isAllRecentUsersSelected && (
                      <RemixIcon name="check-line" size={14} color={colors.iconAccentLight} />
                    )}
                    {isSomeRecentUsersSelected && !isAllRecentUsersSelected && (
                      <View style={[styles.checkboxIndeterminateMark, { backgroundColor: colors.iconAccentLight }]} />
                    )}
                  </View>
                </Pressable>
                {selectedUserIds.size > 0 && (
                  <Pressable
                    onPress={handleBulkDeleteRecentUsers}
                    disabled={isDeleting}
                    style={[
                      styles.deleteButton,
                      { backgroundColor: colors.buttonDanger },
                      isDeleting && styles.buttonDisabled,
                    ]}>
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={colors.iconAccentLight} />
                    ) : (
                      <RemixIcon name="delete-bin-line" size={18} color={colors.iconAccentLight} />
                    )}
                  </Pressable>
                )}
              </View>
            </View>
            <ThemedText
              style={styles.sectionSubtitle}
              lightColor={colors.textSecondary}
              darkColor={colors.textSecondary}>
              Latest 5 registered users
            </ThemedText>
          </View>

          {/* Assign Credits Section - Only shown when users are selected */}
          {selectedUserIds.size > 0 && (
            <View style={[styles.assignCreditsSection, { backgroundColor: colors.badgeBackground, borderColor: colors.divider }]}>
              <ThemedText type="defaultSemiBold" style={styles.assignCreditsTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                Assign Credits to {selectedUserIds.size} Selected User{selectedUserIds.size !== 1 ? 's' : ''}
              </ThemedText>
              <View style={styles.assignCreditsContent}>
                <View style={styles.assignCreditsInputContainer}>
                  <View style={styles.assignCreditsInputRow}>
                    <View style={styles.assignCreditsInputWrapper}>
                      <TextInput
                        style={[
                          styles.assignCreditsInput,
                          styles.assignCreditsInputWithSpinner,
                          { borderColor: colors.inputBorder, color: '#1F1F1F' },
                          isAssigningBulkCredits && { backgroundColor: colors.cardBackground, opacity: 0.6 },
                        ]}
                        placeholder="Enter number of credits"
                        placeholderTextColor={colors.textSecondary}
                        value={bulkCreditsInput}
                        onChangeText={setBulkCreditsInput}
                        keyboardType="numeric"
                        editable={!isAssigningBulkCredits}
                      />
                      <View style={styles.assignCreditsSpinnerContainer}>
                        <Pressable
                          onPress={() => {
                            if (!isAssigningBulkCredits) {
                              if (!bulkCreditsInput || isNaN(parseFloat(bulkCreditsInput))) {
                                setBulkCreditsInput('1');
                              } else {
                                const current = parseFloat(bulkCreditsInput);
                                setBulkCreditsInput(String(current + 1));
                              }
                            }
                          }}
                          disabled={isAssigningBulkCredits}
                          style={styles.assignCreditsSpinnerButton}>
                          <RemixIcon name="arrow-up-s-line" size={16} color={colors.textSecondary} />
                        </Pressable>
                        <View style={[styles.assignCreditsSpinnerDivider, { backgroundColor: colors.divider }]} />
                        <Pressable
                          onPress={() => {
                            if (!isAssigningBulkCredits) {
                              if (!bulkCreditsInput || isNaN(parseFloat(bulkCreditsInput))) {
                                setBulkCreditsInput('1');
                              } else {
                                const current = parseFloat(bulkCreditsInput);
                                if (current > 1) {
                                  setBulkCreditsInput(String(current - 1));
                                }
                              }
                            }
                          }}
                          disabled={isAssigningBulkCredits || (!bulkCreditsInput || parseFloat(bulkCreditsInput) <= 1)}
                          style={[
                            styles.assignCreditsSpinnerButton,
                            (!bulkCreditsInput || (bulkCreditsInput && parseFloat(bulkCreditsInput) <= 1)) && styles.assignCreditsSpinnerButtonDisabled,
                          ]}>
                          <RemixIcon 
                            name="arrow-down-s-line" 
                            size={16} 
                            color={(!bulkCreditsInput || (bulkCreditsInput && parseFloat(bulkCreditsInput) <= 1)) ? colors.textSecondary + '40' : colors.textSecondary} 
                          />
                        </Pressable>
                      </View>
                    </View>
                    {/* Dollar Conversion Display - Inline */}
                    {bulkCreditsInput && !isNaN(parseFloat(bulkCreditsInput)) && parseFloat(bulkCreditsInput) > 0 && (
                      <ThemedText type="defaultSemiBold" style={styles.assignCreditsConversionText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                        = ${(parseFloat(bulkCreditsInput) / 100).toFixed(2)}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText type="default" style={styles.assignCreditsHelper} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                    Enter the number of credits to add to all selected users' accounts (100 credits = $1.00).
                  </ThemedText>
                </View>
                <Pressable
                  onPress={handleBulkAssignCredits}
                  disabled={isAssigningBulkCredits || !bulkCreditsInput || isNaN(parseFloat(bulkCreditsInput)) || parseFloat(bulkCreditsInput) < 1}
                  style={[
                    styles.assignCreditsButton,
                    { backgroundColor: colors.buttonPrimary },
                    (isAssigningBulkCredits || !bulkCreditsInput || isNaN(parseFloat(bulkCreditsInput)) || parseFloat(bulkCreditsInput) < 1) && styles.buttonDisabled,
                  ]}>
                  {isAssigningBulkCredits ? (
                    <ActivityIndicator size="small" color={colors.iconAccentLight} />
                  ) : (
                    <RemixIcon name="file-text-line" size={18} color={colors.iconAccentLight} />
                  )}
                </Pressable>
              </View>
            </View>
          )}

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
              recentUsers.map((user) => (
                <RecentUserRow
                  key={user.id}
                  user={user}
                  colors={colors}
                  onAssignCredits={handleAssignCredits}
                  isSelected={selectedUserIds.has(user.id)}
                  onToggleSelect={handleToggleSelect}
                />
              ))
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

        {/* Analytics Charts Section */}
        <AnalyticsCharts />

        {/* Credit Assignment Dialog */}
        {userToAssignCredits && (
          <CreditAssignmentDialog
            open={assignCreditsDialogOpen}
            onOpenChange={setAssignCreditsDialogOpen}
            user={{
              id: userToAssignCredits.id,
              userId: userToAssignCredits.id,
              fullName: userToAssignCredits.name,
              preferredName: userToAssignCredits.preferredName,
              email: userToAssignCredits.email,
            }}
            onSuccess={handleCreditAssignmentSuccess}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const MetricCardComponent = memo(({ metric, colors }: { readonly metric: MetricCard; colors: typeof Colors.light }): ReactElement => {
  const { title, value, subtitle, icon } = metric;

  // Calculate card width for 2-column layout
  // Screen width - horizontal padding (20 * 2) - gap (16) divided by 2
  const screenWidth = Dimensions.get('window').width;
  const horizontalPadding = 20 * 2;
  const gap = 16;
  const cardWidth = (screenWidth - horizontalPadding - gap) / 2;

  return (
    <View style={[styles.metricCard, { backgroundColor: colors.cardBackground, width: cardWidth }]}>
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
        type="default"
        style={styles.metricValue}
        lightColor={title === 'Total Users' ? colors.highlightText : colors.textPrimary}
        darkColor={title === 'Total Users' ? colors.highlightText : colors.textPrimary}
        numberOfLines={1}>
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

const RecentUserRow = memo(({ 
  user, 
  colors, 
  onAssignCredits,
  isSelected,
  onToggleSelect,
}: { 
  readonly user: RecentUser; 
  readonly colors: typeof Colors.light;
  readonly onAssignCredits: (user: RecentUser) => void;
  readonly isSelected: boolean;
  readonly onToggleSelect: (userId: string) => void;
}): ReactElement => {
  const displayName = user.preferredName && user.preferredName.trim().length > 0 ? user.preferredName : user.name;

  return (
    <View style={[styles.recentUserRow, { borderBottomColor: colors.divider }]}>
      {/* Checkbox */}
      <View style={styles.recentUserCheckboxContainer}>
        <Pressable onPress={() => onToggleSelect(user.id)} style={styles.checkboxContainer}>
          <View
            style={[
              styles.checkbox,
              { borderColor: isSelected ? colors.buttonPrimary : colors.textSecondary },
              isSelected ? { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary } : undefined,
            ]}>
            {isSelected && (
              <RemixIcon name="check-line" size={14} color={colors.iconAccentLight} />
            )}
          </View>
        </Pressable>
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
      <Pressable
        onPress={() => onAssignCredits(user)}
        accessibilityRole="button"
        accessibilityLabel={`Assign credits to ${displayName}`}
        style={({ pressed }) => [
          styles.assignCreditButton,
          pressed && styles.assignCreditButtonPressed,
        ]}>
        <RemixIcon name="file-text-line" size={20} color={colors.iconAccent} />
      </Pressable>
    </View>
  );
});
RecentUserRow.displayName = 'RecentUserRow';


