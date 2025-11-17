# Vercel Environment Variables Fix

## Problem
The backend was crashing with "Field required" errors even though environment variables were set in Vercel.

## Solution Applied
Updated `backend/app/core/config.py` to:
1. Use Pydantic v2 `SettingsConfigDict` for proper environment variable loading
2. Added fallback mechanism that explicitly reads from `os.environ` if standard loading fails
3. Added better error logging to debug missing environment variables

## What Changed
- Switched from old `class Config` to `model_config = SettingsConfigDict(...)`
- Added `load_settings()` function with explicit environment variable reading
- Added debugging logs to show which environment variables are available

## Next Steps

### 1. Commit and Push Changes
```bash
cd backend
git add app/core/config.py
git commit -m "Fix environment variable loading for Vercel deployment"
git push
```

### 2. Verify Environment Variables in Vercel
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Make sure ALL these variables are set for **Production** environment:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SMTP_HOST`
- `SMTP_PORT` (should be `587` as a number/string)
- `SMTP_USER`
- `SMTP_PASS` (no quotes needed in Vercel)
- `SENDER_EMAIL`
- `SMTP_FROM`
- `ENVIRONMENT` (should be `production`)
- `CORS_ORIGINS` (should be `https://admin.he2.ai`)
- `API_PREFIX` (should be `/api/v1`)

### 3. Redeploy
After pushing the code changes, Vercel will automatically redeploy. Or manually:
- Go to Deployments tab
- Click "Redeploy" on the latest deployment

### 4. Check Logs
After redeployment, check the logs. You should now see:
- Better error messages if variables are missing
- List of available environment variables (for debugging)
- "API started successfully" if everything works

### 5. Test
```bash
curl https://invite-code-jcxtk9y58-neuralarcs-projects.vercel.app/health
```

Should return:
```json
{"status":"healthy","environment":"production"}
```

## Debugging
If it still fails, check the Vercel logs. The new code will show:
- Which environment variables are available
- Which ones are missing
- Better error messages

This will help identify if:
- Variables are set in wrong environment (Development vs Production)
- Variable names have typos
- Variables are not being read correctly

