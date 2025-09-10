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
import { Search } from 'lucide-react';
import { useInviteCodes } from '@/hooks/use-realtime-data';
import { usePreviewCodes } from '@/contexts/preview-codes-context';
import type { InviteCode } from '@/lib/types';
import { inviteCodeColumns } from './invite-code-columns';
import { GenerateCodesDialog } from './generate-codes-dialog';

export function InviteCodesTableRealtime() {
  const { codes, loading, error } = useInviteCodes();
  const { previewCodes, clearPreviewCodes } = usePreviewCodes();
  const [filter, setFilter] = React.useState('');
  const [page, setPage] = React.useState(0);
  const rowsPerPage = 10;

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

  const filteredCodes = allCodes.filter((code) =>
    Object.values(code).some(
      (value) =>
        typeof value === 'string' &&
        value.toLowerCase().includes(filter.toLowerCase())
    )
  );

  const paginatedCodes = filteredCodes.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  const totalPages = Math.ceil(filteredCodes.length / rowsPerPage);

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
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invite codes..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9"
            />
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invite codes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
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
            {paginatedCodes.length > 0 ? (
              paginatedCodes.map((code) => (
                <TableRow key={code.id}>
                  {inviteCodeColumns.map((column) => (
                    <TableCell key={column.accessorKey}>
                      {column.cell ? column.cell({ row: code }) : code[column.accessorKey as keyof InviteCode]?.toString()}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={inviteCodeColumns.length} className="h-24 text-center">
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
  );
}
