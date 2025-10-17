'use client';

import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { MoreHorizontal, Copy, Trash2, Eye, ChevronUp, ChevronDown, Mail, Archive, ArchiveRestore } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { InviteCode } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRefresh } from '@/contexts/refresh-context';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import { ViewInviteCodeDetailsDialog } from './view-invite-code-details-dialog';

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

function SendReminderAction({ code }: { code: InviteCode }) {
  const { toast } = useToast();
  const { refreshInviteCodes } = useRefresh();
  const [isSending, setIsSending] = React.useState(false);

  const handleSendReminder = async () => {
    if (code.isPreview) {
      toast({
        variant: 'destructive',
        title: 'Cannot send reminder',
        description: 'Preview codes cannot have reminder emails sent',
      });
      return;
    }

    if (code.isUsed) {
      toast({
        variant: 'destructive',
        title: 'Cannot send reminder',
        description: 'This invite code has already been used',
      });
      return;
    }

    if (code.emailSentTo.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot send reminder',
        description: 'No email addresses found for this invite code',
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/send-reminder-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codeId: code.id,
          code: code.code,
          emails: code.emailSentTo,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Reminder sent!',
          description: `Reminder email sent to ${code.emailSentTo.length} recipient${code.emailSentTo.length > 1 ? 's' : ''}`,
        });
        // Refresh the invite codes list to show updated reminder status
        await refreshInviteCodes();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message || 'Failed to send reminder email',
        });
      }
    } catch (error) {
      console.error('Error sending reminder email:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send reminder email',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ActionMenuItem onSelect={handleSendReminder}>
      <Mail />
      {isSending ? 'Sending...' : 'Send Reminder'}
    </ActionMenuItem>
  );
}

function ArchiveCodeAction({ code }: { code: InviteCode }) {
  const { toast } = useToast();
  const { refreshInviteCodes } = useRefresh();
  const [isArchiving, setIsArchiving] = React.useState(false);

  const handleArchiveCode = async () => {
    if (code.isPreview) {
      toast({
        variant: 'destructive',
        title: 'Cannot archive',
        description: 'Preview codes cannot be archived',
      });
      return;
    }

    setIsArchiving(true);
    try {
      const response = await fetch('/api/archive-invite-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: code.id }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Archived!',
          description: 'Invite code has been archived successfully',
        });
        await refreshInviteCodes();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message || 'Failed to archive invite code',
        });
      }
    } catch (error) {
      console.error('Error archiving invite code:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to archive invite code',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <ActionMenuItem onSelect={handleArchiveCode}>
      <Archive />
      {isArchiving ? 'Archiving...' : 'Archive'}
    </ActionMenuItem>
  );
}

function UnarchiveCodeAction({ code }: { code: InviteCode }) {
  const { toast } = useToast();
  const { refreshInviteCodes } = useRefresh();
  const [isUnarchiving, setIsUnarchiving] = React.useState(false);

  const handleUnarchiveCode = async () => {
    if (code.isPreview) {
      toast({
        variant: 'destructive',
        title: 'Cannot unarchive',
        description: 'Preview codes cannot be unarchived',
      });
      return;
    }

    setIsUnarchiving(true);
    try {
      const response = await fetch('/api/unarchive-invite-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: code.id }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Unarchived!',
          description: 'Invite code has been unarchived successfully',
        });
        await refreshInviteCodes();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message || 'Failed to unarchive invite code',
        });
      }
    } catch (error) {
      console.error('Error unarchiving invite code:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to unarchive invite code',
      });
    } finally {
      setIsUnarchiving(false);
    }
  };

  return (
    <ActionMenuItem onSelect={handleUnarchiveCode}>
      <ArchiveRestore />
      {isUnarchiving ? 'Unarchiving...' : 'Unarchive'}
    </ActionMenuItem>
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
  if (emails.length === 0) {
    return <span className="text-muted-foreground text-xs">No recipients</span>;
  }

  return (
    <div className="space-y-1">
      {emails.map((email, index) => (
        <div key={index} className="text-xs">
          <div className="text-muted-foreground truncate" title={email}>
            {email}
          </div>
        </div>
      ))}
      <div className="text-xs text-muted-foreground">
        {emails.length} recipient{emails.length > 1 ? 's' : ''}
      </div>
    </div>
  );
}

interface ColumnDefinition {
    accessorKey: keyof InviteCode | 'actions' | 'select' | 'status' | 'recipients';
    header: string | React.ReactNode;
    width?: string;
    cell?: ({ row }: { row: InviteCode }) => React.ReactNode;
    sortable?: boolean;
}

// Helper function to create sortable headers
const createSortableHeader = (
  label: string, 
  field: keyof InviteCode, 
  sortField?: keyof InviteCode, 
  sortDirection?: 'asc' | 'desc', 
  onSort?: (field: keyof InviteCode) => void
) => {
  if (!onSort) return label;
  
  const isActive = sortField === field;
  
  return (
    <Button
      variant="ghost"
      className="h-auto p-0 font-medium hover:bg-transparent"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && (
          sortDirection === 'asc' ? 
            <ChevronUp className="h-4 w-4" /> : 
            <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </Button>
  );
};

interface InviteCodeColumnsProps {
  selectedCodes: string[];
  onSelectionChange: (selectedCodes: string[]) => void;
  sortField?: keyof InviteCode;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: keyof InviteCode) => void;
}

export const getInviteCodeColumns = ({ 
  selectedCodes, 
  onSelectionChange, 
  sortField, 
  sortDirection, 
  onSort 
}: InviteCodeColumnsProps): ColumnDefinition[] => [
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
    header: createSortableHeader('Code', 'code', sortField, sortDirection, onSort),
    width: '150px',
    sortable: true,
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
    header: createSortableHeader('Usage', 'currentUses', sortField, sortDirection, onSort),
    width: '100px',
    sortable: true,
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
    accessorKey: 'reminderSentAt',
    header: createSortableHeader('Reminder Sent', 'reminderSentAt', sortField, sortDirection, onSort),
    width: '150px',
    sortable: true,
    cell: ({ row }) => (
      <div className="text-sm">
        {row.reminderSentAt ? (
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">
              Sent
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
              }).format(row.reminderSentAt)}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">Not sent</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: createSortableHeader('Created', 'createdAt', sortField, sortDirection, onSort),
    width: '150px',
    sortable: true,
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
    header: createSortableHeader('Expires', 'expiresAt', sortField, sortDirection, onSort),
    width: '150px',
    sortable: true,
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
    header: createSortableHeader('Used At', 'usedAt', sortField, sortDirection, onSort),
    width: '150px',
    sortable: true,
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
          {!row.isArchived && <SendReminderAction code={row} />}
          <DropdownMenuSeparator />
          {row.isArchived ? (
            <UnarchiveCodeAction code={row} />
          ) : (
            <ArchiveCodeAction code={row} />
          )}
          <DeleteCodeAction code={row} />
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

// Export the old columns for backward compatibility
export const inviteCodeColumns = getInviteCodeColumns({ selectedCodes: [], onSelectionChange: () => {} });
