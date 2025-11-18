import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { usageLogsApi, emailsApi } from '@/services/api-client';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type UsageLog = {
  readonly userId: string;
  readonly userName: string;
  readonly userEmail: string;
  readonly totalPromptTokens: number;
  readonly totalCompletionTokens: number;
  readonly totalTokens: number;
  readonly totalEstimatedCost: number;
  readonly usageCount: number;
  readonly earliestActivity: string;
  readonly latestActivity: string;
  readonly hasCompletedPayment: boolean;
  readonly activityLevel: 'high' | 'medium' | 'low' | 'inactive';
  readonly daysSinceLastActivity: number;
  readonly activityScore: number;
  readonly userType: 'internal' | 'external';
};

export function UsageLogsTable(): ReactElement {
  const router = useRouter();
  const theme = useColorScheme();
  const colors = Colors[theme];
  const [usageLogs, setUsageLogs] = useState<readonly UsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [grandTotalTokens, setGrandTotalTokens] = useState(0);
  const [grandTotalCost, setGrandTotalCost] = useState(0);
  const [overallTotalCost, setOverallTotalCost] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [userTypeFilter, setUserTypeFilter] = useState<'internal' | 'external'>('external');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const itemsPerPage = 10;

  // Custom email dialog state
  const [customEmailDialog, setCustomEmailDialog] = useState<{
    isOpen: boolean;
    user: { email: string; name: string; activityLevel: string; userId: string } | null;
  }>({ isOpen: false, user: null });
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sendingCustomEmail, setSendingCustomEmail] = useState(false);
  const [enhancingEmail, setEnhancingEmail] = useState(false);
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set());
  const [emailResults, setEmailResults] = useState<Map<string, { success: boolean; message: string; timestamp: number }>>(new Map());

  // Fetch overall total cost for both external and internal users
  useEffect(() => {
    const fetchOverallTotalCost = async () => {
      try {
        const [externalResponse, internalResponse] = await Promise.all([
          usageLogsApi.getAggregated({
            page: 1,
            limit: 1,
            search_query: '',
            activity_filter: 'all',
            user_type_filter: 'external',
          }),
          usageLogsApi.getAggregated({
            page: 1,
            limit: 1,
            search_query: '',
            activity_filter: 'all',
            user_type_filter: 'internal',
          }),
        ]);

        const externalCost = externalResponse.success ? (externalResponse.grand_total_cost || 0) : 0;
        const internalCost = internalResponse.success ? (internalResponse.grand_total_cost || 0) : 0;

        setOverallTotalCost(externalCost + internalCost);
      } catch (error) {
        console.error('Error fetching overall total cost:', error);
        setOverallTotalCost(0);
      }
    };

    fetchOverallTotalCost();
    const interval = setInterval(fetchOverallTotalCost, 30000);
    return () => clearInterval(interval);
  }, [grandTotalCost]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localSearchQuery !== searchQuery) {
        setSearchQuery(localSearchQuery);
        setCurrentPage(1);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localSearchQuery, searchQuery]);

  const fetchUsageLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const payload = await usageLogsApi.getAggregated({
        page: currentPage,
        limit: itemsPerPage,
        search_query: searchQuery,
        activity_filter: activityFilter,
        user_type_filter: userTypeFilter,
      });

      if (!payload.success) {
        throw new Error('Failed to load usage logs');
      }

      // Transform the data from snake_case to camelCase
      const transformedLogs = (payload.data || []).map((row: any) => ({
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        totalPromptTokens: parseInt(row.total_prompt_tokens) || 0,
        totalCompletionTokens: parseInt(row.total_completion_tokens) || 0,
        totalTokens: parseInt(row.total_tokens) || 0,
        totalEstimatedCost: parseFloat(row.total_estimated_cost) || 0,
        usageCount: parseInt(row.usage_count) || 0,
        earliestActivity: row.earliest_activity,
        latestActivity: row.latest_activity,
        hasCompletedPayment: row.has_completed_payment || false,
        activityLevel: row.activity_level || 'inactive',
        daysSinceLastActivity: parseInt(row.days_since_last_activity) || 0,
        activityScore: parseFloat(row.activity_score) || 0,
        userType: row.user_type || 'external',
      }));

      setUsageLogs(transformedLogs);
      setTotalCount(payload.total_count || 0);
      setGrandTotalTokens(payload.grand_total_tokens || 0);
      setGrandTotalCost(payload.grand_total_cost || 0);
      setLastUpdateTime(new Date());
    } catch (err) {
      console.error('Error fetching usage logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load usage logs');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, activityFilter, userTypeFilter]);

  useEffect(() => {
    fetchUsageLogs();
  }, [fetchUsageLogs]);

  // Format currency
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  // Format date
  const formatDate = useCallback((dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return 'N/A';
    }
  }, []);

  // Format number with commas
  const formatNumber = useCallback((num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  }, []);

  // Format number with 2 decimal places
  const formatNumberWithDecimals = useCallback((num: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const totalLogs = totalCount;
    const totalCost = grandTotalCost;
    const totalTokens = totalCost * 100;
    const uniqueUsers = usageLogs.length;
    const overallTotalCredits = overallTotalCost * 100;

    return {
      totalLogs,
      totalCost,
      totalTokens,
      uniqueUsers,
      overallTotalCredits,
    };
  }, [totalCount, grandTotalCost, usageLogs.length, overallTotalCost]);

  // Pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const goToPrevious = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage((prev) => Math.max(1, prev - 1));
    }
  }, [hasPreviousPage]);

  const goToNext = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage((prev) => Math.min(totalPages, prev + 1));
    }
  }, [hasNextPage, totalPages]);

  // Activity level helpers
  const getActivityIcon = useCallback((level: string): string => {
    switch (level) {
      case 'high': return 'flashlight-line';
      case 'medium': return 'time-line';
      case 'low': return 'alert-line';
      case 'inactive': return 'user-unfollow-line';
      default: return 'pulse-line';
    }
  }, []);

  const getActivityColor = useCallback((level: string): string => {
    switch (level) {
      case 'high': return colors.badgeHigh;
      case 'medium': return colors.badgeMedium;
      case 'low': return colors.badgeLow;
      case 'inactive': return colors.badgeInactive;
      default: return colors.textSecondary;
    }
  }, []);

  const getActivityLabel = useCallback((level: string): string => {
    return level.charAt(0).toUpperCase() + level.slice(1);
  }, []);

  // Handle sending preset activity reminder email
  const handleSendReminder = useCallback(async (userEmail: string, userName: string, activityLevel: string, userId: string) => {
    setSendingEmails((prev) => new Set(prev).add(userId));

    try {
      // Generate activity reminder email content
      const subject = `We miss you, ${userName}! Come back to our AI platform`;
      const textContent = `Hi ${userName},

We noticed you haven't been as active on our platform recently. Your current activity level is ${activityLevel}, and we'd love to have you back!

Feel free to reach out if you have any questions or need assistance getting started again.

Best regards,
The AI Team`;
      const htmlContent = `<p>Hi ${userName},</p>
<p>We noticed you haven't been as active on our platform recently. Your current activity level is ${activityLevel}, and we'd love to have you back!</p>
<p>Feel free to reach out if you have any questions or need assistance getting started again.</p>
<p>Best regards,<br>The AI Team</p>`;

      const result = await emailsApi.sendIndividual({
        individual_email: userEmail,
        subject,
        text_content: textContent,
        html_content: htmlContent,
      });

      const emailResult = {
        success: result.success || false,
        message: result.message || 'Email sent successfully',
        timestamp: Date.now(),
      };

      setEmailResults((prev) => {
        const newMap = new Map(prev);
        newMap.set(userId, emailResult);
        return newMap;
      });
    } catch (error) {
      const emailResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send email',
        timestamp: Date.now(),
      };

      setEmailResults((prev) => {
        const newMap = new Map(prev);
        newMap.set(userId, emailResult);
        return newMap;
      });
    } finally {
      setSendingEmails((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  }, []);

  // Handle opening custom email dialog
  const handleOpenCustomEmail = useCallback((userEmail: string, userName: string, activityLevel: string, userId: string) => {
    setCustomEmailDialog({
      isOpen: true,
      user: { email: userEmail, name: userName, activityLevel, userId },
    });
    setCustomSubject(`We miss you, ${userName}! Come back to our AI platform`);
    setCustomMessage(`Hi ${userName},

We noticed you haven't been as active on our platform recently. We'd love to have you back!

Your current activity level is ${activityLevel}, and we think you might enjoy exploring some of our new features.

Feel free to reach out if you have any questions or need assistance getting started again.

Best regards,
The AI Team`);
  }, []);

  // Handle sending custom email
  const handleSendCustomEmail = useCallback(async () => {
    if (!customEmailDialog.user || !customSubject.trim() || !customMessage.trim()) {
      return;
    }

    setSendingCustomEmail(true);
    try {
      const result = await emailsApi.sendIndividual({
        individual_email: customEmailDialog.user.email,
        subject: customSubject.trim(),
        text_content: customMessage.trim(),
        html_content: customMessage.trim().replace(/\n/g, '<br>'),
      });

      if (result.success) {
        // Close dialog and show success
        setCustomEmailDialog({ isOpen: false, user: null });
        setCustomSubject('');
        setCustomMessage('');
        
        // Show success message in the table
        const emailResult = {
          success: true,
          message: result.message || 'Custom email sent successfully!',
          timestamp: Date.now(),
        };
        
        setEmailResults((prev) => {
          const newMap = new Map(prev);
          newMap.set(customEmailDialog.user!.userId, emailResult);
          return newMap;
        });
      } else {
        // Show error in dialog (matching web version)
        const errorMessage = result.message || 'Failed to send email';
        console.error('Failed to send custom email:', errorMessage);
        Alert.alert('Error', `Failed to send custom email: ${errorMessage}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error sending custom email:', error);
      // Show error alert (matching web version)
      Alert.alert('Error', `Error sending custom email: ${errorMessage}`);
    } finally {
      setSendingCustomEmail(false);
    }
  }, [customEmailDialog, customSubject, customMessage]);

  // Generate enhanced email content (matching web version exactly)
  const generateEnhancedEmailContent = useCallback((userName: string, activityLevel: string, currentSubject: string, currentMessage: string) => {
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
    
    // Enhanced subject lines
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

    // Enhanced message templates
    const enhancedMessages = {
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
    const messages = enhancedMessages[activityLevel as keyof typeof enhancedMessages] || enhancedMessages.medium;
    
    return {
      subject: subjects[Math.floor(Math.random() * subjects.length)],
      message: messages
    };
  }, []);

  // Handle enhancing custom email (matching web version exactly)
  const handleEnhanceEmail = useCallback(async () => {
    if (!customEmailDialog.user) return;

    setEnhancingEmail(true);
    try {
      console.log(`Enhancing email for ${customEmailDialog.user.name} - Activity Level: ${customEmailDialog.user.activityLevel}`);
      
      // Create enhanced content based on activity level and user context (matching web version)
      const enhancedContent = generateEnhancedEmailContent(
        customEmailDialog.user.name,
        customEmailDialog.user.activityLevel,
        customSubject,
        customMessage
      );
      
      setCustomSubject(enhancedContent.subject);
      setCustomMessage(enhancedContent.message);
      
      console.log('Email enhanced successfully');
    } catch (error) {
      console.error('Error enhancing email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to enhance email';
      Alert.alert('Error', `Failed to enhance email: ${errorMessage}`);
    } finally {
      setEnhancingEmail(false);
    }
  }, [customEmailDialog, customSubject, customMessage, generateEnhancedEmailContent]);

  // Handle activity filter change
  const handleActivityFilter = useCallback((filter: string) => {
    setActivityFilter(filter);
    setCurrentPage(1);
  }, []);

  // Handle user type filter change
  const handleUserTypeFilter = useCallback((filter: 'internal' | 'external') => {
    setUserTypeFilter(filter);
    setCurrentPage(1);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setLocalSearchQuery('');
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  if (isLoading && usageLogs.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backButton, { backgroundColor: colors.cardBackground }, pressed && styles.backButtonPressed]}>
                <RemixIcon name="arrow-left-line" size={22} color={colors.textPrimary} />
              </Pressable>
              <ThemedText type="title" style={styles.headerTitle} lightColor={colors.headerText} darkColor={colors.headerText}>
                Usage Logs
              </ThemedText>
            </View>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.iconAccent} />
            <ThemedText type="default" style={styles.loadingText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              Loading usage logs...
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error && usageLogs.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
                <RemixIcon name="arrow-left-line" size={22} color={colors.textPrimary} />
              </Pressable>
              <ThemedText type="title" style={styles.headerTitle}>
                Usage Logs
              </ThemedText>
            </View>
          </View>
          <View style={styles.errorContainer}>
            <ThemedText type="default" style={styles.errorText}>
              {error}
            </ThemedText>
            <Pressable onPress={fetchUsageLogs} style={styles.retryButton}>
              <ThemedText type="defaultSemiBold" style={styles.retryButtonText}>
                Retry
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, { backgroundColor: colors.cardBackground }, pressed && styles.backButtonPressed]}>
              <RemixIcon name="arrow-left-line" size={22} color={colors.textPrimary} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <ThemedText type="title" style={styles.headerTitle} lightColor={colors.headerText} darkColor={colors.headerText}>
                Usage Logs
              </ThemedText>
              <ThemedText type="default" style={styles.headerSubtitle} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                Overall Total Credits: <ThemedText type="defaultSemiBold" lightColor={colors.textPrimary} darkColor={colors.textPrimary}>{formatNumberWithDecimals(stats.overallTotalCredits)}</ThemedText>
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Description and Refresh */}
        <View style={styles.descriptionRow}>
          <View>
            <ThemedText type="default" style={styles.descriptionText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              Monitor AI usage and token consumption
            </ThemedText>
            {lastUpdateTime && (
              <ThemedText type="default" style={styles.updateTimeText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                Last updated: {lastUpdateTime.toLocaleTimeString()} (Real-time)
              </ThemedText>
            )}
          </View>
          <Pressable
            onPress={fetchUsageLogs}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.refreshButton,
              { backgroundColor: colors.cardBackground },
              pressed && styles.refreshButtonPressed,
              isLoading && styles.refreshButtonDisabled,
            ]}>
            <RemixIcon
              name="refresh-line"
              size={20}
              color={isLoading ? colors.textSecondary : colors.textPrimary}
            />
          </Pressable>
        </View>

        {/* User Type Tabs */}
        <View style={[styles.tabContainer, { backgroundColor: colors.inactiveTabBackground }]}>
          <Pressable
            onPress={() => handleUserTypeFilter('external')}
            style={({ pressed }) => [
              styles.tab,
              { backgroundColor: userTypeFilter === 'external' ? colors.activeTabBackground : 'transparent' },
              pressed && styles.tabPressed,
            ]}>
            <RemixIcon
              name="user-line"
              size={16}
              color={userTypeFilter === 'external' ? colors.activeTabText : colors.inactiveTabText}
            />
            <ThemedText
              type="defaultSemiBold"
              style={styles.tabText}
              lightColor={userTypeFilter === 'external' ? colors.activeTabText : colors.inactiveTabText}
              darkColor={userTypeFilter === 'external' ? colors.activeTabText : colors.inactiveTabText}>
              External Users
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => handleUserTypeFilter('internal')}
            style={({ pressed }) => [
              styles.tab,
              { backgroundColor: userTypeFilter === 'internal' ? colors.activeTabBackground : 'transparent' },
              pressed && styles.tabPressed,
            ]}>
            <RemixIcon
              name="building-line"
              size={16}
              color={userTypeFilter === 'internal' ? colors.activeTabText : colors.inactiveTabText}
            />
            <ThemedText
              type="defaultSemiBold"
              style={styles.tabText}
              lightColor={userTypeFilter === 'internal' ? colors.activeTabText : colors.inactiveTabText}
              darkColor={userTypeFilter === 'internal' ? colors.activeTabText : colors.inactiveTabText}>
              Internal Users
            </ThemedText>
          </Pressable>
        </View>

        {/* Search and Activity Filter */}
        <View style={styles.filterRow}>
          <View style={[styles.searchContainer, { backgroundColor: colors.searchBackground, borderColor: colors.searchBorder }]}>
            <RemixIcon name="search-line" size={18} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search users by name, email, or ID..."
              placeholderTextColor={colors.textSecondary}
              value={localSearchQuery}
              onChangeText={setLocalSearchQuery}
            />
            {localSearchQuery.length > 0 && (
              <Pressable onPress={clearSearch} style={styles.clearButton}>
                <RemixIcon name="close-line" size={16} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Activity Filter */}
        <View style={styles.activityFilterContainer}>
          <ThemedText type="default" style={styles.filterLabel} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
            Activity Filter:
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activityFilterScroll}>
            {['all', 'high', 'medium', 'low', 'inactive'].map((filter) => (
              <Pressable
                key={filter}
                onPress={() => handleActivityFilter(filter)}
                style={({ pressed }) => [
                  styles.activityFilterButton,
                  {
                    backgroundColor: activityFilter === filter ? colors.iconAccent : colors.rowBackground,
                    borderColor: colors.divider,
                  },
                  pressed && styles.activityFilterButtonPressed,
                ]}>
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.activityFilterText}
                  lightColor={activityFilter === filter ? colors.iconAccentLight : colors.textPrimary}
                  darkColor={activityFilter === filter ? colors.iconAccentLight : colors.textPrimary}>
                  {filter === 'all' ? 'All Users' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.statHeader}>
              <ThemedText type="defaultSemiBold" style={styles.statTitle} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                Total Users
              </ThemedText>
              <RemixIcon name="pulse-line" size={16} color={colors.textSecondary} />
            </View>
            <ThemedText type="title" style={styles.statValue} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
              {formatNumber(stats.totalLogs)}
            </ThemedText>
            <ThemedText type="default" style={styles.statSubtitle} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              Users with usage logs
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.statHeader}>
              <ThemedText type="defaultSemiBold" style={styles.statTitle} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                Total Credits
              </ThemedText>
              <RemixIcon name="hashtag-line" size={16} color={colors.textSecondary} />
            </View>
            <ThemedText type="title" style={styles.statValue} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
              {formatNumberWithDecimals(stats.totalTokens)}
            </ThemedText>
            <ThemedText type="default" style={styles.statSubtitle} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              Calculated (Total Cost × 100)
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.statHeader}>
              <ThemedText type="defaultSemiBold" style={styles.statTitle} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                Total Cost
              </ThemedText>
              <RemixIcon name="money-dollar-circle-line" size={16} color={colors.textSecondary} />
            </View>
            <ThemedText type="title" style={styles.statValue} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
              {formatCurrency(stats.totalCost)}
            </ThemedText>
            <ThemedText type="default" style={styles.statSubtitle} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              Estimated usage cost
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.statHeader}>
              <ThemedText type="defaultSemiBold" style={styles.statTitle} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                Page Users
              </ThemedText>
              <RemixIcon name="calendar-line" size={16} color={colors.textSecondary} />
            </View>
            <ThemedText type="title" style={styles.statValue} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
              {formatNumber(stats.uniqueUsers)}
            </ThemedText>
            <ThemedText type="default" style={styles.statSubtitle} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              Users on current page
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.statHeader}>
              <ThemedText type="defaultSemiBold" style={styles.statTitle} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                Cache Performance
              </ThemedText>
              <RemixIcon name="flashlight-line" size={16} color={colors.textSecondary} />
            </View>
            <ThemedText type="title" style={styles.statValue}>
              N/A
            </ThemedText>
            <ThemedText type="default" style={styles.statSubtitle}>
              Server-side
            </ThemedText>
          </View>
        </View>

        {/* Usage Logs Table Card */}
        <View style={[styles.tableCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.tableCardHeader}>
            <ThemedText type="subtitle" style={styles.tableCardTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
              Usage Logs
            </ThemedText>
            <ThemedText type="default" style={styles.tableCardDescription} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              {searchQuery || activityFilter !== 'all' ? (
                <>Filtered results ({totalCount} {userTypeFilter === 'internal' ? 'internal' : 'external'} user{totalCount !== 1 ? 's' : ''} found)</>
              ) : (
                <>Aggregated AI usage by {userTypeFilter === 'internal' ? 'internal' : 'external'} users ({totalCount} unique users)</>
              )}
            </ThemedText>
          </View>

          {/* Usage Logs List */}
          {usageLogs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <RemixIcon name="file-list-3-line" size={48} color={colors.textSecondary} />
              <ThemedText type="default" style={styles.emptyText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                {searchQuery || activityFilter !== 'all' ? 'No users found' : 'No usage data found'}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.logsList}>
              {usageLogs.map((log) => (
                <View key={log.userId} style={[styles.logCard, { backgroundColor: colors.rowBackground, borderColor: colors.divider }]}>
                  {/* User Info */}
                  <View style={styles.logHeader}>
                    <View style={styles.userInfo}>
                      {log.hasCompletedPayment && (
                        <View style={[styles.paidIndicator, { backgroundColor: colors.badgeHigh }]} />
                      )}
                      <View style={styles.userDetails}>
                        <ThemedText type="defaultSemiBold" style={styles.userName} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                          {log.userName}
                        </ThemedText>
                        <ThemedText type="default" style={styles.userEmail} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                          {log.userEmail}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Activity Level */}
                  <View style={[styles.activitySection, { borderTopColor: colors.divider }]}>
                    <View style={styles.activityRow}>
                      <RemixIcon
                        name={getActivityIcon(log.activityLevel)}
                        size={18}
                        color={getActivityColor(log.activityLevel)}
                      />
                      <View style={[styles.activityBadge, { backgroundColor: getActivityColor(log.activityLevel) + '20' }]}>
                        <ThemedText
                          type="defaultSemiBold"
                          style={[styles.activityBadgeText, { color: getActivityColor(log.activityLevel) }]}>
                          {getActivityLabel(log.activityLevel)}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText type="default" style={styles.activityTimeText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                      {log.daysSinceLastActivity === 0
                        ? 'Today'
                        : log.daysSinceLastActivity === 1
                        ? '1 day ago'
                        : `${log.daysSinceLastActivity} days ago`}
                    </ThemedText>
                    {(log.activityLevel === 'medium' || log.activityLevel === 'low') && (
                      <View style={styles.emailButtonsRow}>
                        <Pressable
                          onPress={() => handleSendReminder(log.userEmail, log.userName, log.activityLevel, log.userId)}
                          disabled={sendingEmails.has(log.userId)}
                          style={({ pressed }) => [
                            styles.emailButton,
                            { borderColor: colors.divider },
                            pressed && styles.emailButtonPressed,
                            sendingEmails.has(log.userId) && styles.emailButtonDisabled,
                          ]}>
                          {sendingEmails.has(log.userId) ? (
                            <ActivityIndicator size="small" color={colors.iconAccent} />
                          ) : (
                            <RemixIcon name="mail-line" size={14} color={colors.iconAccent} />
                          )}
                          <ThemedText
                            type="defaultSemiBold"
                            style={styles.emailButtonText}
                            lightColor={sendingEmails.has(log.userId) ? colors.textSecondary : colors.iconAccent}
                            darkColor={sendingEmails.has(log.userId) ? colors.textSecondary : colors.iconAccent}>
                            {sendingEmails.has(log.userId) ? 'Sending...' : 'Quick Reminder'}
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={() => handleOpenCustomEmail(log.userEmail, log.userName, log.activityLevel, log.userId)}
                          disabled={sendingEmails.has(log.userId)}
                          style={({ pressed }) => [
                            styles.emailButton,
                            { borderColor: colors.divider },
                            pressed && styles.emailButtonPressed,
                            sendingEmails.has(log.userId) && styles.emailButtonDisabled,
                          ]}>
                          <RemixIcon name="edit-line" size={14} color={colors.iconAccent} />
                          <ThemedText
                            type="defaultSemiBold"
                            style={styles.emailButtonText}
                            lightColor={sendingEmails.has(log.userId) ? colors.textSecondary : colors.iconAccent}
                            darkColor={sendingEmails.has(log.userId) ? colors.textSecondary : colors.iconAccent}>
                            Custom Email
                          </ThemedText>
                        </Pressable>
                        {emailResults.has(log.userId) && (
                          <View style={styles.emailResult}>
                            <ThemedText
                              type="default"
                              style={styles.emailResultText}
                              lightColor={emailResults.get(log.userId)?.success ? colors.badgeHigh : colors.badgeInactive}
                              darkColor={emailResults.get(log.userId)?.success ? colors.badgeHigh : colors.badgeInactive}>
                              {emailResults.get(log.userId)?.success ? '✓ Sent' : '✗ Failed'}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Usage Details */}
                  <View style={[styles.logDetails, { borderTopColor: colors.divider }]}>
                    <View style={styles.logRow}>
                      <ThemedText type="default" style={styles.logLabel} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                        Total estimated credits
                      </ThemedText>
                      <ThemedText type="defaultSemiBold" style={styles.logValue} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                        {formatNumber(Math.round(log.totalEstimatedCost * 100))}
                      </ThemedText>
                    </View>
                    <View style={styles.logRow}>
                      <ThemedText type="default" style={styles.logLabel} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                        Usage Count
                      </ThemedText>
                      <View style={[styles.usageCountBadge, { backgroundColor: colors.badgeBackground }]}>
                        <ThemedText type="defaultSemiBold" style={styles.usageCountText} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                          {log.usageCount} sessions
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.logRow}>
                      <ThemedText type="default" style={styles.logLabel} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                        Activity Period
                      </ThemedText>
                      <View style={styles.activityPeriod}>
                        <ThemedText type="default" style={styles.activityPeriodText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                          From: {formatDate(log.earliestActivity)}
                        </ThemedText>
                        <ThemedText type="default" style={styles.activityPeriodText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                          To: {formatDate(log.latestActivity)}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={[styles.pagination, { borderTopColor: colors.divider }]}>
              <ThemedText type="default" style={styles.paginationText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                {searchQuery || activityFilter !== 'all' ? (
                  <>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} filtered results</>
                ) : (
                  <>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} users</>
                )}
              </ThemedText>
              <View style={styles.paginationButtons}>
                <Pressable
                  onPress={goToPrevious}
                  disabled={!hasPreviousPage || isLoading}
                  style={({ pressed }) => [
                    styles.paginationButton,
                    { backgroundColor: colors.rowBackground, borderColor: colors.divider },
                    (!hasPreviousPage || isLoading) && styles.paginationButtonDisabled,
                    pressed && hasPreviousPage && !isLoading && styles.paginationButtonPressed,
                  ]}>
                  <RemixIcon
                    name="arrow-left-s-line"
                    size={16}
                    color={!hasPreviousPage || isLoading ? colors.textSecondary : colors.textPrimary}
                  />
                  <ThemedText
                    type="defaultSemiBold"
                    style={styles.paginationButtonText}
                    lightColor={!hasPreviousPage || isLoading ? colors.textSecondary : colors.textPrimary}
                    darkColor={!hasPreviousPage || isLoading ? colors.textSecondary : colors.textPrimary}>
                    Previous
                  </ThemedText>
                </Pressable>
                <View style={styles.pageNumbers}>
                  {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Pressable
                        key={page}
                        onPress={() => goToPage(page)}
                        disabled={isLoading}
                        style={({ pressed }) => [
                          styles.pageNumberButton,
                          {
                            backgroundColor: currentPage === page ? colors.iconAccent : colors.rowBackground,
                            borderColor: currentPage === page ? colors.iconAccent : colors.divider,
                          },
                          pressed && styles.pageNumberButtonPressed,
                        ]}>
                        <ThemedText
                          type="defaultSemiBold"
                          style={styles.pageNumberText}
                          lightColor={currentPage === page ? colors.iconAccentLight : colors.textPrimary}
                          darkColor={currentPage === page ? colors.iconAccentLight : colors.textPrimary}>
                          {page}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  onPress={goToNext}
                  disabled={!hasNextPage || isLoading}
                  style={({ pressed }) => [
                    styles.paginationButton,
                    { backgroundColor: colors.rowBackground, borderColor: colors.divider },
                    (!hasNextPage || isLoading) && styles.paginationButtonDisabled,
                    pressed && hasNextPage && !isLoading && styles.paginationButtonPressed,
                  ]}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={styles.paginationButtonText}
                    lightColor={!hasNextPage || isLoading ? colors.textSecondary : colors.textPrimary}
                    darkColor={!hasNextPage || isLoading ? colors.textSecondary : colors.textPrimary}>
                    Next
                  </ThemedText>
                  <RemixIcon
                    name="arrow-right-s-line"
                    size={16}
                    color={!hasNextPage || isLoading ? colors.textSecondary : colors.textPrimary}
                  />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Custom Email Dialog */}
      <Modal
        visible={customEmailDialog.isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCustomEmailDialog({ isOpen: false, user: null })}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <View style={styles.modalHeaderLeft}>
                <RemixIcon name="edit-line" size={20} color={colors.textPrimary} />
                <ThemedText type="subtitle" style={styles.modalTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                  Send Custom Reminder Email
                </ThemedText>
              </View>
              <Pressable
                onPress={() => setCustomEmailDialog({ isOpen: false, user: null })}
                style={({ pressed }) => [styles.modalCloseButton, pressed && styles.modalCloseButtonPressed]}>
                <RemixIcon name="close-line" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>
            <ThemedText type="default" style={styles.modalDescription} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
              Send a personalized reminder email to {customEmailDialog.user?.name} ({customEmailDialog.user?.email})
            </ThemedText>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.modalForm}>
                <View style={styles.formField}>
                  <ThemedText type="defaultSemiBold" style={styles.formLabel} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Email Subject
                  </ThemedText>
                  <TextInput
                    style={[styles.formInput, { borderColor: colors.inputBorder, color: '#000000' }]}
                    placeholder="Enter email subject..."
                    placeholderTextColor={colors.textSecondary}
                    value={customSubject}
                    onChangeText={setCustomSubject}
                  />
                </View>

                <View style={styles.formField}>
                  <ThemedText type="defaultSemiBold" style={styles.formLabel} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Email Message
                  </ThemedText>
                  <TextInput
                    style={[styles.formTextArea, styles.formInput, { borderColor: colors.inputBorder, color: '#000000' }]}
                    placeholder="Enter your custom message..."
                    placeholderTextColor={colors.textSecondary}
                    value={customMessage}
                    onChangeText={setCustomMessage}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                  />
                  <View style={styles.messageFooter}>
                    <ThemedText type="default" style={styles.characterCount} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                      {customMessage.length} characters
                    </ThemedText>
                    <Pressable
                      onPress={handleEnhanceEmail}
                      disabled={enhancingEmail || !customMessage.trim()}
                      style={({ pressed }) => [
                        styles.enhanceButton,
                        { backgroundColor: colors.buttonSecondary, borderColor: colors.divider },
                        pressed && styles.enhanceButtonPressed,
                        (enhancingEmail || !customMessage.trim()) && styles.enhanceButtonDisabled,
                      ]}>
                      {enhancingEmail ? (
                        <ActivityIndicator size="small" color={colors.iconAccent} />
                      ) : (
                        <RemixIcon name="sparkling-2-line" size={14} color={colors.iconAccent} />
                      )}
                      <ThemedText
                        type="defaultSemiBold"
                        style={styles.enhanceButtonText}
                        lightColor={(enhancingEmail || !customMessage.trim()) ? colors.textSecondary : colors.iconAccent}
                        darkColor={(enhancingEmail || !customMessage.trim()) ? colors.textSecondary : colors.iconAccent}>
                        {enhancingEmail ? 'Enhancing...' : 'Enhance with AI'}
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.emailPreview, { backgroundColor: colors.badgeBackground }]}>
                  <ThemedText type="defaultSemiBold" style={styles.previewTitle} lightColor={colors.textPrimary} darkColor={colors.textPrimary}>
                    Email Preview
                  </ThemedText>
                  <ThemedText type="default" style={styles.previewText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                    <ThemedText type="defaultSemiBold" lightColor={colors.textPrimary} darkColor={colors.textPrimary}>To:</ThemedText> {customEmailDialog.user?.email}
                  </ThemedText>
                  <ThemedText type="default" style={styles.previewText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                    <ThemedText type="defaultSemiBold" lightColor={colors.textPrimary} darkColor={colors.textPrimary}>Subject:</ThemedText> {customSubject || 'No subject'}
                  </ThemedText>
                  <ThemedText type="default" style={styles.previewText} lightColor={colors.textSecondary} darkColor={colors.textSecondary}>
                    <ThemedText type="defaultSemiBold" lightColor={colors.textPrimary} darkColor={colors.textPrimary}>Activity Level:</ThemedText> {customEmailDialog.user?.activityLevel}
                  </ThemedText>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.divider }]}>
              <Pressable
                onPress={() => setCustomEmailDialog({ isOpen: false, user: null })}
                disabled={sendingCustomEmail}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonCancel,
                  { backgroundColor: colors.cardBackground, borderColor: colors.inputBorder },
                  pressed && styles.modalButtonPressed,
                  sendingCustomEmail && styles.modalButtonDisabled,
                ]}>
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.modalButtonText}
                  lightColor={sendingCustomEmail ? colors.textSecondary : colors.textPrimary}
                  darkColor={sendingCustomEmail ? colors.textSecondary : colors.textPrimary}>
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSendCustomEmail}
                disabled={!customSubject.trim() || !customMessage.trim() || sendingCustomEmail}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonSend,
                  { backgroundColor: colors.buttonPrimary },
                  pressed && styles.modalButtonPressed,
                  (!customSubject.trim() || !customMessage.trim() || sendingCustomEmail) && styles.modalButtonDisabled,
                ]}>
                {sendingCustomEmail ? (
                  <ActivityIndicator size="small" color={colors.iconAccentLight} />
                ) : (
                  <RemixIcon name="send-plane-2-line" size={16} color={colors.iconAccentLight} />
                )}
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.modalButtonText}
                  lightColor={colors.iconAccentLight}
                  darkColor={colors.iconAccentLight}>
                  {sendingCustomEmail ? 'Sending...' : 'Send Custom Email'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    // Background color applied inline
  },
  backButtonPressed: {
    opacity: 0.8,
  },
  headerTitleContainer: {
    flex: 1,
    gap: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  descriptionText: {
    fontSize: 14,
  },
  updateTimeText: {
    fontSize: 12,
    marginTop: 4,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    // Background color applied inline
  },
  refreshButtonPressed: {
    opacity: 0.7,
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    padding: 4,
    // Background color applied inline
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  tabActive: {
    // Background color applied inline
  },
  tabPressed: {
    opacity: 0.7,
  },
  tabText: {
    fontSize: 14,
  },
  tabTextActive: {
    // Color applied inline
  },
  filterRow: {
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
    // Background and border colors applied inline
  },
  searchIcon: {
    marginLeft: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 12,
    // Color applied inline
  },
  clearButton: {
    padding: 4,
  },
  activityFilterContainer: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
  },
  activityFilterScroll: {
    flexDirection: 'row',
  },
  activityFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    // Background and border colors applied inline
  },
  activityFilterButtonActive: {
    // Background and border colors applied inline
  },
  activityFilterButtonPressed: {
    opacity: 0.7,
  },
  activityFilterText: {
    fontSize: 14,
  },
  activityFilterTextActive: {
    color: '#FFFFFF',
  },
  statsGrid: {
    gap: 16,
  },
  statCard: {
    borderRadius: 22,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 5,
    // Background color applied inline
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statTitle: {
    fontSize: 15,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  statSubtitle: {
    fontSize: 14,
  },
  tableCard: {
    borderRadius: 24,
    padding: 20,
    gap: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
    // Background color applied inline
  },
  tableCardHeader: {
    gap: 6,
  },
  tableCardTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  tableCardDescription: {
    fontSize: 14,
  },
  logsList: {
    gap: 12,
  },
  logCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 16,
    // Background and border colors applied inline
  },
  logHeader: {
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paidIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    // Background color applied inline
  },
  userDetails: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 16,
  },
  userEmail: {
    fontSize: 14,
  },
  activitySection: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    // Border color applied inline
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    // Background color applied inline
  },
  activityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activityTimeText: {
    fontSize: 12,
  },
  emailButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    // Border color applied inline
  },
  emailButtonPressed: {
    opacity: 0.7,
  },
  emailButtonDisabled: {
    opacity: 0.5,
  },
  emailButtonText: {
    fontSize: 12,
  },
  emailButtonTextDisabled: {
    // Color applied inline
  },
  emailResult: {
    marginLeft: 4,
  },
  emailResultText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emailResultSuccess: {
    // Color applied inline
  },
  emailResultError: {
    // Color applied inline
  },
  logDetails: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    // Border color applied inline
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  logLabel: {
    fontSize: 14,
    flex: 1,
  },
  logValue: {
    fontSize: 14,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  usageCountBadge: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    // Background color applied inline
  },
  usageCountText: {
    fontSize: 12,
  },
  activityPeriod: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  activityPeriodText: {
    fontSize: 14,
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    // Background color applied inline
  },
  retryButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  pagination: {
    marginTop: 16,
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    // Border color applied inline
  },
  paginationText: {
    fontSize: 14,
    textAlign: 'center',
  },
  paginationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    // Border and background colors applied inline
  },
  paginationButtonPressed: {
    opacity: 0.7,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
  },
  paginationButtonTextDisabled: {
    // Color applied inline
  },
  pageNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageNumberButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Border and background colors applied inline
  },
  pageNumberButtonActive: {
    // Background and border colors applied inline
  },
  pageNumberButtonPressed: {
    opacity: 0.7,
  },
  pageNumberText: {
    fontSize: 14,
  },
  pageNumberTextActive: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
    // Background color applied inline
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    // Border color applied inline
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonPressed: {
    opacity: 0.7,
  },
  modalDescription: {
    fontSize: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalForm: {
    padding: 20,
    gap: 20,
  },
  formField: {
    gap: 8,
  },
  formLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formLabel: {
    fontSize: 14,
  },
  enhanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    // Border and background colors applied inline
  },
  enhanceButtonPressed: {
    opacity: 0.7,
  },
  enhanceButtonDisabled: {
    opacity: 0.5,
  },
  enhanceButtonText: {
    fontSize: 12,
  },
  enhanceButtonTextDisabled: {
    // Color applied inline
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    // Border and text colors applied inline
  },
  formTextArea: {
    minHeight: 160,
    textAlignVertical: 'top',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
  },
  emailPreview: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
    // Background color applied inline
  },
  previewTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  previewText: {
    fontSize: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    // Border color applied inline
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
    // Background and border colors applied inline
  },
  modalButtonSend: {
    // Background color applied inline
  },
  modalButtonPressed: {
    opacity: 0.7,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    fontSize: 14,
  },
  modalButtonTextSend: {
    color: '#FFFFFF',
  },
  modalButtonTextDisabled: {
    // Color applied inline
  },
});

