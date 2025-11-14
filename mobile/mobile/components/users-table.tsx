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

const palette = {
  background: '#F5ECE4',
  cardBackground: '#F6E8DC',
  headerText: '#1A1A1A',
  primaryText: '#1F1F1F',
  secondaryText: '#5C5C5C',
  activeTabBackground: '#E7A79A',
  inactiveTabBackground: '#E4D5CA',
  activeTabText: '#1F1F1F',
  inactiveTabText: '#5C5C5C',
  searchBackground: '#FFFFFF',
  searchBorder: '#E4D5CA',
  rowBackground: '#FFFFFF',
  rowBorder: '#E4D5CA',
  badgeSent: '#22C55E',
  badgeAssigned: '#3B82F6',
  badgeNotSent: '#9CA3AF',
  buttonPrimary: '#C3473D',
  buttonSecondary: '#E4D5CA',
  buttonDanger: '#DC2626',
  avatarBackground: '#F0CFC2',
  avatarText: '#643022',
  divider: '#E4D5CA',
} as const;

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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.buttonPrimary} />
          <ThemedText style={styles.loadingText} type="defaultSemiBold">
            Loading user profiles...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText} type="defaultSemiBold">
            Error loading user profiles
          </ThemedText>
          <ThemedText style={styles.errorSubtext}>{error}</ThemedText>
          <Pressable onPress={fetchUserProfiles} style={styles.retryButton}>
            <RemixIcon name="refresh-line" size={18} color={palette.buttonPrimary} />
            <ThemedText style={styles.retryButtonText} type="defaultSemiBold">
              Retry
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
                pressed ? styles.backButtonPressed : undefined,
              ]}>
              <RemixIcon name="arrow-left-line" size={22} color={palette.primaryText} />
            </Pressable>
            <ThemedText type="title" style={styles.headerTitle}>
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
              pressed ? styles.actionButtonPressed : undefined,
            ]}>
            <RemixIcon name="user-add-line" size={16} color="#FFFFFF" />
            <ThemedText type="defaultSemiBold" style={styles.actionButtonText}>
              Create User
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setEmailDialogOpen(true)}
            disabled={isSendingEmail}
            style={({ pressed }) => [
              styles.actionButton,
              styles.sendEmailButton,
              pressed ? styles.actionButtonPressed : undefined,
              isSendingEmail ? styles.actionButtonDisabled : undefined,
            ]}>
            {isSendingEmail ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <RemixIcon name="mail-line" size={16} color="#FFFFFF" />
            )}
            <ThemedText type="defaultSemiBold" style={styles.actionButtonText}>
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
              userTypeFilter === 'external' ? styles.tabActive : styles.tabInactive,
            ]}>
            <ThemedText
              type="defaultSemiBold"
              style={[
                styles.tabText,
                userTypeFilter === 'external' ? styles.tabTextActive : styles.tabTextInactive,
              ]}>
              External Users
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setUserTypeFilter('internal')}
            style={[
              styles.tab,
              userTypeFilter === 'internal' ? styles.tabActive : styles.tabInactive,
            ]}>
            <ThemedText
              type="defaultSemiBold"
              style={[
                styles.tabText,
                userTypeFilter === 'internal' ? styles.tabTextActive : styles.tabTextInactive,
              ]}>
              Internal Users
            </ThemedText>
          </Pressable>
        </View>

        {/* Card Container */}
        <View style={styles.card}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <RemixIcon name="user-3-line" size={20} color={palette.primaryText} />
              <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                User Profiles ({filteredProfiles.length}{' '}
                {userTypeFilter === 'internal' ? 'internal' : 'external'} user
                {filteredProfiles.length !== 1 ? 's' : ''})
              </ThemedText>
              {selectedUserIds.size > 0 && (
                <View style={styles.selectedBadge}>
                  <ThemedText type="defaultSemiBold" style={styles.selectedBadgeText}>
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
                  style={[styles.cardActionButton, styles.deleteButton]}>
                  <RemixIcon name="delete-bin-line" size={16} color="#FFFFFF" />
                  <ThemedText type="defaultSemiBold" style={styles.deleteButtonText}>
                    Delete ({selectedUserIds.size})
                  </ThemedText>
                </Pressable>
              )}
              <Pressable onPress={fetchUserProfiles} style={[styles.cardActionButton, styles.refreshButton]}>
                <RemixIcon name="refresh-line" size={16} color={palette.primaryText} />
              </Pressable>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <RemixIcon
              name="search-line"
              size={18}
              color={palette.secondaryText}
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Search users..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor={palette.secondaryText}
            />
          </View>

          {/* Select All */}
          {filteredProfiles.length > 0 && (
            <View style={styles.selectAllContainer}>
              <Pressable onPress={handleSelectAll} style={styles.checkboxContainer}>
                <View
                  style={[
                    styles.checkbox,
                    isAllSelected ? styles.checkboxChecked : undefined,
                    isSomeSelected && !isAllSelected ? styles.checkboxIndeterminate : undefined,
                  ]}>
                  {isAllSelected && (
                    <RemixIcon name="check-line" size={14} color="#FFFFFF" />
                  )}
                  {isSomeSelected && !isAllSelected && (
                    <View style={styles.checkboxIndeterminateMark} />
                  )}
                </View>
                <ThemedText type="default" style={styles.selectAllText}>
                  Select All
                </ThemedText>
              </Pressable>
            </View>
          )}

          {/* User List */}
          {filteredProfiles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <RemixIcon name="user-3-line" size={48} color={palette.secondaryText} />
              <ThemedText type="defaultSemiBold" style={styles.emptyText}>
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
                <View style={styles.userRow}>
                  {/* Checkbox */}
                  <Pressable onPress={() => handleToggleSelect(profile.userId)} style={styles.checkboxContainer}>
                    <View
                      style={[
                        styles.checkbox,
                        selectedUserIds.has(profile.userId) ? styles.checkboxChecked : undefined,
                      ]}>
                      {selectedUserIds.has(profile.userId) && (
                        <RemixIcon name="check-line" size={14} color="#FFFFFF" />
                      )}
                    </View>
                  </Pressable>

                  <View style={styles.userInfo}>
                    {/* Name */}
                    <View style={styles.userNameRow}>
                      <View style={styles.avatar}>
                        <ThemedText type="defaultSemiBold" style={styles.avatarText}>
                          {getInitials(profile.fullName)}
                        </ThemedText>
                      </View>
                      <View style={styles.userNameContainer}>
                        <ThemedText type="defaultSemiBold" style={styles.userName}>
                          {profile.fullName}
                        </ThemedText>
                        {profile.preferredName && profile.preferredName !== profile.fullName && (
                          <ThemedText type="default" style={styles.userPreferredName}>
                            ({profile.preferredName})
                          </ThemedText>
                        )}
                      </View>
                    </View>

                    {/* Email */}
                    <View style={styles.userEmailRow}>
                      <RemixIcon name="mail-line" size={14} color={palette.secondaryText} />
                      <ThemedText type="default" style={styles.userEmail}>
                        {profile.email}
                      </ThemedText>
                    </View>

                    {/* Status */}
                    <View style={styles.statusContainer}>
                      {isCreditsEmailSent(profile) && isCreditsAssigned(profile) ? (
                        <View style={styles.statusBadges}>
                          <View style={[styles.statusBadge, styles.statusBadgeSent]}>
                            <RemixIcon name="check-line" size={12} color="#FFFFFF" />
                            <ThemedText type="default" style={styles.statusBadgeText}>
                              Sent
                            </ThemedText>
                          </View>
                          <View style={[styles.statusBadge, styles.statusBadgeAssigned]}>
                            <RemixIcon name="check-line" size={12} color="#FFFFFF" />
                            <ThemedText type="default" style={styles.statusBadgeText}>
                              Assigned
                            </ThemedText>
                          </View>
                        </View>
                      ) : isCreditsEmailSent(profile) ? (
                        <View style={[styles.statusBadge, styles.statusBadgeSent]}>
                          <RemixIcon name="check-line" size={12} color="#FFFFFF" />
                          <ThemedText type="default" style={styles.statusBadgeText}>
                            Sent
                          </ThemedText>
                        </View>
                      ) : isCreditsAssigned(profile) ? (
                        <View style={[styles.statusBadge, styles.statusBadgeAssigned]}>
                          <RemixIcon name="check-line" size={12} color="#FFFFFF" />
                          <ThemedText type="default" style={styles.statusBadgeText}>
                            Assigned
                          </ThemedText>
                        </View>
                      ) : (
                        <View style={[styles.statusBadge, styles.statusBadgeNotSent]}>
                          <ThemedText type="default" style={styles.statusBadgeTextNotSent}>
                            Not Sent
                          </ThemedText>
                        </View>
                      )}
                    </View>

                    {/* User ID */}
                    <View style={styles.userIdRow}>
                      <ThemedText type="default" style={styles.userIdLabel}>
                        User ID:
                      </ThemedText>
                      <View style={styles.userIdBadge}>
                        <ThemedText type="default" style={styles.userIdValue}>
                          {profile.userId.slice(0, 8)}...
                        </ThemedText>
                      </View>
                    </View>

                    {/* Dates */}
                    <View style={styles.datesRow}>
                      <View style={styles.dateItem}>
                        <RemixIcon name="calendar-line" size={14} color={palette.secondaryText} />
                        <ThemedText type="default" style={styles.dateText}>
                          Created: {formatDate(profile.createdAt)}
                        </ThemedText>
                      </View>
                      <View style={styles.dateItem}>
                        <RemixIcon name="calendar-line" size={14} color={palette.secondaryText} />
                        <ThemedText type="default" style={styles.dateText}>
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
                        style={[styles.actionButtonSmall, styles.assignButton]}>
                        <RemixIcon name="bank-card-line" size={14} color={palette.primaryText} />
                        <ThemedText type="defaultSemiBold" style={styles.assignButtonText}>
                          Assign Credits
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteClick(profile)}
                        style={[styles.actionButtonSmall, styles.deleteButtonSmall]}>
                        <RemixIcon name="delete-bin-line" size={14} color={palette.buttonDanger} />
                        <ThemedText type="defaultSemiBold" style={styles.deleteButtonSmallText}>
                          Delete
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.pagination}>
              <ThemedText type="default" style={styles.paginationText}>
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
                    page === 0 && styles.paginationButtonDisabled,
                  ]}>
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
                  style={[
                    styles.paginationButton,
                    page === totalPages - 1 && styles.paginationButtonDisabled,
                  ]}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={[
                      styles.paginationButtonText,
                      page === totalPages - 1 && styles.paginationButtonTextDisabled,
                    ]}>
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
            <View style={styles.dialog}>
              <ThemedText type="title" style={styles.dialogTitle}>
                Are you sure?
              </ThemedText>
              <ThemedText type="default" style={styles.dialogDescription}>
                This action cannot be undone. This will permanently delete the user profile for{' '}
                <ThemedText type="defaultSemiBold">{userToDelete?.fullName}</ThemedText> (
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
                    isDeleting && styles.dialogButtonDisabled,
                  ]}>
                  <ThemedText type="defaultSemiBold" style={styles.dialogButtonCancelText}>
                    Cancel
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleDeleteConfirm}
                  disabled={isDeleting}
                  style={[
                    styles.dialogButton,
                    styles.dialogButtonConfirm,
                    isDeleting && styles.dialogButtonDisabled,
                  ]}>
                  {isDeleting ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                      <ThemedText type="defaultSemiBold" style={styles.dialogButtonConfirmText}>
                        Deleting...
                      </ThemedText>
                    </>
                  ) : (
                    <ThemedText type="defaultSemiBold" style={styles.dialogButtonConfirmText}>
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
    backgroundColor: palette.background,
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
    color: palette.primaryText,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  errorText: {
    color: palette.buttonDanger,
    fontSize: 18,
  },
  errorSubtext: {
    color: palette.secondaryText,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: palette.buttonPrimary,
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
    color: palette.headerText,
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
    backgroundColor: palette.buttonPrimary,
  },
  sendEmailButton: {
    backgroundColor: palette.buttonPrimary,
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
    backgroundColor: palette.activeTabBackground,
  },
  tabInactive: {
    backgroundColor: palette.inactiveTabBackground,
  },
  tabText: {
    fontSize: 16,
  },
  tabTextActive: {
    color: palette.activeTabText,
  },
  tabTextInactive: {
    color: palette.inactiveTabText,
  },
  card: {
    backgroundColor: palette.cardBackground,
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
    color: palette.primaryText,
    fontSize: 18,
  },
  selectedBadge: {
    backgroundColor: palette.buttonSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectedBadgeText: {
    color: palette.primaryText,
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
    backgroundColor: palette.buttonSecondary,
  },
  deleteButton: {
    backgroundColor: palette.buttonDanger,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  selectAllContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
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
    borderColor: palette.secondaryText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: palette.buttonPrimary,
    borderColor: palette.buttonPrimary,
  },
  checkboxIndeterminate: {
    backgroundColor: palette.buttonPrimary,
    borderColor: palette.buttonPrimary,
  },
  checkboxIndeterminateMark: {
    width: 10,
    height: 2,
    backgroundColor: '#FFFFFF',
  },
  selectAllText: {
    color: palette.primaryText,
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.searchBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.searchBorder,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: palette.primaryText,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    color: palette.secondaryText,
    textAlign: 'center',
  },
  userRow: {
    flexDirection: 'row',
    backgroundColor: palette.rowBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.rowBorder,
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
    backgroundColor: palette.avatarBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: palette.avatarText,
    fontSize: 14,
  },
  userNameContainer: {
    flex: 1,
  },
  userName: {
    color: palette.primaryText,
    fontSize: 16,
  },
  userPreferredName: {
    color: palette.secondaryText,
    fontSize: 14,
  },
  userEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userEmail: {
    color: palette.secondaryText,
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
  statusBadgeSent: {
    backgroundColor: palette.badgeSent,
  },
  statusBadgeAssigned: {
    backgroundColor: palette.badgeAssigned,
  },
  statusBadgeNotSent: {
    backgroundColor: palette.badgeNotSent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  statusBadgeTextNotSent: {
    color: palette.primaryText,
    fontSize: 12,
  },
  userIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userIdLabel: {
    color: palette.secondaryText,
    fontSize: 12,
  },
  userIdBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  userIdValue: {
    color: palette.buttonDanger,
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
    color: palette.secondaryText,
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
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  assignButton: {
    backgroundColor: palette.buttonSecondary,
  },
  assignButtonText: {
    color: palette.primaryText,
    fontSize: 12,
  },
  deleteButtonSmall: {
    backgroundColor: '#FEE2E2',
  },
  deleteButtonSmallText: {
    color: palette.buttonDanger,
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
    backgroundColor: '#FFFFFF',
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
  },
  dialogTitle: {
    color: palette.primaryText,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  dialogDescription: {
    color: palette.secondaryText,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E4',
  },
  dialogButtonCancelText: {
    color: palette.primaryText,
    fontSize: 14,
    fontWeight: '500',
  },
  dialogButtonConfirm: {
    backgroundColor: palette.buttonDanger,
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
    borderTopColor: palette.divider,
    gap: 12,
    marginTop: 8,
  },
  paginationText: {
    color: palette.secondaryText,
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
    backgroundColor: palette.buttonSecondary,
    minWidth: 80,
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    color: palette.primaryText,
    fontSize: 14,
  },
  paginationButtonTextDisabled: {
    color: palette.secondaryText,
  },
  paginationPageText: {
    color: palette.primaryText,
    fontSize: 14,
  },
});

