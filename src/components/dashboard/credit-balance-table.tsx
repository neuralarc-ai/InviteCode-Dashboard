"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCreditBalances } from "@/hooks/use-realtime-data";
import { useToast } from "@/hooks/use-toast";
import { getNameFromEmail, getUserType } from "@/lib/utils";
import {
  ArrowLeftRight,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  EllipsisVertical,
  RefreshCw,
  Search,
  User,
  Users
} from "lucide-react";
import * as React from "react";
import ChangePlanDialog from "../change-plan-dialog";
import { CreditAssignmentDialog } from "./credit-assignment-dialog";
import { UserProfile } from "@/lib/types";

export function CreditBalanceTable() {
  const { creditBalances, loading, error, refreshCreditBalances } =
    useCreditBalances();
  const [filter, setFilter] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [userTypeFilter, setUserTypeFilter] = React.useState<
    "external" | "internal"
  >("external");
  const [creditDialogOpen, setCreditDialogOpen] = React.useState(false);
  const [selectedBalance, setSelectedBalance] = React.useState<{
    userId: string;
    userName: string;
    userEmail: string;
  } | null>(null);
  const rowsPerPage = 10;
  const { toast } = useToast();

  const [isDeleting, setIsDeleting] = React.useState(false);
    const [openDialog, setOpenDialog] = React.useState(false);
    const [selectedProfile, setSelectedProfile] =
      React.useState<UserProfile | null>(null);

  
  const typedFilteredBalances = React.useMemo(() => {
    return creditBalances.filter((balance) => {
      const userType = getUserType(balance.userEmail);
      return userType === userTypeFilter;
    });
  }, [creditBalances, userTypeFilter]);

  const filteredBalances = React.useMemo(() => {
    if (!filter.trim()) return typedFilteredBalances;

    const searchLower = filter.toLowerCase();
    return typedFilteredBalances.filter((balance) => {
      return (
        balance.userEmail?.toLowerCase().includes(searchLower) ||
        balance.userName?.toLowerCase().includes(searchLower) ||
        balance.userId.toLowerCase().includes(searchLower)
      );
    });
  }, [typedFilteredBalances, filter]);

  const paginatedBalances = filteredBalances.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  const totalPages = Math.ceil(filteredBalances.length / rowsPerPage);

  React.useEffect(() => {
    setPage(0);
  }, [userTypeFilter, filter]);

  const formatCredits = (balanceDollars: number | null | undefined): string => {
    if (
      balanceDollars === null ||
      balanceDollars === undefined ||
      isNaN(balanceDollars)
    ) {
      return "0";
    }
    const credits = Math.round(balanceDollars * 100);
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(credits);
  };

  const formatDate = (date: Date | null | undefined): string => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return "N/A";
    }
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const toCredits = (dollars: number | null | undefined): number => {
    if (dollars === null || dollars === undefined || isNaN(dollars)) return 0;
    return Math.max(0, Math.round(dollars * 100));
  };

  const handleRefresh = async () => {
    try {
      await refreshCreditBalances();
      toast({
        title: "Success",
        description: "Credit balances refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh credit balances",
        variant: "destructive",
      });
    }
  };

  const handleAssignCredits = (balance: (typeof creditBalances)[0]) => {
    let userName = balance.userName;
    if (
      !userName ||
      userName.trim() === "" ||
      userName.trim().toLowerCase() === "user" ||
      userName.startsWith("User ")
    ) {
      userName =
        balance.userEmail && balance.userEmail !== "Email not available"
          ? getNameFromEmail(balance.userEmail)
          : `User ${balance.userId.slice(0, 8)}`;
    }

    setSelectedBalance({
      userId: balance.userId,
      userName: userName,
      userEmail: balance.userEmail || "Email not available",
    });
    setCreditDialogOpen(true);
  };

  const handleCreditAssignmentSuccess = () => {
    refreshCreditBalances();
    toast({
      title: "Success",
      description: "Credits assigned successfully!",
    });
  };

  if (loading) {
    /* unchanged */
  }
  if (error) {
    /* unchanged */
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            Credit Balances
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-lg w-full md:w-fit mb-6">
          <Button
            variant={userTypeFilter === "external" ? "default" : "ghost"}
            size="sm"
            onClick={() => setUserTypeFilter("external")}
            className={`flex items-center gap-2 w-full ${
              userTypeFilter === "external" ? "hover:bg-primary" : ""
            }`}
          >
            <Users className="h-4 w-4" />
            External Users
          </Button>
          <Button
            variant={userTypeFilter === "internal" ? "default" : "ghost"}
            size="sm"
            onClick={() => setUserTypeFilter("internal")}
            className={`flex items-center gap-2 w-full ${
              userTypeFilter === "internal" ? "hover:bg-primary" : ""
            }`}
          >
            <Building2 className="h-4 w-4" />
            Internal Users
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by user email or name..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table – unchanged except using the double-filtered list */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Total Credits</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBalances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <User className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {filter || userTypeFilter
                          ? "No credit balances found matching your filters"
                          : "No credit balances found"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBalances.map((balance) => (
                  <TableRow key={balance.userId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {balance.userName &&
                            balance.userName.trim() !== "" &&
                            balance.userName.trim().toLowerCase() !== "user" &&
                            !balance.userName.startsWith("User ")
                              ? balance.userName
                              : getNameFromEmail(balance.userEmail)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono font-semibold text-foreground">
                          {formatCredits(balance.totalPurchased)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          total purchased
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono font-semibold text-foreground">
                          {formatCredits(balance.balanceDollars)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          total balance
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const total = toCredits(balance.totalPurchased);
                        const used = toCredits(balance.totalUsed);
                        const remaining = toCredits(balance.balanceDollars);
                        const usedPercent =
                          total > 0
                            ? Math.min(100, Math.round((used / total) * 100))
                            : 0;
                        return (
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-2 text-sm">
                              <span className="font-mono font-semibold text-foreground">
                                {used}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                used · {remaining} remaining
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-foreground/20">
                              <div
                                className="h-2 rounded-full bg-primary"
                                style={{ width: `${usedPercent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(balance.lastUpdated)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant={"outline"} size={"icon"}>
                            <EllipsisVertical />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="space-y-2">
                          <DropdownMenuItem asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAssignCredits(balance)}
                              className="w-full justify-start"
                              aria-label="Assign Credits"
                            >
                              <CreditCard className="h-4 w-4" />
                              Assign Credits
                            </Button>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setOpenDialog(true);
                                setSelectedProfile(balance);
                              }}
                              className="w-full justify-start"
                              disabled={isDeleting}
                              aria-label="Change Plan"
                            >
                              <ArrowLeftRight className="h-4 w-4" />
                              Change Plan
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

        {/* Pagination – now based on double-filtered list */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {page * rowsPerPage + 1} to{" "}
              {Math.min((page + 1) * rowsPerPage, filteredBalances.length)} of{" "}
              {filteredBalances.length} balances
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
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
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Dialog unchanged */}
      {selectedBalance && (
        <CreditAssignmentDialog
          open={creditDialogOpen}
          onOpenChange={setCreditDialogOpen}
          user={{
            id: selectedBalance.userId,
            userId: selectedBalance.userId,
            fullName: selectedBalance.userName,
            preferredName: selectedBalance.userName,
            workDescription: "",
            personalReferences: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            avatarUrl: null,
            referralSource: null,
            consentGiven: null,
            consentDate: null,
            email: selectedBalance.userEmail,
          }}
          onSuccess={handleCreditAssignmentSuccess}
        />
      )}

      <ChangePlanDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        profile={selectedProfile}
        // onSuccess={refreshUserProfiles}
      />
    </Card>
  );
}
