import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usersApi, creditsApi } from '@/services/api-client';

const LAST_SEEN_USERS_COUNT_KEY = 'last_seen_users_count';
const LAST_SEEN_PAID_USERS_COUNT_KEY = 'last_seen_paid_users_count';

type NewUsersNotification = {
  readonly newUsersCount: number;
  readonly newPaidUsersCount: number;
  readonly clearNewUsers: () => Promise<void>;
  readonly clearNewPaidUsers: () => Promise<void>;
  readonly refresh: () => Promise<void>;
};

export function useNewUsersNotification(): NewUsersNotification {
  const [newUsersCount, setNewUsersCount] = useState<number>(0);
  const [newPaidUsersCount, setNewPaidUsersCount] = useState<number>(0);

  const checkNewUsers = useCallback(async () => {
    try {
      // Fetch current user counts
      const [users, purchases] = await Promise.all([
        usersApi.getAll(),
        creditsApi.getPurchases('completed'),
      ]);

      const currentUsersCount = users.length;
      
      // Get unique user IDs from purchases (paid users)
      const paidUserIds = new Set(purchases.map((p) => p.user_id));
      const currentPaidUsersCount = paidUserIds.size;

      // Get last seen counts from storage
      const [lastSeenUsersCountStr, lastSeenPaidUsersCountStr] = await Promise.all([
        AsyncStorage.getItem(LAST_SEEN_USERS_COUNT_KEY),
        AsyncStorage.getItem(LAST_SEEN_PAID_USERS_COUNT_KEY),
      ]);

      const lastSeenUsersCount = lastSeenUsersCountStr ? parseInt(lastSeenUsersCountStr, 10) : currentUsersCount;
      const lastSeenPaidUsersCount = lastSeenPaidUsersCountStr
        ? parseInt(lastSeenPaidUsersCountStr, 10)
        : currentPaidUsersCount;

      // Calculate new users
      const newUsers = Math.max(0, currentUsersCount - lastSeenUsersCount);
      const newPaidUsers = Math.max(0, currentPaidUsersCount - lastSeenPaidUsersCount);

      setNewUsersCount(newUsers);
      setNewPaidUsersCount(newPaidUsers);
    } catch (error) {
      console.error('Error checking new users:', error);
      // On error, don't show notifications
      setNewUsersCount(0);
      setNewPaidUsersCount(0);
    }
  }, []);

  const clearNewUsers = useCallback(async () => {
    try {
      const users = await usersApi.getAll();
      const currentUsersCount = users.length;
      await AsyncStorage.setItem(LAST_SEEN_USERS_COUNT_KEY, currentUsersCount.toString());
      setNewUsersCount(0);
    } catch (error) {
      console.error('Error clearing new users notification:', error);
    }
  }, []);

  const clearNewPaidUsers = useCallback(async () => {
    try {
      const purchases = await creditsApi.getPurchases('completed');
      const paidUserIds = new Set(purchases.map((p) => p.user_id));
      const currentPaidUsersCount = paidUserIds.size;
      await AsyncStorage.setItem(LAST_SEEN_PAID_USERS_COUNT_KEY, currentPaidUsersCount.toString());
      setNewPaidUsersCount(0);
    } catch (error) {
      console.error('Error clearing new paid users notification:', error);
    }
  }, []);

  useEffect(() => {
    checkNewUsers();
    
    // Refresh every 30 seconds to check for new users
    const interval = setInterval(() => {
      checkNewUsers();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [checkNewUsers]);

  return {
    newUsersCount,
    newPaidUsersCount,
    clearNewUsers,
    clearNewPaidUsers,
    refresh: checkNewUsers,
  };
}

