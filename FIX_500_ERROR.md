# 🔧 Fix 500 Error - Quick Steps

## The Issue

You're getting: `Error: HTTP error! status: 500`

This is because the API needs the **Supabase Service Role Key** to access the `auth.users` table.

## ✅ Quick Fix (3 Steps)

### Step 1: Get Your Service Role Key

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Go to your project
3. Click **Project Settings** (gear icon) → **API**
4. Find **`service_role` secret** key
5. Click **"Reveal"** and copy it

⚠️ **Important:** This key is secret - never commit it to git!

### Step 2: Add to Environment Variables

**For Local Development:**

Create or edit `.env.local` in your project root:

```bash
# Add this line (replace with your actual key)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```

**For Production (Vercel):**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Your service role key
   - **Environments:** Production, Preview, Development
   - **Sensitive:** ✓ Check this box
3. Redeploy

### Step 3: Restart Your Dev Server

```bash
# Stop your current dev server (Ctrl+C or Cmd+C)
# Then restart:
npm run dev
```

## ✅ Verify It Works

### Check 1: Server Console

When your server starts, look for:
```
✅ - Admin Client: AVAILABLE
```

If you see `NOT AVAILABLE`, the key is missing.

### Check 2: Visit Usage Logs Page

1. Go to `/usage-logs` in your browser
2. Should load in < 1 second
3. No errors in console

## 🎉 Done!

Your usage logs should now load super fast!

---

## 🆘 Still Not Working?

### Quick Debugging

1. **Check if service role key is set:**
   ```bash
   # In your terminal
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```
   Should print your key (starting with `eyJh...`)

2. **Check server logs:**
   Look at your terminal (where you run `npm run dev`)
   - You'll see the actual error message there

3. **Test the database function:**
   In Supabase SQL Editor:
   ```sql
   SELECT * FROM get_aggregated_usage_logs('', '', 1, 10);
   ```
   Should return user data (or empty if no users)

### Common Mistakes

❌ **Added key to wrong file:** Must be in `.env.local` (not `.env`)
❌ **Forgot to restart server:** Must restart after adding env var
❌ **Typo in key name:** Must be exactly `SUPABASE_SERVICE_ROLE_KEY`
❌ **Wrong key:** Must be the `service_role` key (not the `anon` key)

## 📚 More Help

- Full details: See `TROUBLESHOOTING.md`
- Security info: See warning in `TROUBLESHOOTING.md`

---

**TL;DR:**
1. Get service_role key from Supabase Dashboard → Settings → API
2. Add to `.env.local`: `SUPABASE_SERVICE_ROLE_KEY=your_key`
3. Restart dev server: `npm run dev`
4. Refresh usage logs page → Should work! 🚀

