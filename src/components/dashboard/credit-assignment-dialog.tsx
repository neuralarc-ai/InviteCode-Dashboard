'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';

interface CreditAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onSuccess?: () => void;
}

export function CreditAssignmentDialog({
  open,
  onOpenChange,
  user,
  onSuccess
}: CreditAssignmentDialogProps) {
  const [creditsToAdd, setCreditsToAdd] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  // Reset form when dialog opens/closes or user changes
  React.useEffect(() => {
    if (open) {
      setCreditsToAdd('');
      setNotes('');
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "No user selected",
        variant: "destructive",
      });
      return;
    }

    const credits = parseInt(creditsToAdd);
    if (isNaN(credits) || credits <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number of credits",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/credit-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.userId,
          creditsToAdd: credits,
          notes: notes.trim() || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to assign credits",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error assigning credits:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while assigning credits",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Assign Credits
          </DialogTitle>
          <DialogDescription>
            Add credit dollars to {user?.fullName}'s account. This will increase their current balance.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-info">User</Label>
            <div id="user-info" className="p-3 bg-muted rounded-md">
              <div className="font-medium">{user?.fullName}</div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
              {user?.preferredName && user.preferredName !== user.fullName && (
                <div className="text-sm text-muted-foreground">({user.preferredName})</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="credits">Credit Amount ($) *</Label>
            <Input
              id="credits"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Enter dollar amount"
              value={creditsToAdd}
              onChange={(e) => setCreditsToAdd(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <p className="text-sm text-muted-foreground">
              Enter the dollar amount to add to this user's credit balance.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add a note about this credit assignment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Optional note to track the reason for this credit assignment.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !creditsToAdd}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Assign Credits
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
