'use client';

import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Copy, Trash2, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { InviteCode } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';

function ActionMenuItem({
  children,
  onSelect,
}: {
  children: React.ReactNode;
  onSelect: () => void;
}) {
  const [isPending, startTransition] = React.useTransition();
  return (
    <DropdownMenuItem
      onSelect={() => startTransition(onSelect)}
      disabled={isPending}
      className="gap-2"
    >
      {children}
    </DropdownMenuItem>
  );
}

function CopyCodeAction({ code }: { code: string }) {
  const { toast } = useToast();

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: 'Copied!',
        description: 'Invite code copied to clipboard',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy code',
      });
    }
  };

  return (
    <ActionMenuItem onSelect={handleCopyCode}>
      <Copy />
      Copy Code
    </ActionMenuItem>
  );
}

const statusColors = {
  true: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
  false: 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30',
};

const getStatusText = (code: InviteCode) => {
  if (code.isUsed) return 'Used';
  if (code.expiresAt && new Date(code.expiresAt) < new Date()) return 'Expired';
  return 'Active';
};

const getStatusColor = (code: InviteCode) => {
  if (code.isUsed) return statusColors.true;
  if (code.expiresAt && new Date(code.expiresAt) < new Date()) return statusColors.true;
  return statusColors.false;
};

interface ColumnDefinition {
    accessorKey: keyof InviteCode | 'actions' | 'select' | 'status';
    header: string;
    width?: string;
    cell?: ({ row }: { row: InviteCode }) => React.ReactNode;
}

export const inviteCodeColumns: ColumnDefinition[] = [
  {
    accessorKey: 'select',
    header: '',
    width: '40px',
    cell: ({ row }) => <Checkbox aria-label="Select row" />,
  },
  {
    accessorKey: 'code',
    header: 'Code',
    width: '150px',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-medium">{row.code}</span>
        {row.isPreview && (
          <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
            Preview
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    width: '120px',
    cell: ({ row }) => {
      const statusText = getStatusText(row);
      const statusColor = getStatusColor(row);
      return (
        <Badge variant="outline" className={cn("font-mono text-xs", statusColor)}>
          {statusText}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'currentUses',
    header: 'Usage',
    width: '100px',
    cell: ({ row }) => (
      <div className="text-sm">
        <span className="font-medium">{row.currentUses}</span>
        <span className="text-muted-foreground">/{row.maxUses}</span>
      </div>
    ),
  },
  {
    accessorKey: 'emailSentTo',
    header: 'Emails Sent',
    width: '200px',
    cell: ({ row }) => (
      <div className="text-sm">
        {row.emailSentTo.length > 0 ? (
          <div className="space-y-1">
            {row.emailSentTo.map((email, index) => (
              <div key={index} className="text-xs text-muted-foreground truncate" title={email}>
                {email}
              </div>
            ))}
            <div className="text-xs text-muted-foreground">
              {row.emailSentTo.length} email{row.emailSentTo.length > 1 ? 's' : ''}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">No emails sent</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    width: '150px',
    cell: ({ row }) => (
      <div className="text-sm">
        {new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(row.createdAt)}
      </div>
    ),
  },
  {
    accessorKey: 'expiresAt',
    header: 'Expires',
    width: '150px',
    cell: ({ row }) => (
      <div className="text-sm">
        {row.expiresAt ? (
          new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(row.expiresAt)
        ) : (
          <span className="text-muted-foreground">Never</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'usedAt',
    header: 'Used At',
    width: '150px',
    cell: ({ row }) => (
      <div className="text-sm">
        {row.usedAt ? (
          new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(row.usedAt)
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'actions',
    header: '',
    width: '50px',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <CopyCodeAction code={row.code} />
          <DropdownMenuItem className="gap-2"><Eye /> View Details</DropdownMenuItem>
          <DropdownMenuItem className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"><Trash2 /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
