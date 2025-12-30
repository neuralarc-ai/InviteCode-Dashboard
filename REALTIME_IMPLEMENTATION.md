# Supabase Realtime Implementation Guide

This document explains how realtime data fetching is implemented for the following tables:
- `user_profile` / `user_profiles`
- `subscriptions`
- `credit_purchase` / `credit_purchases`
- `usage_logs`

## Overview

The application uses [Supabase Realtime](https://supabase.com/docs/guides/realtime) to listen for database changes and automatically update the UI without requiring manual refreshes. This provides a seamless, live-updating experience.

## Setup Instructions

### Option 1: Using the Realtime Manager UI (Recommended)

1. Navigate to your Settings page (or add the `RealtimeManager` component to any page)
2. Click "Check Status" to see which tables need realtime enabled
3. Choose one of these options:
   - **Click "Enable Realtime"** - Attempts to enable programmatically (may require manual SQL)
   - **Click "Generate SQL Script"** - Generates SQL you can copy and run in Supabase SQL Editor
   - **Click "Open Supabase Dashboard"** - Opens dashboard where you can enable via UI

### Option 2: Using Supabase Dashboard UI

1. Go to your Supabase project dashboard
2. Navigate to **Database → Replication**
3. For each table, toggle **"Enable Realtime"** ON:
   - `user_profiles` (or `user_profile`)
   - `subscriptions`
   - `credit_purchases` (or `credit_purchase`)
   - `usage_logs`

### Option 3: Using SQL Script

Run the SQL script to enable realtime for all required tables:

```bash
# In your Supabase SQL Editor, run:
enable-realtime-tables.sql
```

This script will:
- Add all four tables to the `supabase_realtime` publication
- Handle both singular and plural table name variations
- Verify the configuration

### Optional: Create Helper Function

For better status checking, you can create a helper function:

```bash
# In your Supabase SQL Editor, run:
create-realtime-check-function.sql
```

This creates a function that allows the API to check realtime status programmatically.

### 2. Supabase Client Configuration

The Supabase client is configured with realtime options in `src/lib/supabase.ts`:

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
```

### 3. Realtime Hooks

Each table has a dedicated React hook that manages realtime subscriptions:

#### `useUserProfiles()`
- **Location**: `src/hooks/realtime/use-user-profiles.ts`
- **Table**: `user_profiles` or `user_profile`
- **Features**:
  - Listens for INSERT, UPDATE, DELETE events
  - Automatically fetches user emails when profiles change
  - Updates IndexedDB cache for offline support

#### `useSubscriptions()`
- **Location**: `src/hooks/realtime/use-subscriptions.ts`
- **Table**: `subscriptions`
- **Features**:
  - Listens for all subscription changes
  - Updates subscription status in real-time
  - Syncs with IndexedDB cache

#### `useCreditPurchases()`
- **Location**: `src/hooks/realtime/use-credit-purchases.ts`
- **Table**: `credit_purchases` or `credit_purchase`
- **Features**:
  - Monitors credit purchase transactions
  - Updates purchase status immediately
  - Handles metadata fetching for new purchases

#### `useUsageLogs()`
- **Location**: `src/hooks/realtime/use-usage-logs.ts`
- **Table**: `usage_logs`
- **Features**:
  - Listens to both `usage_logs` and `credit_purchases` tables
  - Uses debounced updates (500ms) to prevent excessive refreshes
  - Triggers background refresh when data changes

## How It Works

### Subscription Pattern

All hooks follow the same pattern according to [Supabase Realtime documentation](https://supabase.com/docs/guides/realtime):

```typescript
const subscription = supabase
  .channel('unique_channel_name')
  .on(
    'postgres_changes',
    {
      event: '*',  // Listen to INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'table_name',
    },
    async (payload) => {
      // Handle the change
      if (payload.eventType === 'INSERT') {
        // Add new record
      } else if (payload.eventType === 'UPDATE') {
        // Update existing record
      } else if (payload.eventType === 'DELETE') {
        // Remove deleted record
      }
    }
  )
  .subscribe((status) => {
    // Handle subscription status
    if (status === 'SUBSCRIBED') {
      console.log('✅ Subscribed successfully');
    } else if (status === 'CHANNEL_ERROR') {
      console.error('❌ Subscription error');
    }
  });
```

### Error Handling

All hooks include:
- Try-catch blocks around payload handlers
- Subscription status callbacks
- Error state management
- Console logging for debugging

### Performance Optimizations

1. **Debouncing**: `useUsageLogs` uses a 500ms debounce to batch rapid updates
2. **Caching**: All hooks use IndexedDB for offline support and faster initial loads
3. **Selective Updates**: Only relevant changes trigger UI updates

## Usage Example

```typescript
import { useUserProfiles } from '@/hooks/realtime/use-user-profiles';

function UsersPage() {
  const { userProfiles, loading, error, refreshUserProfiles } = useUserProfiles();

  // userProfiles automatically updates when database changes
  // No need to manually refresh!

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {userProfiles.map(profile => (
        <div key={profile.id}>{profile.fullName}</div>
      ))}
    </div>
  );
}
```

## Database Requirements

### Row Level Security (RLS)

Make sure RLS policies are set up for all tables. Example:

```sql
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to user_profiles" 
  ON user_profiles FOR SELECT USING (true);
```

### Realtime Publication

Tables must be added to the `supabase_realtime` publication:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE credit_purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE usage_logs;
```

## Troubleshooting

### Subscriptions Not Working

1. **Check Database Configuration**:
   ```sql
   -- Verify tables are in the publication
   SELECT tablename 
   FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime';
   ```

2. **Check RLS Policies**:
   - Ensure policies allow SELECT operations
   - Verify the anon key has proper permissions

3. **Check Browser Console**:
   - Look for subscription status messages
   - Check for error messages

4. **Verify Environment Variables**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

### Common Issues

- **"Table not found"**: Run the `enable-realtime-tables.sql` script
- **"Permission denied"**: Check RLS policies
- **"Subscription failed"**: Verify Supabase project settings allow realtime

## Testing

To test realtime updates:

1. Open your application in the browser
2. Open the browser console to see subscription messages
3. Make a change to one of the tables in Supabase Dashboard
4. Watch the UI update automatically without refresh

## References

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Postgres Changes Guide](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Realtime with Next.js](https://supabase.com/docs/guides/realtime/using-realtime-with-nextjs)

