# Real-time Updates Implementation Guide

## Overview
This document explains how the real-time updates feature works in the Usage Logs page, ensuring that only relevant data updates without full page refreshes.

## How It Works

### 1. **Database Real-time Configuration**
Supabase real-time is enabled for:
- `usage_logs` table
- `credit_purchases` table

These tables broadcast changes (INSERT, UPDATE, DELETE) to subscribed clients.

### 2. **Smart Update Strategy**

#### Silent Background Updates
When a real-time event occurs, the system performs a **silent background refresh** instead of showing a loading spinner:

```typescript
// Silent mode: Updates data without blocking UI
fetchUsageLogs(currentPage, itemsPerPage, searchQuery, true)
```

#### Debouncing
Rapid consecutive changes are batched using a 500ms debounce:
```typescript
const debouncedUpdate = () => {
  setTimeout(() => {
    fetchUsageLogs(..., true);
  }, 500);
};
```

This prevents overwhelming the UI with updates when multiple records change quickly.

### 3. **Visual Indicators**

#### Full Loading State
- **When:** User clicks "Refresh" or changes filters
- **Visual:** Large loading spinner, disabled table
- **State:** `loading: true`

#### Background Refresh State
- **When:** Real-time event triggers automatic update
- **Visual:** Small "Syncing..." indicator with spinning icon
- **State:** `isBackgroundRefreshing: true`

```tsx
{isBackgroundRefreshing && (
  <div className="flex items-center gap-1 text-xs text-blue-600">
    <RefreshCw className="h-3 w-3 animate-spin" />
    <span>Syncing...</span>
  </div>
)}
```

### 4. **Intelligent Filtering**

#### Usage Logs Table
Updates on **any** change (INSERT, UPDATE, DELETE) because:
- Aggregated data needs recalculation
- User statistics change with every new log entry

```typescript
// Always trigger update for usage logs
if (record) {
  debouncedUpdate();
}
```

#### Credit Purchases Table
Updates **only** for:
- Completed payments (`status: 'completed'`)
- Deleted records

```typescript
// Only update if it affects has_completed_payment
if (newRecord?.status === 'completed' || payload.eventType === 'DELETE') {
  debouncedUpdate();
}
```

This prevents unnecessary updates for pending/failed transactions.

## User Experience Flow

### Scenario 1: New Usage Log Entry
```
User A generates AI response
  ↓
New entry in usage_logs table
  ↓
Real-time event broadcast to all connected clients
  ↓
500ms debounce timer starts
  ↓
Silent background fetch (no loading spinner)
  ↓
Data updates smoothly
  ↓
User sees updated stats without interruption
```

### Scenario 2: Completed Payment
```
User B completes payment
  ↓
credit_purchases record status → 'completed'
  ↓
Real-time event broadcast
  ↓
Check: status === 'completed' ✓
  ↓
Debounced silent update
  ↓
Green payment dot appears for User B
  ↓
Total revenue updates
```

### Scenario 3: User Actively Browsing
```
User viewing page 2 of External Users
  ↓
Real-time event occurs
  ↓
Small "Syncing..." indicator appears
  ↓
Background fetch for page 2
  ↓
Data refreshes without losing page position
  ↓
"Syncing..." indicator disappears
```

## Code Architecture

### Hook Structure (`use-realtime-data.ts`)

```typescript
export function useUsageLogs() {
  // State
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  
  // Silent fetch function
  const fetchUsageLogs = async (...args, silent: boolean = false) => {
    if (silent) {
      setIsBackgroundRefreshing(true); // Subtle indicator
    } else {
      setLoading(true); // Full loading state
    }
    // ... fetch data ...
  }
  
  // Real-time subscriptions
  useEffect(() => {
    const debouncedUpdate = () => {
      setTimeout(() => {
        fetchUsageLogs(currentPage, itemsPerPage, searchQuery, true);
      }, 500);
    };
    
    supabase
      .channel('usage_logs_changes')
      .on('postgres_changes', ..., debouncedUpdate)
      .subscribe();
  }, [currentPage, searchQuery, userTypeFilter, activityFilter]);
  
  return {
    usageLogs,
    loading,
    isBackgroundRefreshing, // New!
    // ... other exports
  };
}
```

### UI Component (`page.tsx`)

```tsx
export default function UsageLogsPage() {
  const { 
    usageLogs, 
    loading, 
    isBackgroundRefreshing 
  } = useUsageLogs();
  
  return (
    <>
      {/* Subtle background sync indicator */}
      {isBackgroundRefreshing && (
        <div>Syncing...</div>
      )}
      
      {/* Full loading state */}
      {loading && !usageLogs.length && (
        <LoadingSpinner />
      )}
      
      {/* Table shows even during background refresh */}
      <Table>{usageLogs.map(...)}</Table>
    </>
  );
}
```

## Benefits

### 1. **No UI Interruption**
- Table remains visible during updates
- User can continue reading
- No jarring loading states

