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
import { WelcomeEmailDialog } from '@/components/dashboard/welcome-email-dialog';
import { CreditAssignmentDialog } from '@/components/dashboard/credit-assignment-dialog';
import { CreateUserDialog } from '@/components/dashboard/create-user-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { Mail, Loader2, Users, Building2, UserPlus, CreditCard, Download, Activity, UserX, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserProfiles } from '@/hooks/use-realtime-data';
import { getUserType } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function UsersPage() {
  const { userProfiles, loading, error, refreshUserProfiles, deleteUserProfile, bulkDeleteUserProfiles } = useUserProfiles();
  const [showCustomizationDialog, setShowCustomizationDialog] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [userTypeFilter, setUserTypeFilter] = useState<'internal' | 'external'>('external'); // Default to external users
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [bulkCreditsInput, setBulkCreditsInput] = useState('');
  const [isAssigningCredits, setIsAssigningCredits] = useState(false);
  const [usageActivityMap, setUsageActivityMap] = useState<Record<string, { usageCount: number; latestActivity: Date | null }>>({});
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [emailDialogOverride, setEmailDialogOverride] = useState<{
    section: 'activity';
    subject: string;
    textContent: string;
  } | null>(null);
  const { toast } = useToast();

  // Clear bulk credits input when selection is cleared or user type filter changes
  useEffect(() => {
    if (selectedUserIds.size === 0) {
      setBulkCreditsInput('');
      // Also clear email override when selection is cleared (if we want that behavior)
      // but usually we keep it until dialog closes. 
      // Actually we should clear it when dialog closes.
    }
  }, [selectedUserIds.size, userTypeFilter]);

  const handleOpenEmailForGroup = (group: 'active' | 'partial' | 'inactive') => {
    // 1. Identify users
    const filteredProfiles = userProfiles.filter((profile) => {
      const profileUserType = getUserType(profile.email);
      return profileUserType === userTypeFilter;
    });

    const now = new Date();
    const activeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
    const partialThreshold = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days

    const targetUserIds = new Set<string>();

    filteredProfiles.forEach(user => {
      const activity = usageActivityMap[user.userId];
      const lastActive = activity?.latestActivity ? new Date(activity.latestActivity) : null;
      
      const isInactive = !activity || activity.usageCount === 0 || (lastActive && lastActive <= partialThreshold);
      const isPartial = !isInactive && lastActive && lastActive <= activeThreshold && lastActive > partialThreshold;
      const isActive = !isInactive && !isPartial && lastActive && lastActive > activeThreshold;
      
      if (group === 'inactive' && isInactive) {
        targetUserIds.add(user.userId);
      } else if (group === 'partial' && isPartial) {
        targetUserIds.add(user.userId);
      } else if (group === 'active' && isActive) {
        targetUserIds.add(user.userId);
      }
    });

    if (targetUserIds.size === 0) {
      toast({
        title: "No Users Found",
        description: `No ${group} users found to email.`,
        variant: "destructive",
      });
      return;
    }

    // 2. Select users
    setSelectedUserIds(targetUserIds);

    // 3. Prepare content
    if (group === 'active') {
      setShowWelcomeDialog(true);
      return;
    } else if (group === 'partial') {
      setEmailDialogOverride({
        section: 'activity',
        subject: "We miss you! Come back to Helium",
        textContent: `Hi there! 👋

We've been thinking about you and noticed you haven't been as active on Helium recently. We completely understand that life gets busy, but we wanted to reach out because we genuinely miss having you as part of our community!

We think you might love exploring some of the exciting new features we've added since you last visited.

Here's what's new that might interest you:
✨ Enhanced AI capabilities with better responses
🎨 New creative tools for your projects
📊 Improved analytics to track your progress
🤝 A more vibrant community of creators

We believe in your potential and would love to see you back in action.

Remember, every great journey has its pauses - and that's perfectly okay! When you're ready to continue, we'll be here with open arms and exciting new possibilities.

Take care, and we hope to see you back soon! 🌟

With warm regards,
The Helium Team 💙`
      });
    } else {
      setEmailDialogOverride({
        section: 'activity',
        subject: "We're here when you're ready",
        textContent: `Hello, 💙

We hope this message finds you well. We've noticed you haven't been active on Helium lately, and we wanted to reach out - not to pressure you, but simply to let you know that you're missed and valued.

We want you to know that there's absolutely no rush to return. Life has its seasons, and we understand that sometimes you need to step back and focus on other things.

When you're ready (and only when you're ready), we'll be here with:
🌱 A welcoming community that understands
☕ A platform that adapts to your pace
💡 Tools that grow with your needs
🤗 Support without any pressure

We believe in the power of taking breaks and coming back when the time feels right. Your journey with AI and creativity is uniquely yours, and we respect that completely.

Whether you return tomorrow, next month, or next year, know that you'll always have a place here at Helium. We're not going anywhere, and we'll be excited to welcome you back whenever you're ready.

Take all the time you need. We're here when you are. 💙

With understanding and care,
The Helium Team 🌟`
      });
    }

    // 4. Open dialog
    setShowCustomizationDialog(true);
  };

  // Fetch usage activity (aggregated) for current user type to drive activity tabs
  useEffect(() => {
    let isMounted = true;
    let debounceTimeout: NodeJS.Timeout;

    const fetchActivity = async () => {
      // Don't show loading spinner for background refreshes if we already have data
      const hasData = Object.keys(usageActivityMap).length > 0;
      if (!hasData) {
        setIsLoadingActivity(true);
      }
      
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
        
        if (isMounted) {
          const map: Record<string, { usageCount: number; latestActivity: Date | null }> = {};

          (result.data || []).forEach((row: any) => {
            map[row.user_id] = {
              usageCount: Number(row.usage_count || 0),
              latestActivity: row.latest_activity ? new Date(row.latest_activity) : null,
            };
          });

          setUsageActivityMap(map);
        }
      } catch (err) {
        console.error('Error fetching usage activity', err);
        if (isMounted) {
          toast({
            title: 'Error',
            description: 'Failed to load activity data for user tabs.',
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingActivity(false);
        }
      }
    };

    fetchActivity();

    // Subscribe to usage_logs changes to update activity status in real-time
    const subscription = supabase
      .channel('users_page_activity_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'usage_logs',
        },
        () => {
          // Debounce updates to avoid excessive API calls
          clearTimeout(debounceTimeout);
          debounceTimeout = setTimeout(() => {
            fetchActivity();
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearTimeout(debounceTimeout);
      subscription.unsubscribe();
    };
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

    const headers = ['Name', 'Email', 'Status', 'Referral Source', 'Created'];
    const csvContent = [
      headers.join(','),
      ...filteredProfiles.map(profile => {
        const sent = !!(profile.metadata?.credits_email_sent_at);
        const assigned = !!(profile.metadata?.credits_assigned);
        let status = 'Not Sent';
        if (sent && assigned) status = 'Sent & Assigned';
        else if (sent) status = 'Sent';
        else if (assigned) status = 'Assigned';

        const referral = profile.referralSource || 'N/A';
        const created = new Date(profile.createdAt).toLocaleDateString();

        return [
          `"${profile.fullName}"`,
          `"${profile.email}"`,
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
      }
      

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

          // Try to parse as JSON
          if (responseText && responseText.trim().length > 0) {
            try {
              errorDetails = JSON.parse(responseText);
              
              // Check if errorDetails is empty object or has no message
              if (errorDetails && typeof errorDetails === 'object') {
                if (Object.keys(errorDetails).length === 0) {
                  errorMessage = `Server returned empty error response (${response.status}). This usually means the selected users don't exist in the database.`;
                } else {
                  errorMessage = errorDetails.message || errorDetails.hint || errorDetails.error || errorMessage;
                  
                  // Include additional details if available
                  if (errorDetails.details) {
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

  // Calculate user stats
  const userStats = {
    active: 0,
    inactive: 0,
    partial: 0
  };

  const filteredProfilesForStats = userProfiles.filter((profile) => {
    const profileUserType = getUserType(profile.email);
    return profileUserType === userTypeFilter;
  });

  const now = new Date();
  const activeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
  const partialThreshold = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days

  filteredProfilesForStats.forEach(user => {
    const activity = usageActivityMap[user.userId];
    const lastActive = activity?.latestActivity ? new Date(activity.latestActivity) : null;

    if (!activity || activity.usageCount === 0 || (lastActive && lastActive <= partialThreshold)) {
      userStats.inactive++;
    } else if (lastActive && lastActive > activeThreshold) {
      userStats.active++;
    } else {
      userStats.partial++;
    }
  });

  const userStatCards = [
  {
    key: 'active',
    title: 'Active Users',
    icon: Activity,
    count: userStats.active,
    description: 'Active in last 30 days',
    buttonText: 'Send Email',
    onClick: () => handleOpenEmailForGroup('active'),
    disabled: userStats.active === 0
  },
  {
    key: 'partial',
    title: 'Partially Active',
    icon: Clock,
    count: userStats.partial,
    description: 'Inactive for 30-60 days',
    buttonText: 'Send Email',
    onClick: () => handleOpenEmailForGroup('partial'),
    disabled: userStats.partial === 0
  },
  {
    key: 'inactive',
    title: 'Inactive Users',
    icon: UserX,
    count: userStats.inactive,
    description: 'No recent activity (> 60 days)',
    buttonText: 'Send Email',
    onClick: () => handleOpenEmailForGroup('inactive'),
    disabled: userStats.inactive === 0
  }
];

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
            {/* User Statistics Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {userStatCards.map((card) => (
                <Card
                  key={card.key}
                  className="border-primary/20 hover:border-primary/50 duration-300 ease-in-out transition-all"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-medium">
                      {card.title}
                    </CardTitle>
                    <card.icon className="w-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{card.count}</div>
                    <p className="text-xs text-muted-foreground mb-4">
                      {card.description}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={card.onClick}
                      disabled={card.disabled}
                    >
                      <Mail className="h-3 w-3 mr-2" />
                      {card.buttonText}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <h2 className="text-xl font-semibold">User Profiles</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 md:w-fit w-full gap-2">
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
                  variant={"secondary"}
                  className="flex items-center gap-2"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {isSending ? "Sending..." : "Send Email"}
                </Button>
                <Button
                  onClick={handleDownloadCsv}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </Button>
              </div>
            </div>

            {/* User Type Toggle */}
            <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-lg w-full md:w-fit">
              <Button
                variant={userTypeFilter === "external" ? "default" : "ghost"}
                size="sm"
                onClick={() => setUserTypeFilter("external")}
                className={`flex items-center gap-2 w-full ${
                  userTypeFilter === "external" ? "hover:bg-primary" : ""
                }`}
              >
                <Users className="h-4 w-4" />
                External Users
              </Button>
              <Button
                variant={userTypeFilter === "internal" ? "default" : "ghost"}
                size="sm"
                onClick={() => setUserTypeFilter("internal")}
                className={`flex items-center gap-2 w-full ${
                  userTypeFilter === "internal" ? "hover:bg-primary" : ""
                }`}
              >
                <Building2 className="h-4 w-4" />
                Internal Users
              </Button>
            </div>

            {/* Bulk Credit Assignment Controls */}
            {selectedUserIds.size > 0 && (
              <div className="flex flex-col md:flex-row items-end gap-3 p-4 bg-muted/50 rounded-lg border">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="bulk-credits" className="text-sm font-medium">
                    Assign Credits to {selectedUserIds.size} Selected User
                    {selectedUserIds.size !== 1 ? "s" : ""}
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
                    {bulkCreditsInput &&
                      !isNaN(parseFloat(bulkCreditsInput)) &&
                      parseFloat(bulkCreditsInput) > 0 && (
                        <span className="text-sm text-muted-foreground">
                          = ${(parseFloat(bulkCreditsInput) / 100).toFixed(2)}
                        </span>
                      )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the number of credits to add to all selected users'
                    accounts (100 credits = $1.00)
                  </p>
                </div>
                <Button
                  onClick={handleBulkAssignCredits}
                  disabled={
                    isAssigningCredits ||
                    !bulkCreditsInput ||
                    parseFloat(bulkCreditsInput) <= 0
                  }
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
        onOpenChange={(open) => {
          setShowCustomizationDialog(open);
          if (!open) {
            setEmailDialogOverride(null); // Clear override when dialog closes
          }
        }}
        onSendEmail={handleSendEmail}
        onSendToIndividual={handleSendToIndividual}
        isSending={isSending}
        selectedCount={selectedUserIds.size}
        initialTab={emailDialogOverride ? "activity" : "uptime"}
        overrideContent={emailDialogOverride}
      />

      <WelcomeEmailDialog
        open={showWelcomeDialog}
        onOpenChange={setShowWelcomeDialog}
        onSendEmail={handleSendEmail}
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
