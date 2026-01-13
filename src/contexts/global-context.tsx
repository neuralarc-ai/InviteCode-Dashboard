"use client";
import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { dbOperations } from "@/lib/db";
import { getNameFromEmail } from "@/lib/utils";
import type {
  CreditUsage,
  CreditUsageGrouped,
  UserProfile,
  UsageLog,
} from "@/lib/types";

// Global flags to prevent duplicate fetches
let isFetchingCreditUsage = false;
let isFetchingUserProfiles = false;

// Helper to fetch emails for users
const fetchEmailsForUsers = async (
  userIds: string[]
): Promise<Map<string, string>> => {
  const userIdToEmail = new Map<string, string>();
  if (userIds.length === 0) return userIdToEmail;

  try {
    const response = await fetch("/api/fetch-user-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds }),
    });

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
  } catch (e) {
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
  bulkDeleteUserProfiles: (
    profileIds: string[]
  ) => Promise<{
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
};

const GlobalContext = createContext<GlobalContextProps | null>(null);

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  // Notification state
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [hasNotifications, setHasNotifications] = useState<boolean>(false);

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

  // Credit Usage functions
  const fetchCreditUsage = useCallback(async () => {
    if (isFetchingCreditUsage) return;
    isFetchingCreditUsage = true;

    try {
      console.log("Fetching recent credit usage...");
      setCreditUsageLoading(true);

      // Fetch only last 30 days of data instead of all historical data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("credit_usage")
        .select("*")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

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
      const emailMap = await fetchEmailsForUsers(userIds);

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

      // Cache the data
      await dbOperations.putAll("credit_usage", transformedUsage);
    } catch (err) {
      console.error("Error fetching credit usage:", err);
      setCreditUsageError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreditUsageLoading(false);
      isFetchingCreditUsage = false;
    }
  }, []);

  // User Profiles functions
  const fetchUserProfiles = useCallback(async () => {
    if (isFetchingUserProfiles) return;
    isFetchingUserProfiles = true;

    try {
      console.log("Fetching user profiles...");
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
            .order("created_at", { ascending: false });

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
        const emailMap = await fetchEmailsForUsers(profilesToFetchEmail);

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
      await dbOperations.putAll("user_profiles", transformedProfiles);
    } catch (err) {
      console.error("Error fetching user profiles:", err);
      setUserProfilesError(
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setUserProfilesLoading(false);
      isFetchingUserProfiles = false;
    }
  }, []);

  // Usage Logs functions
  const fetchUsageLogs = useCallback(async (config: any = {}) => {
    try {
      setUsageLogsLoading(true);
      setUsageLogsError(null);

      const response = await fetch("/api/usage-logs-aggregated", {
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
      });

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
    } catch (err) {
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
          await dbOperations.delete("user_profiles", profileId);
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
          for (const id of successfulDeletes) {
            await dbOperations.delete("user_profiles", id);
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

  // Initialize data on mount
  useEffect(() => {
    // Load cached data first for better UX
    const loadCache = async () => {
      try {
        const cachedUsage = await dbOperations.getAll("credit_usage");
        if (cachedUsage && cachedUsage.length > 0) {
          setRawUsage(cachedUsage);
          setCreditUsage(groupUsageData(cachedUsage));
          setCreditUsageLoading(false);
        }

        const cachedProfiles = await dbOperations.getAll("user_profiles");
        if (cachedProfiles && cachedProfiles.length > 0) {
          setUserProfiles(cachedProfiles);
          setUserProfilesLoading(false);
        }
      } catch (e) {
        console.warn(e);
      }
    };

    loadCache();

    // Fetch fresh data
    fetchCreditUsage();
    fetchUserProfiles();
  }, [fetchCreditUsage, fetchUserProfiles]);

  // Realtime subscriptions
  useEffect(() => {
    // Credit usage realtime
    const creditUsageSubscription = supabase
      .channel("global_credit_usage")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "credit_usage" },
        async (payload) => {
          console.log("Global credit usage update:", payload);
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
              dbOperations.put("credit_usage", newUsage);
              return updated;
            });
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setRawUsage((prev) => {
              const updated = prev.filter((u) => u.id !== deletedId);
              setCreditUsage(groupUsageData(updated));
              dbOperations.delete("credit_usage", deletedId);
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
          console.log("Global user profiles update:", payload);
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
            dbOperations.put("user_profiles", newProfile);
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setUserProfiles((prev) => prev.filter((p) => p.id !== deletedId));
            dbOperations.delete("user_profiles", deletedId);
          }
        }
      )
      .subscribe();

    return () => {
      creditUsageSubscription.unsubscribe();
      userProfilesSubscription.unsubscribe();
    };
  }, [userProfilesTableName]);

  return (
    <GlobalContext.Provider
      value={{
        // Notifications
        showNotifications,
        setShowNotifications,
        hasNotifications,
        setHasNotifications,

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
