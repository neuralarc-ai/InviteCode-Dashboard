"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  RefreshCw,
  User,
  Mail,
  CreditCard,
  Trash2,
  Loader2,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  EllipsisVertical,
  ArrowLeftRight,
} from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getUserType, getNameFromEmail } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ChangePlanDialog from "../change-plan-dialog";

type UsageActivity = {
  usageCount: number;
  latestActivity: Date | null;
};

interface UsersTableRealtimeProps {
  userTypeFilter?: "internal" | "external";
  selectedUserIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onAssignCredits?: (user: UserProfile) => void;
  usageActivityMap?: Record<string, UsageActivity>;
  userProfiles: UserProfile[];
  loading: boolean;
  error: string | null;
  refreshUserProfiles: () => Promise<void>;
  deleteUserProfile: (
    id: string
  ) => Promise<{ success: boolean; message: string }>;
  bulkDeleteUserProfiles: (
    ids: string[]
  ) => Promise<{ success: boolean; message: string; deletedCount?: number }>;
}

export function UsersTableRealtime({
  userTypeFilter = "external",
  selectedUserIds: externalSelectedUserIds,
  onSelectionChange,
  onAssignCredits,
  usageActivityMap,
  userProfiles,
  loading,
  error,
  refreshUserProfiles,
  deleteUserProfile,
  bulkDeleteUserProfiles,
}: UsersTableRealtimeProps) {
  const [filter, setFilter] = React.useState("");
  const [page, setPage] = React.useState(0);
  const rowsPerPage = 10;
  const { toast } = useToast();
  const [internalSelectedUserIds, setInternalSelectedUserIds] = React.useState<
    Set<string>
  >(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<UserProfile | null>(
    null
  );
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [selectedProfile, setSelectedProfile] =
    React.useState<UserProfile | null>(null);

  // Sorting state
  const [sortField, setSortField] = React.useState<
    | "name"
    | "email"
    | "created"
    | "usageStatus"
    | "usageCount"
    | "latestActivity"
  >("created");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "desc"
  );

  // Use external selection state if provided, otherwise use internal state
  const selectedUserIds = externalSelectedUserIds ?? internalSelectedUserIds;
  const setSelectedUserIds = onSelectionChange ?? setInternalSelectedUserIds;

  // Debug logging
  React.useEffect(() => {
    console.log("UsersTableRealtime - userProfiles:", userProfiles);
    console.log("UsersTableRealtime - loading:", loading);
    console.log("UsersTableRealtime - error:", error);
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

  // Handle sorting
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setPage(0); // Reset to first page when sorting
  };

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatDateOnly = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if user has credits email sent
  const isCreditsEmailSent = (profile: UserProfile): boolean => {
    return !!profile.metadata?.credits_email_sent_at;
  };

  // Check if user has credits assigned
  const isCreditsAssigned = (profile: UserProfile): boolean => {
    return !!profile.metadata?.credits_assigned;
  };

  // Get status badge for user
  const getStatusBadge = (profile: UserProfile) => {
    const sent = isCreditsEmailSent(profile);
    const assigned = isCreditsAssigned(profile);

    if (sent && assigned) {
      return (
        <div className="flex flex-col gap-1">
          <Badge
            variant="default"
            className="bg-green-700 hover:bg-green-800 text-white flex items-center gap-1 w-fit"
          >
            <CheckCircle2 className="h-3 w-3" />
            Sent
          </Badge>
          <Badge
            variant="default"
            className="bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1 w-fit"
          >
            <CheckCircle2 className="h-3 w-3" />
            Assigned
          </Badge>
        </div>
      );
    } else if (sent) {
      return (
        <Badge
          variant="default"
          className="bg-green-700 hover:bg-green-800 text-white flex items-center gap-1"
        >
          <CheckCircle2 className="h-3 w-3" />
          Sent
        </Badge>
      );
    } else if (assigned) {
      return (
        <Badge
          variant="default"
          className="bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1"
        >
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

  const getUsageStatus = (userId: string) => {
    const usageInfo = usageActivityMap?.[userId];
    const latestActivity = usageInfo?.latestActivity;

    if (!latestActivity) {
      return "inactive";
    }

    const now = new Date();
    const daysSinceActivity = Math.floor(
      (now.getTime() - latestActivity.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceActivity <= 5) {
      return "active";
    } else if (daysSinceActivity <= 10) {
      return "partial";
    } else {
      return "inactive";
    }
  };

  const getUsageStatusBadge = (userId: string) => {
    const status = getUsageStatus(userId);

    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            Active
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
            Partial Active
          </Badge>
        );
      case "inactive":
      default:
        return (
          <Badge variant="secondary" className="text-muted-foreground">
            Inactive
          </Badge>
        );
    }
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
          typeof value === "string" &&
          value.toLowerCase().includes(filter.toLowerCase())
      );
      if (!matchesText) {
        return false;
      }
    }
    return true;
  });

  // Sort the filtered profiles
  const sortedProfiles = [...filteredProfiles].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case "name":
        const aName =
          a.fullName &&
          a.fullName.trim() !== "" &&
          a.fullName.trim().toLowerCase() !== "user"
            ? a.fullName
            : getNameFromEmail(a.email);
        const bName =
          b.fullName &&
          b.fullName.trim() !== "" &&
          b.fullName.trim().toLowerCase() !== "user"
            ? b.fullName
            : getNameFromEmail(b.email);
        aValue = aName.toLowerCase();
        bValue = bName.toLowerCase();
        break;
      case "email":
        aValue = a.email.toLowerCase();
        bValue = b.email.toLowerCase();
        break;
      case "created":
        aValue = a.createdAt.getTime();
        bValue = b.createdAt.getTime();
        break;
      case "usageStatus":
        // Sort by usage status priority: active > partial > inactive
        const getStatusPriority = (userId: string) => {
          const status = getUsageStatus(userId);
          switch (status) {
            case "active":
              return 3;
            case "partial":
              return 2;
            case "inactive":
              return 1;
            default:
              return 0;
          }
        };
        aValue = getStatusPriority(a.userId);
        bValue = getStatusPriority(b.userId);
        break;
      case "usageCount":
        aValue = usageActivityMap?.[a.userId]?.usageCount || 0;
        bValue = usageActivityMap?.[b.userId]?.usageCount || 0;
        break;
      case "latestActivity":
        aValue = usageActivityMap?.[a.userId]?.latestActivity?.getTime() || 0;
        bValue = usageActivityMap?.[b.userId]?.latestActivity?.getTime() || 0;
        break;
      default:
        return 0;
    }

    // Handle null/undefined values
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    // Sort based on direction
    if (sortDirection === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const paginatedProfiles = sortedProfiles.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  const totalPages = Math.ceil(sortedProfiles.length / rowsPerPage);

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
    const allFilteredUserIds = new Set(
      sortedProfiles.map((profile) => profile.userId)
    );
    if (
      selectedUserIds.size === sortedProfiles.length &&
      sortedProfiles.every((profile) => selectedUserIds.has(profile.userId))
    ) {
      // All are selected, deselect all
      setSelectedUserIds(new Set());
    } else {
      // Select all filtered users
      setSelectedUserIds(allFilteredUserIds);
    }
  };

  const isAllSelected =
    sortedProfiles.length > 0 &&
    sortedProfiles.every((profile) => selectedUserIds.has(profile.userId));
  const isSomeSelected = sortedProfiles.some((profile) =>
    selectedUserIds.has(profile.userId)
  );

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
        description:
          "An unexpected error occurred while deleting the user profile",
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
      const selectedProfiles = sortedProfiles.filter((profile) =>
        selectedUserIds.has(profile.userId)
      );
      const profileIds = selectedProfiles.map((profile) => profile.id);

      const result = await bulkDeleteUserProfiles(profileIds);

      if (result.success) {
        toast({
          title: "Success",
          description:
            result.message ||
            `Successfully deleted ${
              result.deletedCount || profileIds.length
            } user profile(s)`,
        });
        setSelectedUserIds(new Set());
        setBulkDeleteDialogOpen(false);
      } else {
        // Check if some users were deleted but some failed
        if (result.deletedCount && result.deletedCount > 0) {
          toast({
            title: "Partial Success",
            description:
              result.message ||
              `Deleted ${result.deletedCount} user(s), but some failed. Check the error details.`,
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
        description:
          "An unexpected error occurred while deleting user profiles",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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
    <Card className="">
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start gap-4 md:items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <User size={28} />
            User Profiles ({sortedProfiles.length}{" "}
            {userTypeFilter === "internal" ? "internal" : "external"} user
            {sortedProfiles.length !== 1 ? "s" : ""})
            {selectedUserIds.size > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedUserIds.size} selected
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2 self-end">
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
                console.log("Current state:", { userProfiles, loading, error });
                console.log("Filtered profiles:", filteredProfiles);
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
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      {getSortIcon("name")}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center gap-1">
                      Email
                      {getSortIcon("email")}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>Credit Status</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort("usageStatus")}
                  >
                    <div className="flex items-center gap-1">
                      Usage Status
                      {getSortIcon("usageStatus")}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>Referral Source</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold hover:bg-transparent justify-end"
                    onClick={() => handleSort("created")}
                  >
                    <div className="flex items-center gap-1">
                      Created
                      {getSortIcon("created")}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <User className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {filter
                          ? `No ${userTypeFilter} users found matching your search`
                          : `No ${userTypeFilter} user profiles found`}
                      </p>
                      {userProfiles.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Showing {userTypeFilter} users only.{" "}
                          {userProfiles.length - sortedProfiles.length}{" "}
                          {userTypeFilter === "internal"
                            ? "external"
                            : "internal"}{" "}
                          user
                          {userProfiles.length - sortedProfiles.length !== 1
                            ? "s"
                            : ""}{" "}
                          hidden.
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
                        onCheckedChange={() =>
                          handleToggleSelect(profile.userId)
                        }
                        aria-label={`Select ${
                          profile.fullName &&
                          profile.fullName.trim() !== "" &&
                          profile.fullName.trim().toLowerCase() !== "user"
                            ? profile.fullName
                            : getNameFromEmail(profile.email)
                        }`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(
                              profile.fullName ||
                                getNameFromEmail(profile.email)
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {profile.fullName &&
                            profile.fullName.trim() !== "" &&
                            profile.fullName.trim().toLowerCase() !== "user"
                              ? profile.fullName
                              : getNameFromEmail(profile.email)}
                          </p>
                          {profile.preferredName &&
                            profile.preferredName !== profile.fullName && (
                              <p className="text-sm text-muted-foreground">
                                ({profile.preferredName})
                              </p>
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
                    <TableCell>{getStatusBadge(profile)}</TableCell>
                    <TableCell>{getUsageStatusBadge(profile.userId)}</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {profile.referralSource || (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDateOnly(profile.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant={"outline"} size={"icon"}>
                            <EllipsisVertical />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="space-y-2">
                          {onAssignCredits && (
                            <DropdownMenuItem asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onAssignCredits(profile)}
                                className="w-full justify-start"
                                aria-label="Assign Credits"
                              >
                                <CreditCard className="h-4 w-4" />
                                Assign Credits
                              </Button>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setOpenDialog(true);
                                setSelectedProfile(profile);
                              }}
                              className="w-full justify-start"
                              disabled={isDeleting}
                              aria-label="Change Plan"
                            >
                              <ArrowLeftRight className="h-4 w-4" />
                              Change Plan
                            </Button>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(profile)}
                              className="w-full justify-start"
                              disabled={isDeleting}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete User
                            </Button>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex w-full flex-col md:flex-row gap-4 items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {page * rowsPerPage + 1} to{" "}
              {Math.min((page + 1) * rowsPerPage, sortedProfiles.length)} of{" "}
              {sortedProfiles.length} users
            </p>
            <div className="flex w-full md:w-fit items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="w-full"
              >
                Previous
              </Button>
              <span className="text-sm w-full whitespace-nowrap">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
                className="w-full"
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
              This action cannot be undone. This will permanently delete the
              user profile for{" "}
              <strong>
                {userToDelete?.fullName &&
                userToDelete.fullName.trim() !== "" &&
                userToDelete.fullName.trim().toLowerCase() !== "user"
                  ? userToDelete.fullName
                  : getNameFromEmail(userToDelete?.email)}
              </strong>{" "}
              ({userToDelete?.email}).
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
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <strong>
                {selectedUserIds.size} user profile
                {selectedUserIds.size !== 1 ? "s" : ""}
              </strong>
              .
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
                `Delete ${selectedUserIds.size} user${
                  selectedUserIds.size !== 1 ? "s" : ""
                }`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ChangePlanDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        profile={selectedProfile}
        onSuccess={refreshUserProfiles}
      />
    </Card>
  );
}
