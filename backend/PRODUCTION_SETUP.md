# Quick Production Setup Steps

## 🚀 Deploy Backend to Production

### Step 1: Choose Deployment Method

**Option A: Vercel (Easiest - Recommended)**
```bash
cd backend
vercel --prod
```

**Option B: Your Own Server**
- Use Docker: `docker-compose up -d`
- Use PM2: Follow DEPLOY_PRODUCTION.md

### Step 2: Get Your Production Backend URL

After deployment, you'll get a URL like:
- Vercel: `https://your-project.vercel.app`
- Custom Domain: `https://api.he2.ai` (if configured)

### Step 3: Set Environment Variables in Production

Add these to your hosting platform (Vercel dashboard, etc.):

```
SUPABASE_URL=https://gdkwidkzbdwjtzgjezch.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdka3dpZGt6YmR3anR6Z2plemNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg0OTYyNywiZXhwIjoyMDcxNDI1NjI3fQ.tvrdsHezFNIJBEMovS9WmZChPBA5o55SCs1V-Wd_21o
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdka3dpZGt6YmR3anR6Z2plemNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDk2MjcsImV4cCI6MjA3MTQyNTYyN30._qLGLq9fb8-K3vtxbwoeagHmKscU4gf-r8LSMRKT6SI
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=dev@neuralarc.ai
SMTP_PASS=mijc vpur hpjx mpls
SENDER_EMAIL=dev@neuralarc.ai
SMTP_FROM=Team Helium
ENVIRONMENT=production
CORS_ORIGINS=https://admin.he2.ai
API_PREFIX=/api/v1
```

### Step 4: Test Your Backend

```bash
curl https://your-backend-url/health
```

Should return:
```json
{"status":"healthy","environment":"production"}
```

### Step 5: Update Mobile App

Edit `mobile/mobile/.env.production`:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-backend-url
```

Replace `https://your-backend-url` with your actual backend production URL.

### Step 6: Rebuild Mobile App in Xcode

1. Open `mobile/mobile` in Xcode
2. Select "Production" scheme
3. Clean build folder (Cmd+Shift+K)
4. Build for production (Cmd+B)
5. Archive and upload to App Store

Or using EAS CLI:

```bash
cd mobile/mobile
eas build --profile production --platform ios
```

## ✅ Verification

- [ ] Backend health check works: `curl https://your-backend-url/health`
- [ ] API docs accessible: Visit `https://your-backend-url/docs`
- [ ] Mobile app .env.production updated
- [ ] Mobile app rebuilt with new backend URL
- [ ] Tested connection from mobile app

## 📝 Quick Commands Reference

```bash
# Deploy backend to Vercel
cd backend && vercel --prod

# Test backend
curl https://your-backend-url/health

# Build mobile app for production
cd mobile/mobile && eas build --profile production --platform ios
```

