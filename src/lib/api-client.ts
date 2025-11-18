/**
 * API client for backend service.
 * This client handles all communication with the FastAPI backend.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

interface RequestOptions extends RequestInit {
  token?: string;
}

/**
 * Get authentication token from Supabase session.
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { supabase } = await import('./supabase');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Make API request to backend.
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;
  
  // Get token if not provided
  const authToken = token || await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const url = `${BACKEND_URL}${API_PREFIX}${endpoint}`;
  
  let response: Response | undefined;
  
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      // FastAPI returns errors with 'detail' field, but some may use 'message'
      const errorMessage = errorData.detail || errorData.message || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    // Log detailed error information for debugging
    if (__DEV__) {
      console.error(`[API] Error response from ${endpoint}:`, {
        status: response?.status,
        statusText: response?.statusText,
        errorData: error instanceof Error ? error.message : error,
      });
    }
    throw error;
  }
}

/**
 * Invite Codes API
 */
export const inviteCodesApi = {
  getAll: () => apiRequest('/invite-codes'),
  
  generate: (maxUses: number = 1, expiresInDays: number = 30) =>
    apiRequest('/invite-codes/generate', {
      method: 'POST',
      body: JSON.stringify({ max_uses: maxUses, expires_in_days: expiresInDays }),
    }),
  
  delete: (codeId: string) =>
    apiRequest(`/invite-codes/${codeId}`, {
      method: 'DELETE',
    }),
  
  bulkDelete: (codeIds: string[]) =>
    apiRequest('/invite-codes/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ code_ids: codeIds }),
    }),
  
  archive: (codeId: string) =>
    apiRequest('/invite-codes/archive', {
      method: 'POST',
      body: JSON.stringify({ code_id: codeId }),
    }),
  
  unarchive: (codeId: string) =>
    apiRequest('/invite-codes/unarchive', {
      method: 'POST',
      body: JSON.stringify({ code_id: codeId }),
    }),
  
  bulkArchiveUsed: () =>
    apiRequest('/invite-codes/bulk-archive-used', {
      method: 'POST',
    }),
};

/**
 * Users API
 */
export const usersApi = {
  getAll: () => apiRequest('/users'),
  
  create: (userData: {
    email: string;
    password: string;
    full_name: string;
    preferred_name?: string;
    work_description?: string;
    metadata?: Record<string, any>;
  }) =>
    apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  
  delete: (userId: string) =>
    apiRequest(`/users/${userId}`, {
      method: 'DELETE',
    }),
  
  bulkDelete: (userIds: string[]) =>
    apiRequest('/users/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds }),
    }),
  
  fetchEmails: (userIds: string[]) =>
    apiRequest('/users/fetch-emails', {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    }),
};

/**
 * Credits API
 */
export const creditsApi = {
  getBalances: (userId?: string) => {
    const url = userId ? `/credits/balances?user_id=${userId}` : '/credits/balances';
    return apiRequest(url);
  },
  
  assign: (userId: string, creditsToAdd: number, notes?: string) =>
    apiRequest('/credits/assign', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        credits_to_add: creditsToAdd,
        notes,
      }),
    }),
};

/**
 * Emails API
 */
export const emailsApi = {
  sendBulk: (data: {
    custom_email?: {
      subject: string;
      text_content: string;
      html_content: string;
    };
    selected_user_ids?: string[];
  }) =>
    apiRequest('/emails/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  sendIndividual: (data: {
    individual_email: string;
    subject: string;
    text_content: string;
    html_content: string;
  }) =>
    apiRequest('/emails/individual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getImages: () => apiRequest('/emails/images'),
};

/**
 * Usage Logs API
 */
export const usageLogsApi = {
  getAggregated: (params: {
    page?: number;
    limit?: number;
    search_query?: string;
    activity_filter?: string;
    user_type_filter?: string;
  }) =>
    apiRequest('/usage-logs/aggregated', {
      method: 'POST',
      body: JSON.stringify({
        page: params.page || 1,
        limit: params.limit || 10,
        search_query: params.search_query || '',
        activity_filter: params.activity_filter || 'all',
        user_type_filter: params.user_type_filter || 'external',
      }),
    }),
};

/**
 * Waitlist API
 */
export const waitlistApi = {
  getAll: () => apiRequest('/waitlist'),
  
  archive: (userIds?: string[]) =>
    apiRequest('/waitlist/archive', {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds || null }),
    }),
};

/**
 * Health check (no auth required)
 */
export const healthCheck = async () => {
  const response = await fetch(`${BACKEND_URL}/health`);
  return response.json();
};

