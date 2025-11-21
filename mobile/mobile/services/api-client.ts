/**
 * API client for FastAPI backend service.
 * This client handles all communication with the FastAPI backend.
 */

import { getAppConfig } from '@/utils/config';

const API_PREFIX = '/api/v1';

interface RequestOptions extends RequestInit {
  token?: string;
}

/**
 * Get admin password from environment or SecureStore.
 * This function can be called from non-React contexts.
 */
async function getAuthToken(): Promise<string | null> {
  try {
    // Get password from environment variable
    const password = process.env.EXPO_PUBLIC_ADMIN_PASSWORD;
    if (password) {
      return password;
    }
    
    // Fallback: try to get from SecureStore
    try {
      const SecureStore = await import('expo-secure-store');
      const isStorageAvailable = await SecureStore.isAvailableAsync();
      
      if (isStorageAvailable) {
        const storedPassword = await SecureStore.getItemAsync('admin_password');
        if (storedPassword) {
          return storedPassword;
        }
      }
    } catch (storeError) {
      console.warn('[API] Error accessing SecureStore:', storeError);
    }
    
    return null;
  } catch (error) {
    console.error('[API] Error getting auth token:', error);
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
  
  const { backendUrl } = getAppConfig();
  const url = `${backendUrl}${API_PREFIX}${endpoint}`;
  
  // Log the request URL in development (helps debug network issues)
  if (__DEV__) {
    console.log(`[API] Making request to: ${url}`, {
      backendUrl,
      endpoint,
      hasToken: Boolean(authToken),
      tokenLength: authToken?.length || 0,
    });
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> || {}),
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  } else {
    console.warn(`[API] No authentication token available for request to ${endpoint}`);
    // For protected endpoints, provide a helpful error message
    if (endpoint.includes('/users') || endpoint.includes('/credits') || 
        endpoint.includes('/invite-codes') || endpoint.includes('/waitlist') ||
        endpoint.includes('/usage-logs') || endpoint.includes('/emails')) {
      throw new Error(
        'Authentication required. Please log in to access this feature.\n\n' +
        'If you are already logged in, try logging out and logging back in.'
      );
    }
  }
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
    
    if (!response.ok) {
      // Try to parse error response
      let errorMessage = `HTTP error! status: ${response.status}`;
      let errorData: any = null;
      
      try {
        errorData = await response.json();
        // FastAPI returns errors in 'detail' field
        // Handle different detail formats (string, array, object)
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            // Validation errors are arrays of objects with 'msg' and 'loc' fields
            const messages = errorData.detail.map((err: any) => {
              if (typeof err === 'string') return err;
              if (err.msg) return `${err.loc?.join('.') || 'field'}: ${err.msg}`;
              return JSON.stringify(err);
            });
            errorMessage = messages.join(', ') || errorMessage;
          } else if (typeof errorData.detail === 'object') {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || errorMessage;
      }
      
      // Log detailed error information for debugging
      if (__DEV__) {
        console.error(`[API] Error response from ${endpoint}:`, {
          status: response.status,
          statusText: response.statusText,
          errorData,
          errorMessage,
        });
      }
      
      // Handle 401 Unauthorized - token expired or missing
      if (response.status === 401) {
        const authErrorMsg = !authToken
          ? 'Authentication required. Please log in to access this feature.'
          : 'Authentication token expired or invalid. Please log in again.';
        console.warn('[API] Authentication error:', authErrorMsg);
        throw new Error(authErrorMsg);
      }
      
      // Handle 409 Conflict - duplicate email or other conflicts
      if (response.status === 409) {
        // Error message should already be set from errorData.detail
        throw new Error(errorMessage);
      }
      
      // Create error with HTTP status info attached
      const httpError = new Error(errorMessage);
      (httpError as any).isHttpError = true;
      (httpError as any).status = response.status;
      throw httpError;
    }
    
    return await response.json();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`API request failed: ${endpoint}`, {
      error: errorMessage,
      url,
      hasToken: Boolean(authToken),
    });
    
    // Only show network error message for actual network failures, not HTTP errors
    // Network errors are TypeError from fetch() failing, not HTTP error responses
    const isNetworkError = 
      error instanceof TypeError || 
      (error instanceof Error && 
       !(error as any).isHttpError && 
       (errorMessage.includes('Network request failed') || 
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('ERR_NETWORK')));
    
    if (isNetworkError) {
      const isLocalhost = backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1');
      const errorMsg = isLocalhost
        ? `Network error: Unable to connect to backend at ${backendUrl}.\n\n` +
          `⚠️  LOCALHOST DETECTED - This won't work on iOS devices!\n\n` +
          `To fix this:\n` +
          `1. Find your computer's IP address:\n` +
          `   - Mac/Linux: Run "ifconfig" and look for "inet" (e.g., 192.168.1.100)\n` +
          `   - Windows: Run "ipconfig" and look for "IPv4 Address"\n\n` +
          `2. Set the environment variable:\n` +
          `   EXPO_PUBLIC_BACKEND_URL=http://YOUR_IP:8000\n\n` +
          `3. Restart your Expo development server\n\n` +
          `Example: EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:8000`
        : `Network error: Unable to connect to backend at ${backendUrl}.\n\n` +
          `Please check:\n` +
          `1. Backend is running and accessible\n` +
          `2. Backend URL is correct: ${backendUrl}\n` +
          `3. Network connection is stable\n` +
          `4. CORS settings allow requests from this app`;
      
      throw new Error(errorMsg);
    }
    
    throw error;
  }
}

