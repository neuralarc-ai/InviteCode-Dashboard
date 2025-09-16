'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, Mail, Calendar, Clock, User, Hash } from 'lucide-react';
import type { InviteCode } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ViewInviteCodeDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  inviteCode: InviteCode | null;
}

export function ViewInviteCodeDetailsDialog({ 
  isOpen, 
  onOpenChange, 
  inviteCode 
}: ViewInviteCodeDetailsDialogProps) {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [copiedEmails, setCopiedEmails] = React.useState(false);

  const copyCode = async () => {
    if (!inviteCode) return;
    
    try {
      await navigator.clipboard.writeText(inviteCode.code);
      setCopiedCode(true);
      toast({
        title: 'Copied!',
        description: 'Invite code copied to clipboard',
      });
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy code',
      });
    }
  };

  const copyEmails = async () => {
    if (!inviteCode || inviteCode.emailSentTo.length === 0) return;
    
    try {
      await navigator.clipboard.writeText(inviteCode.emailSentTo.join(', '));
      setCopiedEmails(true);
      toast({
        title: 'Copied!',
        description: 'Email addresses copied to clipboard',
      });
      setTimeout(() => setCopiedEmails(false), 2000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy emails',
      });
    }
  };

  const getStatusInfo = (code: InviteCode) => {
    if (code.isUsed) {
      return {
        status: 'Used',
        color: 'bg-red-500/20 text-red-400 border-red-500/30',
        description: 'This invite code has been used and is no longer active.'
      };
    }
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
      return {
        status: 'Expired',
        color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        description: 'This invite code has expired and is no longer valid.'
      };
    }
    return {
      status: 'Active',
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      description: 'This invite code is active and available for use.'
    };
  };

  if (!inviteCode) return null;

  const statusInfo = getStatusInfo(inviteCode);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Invite Code Details
          </DialogTitle>
          <DialogDescription>
            Complete information about this invite code
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Code Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Invite Code</h3>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn("font-mono text-sm", statusInfo.color)}
                >
                  {statusInfo.status}
                </Badge>
                {inviteCode.isPreview && (
                  <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                    Preview
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <span className="font-mono text-xl font-bold">{inviteCode.code}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={copyCode}
                className="flex items-center gap-2"
              >
                {copiedCode ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copiedCode ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
          </div>

          {/* Usage Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Usage Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Current Uses:</span>
                  <span className="font-mono">{inviteCode.currentUses}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Max Uses:</span>
                  <span className="font-mono">{inviteCode.maxUses}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Created:</span>
                  <span>{new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).format(inviteCode.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Expires:</span>
                  <span>
                    {inviteCode.expiresAt ? 
                      new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).format(inviteCode.expiresAt) : 
                      'Never'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Email Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Email Information</h3>
              {inviteCode.emailSentTo.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyEmails}
                  className="flex items-center gap-2"
                >
                  {copiedEmails ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copiedEmails ? 'Copied!' : 'Copy All'}
                </Button>
              )}
            </div>
            
            {inviteCode.emailSentTo.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Sent to {inviteCode.emailSentTo.length} email{inviteCode.emailSentTo.length > 1 ? 's' : ''}:
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {inviteCode.emailSentTo.map((email, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono">{email}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No emails have been sent using this invite code.
              </div>
            )}
          </div>

          {/* Additional Information */}
          {inviteCode.usedAt && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Usage Details</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Used At:</span>
                  <span>{new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).format(inviteCode.usedAt)}</span>
                </div>
                {inviteCode.usedBy && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Used By:</span>
                    <span>{inviteCode.usedBy}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
