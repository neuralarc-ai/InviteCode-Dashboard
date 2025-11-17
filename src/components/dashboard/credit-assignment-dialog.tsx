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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { createCreditsHtmlTemplate } from '@/lib/email-templates';

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
  const [sendCustomEmail, setSendCustomEmail] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [customEmailText, setCustomEmailText] = React.useState('');
  const [emailImages, setEmailImages] = React.useState<{
    logo: string | null;
    creditsCustom: string | null;
  }>({
    logo: null,
    creditsCustom: null,
  });
  const [emailPreviewHtml, setEmailPreviewHtml] = React.useState('');
  const { toast } = useToast();

  // Default custom email content
  const defaultCustomEmailText = `Credits Added to Your Account

Greetings from Helium,

We're excited to inform you that credits have been added to your Helium account. These credits are now available for you to use across all platform features.

You can check your credit balance in your account dashboard at any time. If you have any questions about your credits or how to use them, please feel free to reach out to our support team.

Thank you for being a valued member of the Helium community.

Thanks,
The Helium Team`;

  // Conversion rate: $1 = 100 credits
  const CREDITS_PER_DOLLAR = 100;

  // Calculate dollars from credits
  const credits = creditsInput ? parseFloat(creditsInput) : 0;
  const dollars = credits > 0 ? credits / CREDITS_PER_DOLLAR : 0;

  // Fetch email images when dialog opens
  React.useEffect(() => {
    if (open) {
      const fetchImages = async () => {
        try {
          const response = await fetch('/api/get-email-images');
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.images) {
              setEmailImages({
                logo: data.images.logo,
                creditsCustom: data.images.creditsCustom || null,
              });
            }
          }
        } catch (error) {
          console.error('Error fetching email images:', error);
        }
      };
      
      fetchImages();
    }
  }, [open]);

  // Update preview HTML when custom email text or images change
  React.useEffect(() => {
    if (sendCustomEmail && customEmailText) {
      const html = createCreditsHtmlTemplate({
        logoBase64: emailImages.logo || null,
        creditsBodyBase64: emailImages.creditsCustom || null,
        textContent: customEmailText,
        useCid: false, // Use base64 for preview
        useCustomImage: true, // Use custom Credits.png image
      });
      setEmailPreviewHtml(html);
    } else {
      setEmailPreviewHtml('');
    }
  }, [customEmailText, emailImages.logo, emailImages.creditsCustom, sendCustomEmail]);

  // Reset form when dialog opens/closes or user changes
  React.useEffect(() => {
    if (open) {
      setCreditsInput('');
      setNotes('');
      setSendCustomEmail(false);
      setCustomEmailText(defaultCustomEmailText);
      setEmailPreviewHtml('');
    }
  }, [open, user]);

  // Update custom email checkbox when credits change
  React.useEffect(() => {
    const creditsValue = parseFloat(creditsInput);
    if (!isNaN(creditsValue) && creditsValue !== 1000) {
      // Auto-enable custom email for non-1000 credits
      setSendCustomEmail(true);
      // Initialize custom email text if empty
      if (!customEmailText || customEmailText.trim() === '') {
        setCustomEmailText(defaultCustomEmailText);
      }
    } else if (creditsValue === 1000) {
      // Disable custom email for 1000 credits (uses default email)
      setSendCustomEmail(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditsInput]);

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
          sendCustomEmail: sendCustomEmail && creditsValue !== 1000,
          creditsAmount: creditsValue,
          customEmailText: sendCustomEmail && creditsValue !== 1000 ? customEmailText : undefined,
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Assign Credits
          </DialogTitle>
          <DialogDescription>
            Add credits to {user?.fullName}'s account. This will increase their current balance.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 space-y-4">
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

          {/* Custom Email Option - Only show when credits != 1000 */}
          {creditsInput && !isNaN(credits) && credits > 0 && credits !== 1000 && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-md border">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="send-custom-email"
                  checked={sendCustomEmail}
                  onCheckedChange={(checked) => setSendCustomEmail(checked === true)}
                  disabled={isSubmitting}
                />
                <div className="space-y-1 flex-1">
                  <Label
                    htmlFor="send-custom-email"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Send custom email notification
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send a custom email with Credits.png image to notify the user about the credit assignment.
                  </p>
                </div>
              </div>

              {/* Email Customization Section */}
              {sendCustomEmail && (
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-sm font-medium">Customize Email Template</Label>
                  <Tabs defaultValue="text" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="text">Edit Text</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                    <TabsContent value="text" className="space-y-2 mt-4">
                      <Label htmlFor="custom-email-text">Email Content</Label>
                      <Textarea
                        id="custom-email-text"
                        value={customEmailText}
                        onChange={(e) => setCustomEmailText(e.target.value)}
                        placeholder="Enter email content..."
                        className="min-h-[250px] font-mono text-sm"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-muted-foreground">
                        Edit the email text content that will be sent to the user.
                      </p>
                    </TabsContent>
                    <TabsContent value="preview" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Email Preview (HTML Template)</Label>
                        <div className="border rounded-lg min-h-[400px] overflow-hidden overflow-x-auto">
                          {emailPreviewHtml ? (
                            <div 
                              className="prose max-w-none break-words"
                              dangerouslySetInnerHTML={{ __html: emailPreviewHtml }}
                            />
                          ) : (
                            <div className="p-4 text-muted-foreground text-center">
                              <p>Preview will appear here once you enter email content...</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          )}

          {/* Info message for 1000 credits */}
          {creditsInput && !isNaN(credits) && credits === 1000 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                For 1000 credits, the default email notification will be sent automatically.
              </p>
            </div>
          )}
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-background">
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