/**
 * Invite Codes API
 */
export const inviteCodesApi = {
  getAll: () => apiRequest<Array<{
    id: string;
    code: string;
    max_uses: number;
    current_uses: number;
    expires_at: string | null;
    created_at: string;
    is_archived: boolean;
  }>>('/invite-codes'),
  
  generate: (maxUses: number = 1, expiresInDays: number = 30) =>
    apiRequest<{ success: boolean; message: string; data?: any }>('/invite-codes/generate', {
      method: 'POST',
      body: JSON.stringify({ max_uses: maxUses, expires_in_days: expiresInDays }),
    }),
  
  delete: (codeId: string) =>
    apiRequest<{ success: boolean; message: string }>(`/invite-codes/${codeId}`, {
      method: 'DELETE',
    }),
  
  bulkDelete: (codeIds: string[]) =>
    apiRequest<{ success: boolean; message: string }>('/invite-codes/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ code_ids: codeIds }),
    }),
  
  archive: (codeId: string) =>
    apiRequest<{ success: boolean; message: string }>('/invite-codes/archive', {
      method: 'POST',
      body: JSON.stringify({ code_id: codeId }),
    }),
  
  unarchive: (codeId: string) =>
    apiRequest<{ success: boolean; message: string }>('/invite-codes/unarchive', {
      method: 'POST',
      body: JSON.stringify({ code_id: codeId }),
    }),
  
  bulkArchiveUsed: () =>
    apiRequest<{ success: boolean; message: string }>('/invite-codes/bulk-archive-used', {
      method: 'POST',
    }),
};

/**
 * Users API
 */
