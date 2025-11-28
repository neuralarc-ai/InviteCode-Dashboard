"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUsageLogs } from '@/hooks/use-realtime-data';
import { ChevronLeft, ChevronRight, RefreshCw, Activity, DollarSign, Hash, Calendar, Search, X, Zap, Clock, AlertCircle, UserX, Mail, Users, Building2, Edit3, Send, Wand2 } from 'lucide-react';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { PageHeader } from '@/components/page-header';
import { SharedSidebar } from '@/components/shared-sidebar';

export default function UsageLogsPage() {
  const { 
    usageLogs, 
    loading, 
    error, 
    refreshUsageLogs,
    loadPage,
    loadNextPage,
    loadPreviousPage,
    currentPage,
    totalPages,
    totalCount,
    grandTotalTokens,
    grandTotalCost,
    hasNextPage,
    hasPreviousPage,
    itemsPerPage,
    searchQuery,
    handleSearch,
    activityFilter,
    handleActivityFilter,
    userTypeFilter,
    handleUserTypeFilter,
    isBackgroundRefreshing,
    clearActivityCache,
    getCacheStats,
    sendActivityReminder,
    sendCustomReminder,
    enhanceCustomEmail
  } = useUsageLogs();

  // Add a state to track real-time updates
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [previousUserCount, setPreviousUserCount] = useState(0);
  const [newUsersDetected, setNewUsersDetected] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set());
  const [emailResults, setEmailResults] = useState<Map<string, { success: boolean; message: string; timestamp: number }>>(new Map());
  
  // Custom email dialog state
  const [customEmailDialog, setCustomEmailDialog] = useState<{
    isOpen: boolean;
    user: { email: string; name: string; activityLevel: string; userId: string } | null;
  }>({ isOpen: false, user: null });
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sendingCustomEmail, setSendingCustomEmail] = useState(false);
  const [enhancingEmail, setEnhancingEmail] = useState(false);
  const [overallTotalCost, setOverallTotalCost] = useState<number>(0);
  const hasLoggedUserDataRef = useRef(false);
  
  // Quick reminder preview dialog state
  const [quickReminderPreview, setQuickReminderPreview] = useState<{
    isOpen: boolean;
    user: { email: string; name: string; activityLevel: string; userId: string } | null;
  }>({ isOpen: false, user: null });

  // Fetch overall total cost for both external and internal users
  useEffect(() => {
    const fetchOverallTotalCost = async () => {
      try {
        // Fetch both external and internal user totals in parallel
        const [externalResponse, internalResponse] = await Promise.all([
          fetch('/api/usage-logs-aggregated', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              page: 1,
              limit: 1,
              searchQuery: '',
              activityFilter: 'all',
              userTypeFilter: 'external',
            }),
          }),
          fetch('/api/usage-logs-aggregated', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              page: 1,
              limit: 1,
              searchQuery: '',
              activityFilter: 'all',
              userTypeFilter: 'internal',
            }),
          }),
        ]);

        const externalData = await externalResponse.json();
        const internalData = await internalResponse.json();

        const externalCost = externalData.success ? (externalData.grandTotalCost || 0) : 0;
        const internalCost = internalData.success ? (internalData.grandTotalCost || 0) : 0;

        setOverallTotalCost(externalCost + internalCost);
      } catch (error) {
        console.error('Error fetching overall total cost:', error);
        setOverallTotalCost(0);
      }
    };

    fetchOverallTotalCost();
    
    // Refresh every 30 seconds to keep it updated
    const interval = setInterval(fetchOverallTotalCost, 30000);
    
    return () => clearInterval(interval);
  }, [grandTotalCost]); // Re-fetch when grandTotalCost changes (indicates data refresh)

  // Log detailed user metadata to the browser console once per page load
  useEffect(() => {
    if (hasLoggedUserDataRef.current) {
      return;
    }
    if (!usageLogs || usageLogs.length === 0) {
      return;
    }

    const userIds = Array.from(
      new Set(
        usageLogs
          .map((log) => log.user_id)
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      )
    ).slice(0, 200); // Avoid sending an excessively large payload

    if (userIds.length === 0) {
      return;
    }

    hasLoggedUserDataRef.current = true;

    const fetchAndLogUserData = async () => {
      try {
        console.log('[fetch-user-from-logs] Requesting user data for', userIds.length, 'users');
        const response = await fetch('/api/fetch-user-from-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userIds }),
        });

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          console.error('[fetch-user-from-logs] Failed to fetch user data', payload);
          hasLoggedUserDataRef.current = false; // allow retry if the next render has data
          return;
        }

        console.log('[fetch-user-from-logs] Response payload:', payload);
      } catch (err) {
        console.error('[fetch-user-from-logs] Unexpected error', err);
        hasLoggedUserDataRef.current = false;
      }
    };

    fetchAndLogUserData();
  }, [usageLogs]);

  // Load email results from localStorage on component mount
  useEffect(() => {
    const loadEmailResults = () => {
      try {
        const stored = localStorage.getItem('emailResults');
        if (stored) {
          const parsedResults = JSON.parse(stored);
          const emailResultsMap = new Map<string, { success: boolean; message: string; timestamp: number }>();
          
          // Only keep results from the last 24 hours
          const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
          
          Object.entries(parsedResults).forEach(([userId, result]: [string, any]) => {
            if (result.timestamp && result.timestamp > twentyFourHoursAgo) {
              emailResultsMap.set(userId, result);
            }
          });
          
          setEmailResults(emailResultsMap);
        }
      } catch (error) {
        console.error('Error loading email results from localStorage:', error);
      }
    };

    loadEmailResults();
  }, []);

  // Clean up old email results every hour
  useEffect(() => {
    const cleanupInterval = setInterval(cleanupOldEmailResults, 60 * 60 * 1000); // 1 hour
    
    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

  // Save email results to localStorage whenever they change
  const saveEmailResults = (results: Map<string, { success: boolean; message: string; timestamp: number }>) => {
    try {
      const resultsObj = Object.fromEntries(results);
      localStorage.setItem('emailResults', JSON.stringify(resultsObj));
    } catch (error) {
      console.error('Error saving email results to localStorage:', error);
    }
  };

  // Clean up old email results (older than 24 hours)
  const cleanupOldEmailResults = () => {
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    setEmailResults(prev => {
      const newMap = new Map();
      prev.forEach((result, userId) => {
        if (result.timestamp && result.timestamp > twentyFourHoursAgo) {
          newMap.set(userId, result);
        }
      });
      saveEmailResults(newMap);
      return newMap;
    });
  };

  // Handle search input changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localSearchQuery !== searchQuery) {
        handleSearch(localSearchQuery);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [localSearchQuery, searchQuery, handleSearch]);

  // Clear search function
  const clearSearch = () => {
    setLocalSearchQuery('');
    handleSearch('');
  };

  // Generate quick reminder email preview HTML
  const getQuickReminderPreview = (userName: string, activityLevel: string) => {
    const baseMessage = "Looks like your activity on Helium has slowed down. Is everything okay? We're here to help if you need any assistance.";
    const reminderImageUrl = '/images/Reminder.png';
    
    let subject = '';
    let html = '';
    
    switch (activityLevel) {
      case 'medium':
        subject = "We miss you on Helium! ";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #000000;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="${reminderImageUrl}" alt="Reminder" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
            </div>
            <h2 style="color: #000000;">We miss you on Helium! </h2>
            <p style="color: #000000;">Hi ${userName},</p>
            <p style="color: #000000;">${baseMessage}</p>
            <p style="color: #000000;">We'd love to see you back and help you get the most out of our AI platform.</p>
            <p style="color: #000000;">Best regards,<br>The Helium Team</p>
            <div style="text-align: center; margin-top: 20px;">
              <a href="http://he2.ai" style="background-color: #004116; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Go back to Using Helium OS
              </a>
            </div>
          </div>
        `;
        break;
      case 'low':
        subject = "Let's get you back on track with Helium! 🚀";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #000000;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="${reminderImageUrl}" alt="Reminder" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
            </div>
            <h2 style="color: #000000;">Let's get you back on track with Helium! 🚀</h2>
            <p style="color: #000000;">Hi ${userName},</p>
            <p style="color: #000000;">${baseMessage}</p>
            <p style="color: #000000;">We understand that sometimes life gets busy, but we're here to support you whenever you're ready to continue your AI journey.</p>
            <p style="color: #000000;">Best regards,<br>The Helium Team</p>
          </div>
        `;
        break;
      default:
        subject = "We're here to help with Helium! 💙";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #000000;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="${reminderImageUrl}" alt="Reminder" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
            </div>
            <h2 style="color: #000000;">We're here to help with Helium! 💙</h2>
            <p style="color: #000000;">Hi ${userName},</p>
            <p style="color: #000000;">${baseMessage}</p>
            <p style="color: #000000;">Best regards,<br>The Helium Team</p>
          </div>
        `;
    }
    
    return { subject, html };
  };

  // Generate custom email preview HTML
  const getCustomEmailPreview = (userName: string, subject: string, message: string) => {
    const reminderImageUrl = '/images/Reminder.png';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${reminderImageUrl}" alt="Reminder" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
        </div>
        <div style="padding: 30px; text-align: center;">
          <h1 style="color: #000000; margin: 0; font-size: 28px;">Welcome Back!</h1>
        </div>
        
        <div style="padding: 20px; margin: 20px 0; color: #000000;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://he2.ai'}" 
               style="background: #004116; 
                      color: #FFFFFF; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      display: inline-block; 
                      font-weight: bold;">
              Get Back to Using Helium OS
            </a>
          </div>
        </div>
      </div>
    `;
    return { subject, html };
  };

  // Handle opening quick reminder preview
  const handleOpenQuickReminderPreview = (userEmail: string, userName: string, activityLevel: string, userId: string) => {
    setQuickReminderPreview({
      isOpen: true,
      user: { email: userEmail, name: userName, activityLevel, userId }
    });
  };

  // Handle sending preset activity reminder email
  const handleSendReminder = async (userEmail: string, userName: string, activityLevel: string, userId: string) => {
    setSendingEmails(prev => new Set(prev).add(userId));
    setEmailResults(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId); // Clear previous result
      saveEmailResults(newMap); // Save to localStorage
      return newMap;
    });

    try {
      const result = await sendActivityReminder(userEmail, userName, activityLevel);
      const emailResult = {
        success: result.success,
        message: result.success ? result.message : result.error || 'Failed to send email',
        timestamp: Date.now()
      };
      
      setEmailResults(prev => {
        const newMap = new Map(prev).set(userId, emailResult);
        saveEmailResults(newMap); // Save to localStorage
        return newMap;
      });
    } catch (error) {
      const emailResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send email',
        timestamp: Date.now()
      };
      
      setEmailResults(prev => {
        const newMap = new Map(prev).set(userId, emailResult);
        saveEmailResults(newMap); // Save to localStorage
        return newMap;
      });
    } finally {
      setSendingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Handle opening custom email dialog
  const handleOpenCustomEmail = (userEmail: string, userName: string, activityLevel: string, userId: string) => {
    setCustomEmailDialog({
      isOpen: true,
      user: { email: userEmail, name: userName, activityLevel, userId }
    });
    // Set default subject and message
    setCustomSubject(`We miss you, ${userName}! Come back to our AI platform`);
    setCustomMessage(`Hi ${userName},

We noticed you haven't been as active on our platform recently. We'd love to have you back!

Your current activity level is ${activityLevel}, and we think you might enjoy exploring some of our new features.

Feel free to reach out if you have any questions or need assistance getting started again.

Best regards,
The AI Team`);
  };

  // Handle sending custom email
  const handleSendCustomEmail = async () => {
    if (!customEmailDialog.user || !customSubject.trim() || !customMessage.trim()) {
      return;
    }

    setSendingCustomEmail(true);
    try {
      const result = await sendCustomReminder(
        customEmailDialog.user.email,
        customEmailDialog.user.name,
        customEmailDialog.user.activityLevel,
        customSubject.trim(),
        customMessage.trim()
      );

      if (result.success) {
        // Close dialog and show success
        setCustomEmailDialog({ isOpen: false, user: null });
        setCustomSubject('');
        setCustomMessage('');
        
        // Show success message in the table
        const emailResult = {
          success: true,
          message: 'Custom email sent successfully!',
          timestamp: Date.now()
        };
        
        setEmailResults(prev => {
          const newMap = new Map(prev).set(customEmailDialog.user!.userId, emailResult);
          saveEmailResults(newMap); // Save to localStorage
          return newMap;
        });
      } else {
        // Show error in dialog
        alert(`Failed to send custom email: ${result.error}`);
      }
    } catch (error) {
      alert(`Error sending custom email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingCustomEmail(false);
    }
  };

  // Handle closing custom email dialog
  const handleCloseCustomEmail = () => {
    setCustomEmailDialog({ isOpen: false, user: null });
    setCustomSubject('');
    setCustomMessage('');
  };

  // Handle enhancing custom email
  const handleEnhanceEmail = async () => {
    if (!customEmailDialog.user) return;

    setEnhancingEmail(true);
    try {
      const result = await enhanceCustomEmail(
        customEmailDialog.user.name,
        customEmailDialog.user.activityLevel,
        customSubject,
        customMessage
      );

      if (result.success && result.enhancedSubject && result.enhancedMessage) {
        setCustomSubject(result.enhancedSubject);
        setCustomMessage(result.enhancedMessage);
      } else {
        alert(`Failed to enhance email: ${result.error}`);
      }
    } catch (error) {
      alert(`Error enhancing email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setEnhancingEmail(false);
    }
  };

  // Track when data updates (for real-time indicator)
  useEffect(() => {
    if (usageLogs.length > 0) {
      setLastUpdateTime(new Date());
      
      // Check for new users
      if (totalCount > previousUserCount && previousUserCount > 0) {
        setNewUsersDetected(true);
        console.log(`🆕 Frontend: New users detected! Total users: ${totalCount}, Previous: ${previousUserCount}`);
        
        // Clear the new users indicator after 5 seconds
        setTimeout(() => {
          setNewUsersDetected(false);
        }, 5000);
      }
      
      setPreviousUserCount(totalCount);
    }
  }, [usageLogs, totalCount, previousUserCount]);

  // Calculate stats using grand totals (for ALL users, not just current page)
  const totalLogs = totalCount; // Total number of users
  const totalCost = grandTotalCost; // Grand total cost across ALL users
  const totalTokens = totalCost * 100; // Calculated as Total Cost × 100
  const uniqueUsers = usageLogs.length; // Users on current page
  const overallTotalCredits = overallTotalCost * 100; // Overall total credits (external + internal users) × 100

  // Activity level helper functions
  const getActivityIcon = (level: string) => {
    switch (level) {
      case 'high': return <Zap className="h-4 w-4 text-green-600" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'low': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'inactive': return <UserX className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityBadgeVariant = (level: string) => {
    switch (level) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      case 'inactive': return 'destructive';
      default: return 'secondary';
    }
  };

  const getActivityColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-orange-600';
      case 'inactive': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Format number with 2 decimal places
  const formatNumberWithDecimals = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const handlePageChange = (page: number) => {
    loadPage(page);
  };

  if (loading) {
    return (
      <SidebarProvider>
        <SharedSidebar />
        <SidebarInset className="flex flex-col">
          <PageHeader>
            <SidebarTrigger className="md:hidden" />
            <div>
              <h1 className="text-2xl font-bold">Usage Logs</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Overall Total Credits: <span className="font-semibold text-foreground">{formatNumberWithDecimals(overallTotalCredits)}</span>
              </p>
            </div>
          </PageHeader>
          <main className="flex-1 space-y-6 p-4 md:p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Monitor AI usage and token consumption</p>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-3 w-20 mt-1" />
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (error) {
    return (
      <SidebarProvider>
        <SharedSidebar />
        <SidebarInset className="flex flex-col">
          <PageHeader>
            <SidebarTrigger className="md:hidden" />
            <div>
              <h1 className="text-2xl font-bold">Usage Logs</h1>
              <p className="text-xl text-muted-foreground mt-1">
                Overall Total Credits: <span className="font-semibold text-foreground text-2xl">{formatNumberWithDecimals(overallTotalCredits)}</span>
              </p>
            </div>
          </PageHeader>
          <main className="flex-1 space-y-6 p-4 md:p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">Monitor AI usage and token consumption</p>
                </div>
                <Button onClick={refreshUsageLogs} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <Alert variant="destructive">
                <AlertDescription>
                  Error loading usage logs: {error}
                </AlertDescription>
              </Alert>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <SharedSidebar />
      <SidebarInset className="flex flex-col">
        <PageHeader>
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="text-2xl font-bold">Usage Logs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overall Total Credits: <span className="font-semibold text-foreground">{formatNumberWithDecimals(overallTotalCredits)}</span>
            </p>
          </div>
        </PageHeader>
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">Monitor AI usage and token consumption</p>
                <div className="flex items-center gap-2 mt-1">
                  {lastUpdateTime && (
                    <p className="text-xs text-muted-foreground">
                      Last updated: {lastUpdateTime.toLocaleTimeString()} (Real-time)
                    </p>
                  )}
                  {isBackgroundRefreshing && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Syncing...</span>
                    </div>
                  )}
                </div>
                {newUsersDetected && (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    🆕 New users detected! Data updated automatically.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={refreshUsageLogs} variant="outline" disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </div>

                   {/* User Type Toggle */}
                   <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-lg w-fit">
                     <Button
                       variant={userTypeFilter === 'external' ? 'default' : 'ghost'}
                       size="sm"
                       onClick={() => handleUserTypeFilter('external')}
                       className="flex items-center gap-2"
                     >
                       <Users className="h-4 w-4" />
                       External Users
                     </Button>
                     <Button
                       variant={userTypeFilter === 'internal' ? 'default' : 'ghost'}
                       size="sm"
                       onClick={() => handleUserTypeFilter('internal')}
                       className="flex items-center gap-2"
                     >
                       <Building2 className="h-4 w-4" />
                       Internal Users
                     </Button>
                   </div>

                   {/* Search Bar and Activity Filter */}
                   <div className="flex items-center gap-4">
                     <div className="relative flex-1 max-w-md">
                       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input
                         placeholder="Search users by name, email, or ID..."
                         value={localSearchQuery}
                         onChange={(e) => setLocalSearchQuery(e.target.value)}
                         className="pl-10 pr-10"
                       />
                       {localSearchQuery && (
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={clearSearch}
                           className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                         >
                           <X className="h-4 w-4" />
                         </Button>
                       )}
                     </div>
                     
                     <Select value={activityFilter} onValueChange={handleActivityFilter}>
                       <SelectTrigger className="w-48">
                         <SelectValue placeholder="Filter by activity" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">All Users</SelectItem>
                         <SelectItem value="high">High Activity</SelectItem>
                         <SelectItem value="medium">Medium Activity</SelectItem>
                         <SelectItem value="low">Low Activity</SelectItem>
                         <SelectItem value="inactive">Inactive</SelectItem>
                       </SelectContent>
                     </Select>
                     
                     {(searchQuery || activityFilter !== 'all') && (
                       <div className="text-sm text-muted-foreground">
                         {totalCount} result{totalCount !== 1 ? 's' : ''} found
                       </div>
                     )}
                   </div>

                   {/* Stats Cards */}
                   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                     <Card>
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                         <Activity className="h-4 w-4 text-muted-foreground" />
                       </CardHeader>
                       <CardContent>
                         <div className="text-2xl font-bold">{formatNumber(totalLogs)}</div>
                         <p className="text-xs text-muted-foreground">
                           Users with usage logs
                         </p>
                       </CardContent>
                     </Card>

                     <Card>
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                         <Hash className="h-4 w-4 text-muted-foreground" />
                       </CardHeader>
                       <CardContent>
                         <div className="text-2xl font-bold">{formatNumberWithDecimals(totalTokens)}</div>
                         <p className="text-xs text-muted-foreground">
                           Calculated (Total Cost × 100)
                         </p>
                       </CardContent>
                     </Card>

                     <Card>
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                         <DollarSign className="h-4 w-4 text-muted-foreground" />
                       </CardHeader>
                       <CardContent>
                         <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
                         <p className="text-xs text-muted-foreground">
                           Estimated usage cost
                         </p>
                       </CardContent>
                     </Card>

                     <Card>
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <CardTitle className="text-sm font-medium">Page Users</CardTitle>
                         <Calendar className="h-4 w-4 text-muted-foreground" />
                       </CardHeader>
                       <CardContent>
                         <div className="text-2xl font-bold">{formatNumber(uniqueUsers)}</div>
                         <p className="text-xs text-muted-foreground">
                           Users on current page
                         </p>
                       </CardContent>
                     </Card>

                     <Card>
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <CardTitle className="text-sm font-medium">Cache Performance</CardTitle>
                         <Zap className="h-4 w-4 text-muted-foreground" />
                       </CardHeader>
                       <CardContent>
                         <div className="text-2xl font-bold">{getCacheStats().hitRate}</div>
                         <p className="text-xs text-muted-foreground">
                           Cache hit rate
                         </p>
                         <div className="flex gap-2 mt-2">
                           <Button 
                             size="sm" 
                             variant="outline" 
                             onClick={clearActivityCache}
                             className="text-xs h-6"
                           >
                             Clear Cache
                           </Button>
                         </div>
                       </CardContent>
                     </Card>
                   </div>

      {/* Usage Logs Table */}
      <Card>
                     <CardHeader>
                       <CardTitle>Usage Logs</CardTitle>
                       <CardDescription>
                         {searchQuery || activityFilter !== 'all' ? (
                           <>Filtered results ({totalCount} {userTypeFilter === 'internal' ? 'internal' : 'external'} user{totalCount !== 1 ? 's' : ''} found)</>
                         ) : (
                           <>Aggregated AI usage by {userTypeFilter === 'internal' ? 'internal' : 'external'} users ({totalCount} unique users)</>
                         )}
                       </CardDescription>
                     </CardHeader>
        <CardContent>
          {loading && usageLogs.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span>Loading usage logs...</span>
                </div>
              </div>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
           ) : usageLogs.length === 0 ? (
                         <div className="text-center py-8">
                           <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                           <h3 className="text-lg font-medium">
                             {(searchQuery || activityFilter !== 'all') ? 'No users found' : 'No usage data found'}
                           </h3>
                           <p className="text-muted-foreground">
                             {(searchQuery || activityFilter !== 'all') ? (
                               <>No users match your current filters. Try adjusting your search or activity filter.</>
                             ) : (
                               <>User usage statistics will appear here when users interact with AI features.</>
                             )}
                           </p>
                           {(searchQuery || activityFilter !== 'all') && (
                             <div className="flex gap-2 justify-center mt-4">
                               {searchQuery && (
                                 <Button onClick={clearSearch} variant="outline">
                                   Clear search
                                 </Button>
                               )}
                               {activityFilter !== 'all' && (
                                 <Button onClick={() => handleActivityFilter('all')} variant="outline">
                                   Clear activity filter
                                 </Button>
                               )}
                             </div>
                           )}
                         </div>
          ) : (
            <div className="relative">
              {loading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span>Loading...</span>
                  </div>
                </div>
              )}
                           <Table>
                             <TableHeader>
                               <TableRow>
                                 <TableHead>
                                   <div className="flex items-center gap-2">
                                     User
                                     <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                       <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                       <span>Paid</span>
                                     </div>
                                   </div>
                                 </TableHead>
                                 <TableHead>
                                   <div className="flex items-center gap-2">
                                     <Activity className="h-4 w-4 text-muted-foreground" />
                                     Activity Level
                                   </div>
                                 </TableHead>
                                 <TableHead>Total estimated credits</TableHead>
                                 <TableHead>Usage Count</TableHead>
                                 <TableHead>Activity Period</TableHead>
                               </TableRow>
                             </TableHeader>
                             <TableBody>
                               {usageLogs.map((log) => (
                                 <TableRow key={log.userId}>
                                   <TableCell>
                                     <div className="flex items-center gap-2">
                                       {log.hasCompletedPayment && (
                                         <div className="w-2 h-2 bg-green-500 rounded-full" title="Payment completed" />
                                       )}
                                       <div>
                                         <div className="font-medium">{log.userName}</div>
                                         <div className="text-sm text-muted-foreground">{log.userEmail}</div>
                                       </div>
                                     </div>
                                   </TableCell>
                                   <TableCell>
                                     <div className="space-y-2">
                                       <div className="flex items-center gap-2">
                                         {getActivityIcon(log.activityLevel)}
                                         <Badge variant={getActivityBadgeVariant(log.activityLevel)} className="font-medium">
                                           {log.activityLevel.charAt(0).toUpperCase() + log.activityLevel.slice(1)}
                                         </Badge>
                                       </div>
                                       <div className="text-xs text-muted-foreground font-medium">
                                         {log.daysSinceLastActivity === 0 ? 'Today' : 
                                          log.daysSinceLastActivity === 1 ? '1 day ago' : 
                                          `${log.daysSinceLastActivity} days ago`}
                                       </div>
                                       {(log.activityLevel === 'medium' || log.activityLevel === 'low') && (
                                         <div className="flex items-center gap-2 mt-2">
                                           <Button
                                             size="sm"
                                             variant="outline"
                                             onClick={() => handleOpenQuickReminderPreview(log.userEmail, log.userName, log.activityLevel, log.userId)}
                                             disabled={sendingEmails.has(log.userId)}
                                             className="text-xs h-6 px-2"
                                           >
                                             <Mail className="h-3 w-3 mr-1" />
                                             Quick Reminder
                                           </Button>
                                           <Button
                                             size="sm"
                                             variant="outline"
                                             onClick={() => handleOpenCustomEmail(log.userEmail, log.userName, log.activityLevel, log.userId)}
                                             disabled={sendingEmails.has(log.userId)}
                                             className="text-xs h-6 px-2"
                                           >
                                             <Edit3 className="h-3 w-3 mr-1" />
                                             Custom Email
                                           </Button>
                                           {emailResults.has(log.userId) && (
                                             <div className="flex flex-col gap-1">
                                               <div className={`text-xs ${emailResults.get(log.userId)?.success ? 'text-green-600' : 'text-red-600'}`}>
                                                 {emailResults.get(log.userId)?.success ? '✓ Sent' : '✗ Failed'}
                                               </div>
                                               {emailResults.get(log.userId)?.timestamp && (
                                                 <div className="text-xs text-muted-foreground">
                                                   {new Date(emailResults.get(log.userId)!.timestamp).toLocaleTimeString()}
                                                 </div>
                                               )}
                                             </div>
                                           )}
                                         </div>
                                       )}
                                     </div>
                                   </TableCell>
                                   <TableCell>
                                     {formatNumber(Math.round(log.totalEstimatedCost * 100))}
                                   </TableCell>
                                   <TableCell>
                                     <Badge variant="secondary">
                                       {log.usageCount} sessions
                                     </Badge>
                                   </TableCell>
                                   <TableCell>
                                     <div className="text-sm">
                                       <div>From: {formatDate(log.earliestActivity)}</div>
                                       <div>To: {formatDate(log.latestActivity)}</div>
                                     </div>
                                   </TableCell>
                                 </TableRow>
                               ))}
                             </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                               <div className="text-sm text-muted-foreground">
                                 {(searchQuery || activityFilter !== 'all') ? (
                                   <>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} filtered results</>
                                 ) : (
                                   <>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} users</>
                                 )}
                               </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!hasPreviousPage || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="w-8 h-8 p-0"
                            disabled={loading}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!hasNextPage || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
          </div>
        </main>
      </SidebarInset>

      {/* Quick Reminder Preview Dialog */}
      <Dialog open={quickReminderPreview.isOpen} onOpenChange={(open) => setQuickReminderPreview({ isOpen: open, user: quickReminderPreview.user })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Quick Reminder Email Preview
            </DialogTitle>
            <DialogDescription>
              Preview the reminder email for {quickReminderPreview.user?.name} ({quickReminderPreview.user?.email})
            </DialogDescription>
          </DialogHeader>
          
          {quickReminderPreview.user && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Email Details</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>To:</strong> {quickReminderPreview.user.email}</p>
                  <p><strong>Subject:</strong> {getQuickReminderPreview(quickReminderPreview.user.name, quickReminderPreview.user.activityLevel).subject}</p>
                  <p><strong>Activity Level:</strong> {quickReminderPreview.user.activityLevel}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Email Preview</h4>
                <div className="border rounded-lg p-4 bg-muted/50 max-h-[400px] overflow-y-auto">
                  <div 
                    className="bg-white p-4 rounded border"
                    dangerouslySetInnerHTML={{ 
                      __html: getQuickReminderPreview(
                        quickReminderPreview.user.name,
                        quickReminderPreview.user.activityLevel
                      ).html 
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickReminderPreview({ isOpen: false, user: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (quickReminderPreview.user) {
                  setQuickReminderPreview({ isOpen: false, user: null });
                  await handleSendReminder(
                    quickReminderPreview.user.email,
                    quickReminderPreview.user.name,
                    quickReminderPreview.user.activityLevel,
                    quickReminderPreview.user.userId
                  );
                }
              }}
              disabled={sendingEmails.has(quickReminderPreview.user?.userId || '')}
              className="flex items-center gap-2"
            >
              {sendingEmails.has(quickReminderPreview.user?.userId || '') ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Email Dialog */}
      <Dialog open={customEmailDialog.isOpen} onOpenChange={handleCloseCustomEmail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Send Custom Reminder Email
            </DialogTitle>
            <DialogDescription>
              Send a personalized reminder email to {customEmailDialog.user?.name} ({customEmailDialog.user?.email})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email Subject</label>
              <Input
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Email Message</label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter your custom message..."
                className="w-full min-h-[200px]"
                rows={8}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {customMessage.length} characters
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleEnhanceEmail}
                  disabled={enhancingEmail || !customMessage.trim()}
                  className="flex items-center gap-2 text-xs h-7"
                >
                  {enhancingEmail ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-3 w-3" />
                      Enhance with AI
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Email Preview</h4>
              <div className="border rounded-lg p-4 bg-muted/50 max-h-[400px] overflow-y-auto">
                <div className="text-xs text-muted-foreground mb-2 space-y-1">
                  <p><strong>To:</strong> {customEmailDialog.user?.email}</p>
                  <p><strong>Subject:</strong> {customSubject || 'No subject'}</p>
                </div>
                <div 
                  className="mt-4 bg-white p-4 rounded border"
                  dangerouslySetInnerHTML={{ 
                    __html: getCustomEmailPreview(
                      customEmailDialog.user?.name || '',
                      customSubject,
                      customMessage
                    ).html 
                  }}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseCustomEmail}
              disabled={sendingCustomEmail}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendCustomEmail}
              disabled={!customSubject.trim() || !customMessage.trim() || sendingCustomEmail}
              className="flex items-center gap-2"
            >
              {sendingCustomEmail ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Custom Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
