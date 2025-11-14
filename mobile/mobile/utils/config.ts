type AppConfig = {
  readonly apiBaseUrl: string;
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

  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error('Missing EXPO_PUBLIC_API_BASE_URL environment variable');
  }

  cachedConfig = {
    apiBaseUrl: normalizeBaseUrl(apiBaseUrl),
  };

  return cachedConfig;
};


