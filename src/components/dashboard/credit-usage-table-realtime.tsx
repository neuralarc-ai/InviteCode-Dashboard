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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, DollarSign, Calendar, User, Mail, Filter, X, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, MessageSquare, Hash } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import type { CreditUsageGrouped } from '@/lib/types';
import { useCreditUsage } from '@/hooks/use-realtime-data';

export function CreditUsageTableRealtime() {
  const { creditUsage, loading, error } = useCreditUsage();
  const [searchFilter, setSearchFilter] = React.useState('');
  const [minAmount, setMinAmount] = React.useState('');
  const [maxAmount, setMaxAmount] = React.useState('');
  const [usageTypeFilter, setUsageTypeFilter] = React.useState('');
  const [subscriptionTierFilter, setSubscriptionTierFilter] = React.useState('');
  const [sortField, setSortField] = React.useState<'amount' | 'createdAt' | 'usageType' | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [page, setPage] = React.useState(0);
  const rowsPerPage = 10;

  // Helper function to get usage type badge color
  const getUsageTypeColor = (usageType: string) => {
    switch (usageType) {
      case 'token_overage':
        return 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30';
      case 'manual_deduction':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30';
      case 'adjustment':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30';
    }
  };

  // Helper function to format usage type text
  const formatUsageType = (usageType: string) => {
    switch (usageType) {
      case 'token_overage':
        return 'Token Overage';
      case 'manual_deduction':
        return 'Manual Deduction';
      case 'adjustment':
        return 'Adjustment';
      default:
        return usageType;
    }
  };

  const filteredUsage = creditUsage.filter((usage) => {
    // Search filter
    const matchesSearch = !searchFilter || 
      Object.values(usage).some(
        (value) =>
          typeof value === 'string' &&
          value.toLowerCase().includes(searchFilter.toLowerCase())
      ) ||
      usage.usageTypes.some(type => type.toLowerCase().includes(searchFilter.toLowerCase())) ||
      usage.descriptions.some(desc => desc.toLowerCase().includes(searchFilter.toLowerCase()));

    // Amount range filter
    const minAmountNum = minAmount ? parseFloat(minAmount) : 0;
    const maxAmountNum = maxAmount ? parseFloat(maxAmount) : Infinity;
    const matchesAmountRange = usage.totalAmountDollars >= minAmountNum && usage.totalAmountDollars <= maxAmountNum;

    // Usage type filter
    const matchesUsageType = !usageTypeFilter || usageTypeFilter === 'any' || usage.usageTypes.includes(usageTypeFilter);

    // Subscription tier filter
    const matchesSubscriptionTier = !subscriptionTierFilter || subscriptionTierFilter === 'any' || usage.subscriptionTier === subscriptionTierFilter;

    return matchesSearch && matchesAmountRange && matchesUsageType && matchesSubscriptionTier;
  });

  // Sort the filtered usage
  const sortedUsage = React.useMemo(() => {
    if (!sortField) return filteredUsage;

    return [...filteredUsage].sort((a, b) => {
      if (sortField === 'amount') {
        return sortDirection === 'asc' ? a.totalAmountDollars - b.totalAmountDollars : b.totalAmountDollars - a.totalAmountDollars;
      } else if (sortField === 'createdAt') {
        return sortDirection === 'asc' ? a.latestCreatedAt.getTime() - b.latestCreatedAt.getTime() : b.latestCreatedAt.getTime() - a.latestCreatedAt.getTime();
      } else if (sortField === 'usageType') {
        const typeOrder = { 'token_overage': 1, 'manual_deduction': 2, 'adjustment': 3 };
        const orderA = Math.min(...a.usageTypes.map(type => typeOrder[type as keyof typeof typeOrder] || 0));
        const orderB = Math.min(...b.usageTypes.map(type => typeOrder[type as keyof typeof typeOrder] || 0));
        return sortDirection === 'asc' ? orderA - orderB : orderB - orderA;
      }
      return 0;
    });
  }, [filteredUsage, sortField, sortDirection]);

  const paginatedUsage = sortedUsage.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  const totalPages = Math.ceil(sortedUsage.length / rowsPerPage);

  // Clear all filters and sorting
  const clearFilters = () => {
    setSearchFilter('');
    setMinAmount('');
    setMaxAmount('');
    setUsageTypeFilter('');
    setSubscriptionTierFilter('');
    setSortField(null);
    setSortDirection('desc');
    setPage(0);
  };

  // Handle column sorting
  const handleSort = (field: 'amount' | 'createdAt' | 'usageType') => {
    if (sortField === field) {
      // Toggle direction if already sorting by this field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Start sorting by this field
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(0); // Reset to first page when sorting
  };

  // Check if any filters or sorting are active
  const hasActiveFilters = searchFilter || minAmount || maxAmount || usageTypeFilter || subscriptionTierFilter || sortField;

  // Get filter summary text
  const getFilterSummary = () => {
    const filters = [];
    if (minAmount || maxAmount) {
      const min = minAmount ? `$${minAmount}` : '$0';
      const max = maxAmount ? `$${maxAmount}` : '∞';
      filters.push(`Amount: ${min} - ${max}`);
    }
    if (usageTypeFilter && usageTypeFilter !== 'any') {
      filters.push(`Type: ${formatUsageType(usageTypeFilter)}`);
    }
    if (subscriptionTierFilter && subscriptionTierFilter !== 'any') {
      filters.push(`Tier: ${subscriptionTierFilter}`);
    }
    if (sortField) {
      const direction = sortDirection === 'asc' ? '↑' : '↓';
      const fieldNames = { amount: 'Amount', createdAt: 'Date', usageType: 'Type' };
      filters.push(`Sort: ${fieldNames[sortField]} ${direction}`);
    }
    return filters.length > 0 ? filters.join(', ') : 'No filters';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="rounded-md border">
          <div className="h-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search credit usage..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Total Amount ($)</TableHead>
                <TableHead>Usage Types</TableHead>
                <TableHead>Record Count</TableHead>
                <TableHead>Threads</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Subscription Tier</TableHead>
                <TableHead>Latest Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-destructive">
                  Error loading data: {error}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search credit usage..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    !
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Amount Range Filter */}
              <div className="p-3 space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount Range</label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Min $"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="h-8 text-xs"
                      type="number"
                      step="0.01"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      placeholder="Max $"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="h-8 text-xs"
                      type="number"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Usage Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Usage Type</label>
                  <Select value={usageTypeFilter} onValueChange={setUsageTypeFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Any type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any type</SelectItem>
                      <SelectItem value="token_overage">Token Overage</SelectItem>
                      <SelectItem value="manual_deduction">Manual Deduction</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Subscription Tier Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subscription Tier</label>
                  <Select value={subscriptionTierFilter} onValueChange={setSubscriptionTierFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Any tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any tier</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <div className="pt-2 border-t">
                    <Button onClick={clearFilters} variant="outline" size="sm" className="w-full">
                      <X className="h-4 w-4 mr-1" />
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filter Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Active filters:</span>
          <Badge variant="secondary" className="text-xs">
            {getFilterSummary()}
          </Badge>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center gap-1">
                  Total Amount ($)
                  {sortField === 'amount' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )
                  ) : (
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('usageType')}
              >
                <div className="flex items-center gap-1">
                  Usage Types
                  {sortField === 'usageType' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )
                  ) : (
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </TableHead>
              <TableHead>Record Count</TableHead>
              <TableHead>Threads</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Subscription Tier</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center gap-1">
                  Latest Activity
                  {sortField === 'createdAt' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )
                  ) : (
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsage.length > 0 ? (
              paginatedUsage.map((usage) => (
                <TableRow key={usage.userId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{usage.userName}</div>
                        <div className="text-muted-foreground text-xs flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {usage.userEmail}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="font-mono font-semibold text-primary">
                        {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usage.totalAmountDollars)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {usage.usageTypes.map((type, index) => (
                        <Badge 
                          key={index}
                          variant="outline" 
                          className={`font-mono text-xs ${getUsageTypeColor(type)}`}
                        >
                          {formatUsageType(type)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {usage.recordCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Hash className="h-3 w-3" />
                      <span>{usage.threadIds.length} threads</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      <span>{usage.messageIds.length} messages</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {usage.subscriptionTier || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(usage.latestCreatedAt)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No credit usage records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {page + 1} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      </div>
      
      {/* Credit Usage Count */}
      <div className="text-center text-sm text-muted-foreground">
        Total credit usage records: <span className="font-semibold text-foreground">{creditUsage.length}</span>
        {hasActiveFilters && (
          <span className="ml-2">
            (Filtered: <span className="font-semibold text-foreground">{sortedUsage.length}</span>)
          </span>
        )}
      </div>
    </div>
  );
}
