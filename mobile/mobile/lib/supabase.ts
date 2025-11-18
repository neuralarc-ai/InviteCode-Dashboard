import { createClient } from '@supabase/supabase-js';
import { getAppConfig } from '@/utils/config';

const getSupabaseConfig = () => {
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required');
}

  return { supabaseUrl, supabaseAnonKey };
};

const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: async (key: string) => {
        try {
          const { getItemAsync } = await import('expo-secure-store');
          return await getItemAsync(key);
        } catch (error) {
          console.error('Error getting item from secure store:', error);
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          const { setItemAsync } = await import('expo-secure-store');
          await setItemAsync(key, value);
        } catch (error) {
          console.error('Error setting item in secure store:', error);
        }
      },
      removeItem: async (key: string) => {
        try {
          const { deleteItemAsync } = await import('expo-secure-store');
          await deleteItemAsync(key);
        } catch (error) {
          console.error('Error removing item from secure store:', error);
        }
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (process.env.NODE_ENV !== 'production') {
  console.info('Supabase client configured', {
    hasPublicConfig: Boolean(supabaseUrl && supabaseAnonKey),
  });
}
