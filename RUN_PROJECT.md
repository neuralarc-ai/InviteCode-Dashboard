# How to Run the Project

This project consists of two services that need to run simultaneously:
1. **Backend** (FastAPI) - Port 8000
2. **Frontend** (Next.js) - Port 9002

## Quick Start (Recommended)

### Option 1: Using the Script (Easiest)

**Terminal 1 - Backend:**
```bash
./run-backend.sh
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Option 2: Manual Setup

## Step-by-Step Instructions

### 1. Backend Setup (First Time Only)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

**Edit `backend/.env`** with your configuration (copy values from root `.env`):

```env
SUPABASE_URL=https://gdkwidkzbdwjtzgjezch.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=dev@neuralarc.ai
SMTP_PASS=your_password
SENDER_EMAIL=dev@neuralarc.ai
SMTP_FROM=Team Helium
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:9002,http://localhost:3000
API_PREFIX=/api/v1
```

### 2. Start Backend

**In Terminal 1:**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

✅ Backend running at: http://localhost:8000
📚 API Docs at: http://localhost:8000/docs

### 3. Configure Frontend

**Add to root `.env` file:**
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### 4. Start Frontend

**In Terminal 2 (new terminal):**
```bash
# From project root
npm install  # Only needed first time
npm run dev
```

✅ Frontend running at: http://localhost:9002

## Verify Everything Works

1. **Backend Health Check**: http://localhost:8000/health
   - Should return: `{"status": "healthy", "environment": "development"}`

2. **API Documentation**: http://localhost:8000/docs
   - Interactive Swagger UI should load

3. **Frontend**: http://localhost:9002
   - Dashboard should load and you can log in

## Common Issues & Solutions

### ❌ Backend: "ModuleNotFoundError"
**Solution**: 
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### ❌ Backend: "SUPABASE_URL not found"
**Solution**: Create `backend/.env` file with all required variables

### ❌ Frontend: "Cannot connect to backend"
**Solution**: 
1. Check backend is running: http://localhost:8000/health
2. Verify `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000` in root `.env`
3. Restart frontend server

### ❌ Port Already in Use
**Backend**: Change port in command: `--port 8001`
**Frontend**: Change in `package.json` or use: `npm run dev -- -p 3000`

### ❌ CORS Errors
**Solution**: Make sure `CORS_ORIGINS` in `backend/.env` includes `http://localhost:9002`

## Development Workflow

### Daily Development

1. **Start Backend** (Terminal 1):
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload
   ```

2. **Start Frontend** (Terminal 2):
   ```bash
   npm run dev
   ```

3. **Make Changes**: Both servers auto-reload on file changes

4. **Test**: 
   - Backend: http://localhost:8000/docs
   - Frontend: http://localhost:9002

## Environment Variables Summary

### Backend (`backend/.env`)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration
- `SENDER_EMAIL`, `SMTP_FROM` - Email sender info
- `CORS_ORIGINS` - Allowed frontend URLs

### Frontend (root `.env`)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_BACKEND_URL` - Backend API URL (http://localhost:8000)
- `SMTP_*` - Email config (if still using Next.js API routes)
- `GEMINI_API_KEY` - AI API key

## Production Deployment

See:
- `backend/README.md` - Backend deployment options
- Standard Next.js deployment for frontend

## Need More Help?

- **Backend Issues**: Check `backend/README.md`
- **Migration Guide**: See `BACKEND_MIGRATION_GUIDE.md`
- **API Documentation**: http://localhost:8000/docs (when backend is running)

