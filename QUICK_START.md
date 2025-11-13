# Quick Start Guide

This guide will help you run both the backend (FastAPI) and frontend (Next.js) services.

## Prerequisites

- **Python 3.11+** (for backend)
- **Node.js 18+** (for frontend)
- **Supabase account** with project configured
- **SMTP credentials** for email functionality

## Step 1: Set Up Backend

### 1.1 Navigate to Backend Directory

```bash
cd backend
```

### 1.2 Create Virtual Environment

```bash
# On macOS/Linux:
python3 -m venv venv
source venv/bin/activate

# On Windows:
python -m venv venv
venv\Scripts\activate
```

### 1.3 Install Dependencies

```bash
pip install -r requirements.txt
```

### 1.4 Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cp .env.example .env
```

Edit `backend/.env` with your configuration:

```env
# Supabase Configuration (from your root .env)
SUPABASE_URL=https://gdkwidkzbdwjtzgjezch.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# SMTP Configuration (from your root .env)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=dev@neuralarc.ai
SMTP_PASS=your_smtp_password_here
SENDER_EMAIL=dev@neuralarc.ai
SMTP_FROM=Team Helium

# Application Configuration
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:9002,http://localhost:3000
API_PREFIX=/api/v1
```

**Note**: Copy the values from your root `.env` file for Supabase and SMTP settings.

### 1.5 Start Backend Server

```bash
# From the backend directory
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or using Python directly:

```bash
python -m app.main
```

The backend will be available at:
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Step 2: Set Up Frontend

### 2.1 Navigate to Root Directory

Open a **new terminal** and navigate to the project root:

```bash
cd /Users/apple/Desktop/InviteCode-Dashboard
```

### 2.2 Install Dependencies (if not already done)

```bash
npm install
```

### 2.3 Configure Environment Variables

Add the backend URL to your root `.env` file:

```env
# Add this line to your existing .env file
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

Your complete `.env` should look like:

```env
# Server-side only (never exposed to client)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Client-side (public keys only)
NEXT_PUBLIC_SUPABASE_URL=https://gdkwidkzbdwjtzgjezch.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Backend URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=dev@neuralarc.ai
SMTP_PASS=your_smtp_password
SENDER_EMAIL=dev@neuralarc.ai
SENDER_NAME=Team Helium
SMTP_FROM=Team Helium

# AI Configuration
GEMINI_API_KEY=your_gemini_key
```

### 2.4 Start Frontend Server

```bash
npm run dev
```

The frontend will be available at:
- **Frontend**: http://localhost:9002

## Step 3: Verify Everything Works

### 3.1 Check Backend Health

Visit http://localhost:8000/health in your browser. You should see:

```json
{
  "status": "healthy",
  "environment": "development"
}
```

### 3.2 Check API Documentation

Visit http://localhost:8000/docs to see the interactive API documentation.

### 3.3 Check Frontend

Visit http://localhost:9002 and log in to the dashboard.

## Running Both Services

You need **two terminal windows**:

### Terminal 1 - Backend:
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

### Terminal 2 - Frontend:
```bash
cd /Users/apple/Desktop/InviteCode-Dashboard
npm run dev
```

## Troubleshooting

### Backend Issues

**Problem**: `ModuleNotFoundError` or import errors
- **Solution**: Make sure virtual environment is activated and dependencies are installed

**Problem**: `SUPABASE_URL` or other env vars not found
- **Solution**: Check that `.env` file exists in `backend/` directory and has all required variables

**Problem**: Port 8000 already in use
- **Solution**: Change port: `uvicorn app.main:app --reload --port 8001`

**Problem**: CORS errors
- **Solution**: Make sure `CORS_ORIGINS` in backend `.env` includes `http://localhost:9002`

### Frontend Issues

**Problem**: Cannot connect to backend
- **Solution**: 
  1. Verify backend is running on port 8000
  2. Check `NEXT_PUBLIC_BACKEND_URL` is set correctly in root `.env`
  3. Restart frontend server after changing `.env`

**Problem**: Authentication errors
- **Solution**: 
  1. Verify Supabase credentials are correct
  2. Check that JWT token is being sent in requests
  3. Check browser console for specific error messages

**Problem**: Port 9002 already in use
- **Solution**: Change port in `package.json` or use: `npm run dev -- -p 3000`

## Quick Commands Reference

### Backend
```bash
# Activate virtual environment
cd backend
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload

# Run with specific port
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Next Steps

1. **Test the API**: Visit http://localhost:8000/docs and try the endpoints
2. **Test Frontend**: Log in and verify all features work
3. **Check Logs**: Monitor both terminal windows for any errors
4. **Read Documentation**: 
   - Backend: `backend/README.md`
   - Migration: `BACKEND_MIGRATION_GUIDE.md`

## Production Deployment

For production deployment, see:
- Backend: `backend/README.md` (Deployment section)
- Frontend: Standard Next.js deployment

## Need Help?

- Check backend logs in terminal
- Check frontend console in browser
- Review API documentation at `/docs`
- Check environment variable configuration
