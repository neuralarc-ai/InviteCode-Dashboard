# Backend Migration Guide

This guide explains how to migrate from the Next.js API routes to the new FastAPI backend service.

## Overview

The backend has been separated into a standalone FastAPI service located in the `backend/` directory. This allows the backend to be used independently by other developers and applications.

## Architecture Changes

### Before (Monolith)
- Next.js API routes in `src/app/api/`
- Frontend and backend in the same codebase
- All logic tightly coupled

### After (Separated)
- FastAPI backend service in `backend/`
- Frontend uses API client to communicate with backend
- Backend can be deployed independently
- Clear separation of concerns

## Setup

### 1. Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Start backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

Backend will be available at `http://localhost:8000`

### 2. Frontend Setup

1. Add backend URL to `.env`:
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   ```

2. The frontend now uses the API client (`src/lib/api-client.ts`) instead of direct API calls.

## API Endpoint Mapping

### Invite Codes

| Old Endpoint | New Endpoint | Method |
|-------------|--------------|--------|
| `/api/generate-invite-code` | `/api/v1/invite-codes/generate` | POST |
| `/api/delete-invite-code` | `/api/v1/invite-codes/{code_id}` | DELETE |
| `/api/bulk-delete-invite-codes` | `/api/v1/invite-codes/bulk-delete` | POST |
| `/api/archive-invite-code` | `/api/v1/invite-codes/archive` | POST |
| `/api/unarchive-invite-code` | `/api/v1/invite-codes/unarchive` | POST |
| `/api/bulk-archive-used-codes` | `/api/v1/invite-codes/bulk-archive-used` | POST |

### Users

| Old Endpoint | New Endpoint | Method |
|-------------|--------------|--------|
| `/api/create-user` | `/api/v1/users` | POST |
| `/api/delete-user-profile` | `/api/v1/users/{user_id}` | DELETE |
| `/api/bulk-delete-user-profiles` | `/api/v1/users/bulk-delete` | POST |
| `/api/fetch-user-emails` | `/api/v1/users/fetch-emails` | POST |

### Credits

| Old Endpoint | New Endpoint | Method |
|-------------|--------------|--------|
| `/api/credit-balance` | `/api/v1/credits/assign` | POST |
| `/api/credit-balances` | `/api/v1/credits/balances` | GET |

### Emails

| Old Endpoint | New Endpoint | Method |
|-------------|--------------|--------|
| `/api/send-bulk-email` | `/api/v1/emails/bulk` | POST |
| `/api/send-individual-email` | `/api/v1/emails/individual` | POST |
| `/api/get-email-images` | `/api/v1/emails/images` | GET |

### Usage Logs

| Old Endpoint | New Endpoint | Method |
|-------------|--------------|--------|
| `/api/usage-logs-aggregated` | `/api/v1/usage-logs/aggregated` | POST |

## Using the API Client

The frontend now uses a centralized API client. Example usage:

```typescript
import { inviteCodesApi, usersApi, creditsApi } from '@/lib/api-client';

// Generate invite code
const result = await inviteCodesApi.generate(1, 30);

// Get all users
const users = await usersApi.getAll();

// Assign credits
await creditsApi.assign(userId, 100, 'Initial credits');
```

## Authentication

All backend endpoints require Supabase JWT authentication. The API client automatically handles token retrieval and inclusion in requests.

The token is obtained from the Supabase session and included in the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

## Migration Steps

### Step 1: Update Frontend Code

Replace direct API calls with API client methods:

**Before:**
```typescript
const response = await fetch('/api/generate-invite-code', {
  method: 'POST',
  body: JSON.stringify({ maxUses: 1 }),
});
```

**After:**
```typescript
import { inviteCodesApi } from '@/lib/api-client';
const result = await inviteCodesApi.generate(1, 30);
```

### Step 2: Update Environment Variables

Add `NEXT_PUBLIC_BACKEND_URL` to your `.env` file.

### Step 3: Test Backend Independently

1. Start backend server
2. Visit `http://localhost:8000/docs` for API documentation
3. Test endpoints using the Swagger UI

### Step 4: Update Frontend

1. Update all API calls to use the new API client
2. Test all functionality
3. Remove old Next.js API routes (optional, after full migration)

## Deployment

### Backend Deployment

The backend can be deployed independently:

- **Vercel**: Use `vercel.json` configuration
- **AWS Lambda**: Use Serverless Framework
- **Docker**: Use provided `Dockerfile`
- **Traditional Server**: Run with uvicorn

### Frontend Deployment

The frontend deployment remains the same, but ensure:
- `NEXT_PUBLIC_BACKEND_URL` is set to your backend URL
- CORS is configured on the backend to allow frontend domain

## Troubleshooting

### CORS Errors

If you see CORS errors, ensure:
1. Backend `CORS_ORIGINS` includes your frontend URL
2. Backend is running and accessible

### Authentication Errors

If authentication fails:
1. Verify Supabase credentials in backend `.env`
2. Check that JWT token is valid
3. Ensure token is being sent in Authorization header

### Connection Errors

If frontend can't connect to backend:
1. Verify `NEXT_PUBLIC_BACKEND_URL` is set correctly
2. Check backend is running
3. Verify network connectivity

## Benefits of Separation

1. **Independence**: Backend can be used by other applications
2. **Scalability**: Backend can scale independently
3. **Technology Choice**: Backend uses FastAPI (Python) optimized for APIs
4. **Documentation**: Automatic OpenAPI/Swagger documentation
5. **Type Safety**: Pydantic models ensure data validation
6. **Deployment Flexibility**: Deploy backend separately from frontend

## Next Steps

1. Complete frontend migration to use API client
2. Test all functionality
3. Deploy backend to production
4. Update frontend to use production backend URL
5. Monitor and optimize

## Support

For issues or questions:
- Check backend logs
- Review API documentation at `/docs`
- Check environment variable configuration
- Verify Supabase connection

