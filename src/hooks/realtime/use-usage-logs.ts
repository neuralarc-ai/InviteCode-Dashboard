'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { UsageLog } from '@/lib/types';

export function useUsageLogs(initialConfig?: { 
  sort?: string; 
  range?: string; 
  limit?: number 
}) {
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [grandTotalTokens, setGrandTotalTokens] = useState(0);
  const [grandTotalCost, setGrandTotalCost] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(initialConfig?.limit || 10);
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [userTypeFilter, setUserTypeFilter] = useState<'internal' | 'external'>('external');
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);

  const [sortBy, setSortBy] = useState<string>(initialConfig?.sort || 'latest_activity');
  const [timeRange, setTimeRange] = useState<string>(initialConfig?.range || 'all');

  const clearActivityCache = () => {
    console.log('🧹 Cache clear requested (using server-side aggregation now)');
  };

  const getCacheStats = () => {
    return {
      cacheSize: 0,
      hitRate: 'N/A (Server-side)',
      avgCalculationTime: 'N/A',
      totalCalculations: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  };

  const sendActivityReminder = async (userEmail: string, userName: string, activityLevel: string) => {
    try {
      console.log(`Sending preset activity reminder to ${userName} (${userEmail}) - Activity Level: ${activityLevel}`);
      
      const response = await fetch('/api/send-activity-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          userName,
          activityLevel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      const result = await response.json();
      console.log('Preset activity reminder sent successfully:', result);
      return { success: true, message: result.message };
    } catch (error) {
      console.error('Error sending preset activity reminder:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send email' 
      };
    }
  };

  const sendCustomReminder = async (userEmail: string, userName: string, activityLevel: string, customSubject: string, customMessage: string) => {
    try {
      console.log(`Sending custom reminder to ${userName} (${userEmail}) - Activity Level: ${activityLevel}`);
      
      const response = await fetch('/api/send-custom-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          userName,
          activityLevel,
          customSubject,
          customMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send custom email');
      }

      const result = await response.json();
      console.log('Custom reminder sent successfully:', result);
      return { success: true, message: result.message };
    } catch (error) {
      console.error('Error sending custom reminder:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send custom email' 
      };
    }
  };

  const enhanceCustomEmail = async (userName: string, activityLevel: string, currentSubject: string, currentMessage: string) => {
    try {
      console.log(`Enhancing email for ${userName} - Activity Level: ${activityLevel}`);
      
      const enhancedContent = generateEnhancedEmailContent(userName, activityLevel, currentSubject, currentMessage);
      
      return { 
        success: true, 
        enhancedSubject: enhancedContent.subject,
        enhancedMessage: enhancedContent.message
      };
    } catch (error) {
      console.error('Error enhancing email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to enhance email' 
      };
    }
  };

  const generateEnhancedEmailContent = (userName: string, activityLevel: string, currentSubject: string, currentMessage: string) => {
    const activityContext = {
      medium: {
        urgency: "moderate",
        tone: "encouraging",
        suggestions: ["explore new features", "check out recent updates", "reconnect with the community"]
      },
      low: {
        urgency: "gentle",
        tone: "supportive", 
        suggestions: ["take your time", "we're here when you're ready", "no pressure to return"]
      }
    };

    const context = activityContext[activityLevel as keyof typeof activityContext] || activityContext.medium;
    
    const enhancedSubjects = {
      medium: [
        `🌟 ${userName}, your AI journey awaits!`,
        `✨ Ready to rediscover Helium, ${userName}?`,
        `🚀 ${userName}, let's reignite your creativity!`,
        `💡 ${userName}, new possibilities are waiting!`
      ],
      low: [
        `💙 ${userName}, we're thinking of you`,
        `🤗 ${userName}, no rush - we'll be here`,
        `🌱 ${userName}, your growth matters to us`,
        `☕ ${userName}, take your time, we understand`
      ]
    };

    const enhancedMessages = {
      medium: `Hi ${userName}! 👋\n\nWe've been thinking about you...`, // Truncated for brevity in this file copy, assuming full content is not critical for logic structure or user can restore if needed. I'll paste full content to be safe.
      low: `Hello ${userName}, 💙\n\nWe hope this message finds you well...`
    };
    
    // Actually, I should probably copy the full text to avoid regressions if this logic is used.
    // Re-inserting full text from previous read_file.
    
    const fullMessages = {
      medium: `Hi ${userName}! 👋
    
We've been thinking about you and noticed you haven't been as active on Helium recently. We completely understand that life gets busy, but we wanted to reach out because we genuinely miss having you as part of our community! 

Your current activity level is ${activityLevel}, and we think you might love exploring some of the exciting new features we've added since you last visited. 

Here's what's new that might interest you:
✨ Enhanced AI capabilities with better responses
🎨 New creative tools for your projects  
📊 Improved analytics to track your progress
🤝 A more vibrant community of creators

We believe in your potential and would love to see you back in action. Whether you're looking to ${context.suggestions[0]}, ${context.suggestions[1]}, or just want to ${context.suggestions[2]}, we're here to support you every step of the way.

Remember, every great journey has its pauses - and that's perfectly okay! When you're ready to continue, we'll be here with open arms and exciting new possibilities.

Take care, and we hope to see you back soon! 🌟

With warm regards,
The Helium Team 💙`,
      low: `Hello ${userName}, 💙

We hope this message finds you well. We've noticed you haven't been active on Helium lately, and we wanted to reach out - not to pressure you, but simply to let you know that you're missed and valued.

Your current activity level is ${activityLevel}, and we want you to know that there's absolutely no rush to return. Life has its seasons, and we understand that sometimes you need to step back and focus on other things.

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
    };

    const subjects = enhancedSubjects[activityLevel as keyof typeof enhancedSubjects] || enhancedSubjects.medium;
    const messages = fullMessages[activityLevel as keyof typeof fullMessages] || fullMessages.medium;
    
    return {
      subject: subjects[Math.floor(Math.random() * subjects.length)],
      message: messages
    };
  };

  const fetchUsageLogs = async (
    page: number = 1,
    limit: number = itemsPerPage,
    search: string = searchQuery,
    silent: boolean = false,
    userType: 'internal' | 'external' = userTypeFilter,
    activity: string = activityFilter,
    sort: string = sortBy,
    range: string = timeRange
  ) => {
    try {
      if (!silent) {
        setLoading(true);
        setIsBackgroundRefreshing(false);
      } else {
        setIsBackgroundRefreshing(true);
      }
      setError(null);
      
      const response = await fetch('/api/usage-logs-aggregated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page,
          limit,
          searchQuery: search,
          activityFilter: activity,
          userTypeFilter: userType,
          sortBy: sort,
          timeRange: range,
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {}
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch usage logs');
      }

      setGrandTotalTokens(result.grandTotalTokens || 0);
      setGrandTotalCost(result.grandTotalCost || 0);

      if (!result.data || result.data.length === 0) {
        setUsageLogs([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const deriveActivityLevel = (daysSince: number | null | undefined) => {
        if (daysSince === null || daysSince === undefined) return 'inactive';
        if (daysSince <= 2) return 'high';
        if (daysSince === 3) return 'medium';
        if (daysSince > 3) return 'low';
        return 'inactive';
      };

      const transformedLogs = result.data.map((row: any) => {
        const daysSince = row.days_since_last_activity as number | null | undefined;
        return {
          userId: row.user_id,
          userName: row.user_name,
          userEmail: row.user_email,
          totalPromptTokens: parseInt(row.total_prompt_tokens),
          totalCompletionTokens: parseInt(row.total_completion_tokens),
          totalTokens: parseInt(row.total_tokens),
          totalEstimatedCost: parseFloat(row.total_estimated_cost),
          usageCount: parseInt(row.usage_count),
          earliestActivity: new Date(row.earliest_activity),
          latestActivity: new Date(row.latest_activity),
          hasCompletedPayment: row.has_completed_payment,
          daysSinceLastActivity: daysSince ?? null,
          activityScore: row.activity_score,
          activityLevel: deriveActivityLevel(daysSince),
          userType: row.user_type as 'internal' | 'external',
        };
      });

      const filteredLogs =
        activityFilter && activityFilter !== 'all'
          ? transformedLogs.filter((log: any) => log.activityLevel === activityFilter)
          : transformedLogs;

      setUsageLogs(filteredLogs);
      setTotalCount(filteredLogs.length);
      setCurrentPage(page);
      setLoading(false);
      setIsBackgroundRefreshing(false);
      
    } catch (err) {
      console.error('Error fetching usage logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch usage logs');
      setLoading(false);
      setIsBackgroundRefreshing(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    fetchUsageLogs(1, itemsPerPage, query, false, userTypeFilter, activityFilter, sortBy, timeRange);
  };

  const handleActivityFilter = (filter: string) => {
    setActivityFilter(filter);
    setCurrentPage(1);
    fetchUsageLogs(1, itemsPerPage, searchQuery, false, userTypeFilter, filter, sortBy, timeRange);
  };

  const handleUserTypeFilter = (filter: 'internal' | 'external') => {
    setUserTypeFilter(filter);
    setCurrentPage(1);
    fetchUsageLogs(1, itemsPerPage, searchQuery, false, filter, activityFilter, sortBy, timeRange);
  };

  const handleSort = (sort: string) => {
    setSortBy(sort);
    setCurrentPage(1);
    fetchUsageLogs(1, itemsPerPage, searchQuery, false, userTypeFilter, activityFilter, sort, timeRange);
  };

  const handleTimeRange = (range: string) => {
    setTimeRange(range);
    setCurrentPage(1);
    fetchUsageLogs(1, itemsPerPage, searchQuery, false, userTypeFilter, activityFilter, sortBy, range);
  };

  const refreshUsageLogs = () => {
    fetchUsageLogs(currentPage, itemsPerPage, searchQuery, false, userTypeFilter, activityFilter, sortBy, timeRange);
  };

  const loadPage = (page: number) => {
    fetchUsageLogs(page, itemsPerPage, searchQuery, false, userTypeFilter, activityFilter, sortBy, timeRange);
  };

  const loadNextPage = () => {
    if (currentPage < Math.ceil(totalCount / itemsPerPage)) {
      fetchUsageLogs(currentPage + 1, itemsPerPage, searchQuery, false, userTypeFilter, activityFilter, sortBy, timeRange);
    }
  };

  const loadPreviousPage = () => {
    if (currentPage > 1) {
      fetchUsageLogs(currentPage - 1, itemsPerPage, searchQuery, false, userTypeFilter, activityFilter, sortBy, timeRange);
    }
  };

  useEffect(() => {
    fetchUsageLogs(1, itemsPerPage, searchQuery, false, userTypeFilter, activityFilter, sortBy, timeRange);
  }, []);

  useEffect(() => {
    let updateTimeout: NodeJS.Timeout | null = null;

    const debouncedUpdate = () => {
      if (updateTimeout) clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        console.log('🔄 Silent background refresh triggered by real-time event');
        fetchUsageLogs(currentPage, itemsPerPage, searchQuery, true, userTypeFilter, activityFilter, sortBy, timeRange);
      }, 500);
    };

    const usageLogsSubscription = supabase
      .channel('usage_logs_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'usage_logs' },
        (payload) => {
          const record = payload.new || payload.old;
          if (record) debouncedUpdate();
        }
      )
      .subscribe();

    const creditPurchasesSubscription = supabase
      .channel('credit_purchases_changes_logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'credit_purchases' },
        (payload) => {
          const newRecord = payload.new as any;
          if (newRecord?.status === 'completed' || payload.eventType === 'DELETE') {
            debouncedUpdate();
          }
        }
      )
      .subscribe();

    return () => {
      if (updateTimeout) clearTimeout(updateTimeout);
      usageLogsSubscription.unsubscribe();
      creditPurchasesSubscription.unsubscribe();
    };
  }, [currentPage, searchQuery, userTypeFilter, activityFilter, sortBy, timeRange]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return { 
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
    enhanceCustomEmail,
    handleSort,
    sortBy,
    handleTimeRange,
    timeRange
  };
}

