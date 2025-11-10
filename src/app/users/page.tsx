"use client"

import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import { PageHeader } from '@/components/page-header';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { SharedSidebar } from '@/components/shared-sidebar';
import { UsersTableRealtime } from '@/components/dashboard/users-table-realtime';
import { EmailCustomizationDialog, type EmailData } from '@/components/dashboard/email-customization-dialog';
import { CreditAssignmentDialog } from '@/components/dashboard/credit-assignment-dialog';
import { CreateUserDialog } from '@/components/dashboard/create-user-dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Mail, Loader2, Users, Building2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';

export default function UsersPage() {
  const [showCustomizationDialog, setShowCustomizationDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [userTypeFilter, setUserTypeFilter] = useState<'internal' | 'external'>('external'); // Default to external users
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleSendEmail = async (emailData: EmailData, selectedOnly: boolean = false) => {
    setIsSending(true);
    try {
      // Extract only the fields needed for the API (subject, textContent, htmlContent)
      const requestBody: any = {
        subject: emailData.subject,
        textContent: emailData.textContent || '',
        htmlContent: emailData.htmlContent || '',
      };
      
      // If sending to selected users only, include their user IDs
      if (selectedOnly && selectedUserIds.size > 0) {
        requestBody.selectedUserIds = Array.from(selectedUserIds);
      }

      const response = await fetch('/api/send-bulk-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        const recipientCount = selectedOnly ? selectedUserIds.size : 'all';
        toast({
          title: "Success",
          description: `Emails sent successfully! ${result.details.successCount} emails delivered to ${selectedOnly ? `${selectedUserIds.size} selected` : 'all'} users.`,
        });
        // Clear selection after successful send
        if (selectedOnly) {
          setSelectedUserIds(new Set());
        }
        // Note: Real-time subscription should automatically refresh the user profiles
        // when the metadata is updated in the database
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to send emails",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while sending emails",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      setShowCustomizationDialog(false);
    }
  };

  const handleSendToIndividual = async (emailData: EmailData, emailAddress: string) => {
    setIsSending(true);
    try {
      // Extract only the fields needed for the API (subject, textContent, htmlContent)
      const requestBody = {
        subject: emailData.subject,
        textContent: emailData.textContent || '',
        htmlContent: emailData.htmlContent || '',
        individualEmail: emailAddress
      };
      const response = await fetch('/api/send-individual-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: `Email sent successfully to ${emailAddress}!`,
        });
        // Note: Real-time subscription should automatically refresh the user profiles
        // when the metadata is updated in the database
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to send email",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending individual email:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while sending email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      setShowCustomizationDialog(false);
    }
  };

  const handleAssignCredits = (user: UserProfile) => {
    setSelectedUser(user);
    setCreditDialogOpen(true);
  };

  const handleCreditAssignmentSuccess = () => {
    toast({
      title: "Success",
      description: "Credits assigned successfully!",
    });
    // Refresh user profiles to show updated status
    // The real-time subscription should handle this, but we'll also trigger a manual refresh
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleCreateUserSuccess = () => {
    toast({
      title: "Success",
      description: "User created successfully! The user list will update automatically.",
    });
    // The real-time subscription should automatically refresh the user profiles
    // when a new user_profiles entry is created
  };

  return (
    <>
      <SidebarProvider>
        <SharedSidebar />
        <SidebarInset className="flex flex-col">
          <PageHeader>
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-2xl font-bold">Users</h1>
          </PageHeader>
          <main className="flex-1 space-y-6 p-4 md:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">User Profiles</h2>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setCreateUserDialogOpen(true)}
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Create User
                </Button>
                <Button 
                  onClick={() => setShowCustomizationDialog(true)}
                  disabled={isSending}
                  className="flex items-center gap-2"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {isSending ? "Sending..." : "Send EMAIL"}
                </Button>
              </div>
            </div>

            {/* User Type Toggle */}
            <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-lg w-fit">
              <Button
                variant={userTypeFilter === 'external' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setUserTypeFilter('external')}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                External Users
              </Button>
              <Button
                variant={userTypeFilter === 'internal' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setUserTypeFilter('internal')}
                className="flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                Internal Users
              </Button>
            </div>

            <UsersTableRealtime 
              userTypeFilter={userTypeFilter}
              selectedUserIds={selectedUserIds}
              onSelectionChange={setSelectedUserIds}
              onAssignCredits={handleAssignCredits}
            />
          </main>
        </SidebarInset>
      </SidebarProvider>

      <EmailCustomizationDialog
        open={showCustomizationDialog}
        onOpenChange={setShowCustomizationDialog}
        onSendEmail={handleSendEmail}
        onSendToIndividual={handleSendToIndividual}
        isSending={isSending}
        selectedCount={selectedUserIds.size}
      />

      {/* Credit Assignment Dialog */}
      {selectedUser && (
        <CreditAssignmentDialog
          open={creditDialogOpen}
          onOpenChange={setCreditDialogOpen}
          user={selectedUser}
          onSuccess={handleCreditAssignmentSuccess}
        />
      )}

      {/* Create User Dialog */}
      <CreateUserDialog
        open={createUserDialogOpen}
        onOpenChange={setCreateUserDialogOpen}
        onSuccess={handleCreateUserSuccess}
      />
    </>
  );
}
