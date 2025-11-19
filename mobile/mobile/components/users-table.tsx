import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { usersApi, emailsApi, creditsApi } from '@/services/api-client';
import { CreditAssignmentDialog } from '@/components/credit-assignment-dialog';
import { CreateUserDialog } from '@/components/create-user-dialog';
import { EmailCustomizationDialog } from '@/components/email-customization-dialog';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type UserProfile = {
  readonly id: string;
  readonly userId: string;
  readonly fullName: string;
  readonly preferredName: string | null;
  readonly email: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly referralSource?: string | null;
  readonly metadata?: Record<string, any> | null;
};

export function UsersTable(): ReactElement {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const [userProfiles, setUserProfiles] = useState<readonly UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTypeFilter, setUserTypeFilter] = useState<'internal' | 'external'>('external');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assignCreditsDialogOpen, setAssignCreditsDialogOpen] = useState(false);
  const [userToAssignCredits, setUserToAssignCredits] = useState<UserProfile | null>(null);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkCreditsInput, setBulkCreditsInput] = useState('');
  const [isAssigningBulkCredits, setIsAssigningBulkCredits] = useState(false);

  const fetchUserProfiles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const users = await usersApi.getAll();
      
      // Transform API response to match component's expected format
      // Match web app exactly: handle null/undefined emails properly
      const transformedUsers: UserProfile[] = users.map((user) => {
        // Ensure email is a string - handle null/undefined
        let email: string;
        if (user.email && typeof user.email === 'string' && user.email.trim() !== '') {
          email = user.email;
        } else {
          email = 'Email not available';
        }
        
        return {
          id: user.id,
          userId: user.user_id,
          fullName: user.full_name,
          preferredName: user.preferred_name,
          email: email,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          referralSource: (user as any).referral_source || null,
          metadata: user.metadata || null,
        };
      });

      // Debug logging to verify data and filtering
      if (__DEV__) {
        const internalUsers = transformedUsers.filter(u => {
          const email = u.email?.toLowerCase() || '';
          return email.endsWith('@he2.ai') || email.endsWith('@neuralarc.ai');
        });
        const externalUsers = transformedUsers.filter(u => {
          const email = u.email?.toLowerCase() || '';
          return !email.endsWith('@he2.ai') && !email.endsWith('@neuralarc.ai');
        });
        
        console.log('[UsersTable] Loaded users:', {
          total: transformedUsers.length,
          internal: internalUsers.length,
          external: externalUsers.length,
          internalEmails: internalUsers.slice(0, 5).map(u => u.email),
          externalEmails: externalUsers.slice(0, 5).map(u => u.email),
        });
      }

      setUserProfiles(transformedUsers);
    } catch (err) {
      console.error('Failed to load user profiles', err);
      setError(err instanceof Error ? err.message : 'Unable to load user profiles');
      setUserProfiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch user profiles on mount and when dependencies change
  useEffect(() => {
    fetchUserProfiles();
  }, [fetchUserProfiles]);

  // Reset page and clear selections when filter or search changes
  useEffect(() => {
    setPage(0);
    setSelectedUserIds(new Set());
  }, [userTypeFilter, searchQuery]);

  const getUserType = useCallback((email: string | undefined | null): 'internal' | 'external' => {
    // Match web app logic EXACTLY - no extra checks
    // Handle null, undefined, or empty string
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return 'external'; // Default to external if email is missing
    }
    const emailLower = email.toLowerCase().trim();
    // Check for internal email domains - EXACT match with web app
    if (emailLower.endsWith('@he2.ai') || emailLower.endsWith('@neuralarc.ai')) {
      return 'internal';
    }
    return 'external';
  }, []);

  const filteredProfiles = useMemo(() => {
    // Filter by user type (internal/external) - EXACT match with web app
    const filtered = userProfiles.filter((profile) => {
      // Get user type based on email domain - EXACTLY like web app
      const profileUserType = getUserType(profile.email);
      
      // CRITICAL: Only include if user type matches the current filter
      if (profileUserType !== userTypeFilter) {
        return false;
      }

      // Filter by text search (only if filter is provided)
      if (searchQuery.trim()) {
        const matchesText = Object.values(profile).some(
          (value) =>
            value !== null &&
            value !== undefined &&
            typeof value === 'string' &&
            value.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (!matchesText) {
          return false;
        }
      }
      return true;
    });

    // Debug logging to verify filtering is working correctly
    if (__DEV__) {
      const allInternal = userProfiles.filter(p => getUserType(p.email) === 'internal');
      const allExternal = userProfiles.filter(p => getUserType(p.email) === 'external');
      
      // Verify filtered results match the filter
      const filteredInternal = filtered.filter(p => getUserType(p.email) === 'internal');
      const filteredExternal = filtered.filter(p => getUserType(p.email) === 'external');
      
      console.log('[UsersTable] Filtering Results:', {
        totalUsers: userProfiles.length,
        allInternal: allInternal.length,
        allExternal: allExternal.length,
        currentFilter: userTypeFilter,
        filteredCount: filtered.length,
        filteredInternal: filteredInternal.length,
        filteredExternal: filteredExternal.length,
        verification: userTypeFilter === 'internal' 
          ? `Should show ${allInternal.length} internal, showing ${filtered.length}` 
          : `Should show ${allExternal.length} external, showing ${filtered.length}`,
        sampleFiltered: filtered.slice(0, 3).map(p => ({
          email: p.email,
          type: getUserType(p.email),
          matchesFilter: getUserType(p.email) === userTypeFilter
        }))
      });
    }

    return filtered;
  }, [userProfiles, userTypeFilter, searchQuery, getUserType]);

  // Paginate profiles
  const paginatedProfiles = useMemo(() => {
    return filteredProfiles.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  }, [filteredProfiles, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredProfiles.length / rowsPerPage);

  const getInitials = useCallback((name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }, []);

  const isCreditsEmailSent = useCallback((profile: UserProfile): boolean => {
    return !!(profile.metadata?.credits_email_sent_at);
  }, []);

  const isCreditsAssigned = useCallback((profile: UserProfile): boolean => {
    return !!(profile.metadata?.credits_assigned);
  }, []);

  // Selection handlers
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

  const handleSelectAll = useCallback(() => {
    const allFilteredUserIds = new Set(filteredProfiles.map((profile) => profile.userId));
    if (
      selectedUserIds.size === filteredProfiles.length &&
      filteredProfiles.every((profile) => selectedUserIds.has(profile.userId))
    ) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(allFilteredUserIds);
    }
  }, [filteredProfiles, selectedUserIds]);

  const isAllSelected =
    filteredProfiles.length > 0 &&
    filteredProfiles.every((profile) => selectedUserIds.has(profile.userId));
  const isSomeSelected = filteredProfiles.some((profile) => selectedUserIds.has(profile.userId));

  // Delete handlers
  const handleDeleteClick = useCallback((profile: UserProfile) => {
    setUserToDelete(profile);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await usersApi.delete(userToDelete.userId);

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      await fetchUserProfiles();
    } catch (err) {
      console.error('Error deleting user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user profile';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }, [userToDelete, fetchUserProfiles]);

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedUserIds.size === 0) {
      setError('Please select users to delete');
      return;
    }
    setBulkDeleteDialogOpen(true);
  }, [selectedUserIds.size]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (selectedUserIds.size === 0) return;

    setIsDeleting(true);
    try {
      // Get profile IDs from selected user IDs
      const selectedProfiles = filteredProfiles.filter(profile => 
        selectedUserIds.has(profile.userId)
      );
      const userIds = selectedProfiles.map(profile => profile.userId);

      await usersApi.bulkDelete(userIds);

      setSelectedUserIds(new Set());
      setBulkDeleteDialogOpen(false);
      await fetchUserProfiles();
    } catch (err) {
      console.error('Error bulk deleting users:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user profiles';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedUserIds, filteredProfiles, fetchUserProfiles]);

  const handleBulkAssignCredits = useCallback(async () => {
    if (selectedUserIds.size === 0) {
      setError('Please select users to assign credits');
      return;
    }

    const creditsValue = parseFloat(bulkCreditsInput);
    if (isNaN(creditsValue) || creditsValue < 1) {
      setError('Please enter a valid number of credits (minimum 1)');
      return;
    }

    setIsAssigningBulkCredits(true);
    setError(null);

    try {
      // Get selected profiles
      const selectedProfiles = filteredProfiles.filter(profile => 
        selectedUserIds.has(profile.userId)
      );

      // Convert credits to dollars (100 credits = $1.00)
      const dollarsToAdd = creditsValue / 100;

      // Assign credits to each selected user
      const promises = selectedProfiles.map(profile =>
        creditsApi.assign(profile.userId, dollarsToAdd, `Bulk assignment: ${creditsValue} credits`)
      );

      await Promise.all(promises);

      // Clear selection and input
      setSelectedUserIds(new Set());
      setBulkCreditsInput('');
      await fetchUserProfiles();
    } catch (err) {
      console.error('Error bulk assigning credits:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign credits';
      setError(errorMessage);
    } finally {
      setIsAssigningBulkCredits(false);
    }
  }, [selectedUserIds, bulkCreditsInput, filteredProfiles, fetchUserProfiles]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonPrimary} />
          <ThemedText style={styles.loadingText} type="defaultSemiBold" lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
            Loading user profiles...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText} type="defaultSemiBold" lightColor={colors.buttonDanger} darkColor={colors.buttonDanger}>
            Error loading user profiles
          </ThemedText>
          <ThemedText style={styles.errorSubtext} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>{error}</ThemedText>
          <Pressable onPress={fetchUserProfiles} style={[styles.retryButton, { backgroundColor: colors.buttonPrimary }]}>
            <RemixIcon name="refresh-line" size={18} color={colors.iconAccentLight} />
            <ThemedText style={styles.retryButtonText} type="defaultSemiBold" lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
              Retry
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {/* Header with Back Button */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                { backgroundColor: colors.cardBackground },
                pressed ? styles.backButtonPressed : undefined,
              ]}>
              <RemixIcon name="arrow-left-line" size={22} color={colors.textPrimary} />
            </Pressable>
            <ThemedText type="title" style={styles.headerTitle} lightColor={colors.headerText} darkColor={colors.headerText}>
              Users
            </ThemedText>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <Pressable
            onPress={() => setCreateUserDialogOpen(true)}
            style={({ pressed }) => [
              styles.actionButton,
              styles.createUserButton,
              { backgroundColor: colors.buttonPrimary },
              pressed ? styles.actionButtonPressed : undefined,
            ]}>
            <RemixIcon name="user-add-line" size={16} color={colors.iconAccentLight} />
            <ThemedText type="defaultSemiBold" style={styles.actionButtonText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
              Create User
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setEmailDialogOpen(true)}
            disabled={isSendingEmail}
            style={({ pressed }) => [
              styles.actionButton,
              styles.sendEmailButton,
              { backgroundColor: colors.buttonPrimary },
              pressed ? styles.actionButtonPressed : undefined,
              isSendingEmail ? styles.actionButtonDisabled : undefined,
            ]}>
            {isSendingEmail ? (
              <ActivityIndicator size="small" color={colors.iconAccentLight} />
            ) : (
              <RemixIcon name="mail-line" size={16} color={colors.iconAccentLight} />
            )}
            <ThemedText type="defaultSemiBold" style={styles.actionButtonText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
              {isSendingEmail ? 'Sending...' : 'Send EMAIL'}
            </ThemedText>
          </Pressable>
        </View>

        {/* User Type Tabs */}
        <View style={styles.tabContainer}>
          <Pressable
            onPress={() => setUserTypeFilter('external')}
            style={[
              styles.tab,
              {
                backgroundColor: userTypeFilter === 'external' ? colors.activeTabBackground : colors.inactiveTabBackground,
              },
            ]}>
            <ThemedText
              type="defaultSemiBold"
              style={styles.tabText}
              lightColor={userTypeFilter === 'external' ? colors.activeTabText : colors.inactiveTabText}
              darkColor={userTypeFilter === 'external' ? colors.activeTabText : colors.inactiveTabText}>
              External Users
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setUserTypeFilter('internal')}
            style={[
              styles.tab,
              {
                backgroundColor: userTypeFilter === 'internal' ? colors.activeTabBackground : colors.inactiveTabBackground,
              },
            ]}>
            <ThemedText
              type="defaultSemiBold"
              style={styles.tabText}
              lightColor={userTypeFilter === 'internal' ? colors.activeTabText : colors.inactiveTabText}
              darkColor={userTypeFilter === 'internal' ? colors.activeTabText : colors.inactiveTabText}>
              Internal Users
            </ThemedText>
          </Pressable>
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
                        { borderColor: colors.inputBorder, color: colors.textPrimary },
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

        {/* Card Container */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <RemixIcon name="user-3-line" size={24} color={colors.textPrimary} />
              <ThemedText type="defaultSemiBold" style={styles.cardTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                User Profiles ({filteredProfiles.length}{' '}
                {userTypeFilter === 'internal' ? 'internal' : 'external'} user
                {filteredProfiles.length !== 1 ? 's' : ''})
              </ThemedText>
              {selectedUserIds.size > 0 && (
                <View style={[styles.selectedBadge, { backgroundColor: colors.buttonPrimary }]}>
                  <ThemedText type="defaultSemiBold" style={styles.selectedBadgeText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                    {selectedUserIds.size} selected
                  </ThemedText>
                </View>
              )}
            </View>
            <View style={styles.cardHeaderActions}>
              {selectedUserIds.size > 0 && (
                <Pressable
                  onPress={handleBulkDeleteClick}
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
              <Pressable onPress={fetchUserProfiles} style={[styles.refreshButton, { backgroundColor: colors.buttonSecondary }]}>
                <RemixIcon name="refresh-line" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* Search and View Toggle */}
          <View style={styles.searchAndToggleContainer}>
            <View style={[styles.searchContainer, { backgroundColor: colors.searchBackground, borderColor: colors.searchBorder }]}>
              <RemixIcon
                name="search-line"
                size={18}
                color={colors.textSecondary}
                style={styles.searchIcon}
              />
              <TextInput
                placeholder="Search users..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.viewToggleContainer}>
              <Pressable
                onPress={() => setViewMode('table')}
                style={[
                  styles.viewToggleButton,
                  {
                    backgroundColor: viewMode === 'table' ? colors.activeTabBackground : colors.inactiveTabBackground,
                  },
                ]}>
                <RemixIcon
                  name="table-line"
                  size={18}
                  color={viewMode === 'table' ? colors.activeTabText : colors.inactiveTabText}
                />
              </Pressable>
              <Pressable
                onPress={() => setViewMode('grid')}
                style={[
                  styles.viewToggleButton,
                  {
                    backgroundColor: viewMode === 'grid' ? colors.activeTabBackground : colors.inactiveTabBackground,
                  },
                ]}>
                <RemixIcon
                  name="grid-line"
                  size={18}
                  color={viewMode === 'grid' ? colors.activeTabText : colors.inactiveTabText}
                />
              </Pressable>
            </View>
          </View>

          {/* Grid or Table View */}
          {viewMode === 'grid' ? (
            /* Grid/Card View */
            filteredProfiles.length === 0 ? (
              <View style={styles.gridEmptyContainer}>
                <RemixIcon name="user-3-line" size={48} color={colors.textSecondary} />
                <ThemedText type="defaultSemiBold" style={styles.emptyText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                  {searchQuery
                    ? `No ${userTypeFilter} users found matching your search`
                    : `No ${userTypeFilter} user profiles found`}
                </ThemedText>
              </View>
            ) : (
              <FlatList
                key={`users-grid-${userTypeFilter}-${page}`}
                data={paginatedProfiles}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                numColumns={1}
                renderItem={({ item: profile }) => (
                  <View style={[styles.userCard, { backgroundColor: colors.rowBackground, borderColor: colors.divider }]}>
                    <View style={styles.cardContent}>
                      {/* Checkbox */}
                      <View style={styles.cardCheckboxContainer}>
                        <Pressable onPress={() => handleToggleSelect(profile.userId)} style={styles.checkboxContainer}>
                          <View
                            style={[
                              styles.checkbox,
                              { borderColor: selectedUserIds.has(profile.userId) ? colors.buttonPrimary : colors.textSecondary },
                              selectedUserIds.has(profile.userId) ? { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary } : undefined,
                            ]}>
                            {selectedUserIds.has(profile.userId) && (
                              <RemixIcon name="check-line" size={14} color={colors.iconAccentLight} />
                            )}
                          </View>
                        </Pressable>
                      </View>

                      {/* User Info */}
                      <View style={styles.cardUserInfo}>
                        {/* Avatar and Name */}
                        <View style={styles.cardHeaderRow}>
                          <View style={[styles.cardAvatar, { backgroundColor: colors.avatarBackground }]}>
                            <ThemedText type="defaultSemiBold" style={styles.cardAvatarText} lightColor={colors.avatarText} darkColor={colors.avatarText}>
                              {getInitials(profile.fullName)}
                            </ThemedText>
                          </View>
                          <View style={styles.cardNameContainer}>
                            <ThemedText type="defaultSemiBold" style={styles.cardUserName} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                              {profile.fullName}
                            </ThemedText>
                          </View>
                        </View>

                        {/* Email */}
                        <View style={styles.cardEmailRow}>
                          <RemixIcon name="mail-line" size={14} color={colors.textSecondary} />
                          <ThemedText type="default" style={styles.cardUserEmail} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                            {profile.email}
                          </ThemedText>
                        </View>

                        {/* Status */}
                        <View style={styles.cardStatusRow}>
                          {isCreditsEmailSent(profile) && (
                            <View style={[styles.cardStatusBadge, { backgroundColor: colors.badgeSent }]}>
                              <RemixIcon name="check-line" size={12} color={colors.iconAccentLight} />
                              <ThemedText type="default" style={styles.cardStatusBadgeText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                                Sent
                              </ThemedText>
                            </View>
                          )}
                          {isCreditsAssigned(profile) && (
                            <View style={[styles.cardStatusBadge, { backgroundColor: colors.badgeAssigned }]}>
                              <RemixIcon name="check-line" size={12} color={colors.iconAccentLight} />
                              <ThemedText type="default" style={styles.cardStatusBadgeText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                                Assigned
                              </ThemedText>
                            </View>
                          )}
                        </View>

                        {/* User ID */}
                        <View style={styles.cardUserIdRow}>
                          <ThemedText type="default" style={styles.cardUserIdLabel} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                            User ID:{' '}
                          </ThemedText>
                          <ThemedText type="default" style={styles.cardUserIdValue} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                            {profile.userId.slice(0, 8)}...
                          </ThemedText>
                        </View>

                        {/* Dates */}
                        <View style={styles.cardDatesContainer}>
                          <View style={styles.cardDateRow}>
                            <RemixIcon name="calendar-line" size={12} color={colors.textSecondary} />
                            <ThemedText type="default" style={styles.cardDateText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                              Created: {formatDate(profile.createdAt)}
                            </ThemedText>
                          </View>
                          <View style={styles.cardDateRow}>
                            <RemixIcon name="calendar-line" size={12} color={colors.textSecondary} />
                            <ThemedText type="default" style={styles.cardDateText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                              Updated: {formatDate(profile.updatedAt)}
                            </ThemedText>
                          </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.cardActionsRow}>
                          <Pressable
                            onPress={() => {
                              setUserToAssignCredits(profile);
                              setAssignCreditsDialogOpen(true);
                            }}
                            style={[styles.cardActionButton, styles.cardAssignButton, { backgroundColor: colors.buttonSecondary }]}>
                            <RemixIcon name="file-text-line" size={18} color={colors.textPrimary} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteClick(profile)}
                            style={[styles.cardActionButton, styles.cardDeleteButton, { backgroundColor: '#FEE2E2' }]}>
                            <RemixIcon name="delete-bin-line" size={18} color={colors.buttonDanger} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              />
            )
          ) : (
            /* Table View */
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true}
              style={styles.tableScrollView}
              contentContainerStyle={styles.tableScrollContent}>
            <View style={[styles.tableContainer, { borderColor: colors.divider }]}>
              {/* Table Header */}
              <View style={[styles.tableHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.divider }]}>
                <View style={styles.tableHeaderCellCheckbox}>
                  <Pressable onPress={handleSelectAll} style={styles.checkboxContainer}>
                    <View
                      style={[
                        styles.checkbox,
                        { borderColor: isAllSelected || (isSomeSelected && !isAllSelected) ? colors.buttonPrimary : colors.textSecondary },
                        isAllSelected ? { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary } : undefined,
                        isSomeSelected && !isAllSelected ? { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary } : undefined,
                      ]}>
                      {isAllSelected && (
                        <RemixIcon name="check-line" size={14} color={colors.iconAccentLight} />
                      )}
                      {isSomeSelected && !isAllSelected && (
                        <View style={styles.checkboxIndeterminateMark} />
                      )}
                    </View>
                  </Pressable>
                </View>
                <View style={styles.tableHeaderCellName}>
                  <ThemedText type="defaultSemiBold" style={styles.tableHeaderText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Name
                  </ThemedText>
                </View>
                <View style={styles.tableHeaderCellEmail}>
                  <ThemedText type="defaultSemiBold" style={styles.tableHeaderText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Email
                  </ThemedText>
                </View>
                <View style={styles.tableHeaderCellStatus}>
                  <ThemedText type="defaultSemiBold" style={styles.tableHeaderText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Status
                  </ThemedText>
                </View>
                <View style={styles.tableHeaderCellReferralSource}>
                  <ThemedText type="defaultSemiBold" style={styles.tableHeaderText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Referral Source
                  </ThemedText>
                </View>
                <View style={styles.tableHeaderCellUserId}>
                  <ThemedText type="defaultSemiBold" style={styles.tableHeaderText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    User ID
                  </ThemedText>
                </View>
                <View style={styles.tableHeaderCellCreated}>
                  <ThemedText type="defaultSemiBold" style={styles.tableHeaderText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Created
                  </ThemedText>
                </View>
                <View style={styles.tableHeaderCellActions}>
                  <ThemedText type="defaultSemiBold" style={styles.tableHeaderText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Actions
                  </ThemedText>
                </View>
              </View>

            {/* Table Body */}
            {filteredProfiles.length === 0 ? (
              <View style={[styles.tableEmptyRow, { minWidth: 1000 }]}>
                <View style={styles.tableEmptyCell}>
                  <RemixIcon name="user-3-line" size={48} color={colors.textSecondary} />
                  <ThemedText type="defaultSemiBold" style={styles.emptyText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                    {searchQuery
                      ? `No ${userTypeFilter} users found matching your search`
                      : `No ${userTypeFilter} user profiles found`}
                  </ThemedText>
                </View>
              </View>
            ) : (
              <FlatList
                key={`users-list-${userTypeFilter}-${page}`}
                data={paginatedProfiles}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item: profile }) => (
                  <View style={[styles.tableRow, { backgroundColor: colors.rowBackground, borderBottomColor: colors.divider }]}>
                    {/* Checkbox */}
                    <View style={styles.tableCellCheckbox}>
                      <Pressable onPress={() => handleToggleSelect(profile.userId)} style={styles.checkboxContainer}>
                        <View
                          style={[
                            styles.checkbox,
                            { borderColor: selectedUserIds.has(profile.userId) ? colors.buttonPrimary : colors.textSecondary },
                            selectedUserIds.has(profile.userId) ? { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary } : undefined,
                          ]}>
                          {selectedUserIds.has(profile.userId) && (
                            <RemixIcon name="check-line" size={14} color={colors.iconAccentLight} />
                          )}
                        </View>
                      </Pressable>
                    </View>

                    {/* Name */}
                    <View style={styles.tableCellName}>
                      <View style={styles.nameCellContent}>
                        <View style={[styles.avatar, { backgroundColor: colors.avatarBackground }]}>
                          <ThemedText type="defaultSemiBold" style={styles.avatarText} lightColor={colors.avatarText} darkColor={colors.avatarText}>
                            {getInitials(profile.fullName)}
                          </ThemedText>
                        </View>
                        <View style={styles.nameTextContainer}>
                          <ThemedText type="defaultSemiBold" style={styles.userName} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                            {profile.fullName}
                          </ThemedText>
                          {profile.preferredName && profile.preferredName !== profile.fullName && (
                            <ThemedText type="default" style={styles.userPreferredName} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                              ({profile.preferredName})
                            </ThemedText>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Email */}
                    <View style={styles.tableCellEmail}>
                      <View style={styles.emailCellContent}>
                        <RemixIcon name="mail-line" size={14} color={colors.textSecondary} />
                        <ThemedText type="default" style={styles.userEmail} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                          {profile.email}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Status */}
                    <View style={styles.tableCellStatus}>
                      <View style={styles.statusContainer}>
                        {isCreditsEmailSent(profile) && isCreditsAssigned(profile) ? (
                          <View style={styles.statusBadges}>
                            <View style={[styles.statusBadge, { backgroundColor: colors.badgeSent }]}>
                              <RemixIcon name="check-line" size={12} color={colors.iconAccentLight} />
                              <ThemedText type="default" style={styles.statusBadgeText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                                Sent
                              </ThemedText>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: colors.badgeAssigned }]}>
                              <RemixIcon name="check-line" size={12} color={colors.iconAccentLight} />
                              <ThemedText type="default" style={styles.statusBadgeText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                                Assigned
                              </ThemedText>
                            </View>
                          </View>
                        ) : isCreditsEmailSent(profile) ? (
                          <View style={[styles.statusBadge, { backgroundColor: colors.badgeSent }]}>
                            <RemixIcon name="check-line" size={12} color={colors.iconAccentLight} />
                            <ThemedText type="default" style={styles.statusBadgeText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                              Sent
                            </ThemedText>
                          </View>
                        ) : isCreditsAssigned(profile) ? (
                          <View style={[styles.statusBadge, { backgroundColor: colors.badgeAssigned }]}>
                            <RemixIcon name="check-line" size={12} color={colors.iconAccentLight} />
                            <ThemedText type="default" style={styles.statusBadgeText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                              Assigned
                            </ThemedText>
                          </View>
                        ) : (
                          <ThemedText type="default" style={styles.statusBadgeTextNotSent} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                            Not Sent
                          </ThemedText>
                        )}
                      </View>
                    </View>

                    {/* Referral Source */}
                    <View style={styles.tableCellReferralSource}>
                      <ThemedText type="default" style={styles.referralSourceText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                        {profile.referralSource || 'N/A'}
                      </ThemedText>
                    </View>

                    {/* User ID */}
                    <View style={styles.tableCellUserId}>
                      <ThemedText type="default" style={styles.userIdValue} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                        {profile.userId.slice(0, 8)}...
                      </ThemedText>
                    </View>

                    {/* Created */}
                    <View style={styles.tableCellCreated}>
                      <View style={styles.dateItem}>
                        <RemixIcon name="calendar-line" size={12} color={colors.textSecondary} />
                        <ThemedText type="default" style={styles.dateText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                          {formatDate(profile.createdAt)}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.tableCellActions}>
                      <View style={styles.actionsRow}>
                        <Pressable
                          onPress={() => {
                            setUserToAssignCredits(profile);
                            setAssignCreditsDialogOpen(true);
                          }}
                          style={[styles.actionButtonSmall, styles.assignButton, { backgroundColor: colors.buttonSecondary }]}>
                          <RemixIcon name="file-text-line" size={16} color={colors.textPrimary} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteClick(profile)}
                          style={[styles.actionButtonSmall, styles.deleteButtonSmall]}>
                          <RemixIcon name="delete-bin-line" size={16} color={colors.buttonDanger} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                )}
              />
            )}
            </View>
          </ScrollView>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={[styles.pagination, { borderTopColor: colors.divider }]}>
              <ThemedText type="default" style={styles.paginationText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                Showing {page * rowsPerPage + 1} to{' '}
                {Math.min((page + 1) * rowsPerPage, filteredProfiles.length)} of{' '}
                {filteredProfiles.length} users
              </ThemedText>
              <View style={styles.paginationControls}>
                <Pressable
                  onPress={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  style={[
                    styles.paginationButton,
                    { backgroundColor: colors.buttonSecondary },
                    page === 0 && styles.paginationButtonDisabled,
                  ]}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={styles.paginationButtonText}
                    lightColor={page === 0 ? colors.textSecondary : colors.textPrimary}
                    darkColor={page === 0 ? colors.textSecondary : colors.textPrimary}>
                    Previous
                  </ThemedText>
                </Pressable>
                <ThemedText type="default" style={styles.paginationPageText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                  Page {page + 1} of {totalPages}
                </ThemedText>
                <Pressable
                  onPress={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page === totalPages - 1}
                  style={[
                    styles.paginationButton,
                    { backgroundColor: colors.buttonSecondary },
                    page === totalPages - 1 && styles.paginationButtonDisabled,
                  ]}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={styles.paginationButtonText}
                    lightColor={page === totalPages - 1 ? colors.textSecondary : colors.textPrimary}
                    darkColor={page === totalPages - 1 ? colors.textSecondary : colors.textPrimary}>
                    Next
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Delete Confirmation Dialog */}
        <Modal
          visible={deleteDialogOpen && userToDelete !== null}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!isDeleting) {
              setDeleteDialogOpen(false);
              setUserToDelete(null);
            }
          }}>
          <View style={styles.dialogOverlay}>
            <Pressable
              style={styles.overlayPressable}
              onPress={() => {
                if (!isDeleting) {
                  setDeleteDialogOpen(false);
                  setUserToDelete(null);
                }
              }}
            />
            <View style={[styles.dialog, { backgroundColor: colors.cardBackground }]}>
              <ThemedText type="title" style={styles.dialogTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                Are you sure?
              </ThemedText>
              <ThemedText type="default" style={styles.dialogDescription} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                This action cannot be undone. This will permanently delete the user profile for{' '}
                <ThemedText type="defaultSemiBold" lightColor={colors.textPrimary} darkColor={colors.textPrimary}>{userToDelete?.fullName}</ThemedText> (
                {userToDelete?.email}).
              </ThemedText>
              <View style={styles.dialogActions}>
                <Pressable
                  onPress={() => {
                    if (!isDeleting) {
                      setDeleteDialogOpen(false);
                      setUserToDelete(null);
                    }
                  }}
                  disabled={isDeleting}
                  style={[
                    styles.dialogButton,
                    styles.dialogButtonCancel,
                    { backgroundColor: colors.cardBackground, borderColor: colors.divider },
                    isDeleting && styles.dialogButtonDisabled,
                  ]}>
                  <ThemedText type="defaultSemiBold" style={styles.dialogButtonCancelText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Cancel
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleDeleteConfirm}
                  disabled={isDeleting}
                  style={[
                    styles.dialogButton,
                    styles.dialogButtonConfirm,
                    { backgroundColor: colors.buttonDanger },
                    isDeleting && styles.dialogButtonDisabled,
                  ]}>
                  {isDeleting ? (
                    <>
                      <ActivityIndicator size="small" color={colors.iconAccentLight} style={{ marginRight: 8 }} />
                      <ThemedText type="defaultSemiBold" style={styles.dialogButtonConfirmText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                        Deleting...
                      </ThemedText>
                    </>
                  ) : (
                    <ThemedText type="defaultSemiBold" style={styles.dialogButtonConfirmText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                      Delete
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Bulk Delete Confirmation Dialog */}
        <Modal
          visible={bulkDeleteDialogOpen}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!isDeleting) {
              setBulkDeleteDialogOpen(false);
            }
          }}>
          <View style={styles.dialogOverlay}>
            <Pressable
              style={styles.overlayPressable}
              onPress={() => {
                if (!isDeleting) {
                  setBulkDeleteDialogOpen(false);
                }
              }}
            />
            <View style={[styles.dialog, { backgroundColor: colors.cardBackground }]}>
              <ThemedText type="title" style={styles.dialogTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                Are you sure?
              </ThemedText>
              <ThemedText type="default" style={styles.dialogDescription} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                This action cannot be undone. This will permanently delete{' '}
                <ThemedText type="defaultSemiBold" lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                  {selectedUserIds.size} user profile{selectedUserIds.size !== 1 ? 's' : ''}
                </ThemedText>.
              </ThemedText>
              <View style={styles.dialogActions}>
                <Pressable
                  onPress={() => {
                    if (!isDeleting) {
                      setBulkDeleteDialogOpen(false);
                    }
                  }}
                  disabled={isDeleting}
                  style={[
                    styles.dialogButton,
                    styles.dialogButtonCancel,
                    { backgroundColor: colors.cardBackground, borderColor: colors.divider },
                    isDeleting && styles.dialogButtonDisabled,
                  ]}>
                  <ThemedText type="defaultSemiBold" style={styles.dialogButtonCancelText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Cancel
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleBulkDeleteConfirm}
                  disabled={isDeleting}
                  style={[
                    styles.dialogButton,
                    styles.dialogButtonConfirm,
                    { backgroundColor: colors.buttonDanger },
                    isDeleting && styles.dialogButtonDisabled,
                  ]}>
                  {isDeleting ? (
                    <>
                      <ActivityIndicator size="small" color={colors.iconAccentLight} style={{ marginRight: 8 }} />
                      <ThemedText type="defaultSemiBold" style={styles.dialogButtonConfirmText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                        Deleting...
                      </ThemedText>
                    </>
                  ) : (
                    <ThemedText type="defaultSemiBold" style={styles.dialogButtonConfirmText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                      Delete {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''}
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Credit Assignment Dialog */}
        {userToAssignCredits && (
          <CreditAssignmentDialog
            open={assignCreditsDialogOpen}
            onOpenChange={setAssignCreditsDialogOpen}
            user={userToAssignCredits}
            onSuccess={() => {
              setAssignCreditsDialogOpen(false);
              setUserToAssignCredits(null);
              fetchUserProfiles();
            }}
          />
        )}

        {/* Create User Dialog */}
        <CreateUserDialog
          open={createUserDialogOpen}
          onOpenChange={setCreateUserDialogOpen}
          onSuccess={() => {
            fetchUserProfiles();
          }}
        />

        {/* Email Customization Dialog */}
        <EmailCustomizationDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          selectedCount={selectedUserIds.size}
          isSending={isSendingEmail}
          onSendEmail={async (emailData, selectedOnly) => {
            setIsSendingEmail(true);
            try {
              const requestBody: {
                custom_email?: {
                  subject: string;
                  text_content: string;
                  html_content: string;
                };
                selected_user_ids?: string[];
              } = {
                custom_email: {
                subject: emailData.subject,
                  text_content: emailData.textContent || '',
                  html_content: emailData.htmlContent || '',
                },
              };

              if (selectedOnly && selectedUserIds.size > 0) {
                requestBody.selected_user_ids = Array.from(selectedUserIds);
              }

              const result = await emailsApi.sendBulk(requestBody);

              if (result.success) {
                setEmailDialogOpen(false);
                if (selectedOnly) {
                  setSelectedUserIds(new Set());
                }
                fetchUserProfiles();
              } else {
                console.error('Failed to send email:', result.message);
                setError(result.message || 'Failed to send email');
              }
            } catch (err) {
              console.error('Error sending email:', err);
              setError(err instanceof Error ? err.message : 'Failed to send email');
            } finally {
              setIsSendingEmail(false);
            }
          }}
          onSendToIndividual={async (emailData, emailAddress) => {
            setIsSendingEmail(true);
            try {
              const result = await emailsApi.sendIndividual({
                individual_email: emailAddress,
                subject: emailData.subject,
                text_content: emailData.textContent || '',
                html_content: emailData.htmlContent || '',
              });

              if (result.success) {
                setEmailDialogOpen(false);
                fetchUserProfiles();
              } else {
                console.error('Failed to send email:', result.message);
                setError(result.message || 'Failed to send email');
              }
            } catch (err) {
              console.error('Error sending email:', err);
              setError(err instanceof Error ? err.message : 'Failed to send email');
            } finally {
              setIsSendingEmail(false);
            }
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    // Color applied inline
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  errorText: {
    fontSize: 18,
  },
  errorSubtext: {
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  headerTitle: {
    // Color applied inline
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createUserButton: {
    // Background color applied inline
  },
  sendEmailButton: {
    // Background color applied inline
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabActive: {
    // Background color applied inline
  },
  tabInactive: {
    // Background color applied inline
  },
  tabText: {
    fontSize: 16,
  },
  tabTextActive: {
    // Color applied inline
  },
  tabTextInactive: {
    // Color applied inline
  },
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 18,
  },
  selectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectedBadgeText: {
    fontSize: 12,
  },
  cardHeaderActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  assignCreditsSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  selectAllContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    // Border color applied inline
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    // Border color applied inline
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    // Background and border colors applied inline
  },
  checkboxIndeterminate: {
    // Background and border colors applied inline
  },
  checkboxIndeterminateMark: {
    width: 10,
    height: 2,
    backgroundColor: '#FFFFFF',
  },
  selectAllText: {
    fontSize: 14,
  },
  searchAndToggleContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    // Background and border colors applied inline
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    // Color applied inline
  },
  viewToggleContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  viewToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    // Background color applied inline
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
  },
  // Table styles
  tableScrollView: {
    flex: 1,
  },
  tableScrollContent: {
    minWidth: 1000, // Minimum width to enable horizontal scrolling
  },
  tableContainer: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    minWidth: 1000,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    minWidth: 1000,
  },
  tableHeaderCellCheckbox: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableHeaderCellName: {
    width: 180,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableHeaderCellEmail: {
    width: 200,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableHeaderCellStatus: {
    width: 140,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableHeaderCellReferralSource: {
    width: 140,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableHeaderCellUserId: {
    width: 120,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableHeaderCellCreated: {
    width: 160,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableHeaderCellActions: {
    width: 110,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableHeaderText: {
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    minHeight: 60,
    minWidth: 1000,
  },
  tableCellCheckbox: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableCellName: {
    width: 180,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableCellEmail: {
    width: 200,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableCellStatus: {
    width: 140,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableCellReferralSource: {
    width: 140,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableCellUserId: {
    width: 120,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableCellCreated: {
    width: 160,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableCellActions: {
    width: 110,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableEmptyRow: {
    paddingVertical: 48,
    paddingHorizontal: 16,
    width: '100%',
  },
  tableEmptyCell: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  nameCellContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameTextContainer: {
    flex: 1,
  },
  emailCellContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  referralSourceText: {
    fontSize: 13,
  },
  // Legacy styles kept for compatibility
  userRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    gap: 12,
  },
  userInfo: {
    flex: 1,
    gap: 8,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
  },
  userNameContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
  },
  userPreferredName: {
    fontSize: 14,
  },
  userEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userEmail: {
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBadges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgePlain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusBadgeSent: {
    // Background color applied inline
  },
  statusBadgeAssigned: {
    // Background color applied inline
  },
  statusBadgeNotSent: {
    // Background color applied inline
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  statusBadgeTextPlain: {
    fontSize: 12,
  },
  statusBadgeTextNotSent: {
    fontSize: 12,
  },
  userIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userIdLabel: {
    fontSize: 12,
  },
  userIdBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  userIdValue: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  datesRow: {
    gap: 4,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 36,
    minHeight: 36,
  },
  assignButton: {
    // Background color applied inline
  },
  assignButtonText: {
    fontSize: 12,
  },
  deleteButtonSmall: {
    backgroundColor: '#FEE2E2',
  },
  deleteButtonSmallText: {
    fontSize: 12,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialog: {
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
    // Background color applied inline
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  dialogDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  dialogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
  },
  dialogButtonCancel: {
    borderWidth: 1,
    // Background and border colors applied inline
  },
  dialogButtonCancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dialogButtonConfirm: {
    // Background color applied inline
  },
  dialogButtonConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  dialogButtonDisabled: {
    opacity: 0.5,
  },
  pagination: {
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
    marginTop: 8,
    // Border color applied inline
  },
  paginationText: {
    fontSize: 14,
    textAlign: 'center',
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    // Background color applied inline
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
  paginationPageText: {
    fontSize: 14,
  },
  // Grid/Card View Styles
  gridEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  userCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
    // Background and border colors applied inline
  },
  cardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  cardCheckboxContainer: {
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  cardUserInfo: {
    flex: 1,
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    // Background color applied inline
  },
  cardAvatarText: {
    fontSize: 14,
  },
  cardNameContainer: {
    flex: 1,
  },
  cardUserName: {
    fontSize: 16,
  },
  cardEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardUserEmail: {
    fontSize: 14,
  },
  cardStatusRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  cardStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    // Background color applied inline
  },
  cardStatusBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  cardUserIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardUserIdLabel: {
    fontSize: 13,
  },
  cardUserIdValue: {
    fontSize: 13,
    fontFamily: 'monospace',
  },
  cardDatesContainer: {
    gap: 4,
  },
  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDateText: {
    fontSize: 12,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cardActionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    // Background color applied inline
  },
  cardAssignButton: {
    // Background color applied inline
  },
  cardDeleteButton: {
    // Background color applied inline
  },
});

