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
import { getAppConfig } from '@/utils/config';
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

  const fetchUserProfiles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { apiBaseUrl } = getAppConfig();
      const response = await fetch(`${apiBaseUrl}/api/user-profiles`, {
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
        throw new Error(payload.message ?? 'Failed to load user profiles');
      }

      setUserProfiles(payload.data || []);
    } catch (err) {
      console.error('Failed to load user profiles', err);
      setError(err instanceof Error ? err.message : 'Unable to load user profiles');
      setUserProfiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfiles();
  }, [fetchUserProfiles]);

  // Reset page when filter or search changes
  useEffect(() => {
    setPage(0);
  }, [userTypeFilter, searchQuery]);

  const getUserType = useCallback((email: string | undefined): 'internal' | 'external' => {
    if (!email || typeof email !== 'string') {
      return 'external';
    }
    const emailLower = email.toLowerCase();
    if (emailLower.endsWith('@he2.ai') || emailLower.endsWith('@neuralarc.ai')) {
      return 'internal';
    }
    return 'external';
  }, []);

  const filteredProfiles = useMemo(() => {
    return userProfiles.filter((profile) => {
      const profileUserType = getUserType(profile.email);
      if (profileUserType !== userTypeFilter) {
        return false;
      }

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
      const { apiBaseUrl } = getAppConfig();
      const response = await fetch(
        `${apiBaseUrl}/api/delete-user-profile?profileId=${userToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete user profile: ${response.status}`);
      }

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      await fetchUserProfiles();
    } catch (err) {
      console.error('Error deleting user:', err);
    } finally {
      setIsDeleting(false);
    }
  }, [userToDelete, fetchUserProfiles]);

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

        {/* Card Container */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <RemixIcon name="user-3-line" size={20} color={colors.textPrimary} />
              <ThemedText type="defaultSemiBold" style={styles.cardTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                User Profiles ({filteredProfiles.length}{' '}
                {userTypeFilter === 'internal' ? 'internal' : 'external'} user
                {filteredProfiles.length !== 1 ? 's' : ''})
              </ThemedText>
              {selectedUserIds.size > 0 && (
                <View style={[styles.selectedBadge, { backgroundColor: colors.buttonSecondary }]}>
                  <ThemedText type="defaultSemiBold" style={styles.selectedBadgeText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    {selectedUserIds.size} selected
                  </ThemedText>
                </View>
              )}
            </View>
            <View style={styles.cardHeaderActions}>
              {selectedUserIds.size > 0 && (
                <Pressable
                  onPress={() => {
                    // Bulk delete functionality can be added here
                    console.log('Bulk delete', selectedUserIds.size, 'users');
                  }}
                  style={[styles.cardActionButton, styles.deleteButton, { backgroundColor: colors.buttonDanger }]}>
                  <RemixIcon name="delete-bin-line" size={16} color={colors.iconAccentLight} />
                  <ThemedText type="defaultSemiBold" style={styles.deleteButtonText} lightColor={colors.iconAccentLight} darkColor={colors.iconAccentLight}>
                    Delete ({selectedUserIds.size})
                  </ThemedText>
                </Pressable>
              )}
              <Pressable onPress={fetchUserProfiles} style={[styles.cardActionButton, styles.refreshButton, { backgroundColor: colors.buttonSecondary }]}>
                <RemixIcon name="refresh-line" size={16} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* Search */}
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

          {/* Select All */}
          {filteredProfiles.length > 0 && (
            <View style={[styles.selectAllContainer, { borderBottomColor: colors.divider }]}>
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
                <ThemedText type="default" style={styles.selectAllText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                  Select All
                </ThemedText>
              </Pressable>
            </View>
          )}

          {/* User List */}
          {filteredProfiles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <RemixIcon name="user-3-line" size={48} color={colors.textSecondary} />
              <ThemedText type="defaultSemiBold" style={styles.emptyText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                {searchQuery
                  ? `No ${userTypeFilter} users found matching your search`
                  : `No ${userTypeFilter} user profiles found`}
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={paginatedProfiles}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item: profile }) => (
                <View style={[styles.userRow, { backgroundColor: colors.rowBackground, borderColor: colors.rowBorder }]}>
                  {/* Checkbox */}
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

                  <View style={styles.userInfo}>
                    {/* Name */}
                    <View style={styles.userNameRow}>
                      <View style={[styles.avatar, { backgroundColor: colors.avatarBackground }]}>
                        <ThemedText type="defaultSemiBold" style={styles.avatarText} lightColor={colors.avatarText} darkColor={colors.avatarText}>
                          {getInitials(profile.fullName)}
                        </ThemedText>
                      </View>
                      <View style={styles.userNameContainer}>
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

                    {/* Email */}
                    <View style={styles.userEmailRow}>
                      <RemixIcon name="mail-line" size={14} color={colors.textSecondary} />
                      <ThemedText type="default" style={styles.userEmail} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                        {profile.email}
                      </ThemedText>
                    </View>

                    {/* Status */}
                    <View style={styles.statusContainer}>
                      {isCreditsEmailSent(profile) && isCreditsAssigned(profile) ? (
                        <View style={styles.statusBadges}>
                          <View style={styles.statusBadgePlain}>
                            <RemixIcon name="check-line" size={12} color={colors.textSecondary} />
                            <ThemedText type="default" style={styles.statusBadgeTextPlain} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                              Sent
                            </ThemedText>
                          </View>
                          <View style={styles.statusBadgePlain}>
                            <RemixIcon name="check-line" size={12} color={colors.textSecondary} />
                            <ThemedText type="default" style={styles.statusBadgeTextPlain} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                              Assigned
                            </ThemedText>
                          </View>
                        </View>
                      ) : isCreditsEmailSent(profile) ? (
                        <View style={styles.statusBadgePlain}>
                          <RemixIcon name="check-line" size={12} color={colors.textSecondary} />
                          <ThemedText type="default" style={styles.statusBadgeTextPlain} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                            Sent
                          </ThemedText>
                        </View>
                      ) : isCreditsAssigned(profile) ? (
                        <View style={styles.statusBadgePlain}>
                          <RemixIcon name="check-line" size={12} color={colors.textSecondary} />
                          <ThemedText type="default" style={styles.statusBadgeTextPlain} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                            Assigned
                          </ThemedText>
                        </View>
                      ) : (
                        <ThemedText type="default" style={styles.statusBadgeTextNotSent} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                          Not Sent
                        </ThemedText>
                      )}
                    </View>

                    {/* User ID */}
                    <View style={styles.userIdRow}>
                      <ThemedText type="default" style={styles.userIdLabel} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                        User ID:
                      </ThemedText>
                      <ThemedText type="default" style={styles.userIdValue} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                        {profile.userId.slice(0, 8)}...
                      </ThemedText>
                    </View>

                    {/* Dates */}
                    <View style={styles.datesRow}>
                      <View style={styles.dateItem}>
                        <RemixIcon name="calendar-line" size={14} color={colors.textSecondary} />
                        <ThemedText type="default" style={styles.dateText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                          Created: {formatDate(profile.createdAt)}
                        </ThemedText>
                      </View>
                      <View style={styles.dateItem}>
                        <RemixIcon name="calendar-line" size={14} color={colors.textSecondary} />
                        <ThemedText type="default" style={styles.dateText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                          Updated: {formatDate(profile.updatedAt)}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsRow}>
                      <Pressable
                        onPress={() => {
                          setUserToAssignCredits(profile);
                          setAssignCreditsDialogOpen(true);
                        }}
                        style={[styles.actionButtonSmall, styles.assignButton, { backgroundColor: colors.buttonSecondary }]}>
                        <RemixIcon name="bank-card-line" size={18} color={colors.textPrimary} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteClick(profile)}
                        style={[styles.actionButtonSmall, styles.deleteButtonSmall]}>
                        <RemixIcon name="delete-bin-line" size={18} color={colors.buttonDanger} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            />
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
              const { apiBaseUrl } = getAppConfig();
              const requestBody: any = {
                subject: emailData.subject,
                textContent: emailData.textContent || '',
                htmlContent: emailData.htmlContent || '',
              };

              if (selectedOnly && selectedUserIds.size > 0) {
                requestBody.selectedUserIds = Array.from(selectedUserIds);
              }

              const response = await fetch(`${apiBaseUrl}/api/send-bulk-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
              });

              const result = await response.json();

              if (result.success) {
                setEmailDialogOpen(false);
                if (selectedOnly) {
                  setSelectedUserIds(new Set());
                }
                fetchUserProfiles();
              } else {
                console.error('Failed to send email:', result.message);
              }
            } catch (err) {
              console.error('Error sending email:', err);
            } finally {
              setIsSendingEmail(false);
            }
          }}
          onSendToIndividual={async (emailData, emailAddress) => {
            setIsSendingEmail(true);
            try {
              const { apiBaseUrl } = getAppConfig();
              const requestBody = {
                subject: emailData.subject,
                textContent: emailData.textContent || '',
                htmlContent: emailData.htmlContent || '',
                individualEmail: emailAddress,
              };

              const response = await fetch(`${apiBaseUrl}/api/send-individual-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
              });

              const result = await response.json();

              if (result.success) {
                setEmailDialogOpen(false);
                fetchUserProfiles();
              } else {
                console.error('Failed to send email:', result.message);
              }
            } catch (err) {
              console.error('Error sending email:', err);
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
  },
  cardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshButton: {
    // Background color applied inline
  },
  deleteButton: {
    // Background color applied inline
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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
  searchContainer: {
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
  },
  userRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    gap: 12,
    // Background and border colors applied inline
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
    // Background color applied inline
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
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 44,
    minHeight: 44,
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
});

