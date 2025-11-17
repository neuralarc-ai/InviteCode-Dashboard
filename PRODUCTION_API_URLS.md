# Production API URLs Reference

## Current Production Setup

### Frontend
- **URL**: `https://admin.he2.ai`
- **Type**: Next.js Application

### Backend API
- **Current Config**: `NEXT_PUBLIC_BACKEND_URL=https://admin.he2.ai`
- **Status**: ⚠️ **NEEDS UPDATE** - This points to frontend, not backend

## API URL Options

### Option 1: Backend on Subdomain (Recommended)
```
Backend URL: https://api.he2.ai
Frontend URL: https://admin.he2.ai
```

**Update Required:**
- `.env.production`: `NEXT_PUBLIC_BACKEND_URL=https://api.he2.ai`
- `backend/.env`: `CORS_ORIGINS=https://admin.he2.ai`

### Option 2: Backend on Vercel
```
Backend URL: https://your-project.vercel.app
Frontend URL: https://admin.he2.ai
```

**Update Required:**
- `.env.production`: `NEXT_PUBLIC_BACKEND_URL=https://your-project.vercel.app`
- `backend/.env`: `CORS_ORIGINS=https://admin.he2.ai`

### Option 3: Backend on Same Domain (Reverse Proxy)
```
Backend URL: https://admin.he2.ai/api-backend
Frontend URL: https://admin.he2.ai
```

**Requires**: Reverse proxy configuration in your hosting provider

## FastAPI Backend Endpoints

Once backend is deployed, these endpoints will be available:

### Base URL
```
https://your-backend-url/api/v1
```

### Available Endpoints

#### Invite Codes
- `GET /api/v1/invite-codes` - Get all invite codes
- `POST /api/v1/invite-codes/generate` - Generate invite code
- `DELETE /api/v1/invite-codes/{code_id}` - Delete invite code
- `POST /api/v1/invite-codes/bulk-delete` - Bulk delete
- `POST /api/v1/invite-codes/archive` - Archive code
- `POST /api/v1/invite-codes/unarchive` - Unarchive code
- `POST /api/v1/invite-codes/bulk-archive-used` - Bulk archive

#### Users
- `GET /api/v1/users` - Get all users
- `POST /api/v1/users` - Create user
- `DELETE /api/v1/users/{user_id}` - Delete user
- `POST /api/v1/users/bulk-delete` - Bulk delete
- `POST /api/v1/users/fetch-emails` - Fetch emails

#### Credits
- `GET /api/v1/credits/balances` - Get balances
- `POST /api/v1/credits/assign` - Assign credits

#### Emails
- `POST /api/v1/emails/bulk` - Send bulk email
- `POST /api/v1/emails/individual` - Send individual email
- `GET /api/v1/emails/images` - Get images

#### Usage Logs
- `POST /api/v1/usage-logs/aggregated` - Get aggregated logs

#### Waitlist
- `GET /api/v1/waitlist` - Get waitlist
- `POST /api/v1/waitlist/archive` - Archive users

#### Health Check
- `GET /health` - Health check (no auth)
- `GET /` - Root endpoint (no auth)
- `GET /docs` - API documentation

## Mobile App API Calls

The mobile app calls Next.js API routes (not FastAPI directly):

### Base URL
```
https://admin.he2.ai/api
```

### Available Routes
- `GET /api/dashboard-summary`
- `GET /api/user-profiles`
- `POST /api/create-user`
- `DELETE /api/delete-user-profile`
- `GET /api/credit-balances`
- `POST /api/credit-balance`
- `GET /api/credit-purchases`
- `POST /api/usage-logs-aggregated`
- `POST /api/send-bulk-email`
- `POST /api/send-individual-email`
- `POST /api/send-activity-reminder`
- `POST /api/send-custom-reminder`

## How to Find Your Backend URL

### If Deployed to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your backend project
3. Check the deployment URL (e.g., `https://your-project.vercel.app`)
4. Or check custom domain if configured

### If Deployed Elsewhere

1. Check your hosting provider dashboard
2. Look for deployment URL or custom domain
3. Test health endpoint: `https://your-url/health`

## Quick Setup Checklist

- [ ] Deploy FastAPI backend to production
- [ ] Get backend production URL
- [ ] Update `NEXT_PUBLIC_BACKEND_URL` in `.env.production`
- [ ] Update `CORS_ORIGINS` in `backend/.env`
- [ ] Redeploy Next.js frontend
- [ ] Test backend health: `https://your-backend-url/health`
- [ ] Test API docs: `https://your-backend-url/docs`
- [ ] Verify mobile app can connect

## Testing Your Backend

### Health Check
```bash
curl https://your-backend-url/health
```

Expected response:
```json
{
  "status": "healthy",
  "environment": "production"
}
```

### API Documentation
Visit: `https://your-backend-url/docs`

### Test Endpoint (requires auth)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-backend-url/api/v1/invite-codes
```

