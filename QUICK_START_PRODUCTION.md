# Quick Start: Production Setup for TestFlight

## 🎯 Goal
Deploy backend and build iOS app for TestFlight production.

## 📋 Step-by-Step Instructions

### Step 1: Deploy FastAPI Backend

```bash
# Navigate to backend directory
cd backend

# Install Vercel CLI (if not installed)
npm i -g vercel

# Deploy to production
vercel --prod
```

**After deployment:**
- Note your backend URL (e.g., `https://your-backend.vercel.app`)
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Add all variables from `backend/.env`

### Step 2: Update Frontend Configuration

Update `.env.production` in the root directory:

```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.vercel.app
```

Replace `your-backend-url.vercel.app` with your actual backend URL from Step 1.

### Step 3: Update Backend CORS

Update `backend/.env`:

```env
CORS_ORIGINS=https://admin.he2.ai
ENVIRONMENT=production
```

### Step 4: Build iOS App for TestFlight

```bash
# Navigate to mobile app directory
cd mobile/mobile

# Install EAS CLI (if not installed)
npm install -g eas-cli

# Login to Expo
eas login

# Build for production
eas build --platform ios --profile production

# Submit to TestFlight (after build completes)
eas submit --platform ios --profile production
```

## ✅ Verification

### Test Backend
```bash
curl https://your-backend-url.vercel.app/health
```

Should return: `{"status":"healthy","environment":"production"}`

### Test Frontend
Visit: `https://admin.he2.ai` - Should load correctly

### Test Mobile App
1. Install TestFlight build on device
2. Login with admin credentials
3. Verify all features work

## 🔗 Your Production URLs

- **Frontend**: `https://admin.he2.ai`
- **Backend**: `https://your-backend-url.vercel.app` (update after deployment)
- **Mobile API Base**: `https://admin.he2.ai` (already configured)

## 📝 Important Notes

1. **Mobile app** connects to Next.js frontend (`https://admin.he2.ai/api/*`)
2. **Next.js frontend** connects to FastAPI backend (configured in `.env.production`)
3. **Backend CORS** must allow `https://admin.he2.ai`

## 🆘 Troubleshooting

**Backend not accessible?**
- Check Vercel deployment status
- Verify environment variables are set
- Check deployment logs

**Mobile app can't connect?**
- Verify `EXPO_PUBLIC_API_BASE_URL=https://admin.he2.ai` in `mobile/mobile/.env.production`
- Check Next.js frontend is accessible
- Test API endpoints in browser

**CORS errors?**
- Ensure `CORS_ORIGINS` includes `https://admin.he2.ai`
- Restart backend after changing CORS settings

