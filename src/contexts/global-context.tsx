"use client";
import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { dbOperations } from "@/lib/db";
import { getNameFromEmail } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { logSecurityEvent } from "@/lib/security-logger";
import type {
  CreditUsage,
  CreditUsageGrouped,
  UserProfile,
  UsageLog,
} from "@/lib/types";

// Global flags to prevent duplicate fetches
let isFetchingCreditUsage = false;
let isFetchingUserProfiles = false;

// Cleanup guard interface
interface CleanupGuard {
  isCleaningUp: boolean;
  lastCleanupTime: number | null;
}

// Utility function for fetch with AbortController support
interface FetchWithAbortOptions extends RequestInit {
  abortKey: string;
}

const fetchWithAbort = async (
  url: string,
  options: FetchWithAbortOptions,
  abortControllers: Map<string, AbortController>
): Promise<Response> => {
  const { abortKey, ...fetchOptions } = options;

  // Create new AbortController
  const controller = new AbortController();
  abortControllers.set(abortKey, controller);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    return response;
  } finally {
    // Cleanup controller from Map after request completes
    abortControllers.delete(abortKey);
  }
};

// Helper to fetch emails for users
const fetchEmailsForUsers = async (
  userIds: string[],
  abortControllers?: Map<string, AbortController>
): Promise<Map<string, string>> => {
  const userIdToEmail = new Map<string, string>();
  if (userIds.length === 0) return userIdToEmail;

  try {
    let response: Response;

    if (abortControllers) {
      // Use fetchWithAbort if abortControllers provided
      response = await fetchWithAbort(
        "/api/fetch-user-emails",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds }),
          abortKey: "fetch-user-emails",
        },
        abortControllers
      );
    } else {
      // Fallback to regular fetch for backward compatibility
      response = await fetch("/api/fetch-user-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      });
    }

    if (response.ok) {
      const userData = await response.json();
      userData.forEach((user: any) => {
        userIdToEmail.set(user.id, user.email);
      });
    } else {
      // Fallback to admin if available
      if (supabaseAdmin) {
        try {
          const { data: authUsers } =
            await supabaseAdmin.auth.admin.listUsers();
          if (authUsers?.users) {
            authUsers.users.forEach((user) => {
              if (userIds.includes(user.id) && user.email) {
                userIdToEmail.set(user.id, user.email);
              }
            });
          }
        } catch (e) {
          console.warn(e);
        }
      }
    }
  } catch (e: any) {
    // Handle AbortError gracefully
    if (e.name === "AbortError") {
      console.log("[Security] Request aborted: fetch-user-emails");
      return userIdToEmail;
    }
    console.warn("Failed to fetch emails", e);
  }
  return userIdToEmail;
};

// Transform credit usage row
const transformCreditUsage = (row: any): CreditUsage => ({
  id: row.id,
  userId: row.user_id,
  amountDollars: parseFloat(row.amount_dollars),
  threadId: row.thread_id,
  messageId: row.message_id,
  description: row.description,
  usageType: row.usage_type,
  createdAt: new Date(row.created_at),
  subscriptionTier: row.subscription_tier,
  metadata: row.metadata || {},
  userEmail: "Email not available",
  userName: `User ${row.user_id.slice(0, 8)}`,
});

// Group credit usage data
const groupUsageData = (rawData: CreditUsage[]): CreditUsageGrouped[] => {
  const grouped = rawData.reduce(
    (acc: Record<string, CreditUsageGrouped>, usage) => {
      const userId = usage.userId;

      if (!acc[userId]) {
        acc[userId] = {
          userId: userId,
          totalAmountDollars: 0,
          recordCount: 0,
          usageTypes: [],
          descriptions: [],
          threadIds: [],
          messageIds: [],
          subscriptionTier: usage.subscriptionTier,
          earliestCreatedAt: usage.createdAt,
          latestCreatedAt: usage.createdAt,
          metadata: usage.metadata,
          userEmail: usage.userEmail,
          userName: usage.userName,
        };
      }

      acc[userId].totalAmountDollars += usage.amountDollars;
      acc[userId].recordCount += 1;

      if (
        usage.usageType &&
        !acc[userId].usageTypes.includes(usage.usageType)
      ) {
        acc[userId].usageTypes.push(usage.usageType);
      }
      if (
        usage.description &&
        !acc[userId].descriptions.includes(usage.description)
      ) {
        acc[userId].descriptions.push(usage.description);
      }
      if (usage.threadId && !acc[userId].threadIds.includes(usage.threadId)) {
        acc[userId].threadIds.push(usage.threadId);
      }
      if (
        usage.messageId &&
        !acc[userId].messageIds.includes(usage.messageId)
      ) {
        acc[userId].messageIds.push(usage.messageId);
      }

      if (usage.createdAt < acc[userId].earliestCreatedAt) {
        acc[userId].earliestCreatedAt = usage.createdAt;
      }
      if (usage.createdAt > acc[userId].latestCreatedAt) {
        acc[userId].latestCreatedAt = usage.createdAt;
      }

      return acc;
    },
    {}
  );

  return Object.values(grouped).sort(
    (a, b) => b.totalAmountDollars - a.totalAmountDollars
  );
};

