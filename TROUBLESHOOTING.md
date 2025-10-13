# Troubleshooting - Usage Logs 500 Error

## Issue Fixed ✅

The API route has been updated to use `supabaseAdmin` instead of the regular `supabase` client.

## What Was Wrong?

The database function `get_aggregated_usage_logs()` accesses the `auth.users` table, which requires elevated permissions. The regular Supabase client doesn't have these permissions - only the admin client does.

## What Changed?

**Before:**
```typescript
import { supabase } from '@/lib/supabase';  // ❌ Insufficient permissions
```

**After:**
```typescript
import { supabaseAdmin } from '@/lib/supabase';  // ✅ Admin permissions
```

## Required: Check Your Environment Variables

The fix requires that your **Supabase Service Role Key** is configured. Check your environment variables:

### 1. Check `.env.local` File

You need **both** of these keys:

```bash
# Required - Public keys
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Required - Admin key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Find Your Service Role Key

1. Open your Supabase Dashboard
2. Go to **Project Settings** → **API**
3. Under **Project API keys**, find **`service_role` secret**
4. Copy this key (⚠️ Keep it secret! Never expose it in client-side code)

### 3. Add to Environment Variables

**Local Development (.env.local):**
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Production (Vercel/Your Host):**
- Add `SUPABASE_SERVICE_ROLE_KEY` to your deployment platform's environment variables
- **Important:** Mark it as **sensitive/secret**

### 4. Restart Your Development Server

After adding the environment variable:
```bash
# Stop your dev server (Ctrl+C)
# Then restart
npm run dev
```

## Verify the Fix

### Step 1: Check Server Logs

When your server starts, you should see:
```
Supabase configuration:
- URL: https://xxxxx.supabase.co
- Anon Key: SET (first 10 chars: eyJhbGciOi...)
- Service Key: SET (first 10 chars: eyJhbGciOi...)  ← This should be SET
- Admin Client: AVAILABLE  ← This should be AVAILABLE
```

If you see:
```
- Service Key: NOT SET
- Admin Client: NOT AVAILABLE
```

Then the service role key is missing!

### Step 2: Test the API

Open your browser's developer console and run:
```javascript
fetch('/api/usage-logs-aggregated', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ page: 1, limit: 10 })
})
.then(r => r.json())
.then(console.log)
```

**Success Response:**
```json
{
  "success": true,
  "data": [...],
  "totalCount": 45,
  "page": 1,
  "limit": 10
}
```

**Error Response (Missing Service Key):**
```json
{
  "success": false,
  "error": "Server configuration error: Admin client not available"
}
```

### Step 3: Visit Usage Logs Page

1. Go to `/usage-logs`
2. Page should load in < 1 second
3. Check browser console for:
   ```
   ✅ "⚡ Fetching usage logs (optimized)"
   ✅ "API response: { success: true, ... }"
   ✅ "=== FETCH COMPLETED (OPTIMIZED) ==="
   ```

## Common Errors & Solutions

### Error: "Admin client not available"

**Cause:** Service role key not configured

**Solution:**
1. Get service role key from Supabase Dashboard
2. Add to `.env.local`: `SUPABASE_SERVICE_ROLE_KEY=your_key`
3. Restart dev server

### Error: "function get_aggregated_usage_logs does not exist"

**Cause:** Database function not created

**Solution:**
1. Run the SQL file in Supabase SQL Editor
2. Verify: `SELECT * FROM get_aggregated_usage_logs('', '', 1, 10);`

### Error: "permission denied for table auth.users"

**Cause:** Using regular client instead of admin client

**Solution:**
- ✅ Already fixed! The API now uses `supabaseAdmin`
- Make sure service role key is configured

### Error: "HTTP error! status: 500" (with no other details)

**Cause:** Could be various issues

**Solution:**
1. Check server console logs (not browser console)
2. Look for the detailed error message
3. Common causes:
   - Missing service role key
   - Database function not created
   - Function has syntax errors

## Database Function Verification

Test the function directly in Supabase SQL Editor:

```sql
-- Test with default parameters
SELECT * FROM get_aggregated_usage_logs('', '', 1, 10);

-- Test with search
SELECT * FROM get_aggregated_usage_logs('john', '', 1, 10);

-- Test with activity filter
SELECT * FROM get_aggregated_usage_logs('', 'high', 1, 10);

-- Test with both
SELECT * FROM get_aggregated_usage_logs('john', 'high', 1, 10);
```

**Expected Result:**
- Returns rows with user data
- Each row has: user_id, user_name, user_email, etc.
- If no data, returns empty result (not an error)

**If you get an error:**
- Function doesn't exist → Run the SQL file
- Permission denied → Grant permissions (included in SQL file)
- Syntax error → Check Supabase logs for details

## Deployment Checklist

When deploying to production:

- [ ] Service role key added to production environment variables
- [ ] Database function created in production database
- [ ] Indexes created (included in SQL file)
- [ ] Permissions granted (included in SQL file)
- [ ] Environment variables are marked as sensitive/secret

## Production Deployment

### Vercel
1. Go to Project Settings → Environment Variables
2. Add `SUPABASE_SERVICE_ROLE_KEY`
3. Select **Production**, **Preview**, and **Development**
4. Mark as **Sensitive**
5. Redeploy

### Other Platforms
Add the environment variable according to your platform's documentation. Make sure it's:
- Available at build time and runtime
- Marked as secret/sensitive
- Not exposed to the client-side

## Security Note ⚠️

**IMPORTANT:** The service role key has **full access** to your database!

**Do's:**
- ✅ Use only in server-side code (API routes)
- ✅ Keep it secret
- ✅ Add to `.gitignore` (`.env.local` should be ignored)
- ✅ Mark as sensitive in deployment platforms

**Don'ts:**
- ❌ Never use in client-side code
- ❌ Never commit to git
- ❌ Never expose in public repositories
- ❌ Never log the full key value

## Still Having Issues?

### Check Server-Side Logs

The error details are in your **server console** (terminal running `npm run dev`), not the browser console.

Look for:
```
API: Fetching aggregated usage logs { page: 1, limit: 10, ... }
RPC error: { ... }  ← Detailed error here
```

### Enable Verbose Logging

Add this to your API route temporarily for debugging:

```typescript
console.log('Supabase Admin available?', !!supabaseAdmin);
console.log('Calling RPC with:', { search_query, activity_level_filter, page_number, page_size });
```

### Test Database Function Directly

In Supabase SQL Editor:
```sql
-- This should work
SELECT * FROM get_aggregated_usage_logs('', '', 1, 10);

-- If you get an error, the function has a problem
-- Check the error message for details
```

### Last Resort: Rollback

If nothing works, you can rollback:

1. Drop the function:
```sql
DROP FUNCTION IF EXISTS get_aggregated_usage_logs(text, text, integer, integer);
```

2. Revert code changes from git:
```bash
git checkout src/hooks/use-realtime-data.ts
git checkout src/app/api/usage-logs-aggregated/route.ts
# Or delete the route folder entirely
```

3. The old (slow) approach will work again

## Summary

**Most Common Issue:** Missing `SUPABASE_SERVICE_ROLE_KEY` environment variable

**Quick Fix:**
1. Get key from Supabase Dashboard → Settings → API
2. Add to `.env.local`: `SUPABASE_SERVICE_ROLE_KEY=your_key`
3. Restart dev server
4. Refresh usage logs page

**Expected Result:** Usage logs load in < 1 second! 🚀

---

**Need more help?** Check the server console logs for detailed error messages.

