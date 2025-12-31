# Quick Fix: Realtime Subscription Error

## The Error

You're seeing:
```
❌ Error subscribing to credit_purchases realtime
```

This happens because the `credit_purchases` table doesn't have realtime enabled in Supabase.

## Quick Fix (Choose One)

### Option 1: Use the RPC Function (Recommended - No SQL after setup)

If you've run `enable-realtime-via-rpc.sql`, you can enable it programmatically:

```typescript
// In your browser console or add to a page
import { enableRealtime } from '@/lib/realtime-utils';
await enableRealtime(['credit_purchases']);
```

Or use the RealtimeManager component and click "Enable Realtime".

### Option 2: Supabase Dashboard (Easiest)

1. Go to **Supabase Dashboard → Database → Replication**
2. Find `credit_purchases` table
3. Toggle **"Enable Realtime"** ON

### Option 3: Run SQL Once

Run this in Supabase SQL Editor:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE credit_purchases;
```

Or if your table is named `credit_purchase` (singular):

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE credit_purchase;
```

### Option 4: Use the Setup Script

Run `enable-realtime-via-rpc.sql` once - it will automatically enable realtime for all existing tables including `credit_purchases`.

## After Fixing

1. Refresh your browser
2. Check the console - you should see:
   ```
   ✅ Subscribed to credit_purchases realtime changes
   ```
3. The error should be gone!

## Note

The app will still work even with this error - it just won't have real-time updates. The hook has been updated to handle this gracefully without spamming the console.