// Transform user profile row
const transformUserProfile = (row: any, email?: string): UserProfile => {
  let fullName = row.full_name;
  const emailValue = email || "Email not available";

  if (
    !fullName ||
    fullName.trim() === "" ||
    fullName.trim().toLowerCase() === "user"
  ) {
    if (email && email !== "Email not available" && email.includes("@")) {
      fullName = getNameFromEmail(email);
    } else {
      fullName = fullName || "User";
    }
  }

  return {
    id: row.id,
    userId: row.user_id,
    fullName: fullName,
    preferredName: row.preferred_name,
    workDescription: row.work_description,
    personalReferences: row.personal_references,
    countryName:
      row.country_name ||
      row.country ||
      row.metadata?.countryName ||
      row.metadata?.country ||
      null,
    countryCode:
      row.country_code || row.countryCode || row.metadata?.countryCode || null,
    regionName:
      row.region ||
      row.state ||
      row.region_name ||
      row.metadata?.region ||
      row.metadata?.state ||
      null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    avatarUrl: row.avatar_url,
    referralSource: row.referral_source,
    consentGiven: row.consent_given,
    consentDate: row.consent_date ? new Date(row.consent_date) : null,
    email: emailValue,
    metadata: row.metadata || null,
    planType: row.plan_type || "seed",
    accountType: row.account_type || "individual",
  };
};

type GlobalContextProps = {
  // Notification state
  showNotifications: boolean;
  setShowNotifications: (showNotifications: boolean) => void;
  hasNotifications: boolean;
  setHasNotifications: (hasNotifications: boolean) => void;

  // Tab notifications
  tabNotifications: {
    transactions: boolean;
    users: boolean;
    credits: boolean;
  };
  setTabNotifications: (
    tab: "transactions" | "users" | "credits",
    hasNotification: boolean
  ) => void;
  clearTabNotification: (tab: "transactions" | "users" | "credits") => void;

  // Credit Usage
  creditUsage: CreditUsageGrouped[];
  rawUsage: CreditUsage[];
  creditUsageLoading: boolean;
  creditUsageError: string | null;
  refreshCreditUsage: () => Promise<void>;

  // User Profiles
  userProfiles: UserProfile[];
  userProfilesLoading: boolean;
  userProfilesError: string | null;
  refreshUserProfiles: () => Promise<void>;
  deleteUserProfile: (
    profileId: string
  ) => Promise<{ success: boolean; message: string }>;
  bulkDeleteUserProfiles: (profileIds: string[]) => Promise<{
    success: boolean;
    message: string;
    deletedCount?: number;
    authDeleteErrors?: any[];
    failedUserIds?: string[];
  }>;

  // Usage Logs
  usageLogs: UsageLog[];
  usageLogsLoading: boolean;
  usageLogsError: string | null;
  totalCount: number;
  grandTotalTokens: number;
  grandTotalCost: number;
  refreshUsageLogs: (config?: any) => Promise<void>;

  // Cleanup functions
  abortAllRequests: () => void;
  cleanupRealtimeSubscriptions: () => Promise<void>;
  clearAllData: () => Promise<void>;
};

