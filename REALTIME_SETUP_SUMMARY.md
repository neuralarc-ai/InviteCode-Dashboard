# Realtime Setup - Quick Start Guide

## ✅ What's Been Implemented

A complete programmatic solution for managing Supabase Realtime without manually running SQL queries.

## 🚀 Quick Setup (3 Options)

### Option 1: Use the UI Component (Easiest)

1. **Add the RealtimeManager component to your app:**
   ```tsx
   import { RealtimeManager } from '@/components/realtime-manager';
   
   // Add to your settings page or any admin page
   <RealtimeManager />
   ```

2. **Use the component to:**
   - Check realtime status
   - Generate SQL scripts
   - Get direct links to Supabase Dashboard

### Option 2: Use Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard → Database → Replication**
2. Toggle "Enable Realtime" for each table:
   - `user_profiles` / `user_profile`
   - `subscriptions`
   - `credit_purchases` / `credit_purchase`
   - `usage_logs`

### Option 3: Use API Endpoints

**Check Status:**
```bash
GET /api/realtime/status
```

**Generate SQL:**
```bash
GET /api/realtime/enable-sql
```

**Enable Realtime (provides SQL if programmatic enable fails):**
```bash
POST /api/realtime/enable
```

## 📁 Files Created

### API Routes
- `src/app/api/realtime/status/route.ts` - Check realtime status
- `src/app/api/realtime/enable/route.ts` - Attempt to enable realtime
- `src/app/api/realtime/enable-sql/route.ts` - Generate SQL script

### Components
- `src/components/realtime-manager.tsx` - UI component for managing realtime

### Utilities
- `src/lib/realtime-utils.ts` - Helper functions for realtime management

### SQL Scripts
- `enable-realtime-tables.sql` - Manual SQL script (if needed)
- `create-realtime-check-function.sql` - Optional helper function

## 🎯 How It Works

1. **Status Check**: Queries which tables are in the `supabase_realtime` publication
2. **Enable Attempt**: Tries to enable programmatically, falls back to providing SQL
3. **SQL Generation**: Creates ready-to-run SQL based on existing tables

## ⚠️ Important Notes

- **Supabase doesn't allow DDL execution via PostgREST API**, so the enable endpoint will provide SQL statements that need to be run manually
- The **easiest method** is using the Supabase Dashboard UI
- The **RealtimeManager component** provides a user-friendly interface for all options

## 🔧 Integration Example

Add to your settings page:

```tsx
// src/app/settings/page.tsx
import { RealtimeManager } from '@/components/realtime-manager';

export default function SettingsPage() {
  return (
    <div>
      {/* ... other settings ... */}
      <RealtimeManager />
    </div>
  );
}
```

## ✅ Verification

After enabling realtime, check your browser console for:
```
✅ Subscribed to user_profiles realtime changes
✅ Subscribed to subscriptions realtime changes
✅ Subscribed to credit_purchases realtime changes
✅ Subscribed to usage_logs realtime changes
```

## 📚 Documentation

See `REALTIME_IMPLEMENTATION.md` for detailed documentation.


