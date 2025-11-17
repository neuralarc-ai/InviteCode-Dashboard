# TestFlight Production Setup Guide

This guide will help you set up your mobile app for TestFlight production and connect it to your production backend.

## Architecture Overview

```
Mobile App (iOS) 
    ↓
Next.js Frontend API (https://admin.he2.ai/api/*)
    ↓
FastAPI Backend (Production URL needed)
```

## Step 1: Deploy FastAPI Backend to Production

### Option A: Deploy to Vercel (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

3. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables in Vercel Dashboard**:
   - Go to your Vercel project settings
   - Add all environment variables from `backend/.env`:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `SUPABASE_ANON_KEY`
     - `SMTP_HOST`
     - `SMTP_PORT`
     - `SMTP_USER`
     - `SMTP_PASS`
     - `SENDER_EMAIL`
     - `SMTP_FROM`
     - `ENVIRONMENT=production`
     - `CORS_ORIGINS=https://admin.he2.ai` (add mobile app origin if needed)
     - `API_PREFIX=/api/v1`

5. **Get your backend URL**:
   - After deployment, Vercel will provide a URL like: `https://your-backend.vercel.app`
   - Or use a custom domain: `https://api.he2.ai`

### Option B: Deploy to Other Platform

Deploy your FastAPI backend to any hosting platform (AWS, Railway, Render, etc.) and note the production URL.

## Step 2: Update Backend CORS Configuration

Update `backend/.env` to include your production frontend URL:

```env
CORS_ORIGINS=https://admin.he2.ai,http://localhost:9002,http://localhost:3000
```

**Important**: If your mobile app makes direct API calls (not through Next.js), add the mobile app's origin to CORS_ORIGINS.

## Step 3: Update Next.js Frontend to Use Production Backend

1. **Update `.env.production`** in the root directory:
   ```env
   NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.vercel.app
   # OR
   NEXT_PUBLIC_BACKEND_URL=https://api.he2.ai
   ```

2. **Redeploy your Next.js frontend** to apply the changes.

## Step 4: Configure Mobile App for Production

### Update Mobile App Environment

The mobile app's `.env.production` file is already configured correctly:
```env
EXPO_PUBLIC_API_BASE_URL=https://admin.he2.ai
```

This points to your Next.js frontend, which will proxy requests to the FastAPI backend.

### Verify Mobile App Configuration

1. **Check `mobile/mobile/.env.production`**:
   - ✅ `EXPO_PUBLIC_SUPABASE_URL` - Should be your Supabase URL
   - ✅ `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Should be your Supabase anon key
   - ✅ `EXPO_PUBLIC_API_BASE_URL` - Should be `https://admin.he2.ai`
   - ✅ `EXPO_PUBLIC_ADMIN_PASSWORD` - Your admin password

## Step 5: Build iOS App for TestFlight

### Prerequisites

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure EAS** (if not already done):
   ```bash
   eas build:configure
   ```

### Build for TestFlight

1. **Navigate to mobile directory**:
   ```bash
   cd mobile/mobile
   ```

2. **Create production build**:
   ```bash
   eas build --platform ios --profile production
   ```

   This will:
   - Use the `production` profile from `eas.json`
   - Auto-increment the build number
   - Use environment variables from `.env.production`

3. **Wait for build to complete** (this may take 10-20 minutes)

4. **Submit to TestFlight**:
   ```bash
   eas submit --platform ios --profile production
   ```

   Or manually:
   - Go to [Expo Dashboard](https://expo.dev)
   - Find your build
   - Download the `.ipa` file
   - Upload to App Store Connect via Transporter or Xcode

## Step 6: Verify Production Setup

### Test Backend Health

1. **Check backend health endpoint**:
   ```bash
   curl https://your-backend-url.vercel.app/health
   ```

   Should return:
   ```json
   {
     "status": "healthy",
     "environment": "production"
   }
   ```

2. **Check API documentation**:
   - Visit: `https://your-backend-url.vercel.app/docs`
   - Verify all endpoints are accessible

### Test Frontend Connection

1. **Check Next.js API routes**:
   - Visit: `https://admin.he2.ai/api/dashboard-summary`
   - Should return data (may require authentication)

### Test Mobile App

1. **Install TestFlight build** on your device
2. **Login** with admin credentials
3. **Verify API calls work**:
   - Dashboard loads data
   - Users list loads
   - Credits display correctly
   - All features work as expected

## Step 7: Environment Variables Summary

### Mobile App (`.env.production`)
```env
EXPO_PUBLIC_SUPABASE_URL=https://gdkwidkzbdwjtzgjezch.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_ADMIN_PASSWORD=neuralarc.ai@2025$
EXPO_PUBLIC_API_BASE_URL=https://admin.he2.ai
```

### Next.js Frontend (`.env.production`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://gdkwidkzbdwjtzgjezch.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.vercel.app
```

### FastAPI Backend (`backend/.env`)
```env
SUPABASE_URL=https://gdkwidkzbdwjtzgjezch.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
ENVIRONMENT=production
CORS_ORIGINS=https://admin.he2.ai
API_PREFIX=/api/v1
```

## Troubleshooting

### Mobile App Can't Connect to API

1. **Check network connectivity**
2. **Verify `EXPO_PUBLIC_API_BASE_URL` is correct**
3. **Check Next.js frontend is accessible**: `https://admin.he2.ai`
4. **Verify Next.js API routes are working**

### Backend Returns CORS Errors

1. **Check `CORS_ORIGINS` in backend `.env`**
2. **Ensure frontend URL is included**: `https://admin.he2.ai`
3. **Restart backend after changing CORS settings**

### Build Fails

1. **Check EAS build logs** in Expo dashboard
2. **Verify all environment variables are set**
3. **Ensure `app.json` is correctly configured**
4. **Check iOS bundle identifier matches App Store Connect**

## Production API URLs

### Your Production Setup

- **Frontend**: `https://admin.he2.ai`
- **Backend API**: `https://your-backend-url.vercel.app` (or custom domain)
- **API Base Path**: `/api/v1`
- **Full API URL Example**: `https://your-backend-url.vercel.app/api/v1/invite-codes`

### Mobile App API Calls

The mobile app calls Next.js API routes:
- Base: `https://admin.he2.ai`
- Example: `https://admin.he2.ai/api/dashboard-summary`
- Example: `https://admin.he2.ai/api/user-profiles`

These Next.js routes then call the FastAPI backend internally.

## Next Steps

1. ✅ Deploy FastAPI backend to production
2. ✅ Update `NEXT_PUBLIC_BACKEND_URL` in frontend
3. ✅ Redeploy Next.js frontend
4. ✅ Build iOS app with EAS
5. ✅ Submit to TestFlight
6. ✅ Test on physical device
7. ✅ Monitor for errors and performance

## Support

If you encounter issues:
1. Check Expo build logs
2. Check Vercel deployment logs
3. Check browser console for errors
4. Verify all environment variables are set correctly

