'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { InviteCode } from '@/lib/types';
import { dbOperations } from '@/lib/db';

export function useInviteCodes() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [sortedCodes, setSortedCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof InviteCode>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const transformRow = (row: any): InviteCode => ({
    id: row.id,
    code: row.code,
    isUsed: row.is_used,
    usedBy: row.used_by,
    usedAt: row.used_at ? new Date(row.used_at) : null,
    createdAt: new Date(row.created_at),
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    maxUses: row.max_uses,
    currentUses: row.current_uses,
    emailSentTo: row.email_sent_to || [],
    reminderSentAt: row.reminder_sent_at ? new Date(row.reminder_sent_at) : null,
    isArchived: row.is_archived || false,
  });

  // Initial fetch function
  const fetchCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedCodes = data?.map(transformRow) || [];

      setCodes(transformedCodes);
      setError(null);

      // Cache
      await dbOperations.putAll('invite_codes', transformedCodes);
    } catch (err) {
      console.error('Error fetching invite codes:', err);
      setError('Failed to fetch invite codes');
    } finally {
      setLoading(false);
    }
  };

  // Sort codes whenever codes or sort settings change
  useEffect(() => {
    const sorted = [...codes].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      // Handle null/undefined values
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      // Handle different data types
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDirection === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        return sortDirection === 'asc' ? (aVal === bVal ? 0 : aVal ? 1 : -1) : (aVal === bVal ? 0 : aVal ? -1 : 1);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Fallback to string comparison
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    
    setSortedCodes(sorted);
  }, [codes, sortField, sortDirection]);

  // Manual refresh function
  const refreshCodes = async () => {
    setLoading(true);
    await fetchCodes();
  };

  // Handle sort
  const handleSort = (field: keyof InviteCode) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Cleanup expired codes function
  const cleanupExpiredCodes = async () => {
    try {
      console.log('Cleaning up expired invite codes...');
      const response = await fetch('/api/cleanup-expired-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.deletedCount > 0) {
          console.log(`🧹 Cleaned up ${result.deletedCount} expired invite codes:`, result.deletedCodes);
          // Refresh the codes list after cleanup (or let realtime handle DELETEs if the backend triggers them, which it should)
          // But to be safe, we can fetch
          fetchCodes();
        }
      }
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
    }
  };

  useEffect(() => {
    // 1. Load from Cache
    const loadCache = async () => {
        try {
            const cached = await dbOperations.getAll('invite_codes');
            if (cached && cached.length > 0) {
                setCodes(cached);
                setLoading(false);
            }
        } catch (e) {
            console.warn('Failed to load invite codes from cache', e);
        }
    };
    loadCache();

    // 2. Fetch fresh
    fetchCodes();

    // 3. Realtime Delta
    const subscription = supabase
      .channel('invite_codes_changes_optimized')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invite_codes',
        },
        async (payload) => {
          console.log('Real-time invite codes update (Delta):', payload);
          if (payload.eventType === 'INSERT') {
             const newCode = transformRow(payload.new);
             setCodes(prev => [newCode, ...prev]);
             await dbOperations.put('invite_codes', newCode);
          } else if (payload.eventType === 'UPDATE') {
             const updatedCode = transformRow(payload.new);
             setCodes(prev => prev.map(c => c.id === updatedCode.id ? updatedCode : c));
             await dbOperations.put('invite_codes', updatedCode);
          } else if (payload.eventType === 'DELETE') {
             const deletedId = payload.old.id;
             setCodes(prev => prev.filter(c => c.id !== deletedId));
             await dbOperations.delete('invite_codes', deletedId);
          }
        }
      )
      .subscribe();

    // Set up periodic cleanup of expired codes (every 5 minutes)
    const cleanupInterval = setInterval(cleanupExpiredCodes, 5 * 60 * 1000);

    // Run cleanup once on mount
    cleanupExpiredCodes();

    return () => {
      subscription.unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, []);

  return { 
    codes: sortedCodes, 
    loading, 
    error, 
    refreshCodes,
    sortField,
    sortDirection,
    handleSort
  };
}


