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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, RefreshCw, User, DollarSign, Calendar, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { useCreditBalances } from '@/hooks/use-realtime-data';
import { useToast } from '@/hooks/use-toast';
import { CreditAssignmentDialog } from './credit-assignment-dialog';

export function CreditBalanceTable() {
  const { creditBalances, loading, error, refreshCreditBalances } = useCreditBalances();
  const [filter, setFilter] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [creditDialogOpen, setCreditDialogOpen] = React.useState(false);
  const [selectedBalance, setSelectedBalance] = React.useState<{ userId: string; userName: string; userEmail: string } | null>(null);
  const rowsPerPage = 10;
  const { toast } = useToast();

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

  // Credits helpers
  const toCredits = (dollars: number | null | undefined): number => {
    if (dollars === null || dollars === undefined || isNaN(dollars)) return 0;
    return Math.max(0, Math.round(dollars * 100));
  };

  // Filter balances
  const filteredBalances = creditBalances.filter((balance) => {
    if (!filter.trim()) return true;
    
    const searchLower = filter.toLowerCase();
    return (
      balance.userEmail?.toLowerCase().includes(searchLower) ||
      balance.userName?.toLowerCase().includes(searchLower) ||
      balance.userId.toLowerCase().includes(searchLower)
    );
  });

  const paginatedBalances = filteredBalances.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  const totalPages = Math.ceil(filteredBalances.length / rowsPerPage);

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

  const handleAssignCredits = (balance: typeof creditBalances[0]) => {
    setSelectedBalance({
      userId: balance.userId,
      userName: balance.userName || `User ${balance.userId.slice(0, 8)}`,
      userEmail: balance.userEmail || 'Email not available'
    });
    setCreditDialogOpen(true);
  };

  const handleCreditAssignmentSuccess = () => {
    // Refresh credit balances after successful assignment
    refreshCreditBalances();
    toast({
      title: "Success",
      description: "Credits assigned successfully!",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Credit Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading credit balances...</span>
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
            <DollarSign className="h-5 w-5" />
            Credit Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-red-500 mb-2">Error loading credit balances</p>
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
            <DollarSign className="h-5 w-5" />
            Credit Balances ({filteredBalances.length})
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

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Total Credits</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBalances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <User className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {filter ? 'No credit balances found matching your search' : 'No credit balances found'}
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
                          <div className="font-medium">{balance.userName}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono font-semibold text-foreground">
                          {formatCredits(balance.totalPurchased)}
                        </span>
                        <span className="text-xs text-muted-foreground">total purchased</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const total = toCredits(balance.totalPurchased);
                        const used = toCredits(balance.totalUsed);
                        const remaining = toCredits(balance.balanceDollars);
                        const usedPercent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
                        return (
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-2 text-sm">
                              <span className="font-mono font-semibold text-foreground">{used}</span>
                              <span className="text-xs text-muted-foreground">
                                used · {remaining} remaining
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-blue-500"
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssignCredits(balance)}
                        className="p-2"
                        aria-label="Assign Credits"
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
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
              Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, filteredBalances.length)} of {filteredBalances.length} balances
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
            workDescription: '',
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
    </Card>
  );
}

