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
import type { WaitlistUser, UserStatus } from '@/lib/types';
import { sendInviteEmailAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

function SendInviteAction({ user }: { user: WaitlistUser }) {
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleSendInvite = async () => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const result = await sendInviteEmailAction(formData);

    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
  };

  return (
    <>
      <form ref={formRef} action={sendInviteEmailAction} className="hidden">
        <input type="hidden" name="userName" value={user.name} />
        <input type="hidden" name="inviteCode" value={user.code} />
        <input type="hidden" name="email" value={user.email} />
        <input type="hidden" name="companyName" value={user.company} />
      </form>
      <ActionMenuItem onSelect={handleSendInvite}>
        <Send />
        Send Invite
      </ActionMenuItem>
    </>
  );
}

const statusColors: Record<UserStatus, string> = {
  'Not Used': 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
  'Used': 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30',
  'Expired': 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
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
    cell: ({ row }) => <Checkbox aria-label="Select row" />,
  },
  {
    accessorKey: 'name',
    header: 'User',
    width: '250px',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8 text-xs">
          <AvatarFallback>{row.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-muted-foreground text-xs">{row.email}</div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    width: '120px',
    cell: ({ row }) => (
      <Badge variant="outline" className={cn("font-mono text-xs", statusColors[row.status])}>
        {row.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'code',
    header: 'Invite Code',
    width: '150px',
    cell: ({ row }) => <span className="font-mono text-sm">{row.code}</span>,
  },
  {
    accessorKey: 'company',
    header: 'Company',
  },
  {
    accessorKey: 'createdAt',
    header: 'Date Added',
    width: '180px',
    cell: ({ row }) => new Intl.DateTimeFormat('en-US').format(row.createdAt),
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
          <DropdownMenuItem className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"><Trash2 /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
