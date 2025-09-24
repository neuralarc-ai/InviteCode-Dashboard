'use client';

import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Copy, Trash2, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { InviteCode } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRefresh } from '@/contexts/refresh-context';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import { ViewInviteCodeDetailsDialog } from './view-invite-code-details-dialog';
import { getRecipientNamesFromEmails } from '@/lib/data';

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

function ViewDetailsAction({ code }: { code: InviteCode }) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleViewDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDialogOpen(true);
  };

  return (
    <>
      <DropdownMenuItem 
        className="gap-2"
        onSelect={(e) => {
          e.preventDefault();
          setIsDialogOpen(true);
        }}
      >
        <Eye />
        View Details
      </DropdownMenuItem>
      <ViewInviteCodeDetailsDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        inviteCode={code}
      />
    </>
  );
}

function DeleteCodeAction({ code }: { code: InviteCode }) {
  const { toast } = useToast();
  const { refreshInviteCodes } = useRefresh();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const handleDeleteCode = async () => {
    if (code.isPreview) {
      toast({
        variant: 'destructive',
        title: 'Cannot delete',
        description: 'Preview codes cannot be deleted',
      });
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/delete-invite-code?id=${code.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete invite code');
      }

      toast({
        title: 'Deleted!',
        description: 'Invite code has been deleted successfully',
      });

      // Refresh the invite codes list
      await refreshInviteCodes();
    } catch (error) {
      console.error('Error deleting invite code:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete invite code',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  return (
    <>
      <DropdownMenuItem 
        className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
        onSelect={(e) => {
          e.preventDefault();
          setShowDeleteDialog(true);
        }}
      >
        <Trash2 />
        Delete
      </DropdownMenuItem>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invite Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the invite code <strong>{code.code}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCode}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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

// Component to display recipient names
function RecipientNames({ emails }: { emails: string[] }) {
  const [recipientNames, setRecipientNames] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchNames = async () => {
      if (emails.length === 0) {
        setIsLoading(false);
        return;
      }
      
      try {
        const names = await getRecipientNamesFromEmails(emails);
        setRecipientNames(names);
      } catch (error) {
        console.error('Error fetching recipient names:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNames();
  }, [emails]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (emails.length === 0) {
    return <span className="text-muted-foreground text-xs">No recipients</span>;
  }

  return (
    <div className="space-y-1">
      {emails.map((email, index) => {
        const name = recipientNames[email];
        return (
          <div key={index} className="text-xs">
            {name ? (
              <div className="font-medium">{name}</div>
            ) : (
              <div className="text-muted-foreground truncate" title={email}>
                {email}
              </div>
            )}
          </div>
        );
      })}
      <div className="text-xs text-muted-foreground">
        {emails.length} recipient{emails.length > 1 ? 's' : ''}
      </div>
    </div>
  );
}

interface ColumnDefinition {
    accessorKey: keyof InviteCode | 'actions' | 'select' | 'status' | 'recipients';
    header: string;
    width?: string;
    cell?: ({ row }: { row: InviteCode }) => React.ReactNode;
}

interface InviteCodeColumnsProps {
  selectedCodes: string[];
  onSelectionChange: (selectedCodes: string[]) => void;
}

export const getInviteCodeColumns = ({ selectedCodes, onSelectionChange }: InviteCodeColumnsProps): ColumnDefinition[] => [
  {
    accessorKey: 'select',
    header: '',
    width: '40px',
    cell: ({ row }) => (
      <Checkbox 
        aria-label="Select row"
        checked={selectedCodes.includes(row.id)}
        onCheckedChange={(checked) => {
          if (checked) {
            onSelectionChange([...selectedCodes, row.id]);
          } else {
            onSelectionChange(selectedCodes.filter(id => id !== row.id));
          }
        }}
      />
    ),
  },
  {
    accessorKey: 'code',
    header: 'Code',
    width: '150px',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-medium">{row.code}</span>
        {row.isPreview && (
          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
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
    accessorKey: 'recipients',
    header: 'Recipients',
    width: '200px',
    cell: ({ row }) => (
      <div className="text-sm">
        <RecipientNames emails={row.emailSentTo} />
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
          <ViewDetailsAction code={row} />
          <DeleteCodeAction code={row} />
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

// Export the old columns for backward compatibility
export const inviteCodeColumns = getInviteCodeColumns({ selectedCodes: [], onSelectionChange: () => {} });
