'use client';

import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Send, Trash2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { WaitlistUser } from '@/lib/types';
import { deleteWaitlistUserAction, sendInviteEmailAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useRefresh } from '@/contexts/refresh-context';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '../ui/checkbox';
import { GenerateCodesDialog } from './generate-codes-dialog';

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

function SendInviteAction({ user }: { user: WaitlistUser }) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleSendInvite = () => {
    setIsDialogOpen(true);
  };

  return (
    <>
      <ActionMenuItem onSelect={handleSendInvite}>
        <Send />
        Send Invite
      </ActionMenuItem>
      <GenerateCodesDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        prefilledEmail={user.email}
        prefilledName={user.fullName}
        userId={user.id}
        userName={user.fullName}
        companyName={user.company || undefined}
      />
    </>
  );
}

function DeleteWaitlistAction({ user }: { user: WaitlistUser }) {
  const { toast } = useToast();
  const { refreshInviteCodes: refreshUsers } = useRefresh();
  const [isPending, startTransition] = React.useTransition();

  const onDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('userId', user.id);
      const result = await deleteWaitlistUserAction(formData);
      if (result.success) {
        toast({ title: 'Deleted', description: result.message });
        await refreshUsers();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  return (
    <DropdownMenuItem
      onSelect={onDelete}
      disabled={isPending}
      className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
    >
      <Trash2 /> Delete
    </DropdownMenuItem>
  );
}

const notificationColors = {
  true: 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30',
  false: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
};

interface ColumnDefinition {
    accessorKey: keyof WaitlistUser | 'actions' | 'select';
    header: string;
    width?: string;
    cell?: ({ row }: { row: WaitlistUser }) => React.ReactNode;
}

export const columns: ColumnDefinition[] = [
  {
    accessorKey: 'select',
    header: '',
    width: '40px',
    cell: ({ row }) => (
      <Checkbox aria-label="Select row" checked={row.isNotified} disabled />
    ),
  },
  {
    accessorKey: 'fullName',
    header: 'User',
    width: '250px',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8 text-xs">
          <AvatarFallback>{row.fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{row.fullName}</div>
          <div className="text-muted-foreground text-xs">{row.email}</div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'isNotified',
    header: 'Status',
    width: '120px',
    cell: ({ row }) => {
      const colorKey = row.isNotified ? 'true' : 'false';
      return (
        <Badge variant="outline" className={cn("font-mono text-xs", notificationColors[colorKey])}>
          {row.isNotified ? 'Notified' : 'Pending'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'phoneNumber',
    header: 'Phone',
    width: '150px',
    cell: ({ row }) => <span className="font-mono text-sm">{row.countryCode} {row.phoneNumber}</span>,
  },
  {
    accessorKey: 'company',
    header: 'Company',
    cell: ({ row }) => <span className="text-sm">{row.company || 'N/A'}</span>,
  },
  {
    accessorKey: 'referralSource',
    header: 'Source',
    width: '120px',
    cell: ({ row }) => <span className="text-sm">{row.referralSource || 'N/A'}</span>,
  },
  {
    accessorKey: 'reference',
    header: 'Reference',
    width: '150px',
    cell: ({ row }) => <span className="text-sm">{row.reference || 'N/A'}</span>,
  },
  {
    accessorKey: 'joinedAt',
    header: 'Date Added',
    width: '180px',
    cell: ({ row }) => new Intl.DateTimeFormat('en-US').format(row.joinedAt),
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
          <SendInviteAction user={row} />
          <DropdownMenuItem className="gap-2"><User /> View Details</DropdownMenuItem>
          <DeleteWaitlistAction user={row} />
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
