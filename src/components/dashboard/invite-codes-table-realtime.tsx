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
import { Search, Filter, Trash2, CheckSquare, Square } from 'lucide-react';
import { useInviteCodes } from '@/hooks/use-realtime-data';
import { usePreviewCodes } from '@/contexts/preview-codes-context';
import { RefreshProvider } from '@/contexts/refresh-context';
import type { InviteCode } from '@/lib/types';
import { getInviteCodeColumns } from './invite-code-columns';
import { GenerateCodesDialog } from './generate-codes-dialog';
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

export function InviteCodesTableRealtime() {
  const { codes, loading, error, refreshCodes } = useInviteCodes();
  const { previewCodes, clearPreviewCodes } = usePreviewCodes();
  const [filter, setFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [page, setPage] = React.useState(0);
  const [selectedCodes, setSelectedCodes] = React.useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const rowsPerPage = 10;
  const { toast } = useToast();

  // Helper function to get invite code status
  const getInviteCodeStatus = (code: InviteCode): string => {
    if (code.isUsed) return 'used';
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) return 'expired';
    return 'active';
  };

  // Remove preview codes that now exist in the database
  React.useEffect(() => {
    if (codes.length > 0 && previewCodes.length > 0) {
      const databaseCodes = codes.map(code => code.code);
      const hasDatabaseMatches = previewCodes.some(preview => 
        databaseCodes.includes(preview.code)
      );
      
      if (hasDatabaseMatches) {
        // Clear all preview codes since at least one is now in the database
        clearPreviewCodes();
      }
    }
  }, [codes, previewCodes, clearPreviewCodes]);

  // Combine database codes with preview codes
  const allCodes: InviteCode[] = React.useMemo(() => {
    const previewCodesAsInviteCodes: InviteCode[] = previewCodes.map((preview, index) => ({
      id: `preview-${index}`,
      code: preview.code,
      isUsed: false,
      usedBy: null,
      usedAt: null,
      createdAt: new Date(),
      expiresAt: null,
      maxUses: preview.maxUses,
      currentUses: 0,
      emailSentTo: preview.emailSentTo || [],
      isPreview: true,
    }));

    return [...previewCodesAsInviteCodes, ...codes];
  }, [codes, previewCodes]);

  const filteredCodes = allCodes.filter((code) => {
    // Text filter
    const matchesText = Object.values(code).some(
      (value) =>
        typeof value === 'string' &&
        value.toLowerCase().includes(filter.toLowerCase())
    );
    
    // Status filter
    const codeStatus = getInviteCodeStatus(code);
    const matchesStatus = statusFilter === 'all' || codeStatus === statusFilter;
    
    return matchesText && matchesStatus;
  });

  const paginatedCodes = filteredCodes.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  const totalPages = Math.ceil(filteredCodes.length / rowsPerPage);

  // Get columns with selection functionality
  const columns = React.useMemo(() => 
    getInviteCodeColumns({ 
      selectedCodes, 
      onSelectionChange: setSelectedCodes 
    }), 
    [selectedCodes]
  );

  // Select all functionality
  const handleSelectAll = () => {
    if (selectedCodes.length === paginatedCodes.length) {
      setSelectedCodes([]);
    } else {
      setSelectedCodes(paginatedCodes.map(code => code.id));
    }
  };

  // Bulk delete functionality
  const handleBulkDelete = async () => {
    if (selectedCodes.length === 0) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/bulk-delete-invite-codes?ids=${selectedCodes.join(',')}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Deleted!',
          description: result.message,
        });
        setSelectedCodes([]);
        await refreshCodes();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Error deleting invite codes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete invite codes',
      });
    } finally {
      setIsDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };

  // Clear selection when page changes
  React.useEffect(() => {
    setSelectedCodes([]);
  }, [page]);

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
                placeholder="Search invite codes..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <GenerateCodesDialog />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {inviteCodeColumns.map((column) => (
                  <TableHead key={column.accessorKey} style={{ width: column.width }}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={inviteCodeColumns.length} className="h-24 text-center text-destructive">
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
    <RefreshProvider refreshInviteCodes={refreshCodes}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invite codes..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            {selectedCodes.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setShowBulkDeleteDialog(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({selectedCodes.length})
              </Button>
            )}
            <GenerateCodesDialog />
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="h-8 w-8 p-0"
                  >
                    {selectedCodes.length === paginatedCodes.length && paginatedCodes.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                {columns.slice(1).map((column) => (
                  <TableHead key={column.accessorKey} style={{ width: column.width }}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCodes.length > 0 ? (
                paginatedCodes.map((code) => (
                  <TableRow key={code.id}>
                    {columns.map((column) => (
                      <TableCell key={column.accessorKey}>
                        {column.cell ? column.cell({ row: code }) : code[column.accessorKey as keyof InviteCode]?.toString()}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No invite codes found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {paginatedCodes.length} of {filteredCodes.length} codes
            {statusFilter !== 'all' && (
              <span className="ml-2">
                ({statusFilter === 'active' ? 'Active' : statusFilter === 'used' ? 'Used' : 'Expired'}: {filteredCodes.length})
              </span>
            )}
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
      </div>
      
      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Invite Codes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCodes.length} invite code{selectedCodes.length > 1 ? 's' : ''}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RefreshProvider>
  );
}
