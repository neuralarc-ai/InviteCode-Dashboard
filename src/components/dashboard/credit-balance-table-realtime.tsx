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
import { Search, CreditCard, DollarSign, Calendar, User, Mail, Filter, X, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import type { CreditBalance } from '@/lib/types';
import { useCreditBalances } from '@/hooks/use-realtime-data';
import { supabase } from '@/lib/supabase';

export function CreditBalanceTableRealtime() {
  const { creditBalances, loading, error } = useCreditBalances();
  const [searchFilter, setSearchFilter] = React.useState('');
  const [minBalance, setMinBalance] = React.useState('');
  const [maxBalance, setMaxBalance] = React.useState('');
  const [recentlyUsedFilter, setRecentlyUsedFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [sortField, setSortField] = React.useState<'status' | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [page, setPage] = React.useState(0);
  const rowsPerPage = 10;

  // Helper function to get status text based on balance
  const getStatusText = (balanceDollars: number) => {
    if (balanceDollars > 1000) {
      return 'High';
    } else if (balanceDollars > 100) {
      return 'Medium';
    } else {
      return 'Low';
    }
  };

  // Helper function to check if balance was recently used
  const isRecentlyUsed = (lastUpdated: Date, period: string) => {
    const now = new Date();
    const diffInMs = now.getTime() - lastUpdated.getTime();
    
    switch (period) {
      case '1day':
        return diffInMs <= 24 * 60 * 60 * 1000;
      case '7days':
        return diffInMs <= 7 * 24 * 60 * 60 * 1000;
      case '30days':
        return diffInMs <= 30 * 24 * 60 * 60 * 1000;
      case '90days':
        return diffInMs <= 90 * 24 * 60 * 60 * 1000;
      default:
        return true;
    }
  };

  const filteredBalances = creditBalances.filter((balance) => {
    // Search filter
    const matchesSearch = !searchFilter || 
      Object.values(balance).some(
        (value) =>
          typeof value === 'string' &&
          value.toLowerCase().includes(searchFilter.toLowerCase())
      );

    // Balance range filter
    const minBalanceNum = minBalance ? parseFloat(minBalance) : 0;
    const maxBalanceNum = maxBalance ? parseFloat(maxBalance) : Infinity;
    const matchesBalanceRange = balance.balanceDollars >= minBalanceNum && balance.balanceDollars <= maxBalanceNum;

    // Recently used filter
    const matchesRecentlyUsed = !recentlyUsedFilter || recentlyUsedFilter === 'any' || isRecentlyUsed(balance.lastUpdated, recentlyUsedFilter);

    // Status filter
    const matchesStatus = !statusFilter || statusFilter === 'any' || getStatusText(balance.balanceDollars).toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesBalanceRange && matchesRecentlyUsed && matchesStatus;
  });

  // Sort the filtered balances
  const sortedBalances = React.useMemo(() => {
    if (!sortField) return filteredBalances;

    return [...filteredBalances].sort((a, b) => {
      if (sortField === 'status') {
        const statusA = getStatusText(a.balanceDollars);
        const statusB = getStatusText(b.balanceDollars);
        
        // Define status order: High > Medium > Low
        const statusOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
        const orderA = statusOrder[statusA as keyof typeof statusOrder];
        const orderB = statusOrder[statusB as keyof typeof statusOrder];
        
        if (sortDirection === 'asc') {
          return orderA - orderB;
        } else {
          return orderB - orderA;
        }
      }
      return 0;
    });
  }, [filteredBalances, sortField, sortDirection]);

  const paginatedBalances = sortedBalances.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  const totalPages = Math.ceil(sortedBalances.length / rowsPerPage);

  // Clear all filters and sorting
  const clearFilters = () => {
    setSearchFilter('');
    setMinBalance('');
    setMaxBalance('');
    setRecentlyUsedFilter('');
    setStatusFilter('');
    setSortField(null);
    setSortDirection('asc');
    setPage(0);
  };

  // Handle status column sorting
  const handleStatusSort = () => {
    if (sortField === 'status') {
      // Toggle direction if already sorting by status
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Start sorting by status
      setSortField('status');
      setSortDirection('asc');
    }
    setPage(0); // Reset to first page when sorting
  };

  // Check if any filters or sorting are active
  const hasActiveFilters = searchFilter || minBalance || maxBalance || recentlyUsedFilter || statusFilter || sortField;

  // Get filter summary text
  const getFilterSummary = () => {
    const filters = [];
    if (minBalance || maxBalance) {
      const min = minBalance ? `$${minBalance}` : '$0';
      const max = maxBalance ? `$${maxBalance}` : '∞';
      filters.push(`Balance: ${min} - ${max}`);
    }
    if (recentlyUsedFilter && recentlyUsedFilter !== 'any') {
      const periodMap = {
        '1day': 'Last 24 hours',
        '7days': 'Last 7 days',
        '30days': 'Last 30 days',
        '90days': 'Last 90 days'
      };
      filters.push(`Used: ${periodMap[recentlyUsedFilter as keyof typeof periodMap]}`);
    }
    if (statusFilter && statusFilter !== 'any') {
      filters.push(`Status: ${statusFilter}`);
    }
    if (sortField) {
      const direction = sortDirection === 'asc' ? '↑' : '↓';
      filters.push(`Sort: ${sortField} ${direction}`);
    }
    return filters.length > 0 ? filters.join(', ') : 'No filters';
  };

  const getStatusColor = (balanceDollars: number) => {
    if (balanceDollars > 1000) {
      return 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30';
    } else if (balanceDollars > 100) {
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30';
    } else {
      return 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30';
    }
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
              placeholder="Search credit balances..."
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
                <TableHead>Balance ($)</TableHead>
                <TableHead>Total Purchased ($)</TableHead>
                <TableHead>Total Used ($)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-destructive">
                  Error loading data: {error}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  const addSampleData = async () => {
    try {
      console.log('Adding sample data...');
      
      // Sample data to insert
      const sampleData = [
        {
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          balance_dollars: 1500.50,
          total_purchased: 2000.00,
          total_used: 499.50,
          metadata: { source: 'signup_bonus', tier: 'premium' }
        },
        {
          user_id: '550e8400-e29b-41d4-a716-446655440002',
          balance_dollars: 750.25,
          total_purchased: 1000.00,
          total_used: 249.75,
          metadata: { source: 'referral', tier: 'standard' }
        },
        {
          user_id: '550e8400-e29b-41d4-a716-446655440003',
          balance_dollars: 0.00,
          total_purchased: 500.00,
          total_used: 500.00,
          metadata: { source: 'trial', tier: 'basic', expired: true }
        },
        {
          user_id: '550e8400-e29b-41d4-a716-446655440004',
          balance_dollars: 2000.00,
          total_purchased: 2000.00,
          total_used: 0.00,
          metadata: { source: 'purchase', tier: 'premium', payment_method: 'stripe' }
        },
        {
          user_id: '550e8400-e29b-41d4-a716-446655440005',
          balance_dollars: 300.75,
          total_purchased: 800.00,
          total_used: 499.25,
          metadata: { source: 'gift', tier: 'standard', gift_from: 'admin' }
        }
      ];

      const { data, error } = await supabase
        .from('credit_balance')
        .insert(sampleData);
      
      if (error) {
        console.error('Error inserting sample data:', error);
        alert('Error adding sample data: ' + error.message);
      } else {
        console.log('Sample data inserted successfully:', data);
        alert('Sample data added successfully! The table should now show 5 records.');
      }
    } catch (err) {
      console.error('Error adding sample data:', err);
      alert('Error adding sample data: ' + err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search credit balances..."
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
              
              {/* Balance Range Filter */}
              <div className="p-3 space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Balance Range</label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Min $"
                      value={minBalance}
                      onChange={(e) => setMinBalance(e.target.value)}
                      className="h-8 text-xs"
                      type="number"
                      step="0.01"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      placeholder="Max $"
                      value={maxBalance}
                      onChange={(e) => setMaxBalance(e.target.value)}
                      className="h-8 text-xs"
                      type="number"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Recently Used Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recently Used</label>
                  <Select value={recentlyUsedFilter} onValueChange={setRecentlyUsedFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Any time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any time</SelectItem>
                      <SelectItem value="1day">Last 24 hours</SelectItem>
                      <SelectItem value="7days">Last 7 days</SelectItem>
                      <SelectItem value="30days">Last 30 days</SelectItem>
                      <SelectItem value="90days">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Any status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any status</SelectItem>
                      <SelectItem value="high">High (&gt;$1000)</SelectItem>
                      <SelectItem value="medium">Medium ($100-$1000)</SelectItem>
                      <SelectItem value="low">Low (&lt;$100)</SelectItem>
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

          <Button onClick={addSampleData} variant="outline" size="sm">
            Add Sample Data
          </Button>
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
                <TableHead>Name</TableHead>
                <TableHead>Balance ($)</TableHead>
                <TableHead>Total Purchased ($)</TableHead>
                <TableHead>Total Used ($)</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={handleStatusSort}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortField === 'status' ? (
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
                <TableHead>Last Updated</TableHead>
                <TableHead>Metadata</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedBalances.length > 0 ? (
              paginatedBalances.map((balance) => (
                <TableRow key={balance.userId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{balance.userName}</div>
                        <div className="text-muted-foreground text-xs flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {balance.userEmail}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{balance.userName || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="font-mono font-semibold text-primary">
                        {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balance.balanceDollars)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balance.totalPurchased)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balance.totalUsed)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`font-mono text-xs ${getStatusColor(balance.balanceDollars)}`}
                    >
                      {getStatusText(balance.balanceDollars)}
                    </Badge>
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
                      }).format(balance.lastUpdated)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {Object.keys(balance.metadata).length > 0 
                        ? `${Object.keys(balance.metadata).length} items` 
                        : 'Empty'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No credit balance records found.
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
      
      {/* Credit Balance Count */}
      <div className="text-center text-sm text-muted-foreground">
        Total credit balance records: <span className="font-semibold text-foreground">{creditBalances.length}</span>
        {hasActiveFilters && (
          <span className="ml-2">
            (Filtered: <span className="font-semibold text-foreground">{sortedBalances.length}</span>)
          </span>
        )}
      </div>
    </div>
  );
}
