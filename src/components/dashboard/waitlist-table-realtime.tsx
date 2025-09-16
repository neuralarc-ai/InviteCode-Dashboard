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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Mail, Filter } from 'lucide-react';
import type { WaitlistUser } from '@/lib/types';
import { columns } from './columns';
import { GenerateCodesDialog } from './generate-codes-dialog';
import { useWaitlistUsers } from '@/hooks/use-realtime-data';
import { RefreshProvider } from '@/contexts/refresh-context';
import { useToast } from '@/hooks/use-toast';

export function WaitlistTableRealtime() {
  const { users, loading, error, refreshUsers } = useWaitlistUsers();
  const [filter, setFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [page, setPage] = React.useState(0);
  const [isTestingEmail, setIsTestingEmail] = React.useState(false);
  const rowsPerPage = 10;
  const { toast } = useToast();

  const filteredUsers = users.filter((user) => {
    // Text filter
    const matchesText = Object.values(user).some(
      (value) =>
        typeof value === 'string' &&
        value.toLowerCase().includes(filter.toLowerCase())
    );
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'notified' && user.isNotified) ||
      (statusFilter === 'pending' && !user.isNotified);
    
    return matchesText && matchesStatus;
  });

  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);

  const testEmail = async () => {
    if (!users.length) {
      toast({
        variant: 'destructive',
        title: 'No users',
        description: 'No waitlist users available for testing',
      });
      return;
    }

    const testUser = users[0];
    setIsTestingEmail(true);
    
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: testUser.email }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Test Email Sent!',
          description: `Test email sent to ${testUser.email}`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Email Test Failed',
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send test email',
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
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
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="notified">Notified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <GenerateCodesDialog />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.accessorKey} style={{ width: column.width }}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-destructive">
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
    <RefreshProvider refreshInviteCodes={refreshUsers}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="notified">Notified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={testEmail}
              disabled={isTestingEmail || !users.length}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              {isTestingEmail ? 'Testing...' : 'Test Email'}
            </Button>
            <GenerateCodesDialog />
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.accessorKey} style={{ width: column.width }}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    {columns.map((column) => (
                      <TableCell key={column.accessorKey}>
                        {column.cell ? column.cell({ row: user }) : user[column.accessorKey as keyof WaitlistUser]?.toString()}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
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
        
        {/* Waitlist Count */}
        <div className="text-center text-sm text-muted-foreground">
          Total waitlist entries: <span className="font-semibold text-foreground">{users.length}</span>
          {statusFilter !== 'all' && (
            <span className="ml-2">
              ({statusFilter === 'notified' ? 'Notified' : 'Pending'}: <span className="font-semibold text-foreground">{filteredUsers.length}</span>)
            </span>
          )}
          {filter && (
            <span className="ml-2">
              (Filtered: <span className="font-semibold text-foreground">{filteredUsers.length}</span>)
            </span>
          )}
        </div>
      </div>
    </RefreshProvider>
  );
}