export const usersApi = {
  getAll: () => apiRequest<Array<{
    id: string;
    user_id: string;
    full_name: string;
    preferred_name: string | null;
    email: string | null;
    work_description: string | null;
    created_at: string;
    updated_at: string;
    metadata?: Record<string, any> | null;
  }>>('/users'),
  
  create: (userData: {
    email: string;
    password: string;
    full_name: string;
    preferred_name?: string;
    work_description?: string;
    personal_references?: string;
    avatar_url?: string;
    referral_source?: string;
    consent_given?: boolean;
    consent_date?: string;
    plan_type?: 'seed' | 'edge' | 'quantum';
    account_type?: 'individual' | 'business';
    metadata?: Record<string, any>;
  }) =>
    apiRequest<{
      id: string;
      user_id: string;
      full_name: string;
      preferred_name: string | null;
      email: string | null;
      work_description: string | null;
      personal_references: string | null;
      avatar_url: string | null;
      referral_source: string | null;
      consent_given: boolean | null;
      consent_date: string | null;
      plan_type: string;
      account_type: string;
      created_at: string;
      updated_at: string;
      metadata?: Record<string, any> | null;
    }>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  
  delete: (userId: string) =>
    apiRequest<{ success: boolean; message: string }>(`/users/${userId}`, {
      method: 'DELETE',
    }),
  
  bulkDelete: (userIds: string[]) =>
    apiRequest<{ success: boolean; message: string }>('/users/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds }),
    }),
  
  fetchEmails: (userIds: string[]) =>
    apiRequest<{ success: boolean; data: Array<{ user_id: string; email: string }> }>('/users/fetch-emails', {
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
    return apiRequest<Array<{
      user_id: string;
      balance_dollars: number;
      total_purchased: number;
      total_used: number;
      last_updated: string;
      user_email?: string;
      user_name?: string;
    }>>(url);
  },
  
  assign: (userId: string, creditsToAdd: number, notes?: string) =>
    apiRequest<{ 
      success: boolean; 
      message: string;
      data?: {
        userId: string;
        balanceDollars: number;
        totalPurchased: number;
        totalUsed: number;
      };
    }>('/credits/assign', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        credits_to_add: creditsToAdd,
        notes: notes || null,
      }),
    }),
  
  getPurchases: (status?: string) => {
    const url = status ? `/credits/purchases?status=${status}` : '/credits/purchases';
    return apiRequest<Array<{
      id: string;
      user_id: string;
      amount_dollars: number;
      stripe_payment_intent_id: string | null;
      stripe_charge_id: string | null;
      status: string;
      description: string | null;
      metadata: Record<string, any>;
      created_at: string;
      completed_at: string | null;
      expires_at: string | null;
      user_email: string | null;
      user_name: string | null;
    }>>(url);
  },
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
    apiRequest<{ success: boolean; message: string; data?: any }>('/emails/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  sendIndividual: (data: {
    individual_email: string;
    subject: string;
    text_content: string;
    html_content: string;
  }) =>
    apiRequest<{ success: boolean; message: string }>('/emails/individual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getImages: () => apiRequest<{ success: boolean; images: { logo: string | null; uptimeBody: string | null; downtimeBody: string | null; creditsBody: string | null } }>('/emails/images'),
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
    apiRequest<{
      success: boolean;
      data: Array<{
        user_id: string;
        user_name: string;
        user_email: string;
        total_prompt_tokens: number;
        total_completion_tokens: number;
        total_tokens: number;
        total_estimated_cost: number;
        usage_count: number;
        earliest_activity: string;
        latest_activity: string;
        has_completed_payment: boolean;
        activity_level: 'high' | 'medium' | 'low' | 'inactive';
        days_since_last_activity: number;
        activity_score: number;
        user_type: 'internal' | 'external';
      }>;
      total_count: number;
      grand_total_tokens: number;
      grand_total_cost: number;
      page: number;
      limit: number;
    }>('/usage-logs/aggregated', {
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
  getAll: () => apiRequest<Array<{
    id: string;
    user_id: string;
    email: string;
    full_name: string | null;
    preferred_name: string | null;
    created_at: string;
    is_archived: boolean;
  }>>('/waitlist'),
  
  archive: (userIds?: string[]) =>
    apiRequest<{ success: boolean; message: string }>('/waitlist/archive', {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds || null }),
    }),
};

/**
 * Health check (no auth required)
 */
export const healthCheck = async () => {
  const { backendUrl } = getAppConfig();
  const response = await fetch(`${backendUrl}/health`);
  return response.json();
};