### 2. **Performance Optimized**
- Debouncing prevents excessive API calls
- Conditional updates based on relevance
- Server-side aggregation (single fast query)

### 3. **User Awareness**
- Subtle "Syncing..." indicator
- Clear distinction between:
  - User-initiated refresh (full loading)
  - Background sync (minimal indicator)

### 4. **Data Freshness**
- Always up-to-date (< 1 second delay)
- No manual refresh needed
- Multi-user support (everyone sees updates)

## Edge Cases Handled

### Multiple Rapid Changes
```typescript
// Debouncing ensures only one fetch after changes settle
setTimeout(() => fetchUsageLogs(..., true), 500);
```

### Filter Changes During Update
```typescript
// Dependencies array ensures correct data fetched
useEffect(() => {
  // Subscriptions update when filters change
}, [currentPage, searchQuery, userTypeFilter, activityFilter]);
```

### User Navigating Away
```typescript
// Cleanup prevents memory leaks
return () => {
  if (updateTimeout) clearTimeout(updateTimeout);
  subscription.unsubscribe();
};
```

### Server-side Aggregation
```typescript
// Because we aggregate on server, we MUST refetch
// Can't just add/update single record client-side
// This is necessary and optimized
```

## Monitoring Real-time Events

### Console Output

**Silent Update:**
```
🔄 Silent background refresh triggered by real-time event
⚡ Fetching usage logs (silent) - page 1, limit 10...
=== FETCH COMPLETED (OPTIMIZED) ===
```

**Real-time Event Details:**
```
=== REAL-TIME UPDATE (USAGE LOGS) ===
Event type: INSERT
Affected record: { user_id: '...', ... }
```

## Configuration

### Debounce Timing
Adjust in `use-realtime-data.ts`:
```typescript
setTimeout(() => {
  fetchUsageLogs(...);
}, 500); // Increase for slower updates, decrease for faster
```

### Conditional Updates
Modify filters in subscription handlers:
```typescript
// Only update for specific conditions
if (newRecord?.status === 'completed') {
  debouncedUpdate();
}
```

## Testing Real-time Updates

### Manual Testing

1. **Open two browser windows:**
   - Window A: Usage Logs page
   - Window B: Your application (generating logs)

2. **Trigger an event in Window B:**
   - Generate an AI response
   - Complete a payment

3. **Observe Window A:**
   - "Syncing..." indicator appears
   - Data updates within 1-2 seconds
   - No loading spinner
   - Table remains interactive

### Automated Testing (Future)

```typescript
// Test silent updates
test('should update data without loading spinner on real-time event', async () => {
  const { result } = renderHook(() => useUsageLogs());
  
  // Simulate real-time event
  mockSupabaseEvent('INSERT', usageLogData);
  
  // Assert
  expect(result.current.isBackgroundRefreshing).toBe(true);
  expect(result.current.loading).toBe(false);
  
  await waitFor(() => {
    expect(result.current.usageLogs).toHaveLength(expectedLength);
    expect(result.current.isBackgroundRefreshing).toBe(false);
  });
});
```

## Troubleshooting

### Issue: Updates Not Appearing

**Check:**
1. Supabase real-time enabled for table
2. RLS policies allow SELECT
3. Browser console for subscription status
4. Network tab for real-time connection

**Solution:**
```sql
-- Verify real-time is enabled
ALTER TABLE usage_logs REPLICA IDENTITY FULL;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'usage_logs';
```

### Issue: Too Many Updates

**Increase debounce:**
```typescript
setTimeout(() => fetchUsageLogs(..., true), 1000); // 1 second
```

### Issue: Syncing Indicator Stuck

**Check:**
```typescript
// Ensure cleanup in catch block
} catch (err) {
  setIsBackgroundRefreshing(false); // ← Important!
}
```

## Performance Metrics

### Expected Behavior
- **Real-time latency:** < 1 second
- **Debounce delay:** 500ms
- **Fetch time:** 100-300ms (server-side aggregation)
- **Total update time:** ~1.5 seconds

### Optimization Opportunities
1. **WebSocket connection pooling** (future)
2. **Incremental updates** (if not using aggregation)
3. **Optimistic UI updates** (show changes immediately, verify later)

## Security Considerations

### RLS Policies
Real-time respects Row Level Security:
```sql
-- Only see your own data
CREATE POLICY "Users see own usage logs" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);
```

### Rate Limiting
Supabase automatically rate limits:
- Max connections per client
- Max messages per second
- Auto-disconnect on abuse

## Future Enhancements

1. **Optimistic Updates**
   - Show changes immediately
   - Verify with server later
   - Rollback if needed

2. **Selective Column Updates**
   - Only update changed fields
   - Reduce data transfer

3. **Push Notifications**
   - Notify user of important changes
   - "New activity detected" toast

4. **Offline Support**
   - Queue changes while offline
   - Sync when reconnected

---

**Implementation Date:** 2025-10-17  
**Version:** 2.0  
**Status:** Production Ready

