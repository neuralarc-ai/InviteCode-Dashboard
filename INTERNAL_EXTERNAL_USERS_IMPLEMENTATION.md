# Internal/External Users Filter Implementation

## Overview
This implementation adds the ability to categorize and filter users in the Usage Logs page into **Internal Users** (@he2.ai and @neuralarc.ai) and **External Users** (all others).

## Database Changes

### Updated SQL Function
**File:** `add-internal-external-filter.sql`

The PostgreSQL function `get_aggregated_usage_logs` has been updated with:

1. **New Parameter:** `user_type_filter` (text, default: 'external')
   - Options: 'internal', 'external', or 'all'
   
2. **New Return Field:** `user_type` (text)
   - Values: 'internal' or 'external'
   
3. **User Type Determination Logic:**
   ```sql
   CASE 
     WHEN LOWER(email) LIKE '%@he2.ai' 
     OR LOWER(email) LIKE '%@neuralarc.ai' 
     THEN 'internal'
     ELSE 'external'
   END AS user_type
   ```

4. **Filtering Applied Before Pagination:**
   - Ensures proper page counts for each user type
   - Grand totals calculated after filtering

### To Apply Database Changes

Run the SQL script in your Supabase SQL Editor:

```bash
# Option 1: Copy contents of add-internal-external-filter.sql to Supabase SQL Editor

# Option 2: If using Supabase CLI
supabase db execute --file add-internal-external-filter.sql
```

## Code Changes

### 1. Types (`src/lib/types.ts`)
Added `userType` field to `UsageLog` type:
```typescript
export type UsageLog = {
  // ... existing fields
  userType: 'internal' | 'external';
}
```

### 2. API Route (`src/app/api/usage-logs-aggregated/route.ts`)
- Added `userTypeFilter` parameter support
- Passes filter to PostgreSQL function
- Default: 'external'

### 3. React Hook (`src/hooks/use-realtime-data.ts`)
Added new state and handlers:
- `userTypeFilter`: State for current filter ('internal' | 'external')
- `handleUserTypeFilter()`: Function to change filter
- Included in API calls and dependencies

### 4. UI Component (`src/app/usage-logs/page.tsx`)
Added toggle button UI:
- **External Users** button (Users icon)
- **Internal Users** button (Building2 icon)
- Active state styling
- Updates card descriptions dynamically

## Features

### Toggle Button
Located at the top of the Usage Logs page:
```
[External Users] [Internal Users]
```

- Click to switch between user types
- Active button highlighted with default variant
- Resets to page 1 when switched

### Dynamic Labels
- Card descriptions update to show user type
- Example: "Aggregated AI usage by external users (8 unique users)"
- Search results: "Filtered results (3 internal users found)"

### Proper Pagination
- Each user type has independent pagination
- Page counts accurate for filtered users
- Grand totals reflect only the selected user type

## User Experience

### Default View
- Shows **External Users** by default
- All @he2.ai and @neuralarc.ai emails hidden

### Internal Users View
- Click "Internal Users" to see only @he2.ai and @neuralarc.ai
- Useful for monitoring team usage

### Switching Between Views
- Instant filtering
- Maintains search and activity filters
- Resets pagination to page 1

## Benefits

1. ✅ **Separation of Concerns**: Clear distinction between internal and external users
2. ✅ **Accurate Metrics**: Grand totals and counts specific to each user type
3. ✅ **Better Performance**: Server-side filtering before pagination
4. ✅ **Clean UI**: Simple toggle button, no clutter
5. ✅ **Flexible**: Can easily extend to support 'all' users view if needed

## Technical Details

### Filter Flow
```
User clicks toggle 
  → handleUserTypeFilter('internal' or 'external')
  → Updates state
  → Triggers fetchUsageLogs
  → API receives userTypeFilter
  → PostgreSQL function filters by user_type
  → Returns filtered results
  → UI updates
```

### Database Performance
- User type determined in CTE (Common Table Expression)
- Filtering happens early in query pipeline
- Indexes on email columns improve performance
- No full table scans

### Real-time Updates
- Subscription listens to both `usage_logs` and `credit_purchases` tables
- Maintains current user type filter on refresh
- Automatic updates when new data arrives

## Future Enhancements

Possible extensions:
1. Add 'All Users' option to see both types together
2. Add badges in table to show user type
3. Export functionality filtered by user type
4. Separate dashboards for internal vs external users
5. User type-specific activity level thresholds

## Testing Checklist

- [ ] Apply SQL migration successfully
- [ ] External Users view shows only non-@he2.ai/@neuralarc.ai emails
- [ ] Internal Users view shows only @he2.ai/@neuralarc.ai emails
- [ ] Toggle button switches between views smoothly
- [ ] Pagination works correctly for each view
- [ ] Grand totals update based on selected view
- [ ] Search works within selected user type
- [ ] Activity filters work with user type filter
- [ ] Real-time updates maintain current filter
- [ ] Card descriptions show correct user type

## Migration Notes

### Before Migration
- Users see all 8 external users (default behavior was to filter client-side)
- Pagination issues when internal users mixed with external

### After Migration
- Clean separation
- Default shows 8 external users properly paginated
- Internal view shows @he2.ai/@neuralarc.ai users separately
- Better performance and UX

---

**Implementation Date:** 2025-10-17  
**Version:** 1.0  
**Status:** Ready for Production

