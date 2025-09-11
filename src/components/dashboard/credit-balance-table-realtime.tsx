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
import { Search, CreditCard, DollarSign, Calendar, User, Mail } from 'lucide-react';
import type { CreditBalance } from '@/lib/types';
import { useCreditBalances } from '@/hooks/use-realtime-data';
import { supabase } from '@/lib/supabase';

export function CreditBalanceTableRealtime() {
  const { creditBalances, loading, error } = useCreditBalances();
  const [filter, setFilter] = React.useState('');
  const [page, setPage] = React.useState(0);
  const rowsPerPage = 10;


  const filteredBalances = creditBalances.filter((balance) =>
    Object.values(balance).some(
      (value) =>
        typeof value === 'string' &&
        value.toLowerCase().includes(filter.toLowerCase())
    )
  );

  const paginatedBalances = filteredBalances.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  const totalPages = Math.ceil(filteredBalances.length / rowsPerPage);

  const getStatusColor = (balanceDollars: number) => {
    if (balanceDollars > 1000) {
      return 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30';
    } else if (balanceDollars > 100) {
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30';
    } else {
      return 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30';
    }
  };

  const getStatusText = (balanceDollars: number) => {
    if (balanceDollars > 1000) {
      return 'High';
    } else if (balanceDollars > 100) {
      return 'Medium';
    } else {
      return 'Low';
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
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
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
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search credit balances..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={addSampleData} variant="outline" size="sm">
          Add Sample Data
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Balance ($)</TableHead>
              <TableHead>Total Purchased ($)</TableHead>
              <TableHead>Total Used ($)</TableHead>
              <TableHead>Status</TableHead>
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
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="font-mono font-semibold text-green-500">
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
        {filter && (
          <span className="ml-2">
            (Filtered: <span className="font-semibold text-foreground">{filteredBalances.length}</span>)
          </span>
        )}
      </div>
    </div>
  );
}
