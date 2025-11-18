type AppConfig = {
  readonly apiBaseUrl: string;
  readonly backendUrl: string;
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
};

let cachedConfig: AppConfig | null = null;

const normalizeBaseUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (trimmed.length === 0) {
    throw new Error('API base URL cannot be empty');
  }
  return trimmed;
};

export const getAppConfig = (): AppConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Support both old and new env variable names for backward compatibility
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || apiBaseUrl || 'http://localhost:8000';
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable');
  }

  // Warn if using localhost on mobile (won't work on physical devices)
  if (__DEV__ && backendUrl.includes('localhost')) {
    console.warn(
      '⚠️  Backend URL uses localhost. This will not work on physical iOS/Android devices. ' +
      'Use your computer\'s IP address instead (e.g., http://192.168.1.100:8000). ' +
      'Set EXPO_PUBLIC_BACKEND_URL environment variable.'
    );
  }

  cachedConfig = {
    apiBaseUrl: apiBaseUrl ? normalizeBaseUrl(apiBaseUrl) : normalizeBaseUrl(backendUrl),
    backendUrl: normalizeBaseUrl(backendUrl),
    supabaseUrl: normalizeBaseUrl(supabaseUrl),
    supabaseAnonKey,
  };

  return cachedConfig;
};


