'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, RefreshCw, User, Mail, Calendar, CreditCard, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { useUserProfiles } from '@/hooks/use-realtime-data';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UsersTableRealtimeProps {
  userTypeFilter?: 'internal' | 'external';
  selectedUserIds?: Set<string>;
  onSelectionChange?: (selectedUserIds: Set<string>) => void;
  onAssignCredits?: (user: UserProfile) => void;
}

export function UsersTableRealtime({ 
  userTypeFilter = 'external',
  selectedUserIds: externalSelectedUserIds,
  onSelectionChange,
  onAssignCredits
}: UsersTableRealtimeProps) {
  const { userProfiles, loading, error, refreshUserProfiles, deleteUserProfile, bulkDeleteUserProfiles } = useUserProfiles();
  const [filter, setFilter] = React.useState('');
  const [page, setPage] = React.useState(0);
  const rowsPerPage = 10;
  const { toast } = useToast();
  const [internalSelectedUserIds, setInternalSelectedUserIds] = React.useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  // Use external selection state if provided, otherwise use internal state
  const selectedUserIds = externalSelectedUserIds ?? internalSelectedUserIds;
  const setSelectedUserIds = onSelectionChange ?? setInternalSelectedUserIds;

  // Debug logging
  React.useEffect(() => {
    console.log('UsersTableRealtime - userProfiles:', userProfiles);
    console.log('UsersTableRealtime - loading:', loading);
    console.log('UsersTableRealtime - error:', error);
  }, [userProfiles, loading, error]);

  // Reset to first page when user type filter changes
  React.useEffect(() => {
    setPage(0);
  }, [userTypeFilter]);

  // Reset selection when user type filter changes
  React.useEffect(() => {
    if (onSelectionChange) {
      // Only clear if using external state management
      onSelectionChange(new Set());
    } else {
      setInternalSelectedUserIds(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTypeFilter]);

  // Helper function to determine user type based on email domain
  const getUserType = (email: string | undefined): 'internal' | 'external' => {
    if (!email || typeof email !== 'string') {
      return 'external'; // Default to external if email is missing
    }
    const emailLower = email.toLowerCase();
    if (emailLower.endsWith('@he2.ai') || emailLower.endsWith('@neuralarc.ai')) {
      return 'internal';
    }
    return 'external';
  };

  const filteredProfiles = userProfiles.filter((profile) => {
    // Filter by user type (internal/external)
    const profileUserType = getUserType(profile.email);
    if (profileUserType !== userTypeFilter) {
      return false;
    }

    // Filter by text search (only if filter is provided)
    if (filter.trim()) {
      const matchesText = Object.values(profile).some(
        (value) =>
          value !== null &&
          value !== undefined &&
          typeof value === 'string' &&
          value.toLowerCase().includes(filter.toLowerCase())
      );
      if (!matchesText) {
        return false;
      }
    }
    return true;
  });

  const paginatedProfiles = filteredProfiles.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  const totalPages = Math.ceil(filteredProfiles.length / rowsPerPage);

  // Selection handlers (moved after filteredProfiles is defined)
  const handleToggleSelect = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const handleSelectAll = () => {
    const allFilteredUserIds = new Set(filteredProfiles.map(profile => profile.userId));
    if (selectedUserIds.size === filteredProfiles.length && 
        filteredProfiles.every(profile => selectedUserIds.has(profile.userId))) {
      // All are selected, deselect all
      setSelectedUserIds(new Set());
    } else {
      // Select all filtered users
      setSelectedUserIds(allFilteredUserIds);
    }
  };

  const isAllSelected = filteredProfiles.length > 0 && 
    filteredProfiles.every(profile => selectedUserIds.has(profile.userId));
  const isSomeSelected = filteredProfiles.some(profile => selectedUserIds.has(profile.userId));

  const handleRefresh = async () => {
    try {
      await refreshUserProfiles();
      toast({
        title: "Success",
        description: "User profiles refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh user profiles",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (profile: UserProfile) => {
    setUserToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteUserProfile(userToDelete.id);
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message || "User profile deleted successfully",
        });
        setDeleteDialogOpen(false);
        setUserToDelete(null);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to delete user profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the user profile",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedUserIds.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select users to delete",
        variant: "destructive",
      });
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedUserIds.size === 0) return;

    setIsDeleting(true);
    try {
      // Get profile IDs from selected user IDs
      const selectedProfiles = filteredProfiles.filter(profile => 
        selectedUserIds.has(profile.userId)
      );
      const profileIds = selectedProfiles.map(profile => profile.id);

      const result = await bulkDeleteUserProfiles(profileIds);
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message || `Successfully deleted ${result.deletedCount || profileIds.length} user profile(s)`,
        });
        setSelectedUserIds(new Set());
        setBulkDeleteDialogOpen(false);
      } else {
        // Check if some users were deleted but some failed
        if (result.deletedCount && result.deletedCount > 0) {
          toast({
            title: "Partial Success",
            description: result.message || `Deleted ${result.deletedCount} user(s), but some failed. Check the error details.`,
            variant: "destructive",
          });
          // Still clear selection for successfully deleted users
          setSelectedUserIds(new Set());
          setBulkDeleteDialogOpen(false);
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to delete user profiles",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting user profiles",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };


  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if user has credits email sent
  const isCreditsEmailSent = (profile: UserProfile): boolean => {
    return !!(profile.metadata?.credits_email_sent_at);
  };

  // Check if user has credits assigned
  const isCreditsAssigned = (profile: UserProfile): boolean => {
    return !!(profile.metadata?.credits_assigned);
  };

  // Get status badge for user
  const getStatusBadge = (profile: UserProfile) => {
    const sent = isCreditsEmailSent(profile);
    const assigned = isCreditsAssigned(profile);
    
    if (sent && assigned) {
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="default" className="bg-green-600 hover:bg-green-700 flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3 w-3" />
            Sent
          </Badge>
          <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3 w-3" />
            Assigned
          </Badge>
        </div>
      );
    } else if (sent) {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Sent
        </Badge>
      );
    } else if (assigned) {
      return (
        <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Assigned
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Not Sent
        </Badge>
      );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading user profiles...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-red-500 mb-2">Error loading user profiles</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Profiles ({filteredProfiles.length} {userTypeFilter === 'internal' ? 'internal' : 'external'} user{filteredProfiles.length !== 1 ? 's' : ''})
              {selectedUserIds.size > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedUserIds.size} selected
                </Badge>
              )}
            </CardTitle>
          <div className="flex gap-2">
            {selectedUserIds.size > 0 && (
              <Button 
                onClick={handleBulkDeleteClick}
                variant="destructive" 
                size="sm"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedUserIds.size})
                  </>
                )}
              </Button>
            )}
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={() => {
                console.log('Current state:', { userProfiles, loading, error });
                console.log('Filtered profiles:', filteredProfiles);
              }} 
              variant="outline" 
              size="sm"
            >
              Debug
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all users"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <User className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {filter 
                          ? `No ${userTypeFilter} users found matching your search` 
                          : `No ${userTypeFilter} user profiles found`}
                      </p>
                      {userProfiles.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Showing {userTypeFilter} users only. {userProfiles.length - filteredProfiles.length} {userTypeFilter === 'internal' ? 'external' : 'internal'} user{userProfiles.length - filteredProfiles.length !== 1 ? 's' : ''} hidden.
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUserIds.has(profile.userId)}
                        onCheckedChange={() => handleToggleSelect(profile.userId)}
                        aria-label={`Select ${profile.fullName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(profile.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{profile.fullName}</p>
                          {profile.preferredName && profile.preferredName !== profile.fullName && (
                            <p className="text-sm text-muted-foreground">({profile.preferredName})</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{profile.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(profile)}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {profile.userId.slice(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(profile.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(profile.updatedAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                      {onAssignCredits && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAssignCredits(profile)}
                          className="flex items-center gap-2"
                        >
                          <CreditCard className="h-4 w-4" />
                          Assign Credits
                        </Button>
                      )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(profile)}
                          className="flex items-center gap-2 text-destructive hover:text-destructive"
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, filteredProfiles.length)} of {filteredProfiles.length} users
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user profile for{' '}
              <strong>{userToDelete?.fullName}</strong> ({userToDelete?.email}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{' '}
              <strong>{selectedUserIds.size} user profile{selectedUserIds.size !== 1 ? 's' : ''}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedUserIds.size} user${selectedUserIds.size !== 1 ? 's' : ''}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
