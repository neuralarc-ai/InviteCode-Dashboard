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
  const [creditsInput, setCreditsInput] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  // Conversion rate: $1 = 100 credits
  const CREDITS_PER_DOLLAR = 100;

  // Calculate dollars from credits
  const credits = creditsInput ? parseFloat(creditsInput) : 0;
  const dollars = credits > 0 ? credits / CREDITS_PER_DOLLAR : 0;

  // Reset form when dialog opens/closes or user changes
  React.useEffect(() => {
    if (open) {
      setCreditsInput('');
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

    const creditsValue = parseFloat(creditsInput);
    if (isNaN(creditsValue) || creditsValue <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number of credits",
        variant: "destructive",
      });
      return;
    }

    // Convert credits to dollars for API (API expects dollars)
    const dollarsToAdd = creditsValue / CREDITS_PER_DOLLAR;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/credit-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.userId,
          creditsToAdd: dollarsToAdd,
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
            Add credits to {user?.fullName}'s account. This will increase their current balance.
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
            <Label htmlFor="credits">Credits *</Label>
            <Input
              id="credits"
              type="number"
              min="1"
              step="1"
              placeholder="Enter number of credits"
              value={creditsInput}
              onChange={(e) => setCreditsInput(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <p className="text-sm text-muted-foreground">
              Enter the number of credits to add to this user's credit balance.
            </p>
            {creditsInput && !isNaN(credits) && credits > 0 && (
              <div className="mt-2 p-3 bg-muted/50 rounded-md border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Amount:</span>
                  <span className="text-lg font-bold text-primary">
                    ${dollars.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {credits.toLocaleString('en-US', { maximumFractionDigits: 0 })} credits ÷ 100 = ${dollars.toFixed(2)}
                </p>
              </div>
            )}
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
              disabled={isSubmitting || !creditsInput}
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
