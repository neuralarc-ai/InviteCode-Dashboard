# Backend Production Deployment Guide

This guide will help you deploy your FastAPI backend server to production.

## Prerequisites

- Backend code is ready and tested locally
- Production environment variables configured
- Vercel account (or your chosen hosting provider)

## Option 1: Deploy to Vercel (Recommended)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
cd backend
vercel login
```

### Step 3: Deploy to Production

```bash
# Initial deployment
vercel --prod

# Or link to existing project
vercel link
vercel --prod
```

### Step 4: Set Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your backend project
3. Go to Settings → Environment Variables
4. Add all variables from your `.env` file:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
SENDER_EMAIL=...
SMTP_FROM=...
ENVIRONMENT=production
CORS_ORIGINS=https://admin.he2.ai
API_PREFIX=/api/v1
```

### Step 5: Get Your Production URL

After deployment, Vercel will give you a URL like:
- `https://your-project-name.vercel.app`

Or if you configured a custom domain:
- `https://api.he2.ai` (example)

## Option 2: Deploy to Server (VPS/Dedicated Server)

### Step 1: Set Up Server

```bash
# SSH into your server
ssh user@your-server-ip

# Install Python 3.11
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip -y

# Install Nginx (for reverse proxy)
sudo apt install nginx -y
```

### Step 2: Clone and Set Up Backend

```bash
# Clone your repository
git clone <your-repo-url>
cd InviteCode-Dashboard/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with production values
nano .env
# (Copy your production .env values)
```

### Step 3: Set Up Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'backend-api',
    script: 'venv/bin/uvicorn',
    args: 'app.main:app --host 0.0.0.0 --port 8000 --workers 4',
    interpreter: 'none',
    cwd: '/path/to/backend',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 4: Configure Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/backend-api
```

Add configuration:

```nginx
server {
    listen 80;
    server_name api.he2.ai;  # Your backend domain

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/backend-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Set Up SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.he2.ai
```

## Option 3: Deploy with Docker

### Step 1: Build Docker Image

```bash
cd backend
docker build -t invite-code-backend:latest .
```

### Step 2: Run Container

```bash
docker run -d \
  --name backend-api \
  -p 8000:8000 \
  --env-file .env \
  --restart unless-stopped \
  invite-code-backend:latest
```

### Step 3: Use Docker Compose (Recommended)

```bash
cd backend
docker-compose up -d
```

## After Deployment

### Step 1: Test Your Backend

```bash
# Health check
curl https://your-backend-url/health

# Should return:
# {"status":"healthy","environment":"production"}
```

### Step 2: Update Mobile App Configuration

Update `mobile/mobile/.env.production`:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-backend-url
```

Replace `your-backend-url` with your actual production backend URL.

### Step 3: Update Backend CORS (if needed)

Ensure your `backend/.env` has the correct CORS origins:

```env
CORS_ORIGINS=https://admin.he2.ai,https://your-mobile-app-domain
```

### Step 4: Rebuild Mobile App

```bash
cd mobile/mobile
# Rebuild with production environment
eas build --profile production --platform ios
```

## Verification Checklist

- [ ] Backend deployed to production
- [ ] Health endpoint working: `https://your-backend-url/health`
- [ ] API docs accessible: `https://your-backend-url/docs`
- [ ] CORS configured correctly
- [ ] Environment variables set in production
- [ ] Mobile app `.env.production` updated with backend URL
- [ ] Mobile app rebuilt with new configuration
- [ ] Tested API endpoints from mobile app

## Troubleshooting

### Backend Not Starting

```bash
# Check logs
pm2 logs backend-api

# Or if using Docker
docker logs backend-api
```

### CORS Errors

Make sure your backend `.env` has:
```env
CORS_ORIGINS=https://admin.he2.ai,https://your-mobile-domain
```

### Connection Issues

1. Check firewall rules
2. Verify port 8000 is open (or configured port)
3. Test health endpoint: `curl https://your-backend-url/health`

## Security Notes

- ✅ Never commit `.env` files
- ✅ Use environment variables in hosting platform
- ✅ Enable HTTPS/SSL in production
- ✅ Use strong API keys and secrets
- ✅ Regularly update dependencies
- ✅ Monitor logs for suspicious activity

