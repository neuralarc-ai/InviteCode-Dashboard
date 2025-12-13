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
import { UserDemographics } from '@/components/dashboard/user-demographics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { Mail, Loader2, Users, Building2, UserPlus, CreditCard, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserProfiles } from '@/hooks/use-realtime-data';
import { getUserType } from '@/lib/utils';

export default function UsersPage() {
  const { userProfiles, loading, error, refreshUserProfiles, deleteUserProfile, bulkDeleteUserProfiles } = useUserProfiles();
  const [showCustomizationDialog, setShowCustomizationDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [userTypeFilter, setUserTypeFilter] = useState<'internal' | 'external'>('external'); // Default to external users
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [bulkCreditsInput, setBulkCreditsInput] = useState('');
  const [isAssigningCredits, setIsAssigningCredits] = useState(false);
  const [activityTab, setActivityTab] = useState<'all' | 'new' | 'active' | 'partial'>('all');
  const [usageActivityMap, setUsageActivityMap] = useState<Record<string, { usageCount: number; latestActivity: Date | null }>>({});
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const { toast } = useToast();

  // Clear bulk credits input when selection is cleared or user type filter changes
  useEffect(() => {
    if (selectedUserIds.size === 0) {
      setBulkCreditsInput('');
    }
  }, [selectedUserIds.size, userTypeFilter]);

  // Fetch usage activity (aggregated) for current user type to drive activity tabs
  useEffect(() => {
    const fetchActivity = async () => {
      setIsLoadingActivity(true);
      try {
        const response = await fetch('/api/usage-logs-aggregated', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: 1,
            limit: 2000, // enough for typical dashboards; adjust if dataset grows
            searchQuery: '',
            activityFilter: 'all',
            userTypeFilter,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to load activity: ${response.statusText}`);
        }

        const result = await response.json();
        const map: Record<string, { usageCount: number; latestActivity: Date | null }> = {};

        (result.data || []).forEach((row: any) => {
          map[row.user_id] = {
            usageCount: Number(row.usage_count || 0),
            latestActivity: row.latest_activity ? new Date(row.latest_activity) : null,
          };
        });

        setUsageActivityMap(map);
      } catch (err) {
        console.error('Error fetching usage activity', err);
        toast({
          title: 'Error',
          description: 'Failed to load activity data for user tabs.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingActivity(false);
      }
    };

    fetchActivity();
  }, [toast, userTypeFilter]);

  const handleDownloadCsv = () => {
    const filteredProfiles = userProfiles.filter((profile) => {
      const profileUserType = getUserType(profile.email);
      return profileUserType === userTypeFilter;
    });

    if (filteredProfiles.length === 0) {
      toast({
        title: "No Data",
        description: "No users found to download.",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Name', 'Email', 'Country', 'Status', 'Referral Source', 'Created'];
    const csvContent = [
      headers.join(','),
      ...filteredProfiles.map(profile => {
        const sent = !!(profile.metadata?.credits_email_sent_at);
        const assigned = !!(profile.metadata?.credits_assigned);
        let status = 'Not Sent';
        if (sent && assigned) status = 'Sent & Assigned';
        else if (sent) status = 'Sent';
        else if (assigned) status = 'Assigned';

        const country = profile.countryName 
          || (profile.metadata as any)?.countryName 
          || (profile.metadata as any)?.country 
          || 'N/A';

        const referral = profile.referralSource || 'N/A';
        const created = new Date(profile.createdAt).toLocaleDateString();

        return [
          `"${profile.fullName}"`,
          `"${profile.email}"`,
          `"${country}"`,
          `"${status}"`,
          `"${referral}"`,
          `"${created}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${userTypeFilter}_users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        console.log('Sending to selected users:', {
          count: selectedUserIds.size,
          userIds: Array.from(selectedUserIds)
        });
      } else {
        console.log('Sending to all users');
      }
      
      console.log('Request body being sent:', {
        hasSubject: !!requestBody.subject,
        subjectLength: requestBody.subject?.length || 0,
        hasTextContent: !!requestBody.textContent,
        textContentLength: requestBody.textContent?.length || 0,
        hasHtmlContent: !!requestBody.htmlContent,
        htmlContentLength: requestBody.htmlContent?.length || 0,
        hasSelectedUserIds: !!requestBody.selectedUserIds,
        selectedUserIdsCount: requestBody.selectedUserIds?.length || 0
      });

      const response = await fetch('/api/send-bulk-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // Check if response is OK before parsing
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        let errorDetails: any = null;
        
        try {
          // Try to get response as text first to see what we're dealing with
          const responseText = await response.text();
          console.log('Error response text (raw):', responseText);
          
          // Try to parse as JSON
          if (responseText && responseText.trim().length > 0) {
            try {
              errorDetails = JSON.parse(responseText);
              console.log('Error response parsed as JSON:', errorDetails);
              
              // Check if errorDetails is empty object or has no message
              if (errorDetails && typeof errorDetails === 'object') {
                if (Object.keys(errorDetails).length === 0) {
                  errorMessage = `Server returned empty error response (${response.status}). This usually means the selected users don't exist in the database.`;
                } else {
                  errorMessage = errorDetails.message || errorDetails.hint || errorDetails.error || errorMessage;
                  
                  // Include additional details if available
                  if (errorDetails.details) {
                    console.log('Error details:', errorDetails.details);
                    if (errorDetails.details.selectedUserIds) {
                      errorMessage += ` Selected user IDs: ${JSON.stringify(errorDetails.details.selectedUserIds)}`;
                    }
                  }
                }
              }
            } catch (jsonParseError) {
              // Not valid JSON, use text as error message
              console.error('Failed to parse error response as JSON:', jsonParseError);
              errorMessage = responseText || errorMessage;
            }
          } else {
            // Empty response body
            errorMessage = `Server returned empty response (${response.status}). This usually means the selected users don't exist in the database or there was a validation error.`;
          }
        } catch (parseError) {
          console.error('Failed to read error response:', parseError);
          errorMessage = `Failed to read error response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`;
        }
        
        console.error('Bulk email error response:', {
          status: response.status,
          statusText: response.statusText,
          errorDetails,
          finalErrorMessage: errorMessage
        });
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

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
        console.error('Bulk email error:', result);
        toast({
          title: "Error",
          description: result.message || result.hint || "Failed to send emails",
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

      // Check if response is OK before parsing
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorResult = await response.json();
          errorMessage = errorResult.message || errorResult.hint || errorMessage;
          console.error('Individual email error response:', {
            status: response.status,
            statusText: response.statusText,
            error: errorResult
          });
        } catch (parseError) {
          const text = await response.text();
          console.error('Failed to parse error response:', {
            status: response.status,
            statusText: response.statusText,
            body: text
          });
          errorMessage = text || errorMessage;
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: `Email sent successfully to ${emailAddress}!`,
        });
        // Note: Real-time subscription should automatically refresh the user profiles
        // when the metadata is updated in the database
      } else {
        console.error('Individual email error:', result);
        toast({
          title: "Error",
          description: result.message || result.hint || "Failed to send email",
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

  const handleBulkAssignCredits = async () => {
    // Validation
    if (selectedUserIds.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one user to assign credits",
        variant: "destructive",
      });
      return;
    }

    const creditsValue = parseFloat(bulkCreditsInput);
    if (isNaN(creditsValue) || creditsValue <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid positive number of credits",
        variant: "destructive",
      });
      return;
    }

    // Conversion rate: $1 = 100 credits
    const CREDITS_PER_DOLLAR = 100;
    const dollarsToAdd = creditsValue / CREDITS_PER_DOLLAR;

    setIsAssigningCredits(true);

    try {
      const userIds = Array.from(selectedUserIds);
      const results = await Promise.allSettled(
        userIds.map(async (userId) => {
          const response = await fetch('/api/credit-balance', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              creditsToAdd: dollarsToAdd,
              notes: `Bulk assignment: ${creditsValue} credits`,
              sendCustomEmail: true, // Always send email (use custom template for non-1000 credits)
              creditsAmount: creditsValue,
            }),
          });

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.message || 'Failed to assign credits');
          }
          return { userId, success: true };
        })
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      if (failed === 0) {
        toast({
          title: "Success",
          description: `Successfully assigned ${creditsValue} credits to ${successful} user${successful !== 1 ? 's' : ''}! Credits email sent and status updated.`,
        });
        // Clear selection and input after successful assignment
        setSelectedUserIds(new Set());
        setBulkCreditsInput('');
        // Status will update automatically via real-time subscription
      } else if (successful > 0) {
        toast({
          title: "Partial Success",
          description: `Assigned credits to ${successful} user${successful !== 1 ? 's' : ''} (emails sent), but ${failed} assignment${failed !== 1 ? 's' : ''} failed.`,
        });
        // Clear selection for successful assignments
        setSelectedUserIds(new Set());
        setBulkCreditsInput('');
      } else {
        toast({
          title: "Error",
          description: `Failed to assign credits to all ${userIds.length} selected user${userIds.length !== 1 ? 's' : ''}. Please try again.`,
          variant: "destructive",
        });
      }

      // Log errors for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to assign credits to user ${userIds[index]}:`, result.reason);
        }
      });
    } catch (error) {
      console.error('Error in bulk credit assignment:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while assigning credits",
        variant: "destructive",
      });
    } finally {
      setIsAssigningCredits(false);
    }
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
            <UserDemographics />
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
                  onClick={handleDownloadCsv}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
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

            {/* Activity Tabs */}
            <div className="w-full">
              <Tabs value={activityTab} onValueChange={(val) => setActivityTab(val as typeof activityTab)}>
                <TabsList className="grid grid-cols-4 w-full max-w-xl">
                  <TabsTrigger value="all">All users</TabsTrigger>
                  <TabsTrigger value="new">New users</TabsTrigger>
                  <TabsTrigger value="active">Active users</TabsTrigger>
                  <TabsTrigger value="partial">Partially active</TabsTrigger>
                </TabsList>
              </Tabs>
              {isLoadingActivity && (
                <p className="text-xs text-muted-foreground mt-2">Loading activity data…</p>
              )}
            </div>

            {/* Bulk Credit Assignment Controls */}
            {selectedUserIds.size > 0 && (
              <div className="flex items-end gap-3 p-4 bg-muted/50 rounded-lg border">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="bulk-credits" className="text-sm font-medium">
                    Assign Credits to {selectedUserIds.size} Selected User{selectedUserIds.size !== 1 ? 's' : ''}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="bulk-credits"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Enter number of credits"
                      value={bulkCreditsInput}
                      onChange={(e) => setBulkCreditsInput(e.target.value)}
                      disabled={isAssigningCredits}
                      className="max-w-xs"
                    />
                    {bulkCreditsInput && !isNaN(parseFloat(bulkCreditsInput)) && parseFloat(bulkCreditsInput) > 0 && (
                      <span className="text-sm text-muted-foreground">
                        = ${(parseFloat(bulkCreditsInput) / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the number of credits to add to all selected users' accounts (100 credits = $1.00)
                  </p>
                </div>
                <Button
                  onClick={handleBulkAssignCredits}
                  disabled={isAssigningCredits || !bulkCreditsInput || parseFloat(bulkCreditsInput) <= 0}
                  className="flex items-center gap-2"
                >
                  {isAssigningCredits ? (
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
              </div>
            )}

            <UsersTableRealtime 
              userTypeFilter={userTypeFilter}
              selectedUserIds={selectedUserIds}
              onSelectionChange={setSelectedUserIds}
              onAssignCredits={handleAssignCredits}
              activityTab={activityTab}
              usageActivityMap={usageActivityMap}
              userProfiles={userProfiles}
              loading={loading}
              error={error}
              refreshUserProfiles={refreshUserProfiles}
              deleteUserProfile={deleteUserProfile}
              bulkDeleteUserProfiles={bulkDeleteUserProfiles}
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
