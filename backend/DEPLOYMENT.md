# Vercel Deployment Guide

This guide explains how to deploy the FastAPI backend to Vercel with automatic deployments from GitHub.

## Prerequisites

- GitHub repository with the code
- Vercel account (free tier available)
- All environment variables ready (see below)

## Deployment Steps

### 1. Connect GitHub Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. **Important**: Set the **Root Directory** to `backend/`
5. Vercel will automatically detect the `vercel.json` configuration

### 2. Configure Build Settings

- **Framework Preset**: Other
- **Root Directory**: `backend/`
- **Build Command**: (leave empty - Vercel Python runtime handles this)
- **Output Directory**: (leave empty)
- **Install Command**: (leave empty - Vercel installs from `requirements.txt`)

### 3. Set Environment Variables

Add the following environment variables in Vercel Dashboard → Project Settings → Environment Variables:

#### Required Variables

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# SMTP Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SENDER_EMAIL=your_sender_email@example.com
SMTP_FROM=Your Display Name

# Application Configuration
ENVIRONMENT=production
ADMIN_PASSWORD=your_secure_admin_password
API_PREFIX=/api/v1

# CORS Configuration (IMPORTANT: Include your Vercel deployment URL)
CORS_ORIGINS=https://your-vercel-app.vercel.app,https://your-frontend-domain.com,http://localhost:3000
```

**Important Notes:**
- Replace all placeholder values with your actual credentials
- For `CORS_ORIGINS`, include:
  - Your Vercel backend URL (e.g., `https://your-app.vercel.app`)
  - Your frontend/web app URL
  - Your mobile app domain (if applicable)
  - `http://localhost:3000` for local development (optional)

### 4. Deploy

1. Click "Deploy" in Vercel
2. Wait for the build to complete
3. Note your deployment URL (e.g., `https://your-app.vercel.app`)

### 5. Test Deployment

After deployment, test the following endpoints:

- **Health Check**: `https://your-app.vercel.app/health`
- **API Root**: `https://your-app.vercel.app/`
- **API Documentation**: `https://your-app.vercel.app/docs`
- **ReDoc**: `https://your-app.vercel.app/redoc`

### 6. Configure Auto-Deployment

Auto-deployment is enabled by default when you connect a GitHub repository:

- **Production**: Deploys automatically on push to `main` branch
- **Preview**: Creates preview deployments for pull requests (optional)

To configure:
1. Go to Project Settings → Git
2. Ensure "Production Branch" is set to `main`
3. Enable "Automatic deployments from Git"

## Updating Frontend/Mobile Apps

After deployment, update your frontend and mobile apps to use the new backend URL:

### Web App (`src/lib/api-client.ts`)

Set environment variable:
```bash
NEXT_PUBLIC_BACKEND_URL=https://your-app.vercel.app
```

### Mobile App (`mobile/mobile/utils/config.ts`)

Set environment variable:
```bash
EXPO_PUBLIC_BACKEND_URL=https://your-app.vercel.app
```

## Troubleshooting

### Build Failures

- Check that `requirements.txt` is in the `backend/` directory
- Verify Python version is 3.11 (set in `vercel.json`)
- Check build logs in Vercel dashboard for specific errors

### Runtime Errors

- Verify all environment variables are set correctly
- Check function logs in Vercel dashboard
- Ensure static files are accessible (check `vercel.json` includes `static/**`)

### CORS Issues

- Ensure `CORS_ORIGINS` includes your frontend/mobile app URLs
- Check that the Vercel deployment URL is included in `CORS_ORIGINS`
- Verify no trailing slashes in URLs

### Static Files Not Found

- Verify `static/` directory is in `backend/` directory
- Check that `vercel.json` includes `"includeFiles": "static/**"` in functions config
- Static files should be accessible at runtime

## Vercel Limitations

- **Function Timeout**: 
  - Hobby plan: 10 seconds
  - Pro plan: 60 seconds
- **Cold Starts**: First request may be slower (serverless function initialization)
- **File System**: Read-only except `/tmp` directory
- **Static Files**: Must be included in deployment (configured in `vercel.json`)

## Monitoring

- View deployment logs in Vercel Dashboard → Deployments
- Monitor function logs in Vercel Dashboard → Functions
- Set up alerts for failed deployments in Project Settings

## Additional Resources

- [Vercel Python Documentation](https://vercel.com/docs/concepts/functions/serverless-functions/runtimes/python)
- [FastAPI on Vercel](https://vercel.com/guides/deploying-fastapi-with-vercel)