const GlobalContext = createContext<GlobalContextProps | null>(null);

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  // Consume authentication state from AuthProvider
  const { isAuthenticated, isLoading } = useAuth();

  // Refs for tracking abort controllers and subscriptions
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const subscriptionsRef = useRef<Map<string, any>>(new Map());

  // Cleanup guard ref
  const cleanupGuardRef = useRef<CleanupGuard>({
    isCleaningUp: false,
    lastCleanupTime: null,
  });

  // Ref to track previous authentication state for logging
  const prevAuthStateRef = useRef<{
    isAuthenticated: boolean;
    isLoading: boolean;
  } | null>(null);

  // Notification state
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [hasNotifications, setHasNotifications] = useState<boolean>(false);

  // Tab notifications state
  const [tabNotifications, setTabNotificationsState] = useState({
    transactions: false,
    users: false,
    credits: false,
  });

  // Credit Usage state
  const [creditUsage, setCreditUsage] = useState<CreditUsageGrouped[]>([]);
  const [rawUsage, setRawUsage] = useState<CreditUsage[]>([]);
  const [creditUsageLoading, setCreditUsageLoading] = useState(true);
  const [creditUsageError, setCreditUsageError] = useState<string | null>(null);

  // User Profiles state
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [userProfilesLoading, setUserProfilesLoading] = useState(true);
  const [userProfilesError, setUserProfilesError] = useState<string | null>(
    null
  );
  const [userProfilesTableName, setUserProfilesTableName] = useState<
    string | null
  >(null);

  // Usage Logs state
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [usageLogsLoading, setUsageLogsLoading] = useState(true);
  const [usageLogsError, setUsageLogsError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [grandTotalTokens, setGrandTotalTokens] = useState(0);
  const [grandTotalCost, setGrandTotalCost] = useState(0);

  // Cleanup guard helper functions
  const shouldProceedWithCleanup = useCallback((): boolean => {
    if (cleanupGuardRef.current.isCleaningUp) {
      console.log("[Security] Cleanup already in progress, skipping");
      return false;
    }
    return true;
  }, []);

  const markCleanupStarted = useCallback((): void => {
    cleanupGuardRef.current.isCleaningUp = true;
    cleanupGuardRef.current.lastCleanupTime = Date.now();
  }, []);

  const markCleanupCompleted = useCallback((): void => {
    cleanupGuardRef.current.isCleaningUp = false;
  }, []);

  // Tab notification functions
  const setTabNotifications = useCallback(
    (tab: "transactions" | "users" | "credits", hasNotification: boolean) => {
      setTabNotificationsState((prev) => ({
        ...prev,
        [tab]: hasNotification,
      }));
    },
    []
  );

  const clearTabNotification = useCallback(
    (tab: "transactions" | "users" | "credits") => {
      setTabNotificationsState((prev) => ({
        ...prev,
        [tab]: false,
      }));
    },
    []
  );

  // Credit Usage functions
  const fetchCreditUsage = useCallback(async () => {
    if (isFetchingCreditUsage) return;
    isFetchingCreditUsage = true;

    // Create AbortController for this request
    const controller = new AbortController();
    abortControllersRef.current.set("fetch-credit-usage", controller);

    try {
      setCreditUsageLoading(true);

      // Fetch only last 30 days of data instead of all historical data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("credit_usage")
        .select("*")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .abortSignal(controller.signal);

      if (error) throw error;

      if (!data || data.length === 0) {
        setRawUsage([]);
        setCreditUsage([]);
        await dbOperations.clear("credit_usage");
        return;
      }

      // Transform data
      const transformedUsage: CreditUsage[] = data.map(transformCreditUsage);

      // Fetch user emails for recent usage
      const userIds = [...new Set(transformedUsage.map((u) => u.userId))];
      const emailMap = await fetchEmailsForUsers(
        userIds,
        abortControllersRef.current
      );

      // Apply emails to usage data
      transformedUsage.forEach((usage) => {
        if (emailMap.has(usage.userId)) {
          usage.userEmail = emailMap.get(usage.userId)!;
          usage.userName = getNameFromEmail(usage.userEmail);
        }
      });

      setRawUsage(transformedUsage);
      setCreditUsage(groupUsageData(transformedUsage));
      setCreditUsageError(null);

      // Cache the data with error handling
      try {
        await dbOperations.putAll("credit_usage", transformedUsage);
      } catch (cacheError) {
        console.error(
          "[Security] Error caching credit usage to IndexedDB:",
          cacheError
        );
        // Continue even if caching fails - data is already in state
      }
    } catch (err: any) {
      // Handle AbortError gracefully
      if (err.name === "AbortError") {
        console.log("[Security] Request aborted: fetch-credit-usage");
        return;
      }
      console.error("Error fetching credit usage:", err);
      setCreditUsageError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreditUsageLoading(false);
      isFetchingCreditUsage = false;
      // Cleanup controller from Map
      abortControllersRef.current.delete("fetch-credit-usage");
    }
  }, []);

  // User Profiles functions
  const fetchUserProfiles = useCallback(async () => {
    if (isFetchingUserProfiles) return;
    isFetchingUserProfiles = true;

    // Create AbortController for this request
    const controller = new AbortController();
    abortControllersRef.current.set("fetch-user-profiles", controller);

    try {
      setUserProfilesLoading(true);

      let profilesData: any[] = [];
      let detectedTableName = "user_profiles";

      // Fetch all profiles (keeping pagination for now, but only called once)
      const fetchAllProfiles = async (table: string) => {
        let allRows: any[] = [];
        let from = 0;
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .range(from, from + limit - 1)
            .order("created_at", { ascending: false })
            .abortSignal(controller.signal);

          if (error) throw error;

          if (data && data.length > 0) {
            allRows = [...allRows, ...data];
            if (data.length < limit) hasMore = false;
            else from += limit;
          } else {
            hasMore = false;
          }
        }
        return allRows;
      };

      try {
        profilesData = await fetchAllProfiles("user_profiles");
        detectedTableName = "user_profiles";
      } catch (err: any) {
        if (
          err.message &&
          err.message.includes('relation "public.user_profiles" does not exist')
        ) {
          profilesData = await fetchAllProfiles("user_profile");
          detectedTableName = "user_profile";
        } else {
          throw err;
        }
      }

      setUserProfilesTableName(detectedTableName);

      if (!profilesData || profilesData.length === 0) {
        setUserProfiles([]);
        await dbOperations.clear("user_profiles");
        return;
      }

      // Check cache and fetch emails for new profiles
      const cachedProfiles = await dbOperations.getAll("user_profiles");
      const cachedMap = new Map(cachedProfiles.map((p) => [p.userId, p]));

      const profilesToFetchEmail: string[] = [];
      const transformedProfiles: UserProfile[] = [];

      profilesData.forEach((row) => {
        const cached = cachedMap.get(row.user_id);
        const rowUpdated = new Date(row.updated_at).getTime();
        const cachedUpdated = cached?.updatedAt?.getTime();

        if (
          cached &&
          rowUpdated === cachedUpdated &&
          cached.email !== "Email not available"
        ) {
          transformedProfiles.push(cached);
        } else {
          profilesToFetchEmail.push(row.user_id);
          transformedProfiles.push(transformUserProfile(row));
        }
      });

      // Fetch emails for profiles that need them
      if (profilesToFetchEmail.length > 0) {
        const emailMap = await fetchEmailsForUsers(
          profilesToFetchEmail,
          abortControllersRef.current
        );

        for (let i = 0; i < transformedProfiles.length; i++) {
          const p = transformedProfiles[i];
          if (profilesToFetchEmail.includes(p.userId)) {
            const email = emailMap.get(p.userId);
            if (email) {
              transformedProfiles[i] = transformUserProfile(
                profilesData.find((r) => r.user_id === p.userId)!,
                email
              );
            }
          }
        }
      }

      setUserProfiles(transformedProfiles);
      setUserProfilesError(null);

      // Cache the data with error handling
      try {
        await dbOperations.putAll("user_profiles", transformedProfiles);
      } catch (cacheError) {
        console.error(
          "[Security] Error caching user profiles to IndexedDB:",
          cacheError
        );
        // Continue even if caching fails - data is already in state
      }
    } catch (err: any) {
      // Handle AbortError gracefully
      if (err.name === "AbortError") {
        console.log("[Security] Request aborted: fetch-user-profiles");
        return;
      }
      console.error("Error fetching user profiles:", err);
      setUserProfilesError(
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setUserProfilesLoading(false);
      isFetchingUserProfiles = false;
      // Cleanup controller from Map
      abortControllersRef.current.delete("fetch-user-profiles");
    }
  }, []);

  // Usage Logs functions
  const fetchUsageLogs = useCallback(async (config: any = {}) => {
    try {
      setUsageLogsLoading(true);
      setUsageLogsError(null);

      const response = await fetchWithAbort(
        "/api/usage-logs-aggregated",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: config.page || 1,
            limit: config.limit || 10,
            searchQuery: config.search || "",
            activityFilter: config.activity || "all",
            userTypeFilter: config.userType || "external",
            sortBy: config.sort || "latest_activity",
            timeRange: config.range || "all",
          }),
          abortKey: "fetch-usage-logs",
        },
        abortControllersRef.current
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setUsageLogs(result.data || []);
        setTotalCount(result.totalCount || 0);
        setGrandTotalTokens(result.grandTotalTokens || 0);
        setGrandTotalCost(result.grandTotalCost || 0);
      } else {
        throw new Error(result.error || "Failed to fetch usage logs");
      }
    } catch (err: any) {
      // Handle AbortError gracefully
      if (err.name === "AbortError") {
        console.log("[Security] Request aborted: fetch-usage-logs");
        return;
      }
      console.error("Error fetching usage logs:", err);
      setUsageLogsError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUsageLogsLoading(false);
    }
  }, []);

  // Refresh functions
  const refreshCreditUsage = useCallback(async () => {
    setCreditUsageLoading(true);
    await fetchCreditUsage();
  }, [fetchCreditUsage]);

  const refreshUserProfiles = useCallback(async () => {
    setUserProfilesLoading(true);
    await fetchUserProfiles();
  }, [fetchUserProfiles]);

  const refreshUsageLogs = useCallback(
    async (config?: any) => {
      await fetchUsageLogs(config);
    },
    [fetchUsageLogs]
  );

  // Delete functions
  const deleteUserProfile = useCallback(
    async (
      profileId: string
    ): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await fetch(
          `/api/delete-user-profile?profileId=${profileId}`,
          {
            method: "DELETE",
          }
        );
        const result = await response.json();
        if (result.success) {
          setUserProfiles((prev) => prev.filter((p) => p.id !== profileId));

          // Delete from cache with error handling
          try {
            await dbOperations.delete("user_profiles", profileId);
          } catch (cacheError) {
            console.error(
              "[Security] Error deleting user profile from cache:",
              cacheError
            );
            // Continue - the profile is already removed from state
          }

          return {
            success: true,
            message: result.message || "User profile deleted successfully",
          };
        }
        throw new Error(result.message || "Failed to delete user profile");
      } catch (err) {
        return {
          success: false,
          message:
            err instanceof Error
              ? err.message
              : "Failed to delete user profile",
        };
      }
    },
    []
  );

  const bulkDeleteUserProfiles = useCallback(
    async (
      profileIds: string[]
    ): Promise<{
      success: boolean;
      message: string;
      deletedCount?: number;
      authDeleteErrors?: any[];
      failedUserIds?: string[];
    }> => {
      try {
        if (!profileIds || profileIds.length === 0)
          return { success: false, message: "No profiles selected" };

        const response = await fetch("/api/bulk-delete-user-profiles", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileIds }),
        });
        const result = await response.json();

        // Optimistic updates
        const successfulDeletes = profileIds.filter(
          (id) => !result.failedUserIds?.includes(id)
        );
        if (successfulDeletes.length > 0) {
          setUserProfiles((prev) =>
            prev.filter((p) => !successfulDeletes.includes(p.id))
          );

          // Delete from cache with error handling
          for (const id of successfulDeletes) {
            try {
              await dbOperations.delete("user_profiles", id);
            } catch (cacheError) {
              console.error(
                `[Security] Error deleting user profile ${id} from cache:`,
                cacheError
              );
              // Continue with other deletions
            }
          }
        }

        if (result.deletedCount > 0 && result.authDeleteErrors?.length > 0) {
          return {
            success: false,
            message: result.message || "Partial success",
            deletedCount: result.deletedCount,
            authDeleteErrors: result.authDeleteErrors,
            failedUserIds: result.failedUserIds,
          };
        }

        if (!response.ok || !result.success) throw new Error(result.message);

        return {
          success: true,
          message: result.message,
          deletedCount: result.deletedCount,
        };
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : "Failed",
        };
      }
    },
    []
  );

  // Clear all data function
  const clearAllData = useCallback(async () => {
    // Check cleanup guard - prevent duplicate execution
    if (!shouldProceedWithCleanup()) {
      return;
    }

    // Mark cleanup as started
    markCleanupStarted();

    try {
      // Log data clearing start
      logSecurityEvent({
        type: "data_clear",
        details: {
          action: "clear_started",
        },
      });

      // Clear component state
      setCreditUsage([]);
      setRawUsage([]);
      setUserProfiles([]);
      setUsageLogs([]);
      setTotalCount(0);
      setGrandTotalTokens(0);
      setGrandTotalCost(0);

      // Clear notification state
      setShowNotifications(false);
      setHasNotifications(false);
      setTabNotificationsState({
        transactions: false,
        users: false,
        credits: false,
      });

      // Log notification state clearing
      logSecurityEvent({
        type: "data_clear",
        details: {
          action: "notification_state_cleared",
        },
      });

      // Delete entire IndexedDB database with fallback strategy
      try {
        await dbOperations.deleteDatabase();
        console.log("[Security] IndexedDB database deleted successfully");

        // Log IndexedDB deletion success
        logSecurityEvent({
          type: "data_clear",
          details: {
            action: "indexeddb_database_deleted",
          },
        });
      } catch (error) {
        console.error("[Security] Error deleting IndexedDB database:", error);

        // Log IndexedDB deletion error
        logSecurityEvent({
          type: "data_clear",
          details: {
            action: "indexeddb_delete_error",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });

        // Fallback: Clear individual stores
        console.log(
          "[Security] Attempting fallback: clearing individual stores..."
        );

        const storesToClear = [
          "waitlist",
          "invite_codes",
          "user_profiles",
          "credit_usage",
          "credit_purchases",
          "subscriptions",
          "credit_balances",
          "sync_metadata",
        ] as const;

        for (const storeName of storesToClear) {
          try {
            await dbOperations.clear(storeName);
            console.log(`[Security] Cleared IndexedDB store: ${storeName}`);
          } catch (storeError) {
            console.error(
              `[Security] Error clearing store ${storeName}:`,
              storeError
            );

            // Log store clearing error
            logSecurityEvent({
              type: "data_clear",
              details: {
                action: "indexeddb_store_clear_error",
                store: storeName,
                error:
                  storeError instanceof Error
                    ? storeError.message
                    : "Unknown error",
              },
            });
          }
        }

        // Log fallback completion
        logSecurityEvent({
          type: "data_clear",
          details: {
            action: "indexeddb_fallback_cleared",
            stores: Array.from(storesToClear),
          },
        });
      }

      // Clear sessionStorage sensitive data (excluding auth tokens which are handled by logout)
      // Add any other sensitive data keys here if needed

      console.log("[Security] All data cleared");

      // Log data clearing completion
      logSecurityEvent({
        type: "data_clear",
        details: {
          action: "clear_completed",
        },
      });
    } catch (error) {
      console.error("[Security] Error in clearAllData:", error);

      // Log data clearing error
      logSecurityEvent({
        type: "data_clear",
        details: {
          action: "clear_error",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      // Don't throw - we want to continue even if clearing fails
    } finally {
      // Always mark cleanup as completed, even if errors occurred
      markCleanupCompleted();
    }
  }, [shouldProceedWithCleanup, markCleanupStarted, markCleanupCompleted]);

  // Abort all requests function
  const abortAllRequests = useCallback(() => {
    try {
      // Check if there are any controllers to abort
      if (abortControllersRef.current.size === 0) {
        console.log("[Security] No requests to abort");
        return;
      }

      // Iterate through all abort controllers
      abortControllersRef.current.forEach((controller, key) => {
        try {
          console.log(`[Security] Aborting request: ${key}`);
          controller.abort();
        } catch (error) {
          console.error(`[Security] Error aborting ${key}:`, error);
          // Continue with other aborts
        }
      });

      // Always clear the Map after aborting all
      abortControllersRef.current.clear();

      console.log("[Security] All requests aborted");
    } catch (error) {
      console.error("[Security] Error in abortAllRequests:", error);
      // Don't throw - we want to continue even if aborting fails
    }
  }, []);

  // Log authentication state changes
  useEffect(() => {
    // Only log if we have a previous state to compare
    if (prevAuthStateRef.current !== null) {
      const previousAuth = prevAuthStateRef.current.isAuthenticated;
      const currentAuth = isAuthenticated;

      // Log only if authentication state actually changed
      if (previousAuth !== currentAuth) {
        logSecurityEvent({
          type: "auth_change",
          details: {
            previous_state: previousAuth,
            new_state: currentAuth,
            is_loading: isLoading,
          },
        });

       
      }
    }

    // Update previous state
    prevAuthStateRef.current = { isAuthenticated, isLoading };
  }, [isAuthenticated, isLoading]);

  // Initialize data on mount - only when authenticated
  useEffect(() => {
    // Early return if not authenticated or still loading
    if (!isAuthenticated || isLoading) {
      return;
    }

    // Load cached data first for better UX - only when authenticated
    const loadCache = async () => {
      // Double-check authentication before loading cache
      if (!isAuthenticated) {
        return;
      }

      try {
        const cachedUsage = await dbOperations.getAll("credit_usage");
        if (cachedUsage && cachedUsage.length > 0) {
          setRawUsage(cachedUsage);
          setCreditUsage(groupUsageData(cachedUsage));
          setCreditUsageLoading(false);
        }
      } catch (error) {
        console.error("[Security] Error loading cached credit usage:", error);
        // Continue without cached data
      }

      try {
        const cachedProfiles = await dbOperations.getAll("user_profiles");
        if (cachedProfiles && cachedProfiles.length > 0) {
          setUserProfiles(cachedProfiles);
          setUserProfilesLoading(false);
        }
      } catch (error) {
        console.error("[Security] Error loading cached user profiles:", error);
        // Continue without cached data
      }
    };

    loadCache();

    // Fetch fresh data
    fetchCreditUsage();
    fetchUserProfiles();

    // Cleanup function that aborts all requests
    return () => {
      abortAllRequests();
    };
  }, [
    isAuthenticated,
    isLoading,
    fetchCreditUsage,
    fetchUserProfiles,
    abortAllRequests,
  ]);

  // Setup realtime subscriptions function
  const setupRealtimeSubscriptions = useCallback(() => {
    // Credit usage realtime
    const creditUsageSubscription = supabase
      .channel("global_credit_usage")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "credit_usage" },
        async (payload) => {
          // console.log("Global credit usage update:", payload);

          // Check authentication before processing subscription data
          if (!isAuthenticated) {
            console.warn(
              "[Security] Received subscription data when unauthenticated - ignoring"
            );
            return;
          }

          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            const row = payload.new;
            const newUsage: CreditUsage = transformCreditUsage(row);

            // Fetch email for new usage
            const emailMap = await fetchEmailsForUsers([newUsage.userId]);
            if (emailMap.has(newUsage.userId)) {
              newUsage.userEmail = emailMap.get(newUsage.userId)!;
              newUsage.userName = getNameFromEmail(newUsage.userEmail);
            }

            setRawUsage((prev) => {
              const updated =
                payload.eventType === "INSERT"
                  ? [newUsage, ...prev]
                  : prev.map((u) => (u.id === newUsage.id ? newUsage : u));
              setCreditUsage(groupUsageData(updated));

              // Cache with error handling
              dbOperations.put("credit_usage", newUsage).catch((error) => {
                console.error(
                  "[Security] Error caching credit usage update:",
                  error
                );
              });

              return updated;
            });
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setRawUsage((prev) => {
              const updated = prev.filter((u) => u.id !== deletedId);
              setCreditUsage(groupUsageData(updated));

              // Delete from cache with error handling
              dbOperations.delete("credit_usage", deletedId).catch((error) => {
                console.error(
                  "[Security] Error deleting credit usage from cache:",
                  error
                );
              });

              return updated;
            });
          }
        }
      )
      .subscribe();

    // User profiles realtime
    const userProfilesSubscription = supabase
      .channel("global_user_profiles")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: userProfilesTableName || "user_profiles",
        },
        async (payload) => {
          // console.log("Global user profiles update:", payload);

          // Check authentication before processing subscription data
          if (!isAuthenticated) {
            console.warn(
              "[Security] Received subscription data when unauthenticated - ignoring"
            );
            return;
          }

          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            const userId = payload.new.user_id;
            const emailMap = await fetchEmailsForUsers([userId]);
            const email = emailMap.get(userId);
            const newProfile = transformUserProfile(payload.new, email);

            setUserProfiles((prev) =>
              payload.eventType === "INSERT"
                ? [newProfile, ...prev]
                : prev.map((p) => (p.id === newProfile.id ? newProfile : p))
            );

            // Cache with error handling
            dbOperations.put("user_profiles", newProfile).catch((error) => {
              console.error(
                "[Security] Error caching user profile update:",
                error
              );
            });
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setUserProfiles((prev) => prev.filter((p) => p.id !== deletedId));

            // Delete from cache with error handling
            dbOperations.delete("user_profiles", deletedId).catch((error) => {
              console.error(
                "[Security] Error deleting user profile from cache:",
                error
              );
            });
          }
        }
      )
      .subscribe();

    // Store subscriptions in ref Map
    subscriptionsRef.current.set("credit_usage", creditUsageSubscription);
    subscriptionsRef.current.set("user_profiles", userProfilesSubscription);

    console.log("[Security] Realtime subscriptions setup complete");
  }, [isAuthenticated, userProfilesTableName]);

  // Cleanup realtime subscriptions function
  const cleanupRealtimeSubscriptions = useCallback(async () => {
    try {
      // Check if there are any subscriptions to clean up (idempotent check)
      if (subscriptionsRef.current.size === 0) {
        console.log("[Security] No subscriptions to clean up");
        return;
      }

      const subscriptionKeys = Array.from(subscriptionsRef.current.keys());

      // Log the start of cleanup
      logSecurityEvent({
        type: "subscription_cleanup",
        details: {
          action: "cleanup_started",
          subscription_count: subscriptionKeys.length,
          subscriptions: subscriptionKeys,
        },
      });

      // Use Promise.allSettled to handle individual failures gracefully
      const unsubscribePromises = Array.from(
        subscriptionsRef.current.entries()
      ).map(async ([key, channel]) => {
        try {
          await channel.unsubscribe();
          console.log(`[Security] Unsubscribed from ${key}`);

          // Log each unsubscription event
          logSecurityEvent({
            type: "subscription_cleanup",
            details: {
              action: "unsubscribed",
              subscription_key: key,
            },
          });
        } catch (error) {
          console.error(`[Security] Failed to unsubscribe from ${key}:`, error);

          // Log unsubscription failure
          logSecurityEvent({
            type: "subscription_cleanup",
            details: {
              action: "unsubscribe_failed",
              subscription_key: key,
              error: error instanceof Error ? error.message : "Unknown error",
            },
          });
          // Don't throw - let Promise.allSettled handle it
        }
      });

      // Wait for all unsubscriptions to complete (using Promise.allSettled)
      await Promise.allSettled(unsubscribePromises);

      // Always clear the subscriptions ref, even if some unsubscribes failed
      subscriptionsRef.current.clear();

      console.log("[Security] All realtime subscriptions cleaned up");

      // Log cleanup completion
      logSecurityEvent({
        type: "subscription_cleanup",
        details: {
          action: "cleanup_completed",
          subscription_count: subscriptionKeys.length,
        },
      });
    } catch (error) {
      console.error("[Security] Error in cleanupRealtimeSubscriptions:", error);

      // Always clear the ref on error
      subscriptionsRef.current.clear();

      // Log cleanup error
      logSecurityEvent({
        type: "subscription_cleanup",
        details: {
          action: "cleanup_error",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      // Don't throw - ensure function completes
    }
  }, []);

  // Realtime subscriptions - only when authenticated
  useEffect(() => {
    // Early return if not authenticated or still loading
    if (!isAuthenticated || isLoading) {
      return;
    }

    // Setup subscriptions when authenticated
    setupRealtimeSubscriptions();

    // Cleanup function that respects the cleanup guard
    return () => {
      // Only cleanup if not already cleaning up
      if (!cleanupGuardRef.current.isCleaningUp) {
        cleanupRealtimeSubscriptions();
      }
    };
  }, [
    isAuthenticated,
    isLoading,
    userProfilesTableName,
    setupRealtimeSubscriptions,
    cleanupRealtimeSubscriptions,
  ]);

  return (
    <GlobalContext.Provider
      value={{
        // Notifications
        showNotifications,
        setShowNotifications,
        hasNotifications,
        setHasNotifications,

        // Tab notifications
        tabNotifications,
        setTabNotifications,
        clearTabNotification,

        // Credit Usage
        creditUsage,
        rawUsage,
        creditUsageLoading,
        creditUsageError,
        refreshCreditUsage,

        // User Profiles
        userProfiles,
        userProfilesLoading,
        userProfilesError,
        refreshUserProfiles,
        deleteUserProfile,
        bulkDeleteUserProfiles,

        // Usage Logs
        usageLogs,
        usageLogsLoading,
        usageLogsError,
        totalCount,
        grandTotalTokens,
        grandTotalCost,
        refreshUsageLogs,

        // Cleanup functions
        abortAllRequests,
        cleanupRealtimeSubscriptions,
        clearAllData,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobal = () => {
  const cxt = useContext(GlobalContext);
  if (!cxt) {
    throw new Error("useGlobal must be used within a GlobalProvider");
  }
  return cxt;
};
