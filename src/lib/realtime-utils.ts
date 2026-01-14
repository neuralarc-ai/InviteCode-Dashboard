/**
 * Utility functions for managing Supabase Realtime
 */

export interface RealtimeTableStatus {
  table: string;
  alternative: string | null;
  enabled: boolean;
  enabledTable: string | null;
}

export interface RealtimeStatusResponse {
  success: boolean;
  allEnabled: boolean;
  enabledCount: number;
  totalTables: number;
  status: RealtimeTableStatus[];
  enabledTables: string[];
  message: string;
}

/**
 * Check realtime status for all required tables
 */
export async function checkRealtimeStatus(): Promise<RealtimeStatusResponse> {
  try {
    const response = await fetch('/api/realtime/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking realtime status:', error);
    throw error;
  }
}

/**
 * Enable realtime for all tables or specific tables
 * @param tables Optional array of specific table names to enable
 */
export async function enableRealtime(tables?: string[]): Promise<{
  success: boolean;
  enabled: number;
  total: number;
  results: Array<{
    table: string;
    success: boolean;
    message: string;
    enabledTable?: string;
  }>;
  message: string;
}> {
  try {
    const response = await fetch('/api/realtime/enable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tables }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error enabling realtime:', error);
    throw error;
  }
}

/**
 * Get a user-friendly message about realtime status
 */
export function getRealtimeStatusMessage(status: RealtimeStatusResponse): string {
  if (status.allEnabled) {
    return '✅ All tables have realtime enabled';
  }
  
  const missing = status.status
    .filter(s => !s.enabled)
    .map(s => s.table)
    .join(', ');
  
  return `⚠️ ${status.enabledCount} of ${status.totalTables} tables enabled. Missing: ${missing}`;
}

/**
 * Required tables for realtime
 */
export const REQUIRED_REALTIME_TABLES = [
  'user_profiles',
  'subscriptions',
  'credit_purchases',
  'usage_logs'
] as const;



