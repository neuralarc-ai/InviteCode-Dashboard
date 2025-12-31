# Enable Realtime Without Running SQL Queries

## 🎯 One-Time Setup (5 minutes)

Run this SQL script **ONCE** in your Supabase SQL Editor to enable programmatic realtime management:

```sql
-- File: enable-realtime-via-rpc.sql
-- Run this ONCE, then never touch SQL again!
```

After running this script, you can enable/check realtime **entirely from your application** - no more SQL queries needed!

## ✅ After Setup

### From Your Application:

1. **Use the RealtimeManager Component:**
   ```tsx
   import { RealtimeManager } from '@/components/realtime-manager';
   
   <RealtimeManager />
   ```

2. **Or Use the API Directly:**
   ```typescript
   import { enableRealtime, checkRealtimeStatus } from '@/lib/realtime-utils';
   
   // Enable realtime for all tables
   await enableRealtime();
   
   // Check status
   const status = await checkRealtimeStatus();
   ```

3. **Or Use API Endpoints:**
   ```bash
   # Enable realtime
   POST /api/realtime/enable
   
   # Check status
   GET /api/realtime/status
   ```

## 🔧 How It Works

The setup script creates **RPC functions** in your database:
- `enable_realtime_table(table_name)` - Enable realtime for one table
- `enable_realtime_tables(table_names[])` - Enable realtime for multiple tables
- `check_realtime_status(table_names[])` - Check which tables have realtime enabled

These functions can be called from your application via the Supabase client, so you never need to write SQL again!

## 📋 Setup Steps

1. **One-time SQL execution:**
   - Open Supabase Dashboard → SQL Editor
   - Copy contents of `enable-realtime-via-rpc.sql`
   - Run it (this creates the helper functions)

2. **That's it!** Now you can:
   - Click "Enable Realtime" button in the UI
   - Call the API endpoints
   - Use the utility functions

## 🚀 Benefits

- ✅ **No SQL queries after initial setup**
- ✅ **Programmatic control from your app**
- ✅ **UI component for easy management**
- ✅ **API endpoints for automation**
- ✅ **Automatic table detection**

## 📝 Note

The initial setup script (`enable-realtime-via-rpc.sql`) also **automatically enables realtime** for any existing tables, so you might not even need to do anything after running it!


