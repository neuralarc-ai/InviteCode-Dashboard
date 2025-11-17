# Backend Server Setup Guide

This guide explains how to set up and run the backend server independently.

## Quick Start

### Option 1: Using the Startup Script (Recommended)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the server:**
   ```bash
   # Development mode (with auto-reload)
   ./run-server.sh
   
   # Production mode (with multiple workers)
   ./start-production.sh
   ```

### Option 2: Using Make Commands

```bash
# Install dependencies
make install

# Start development server
make dev

# Start production server
make prod
```

### Option 3: Using Docker

```bash
# Build and start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop server
docker-compose down
```

### Option 4: Manual Start

```bash
# Create virtual environment (if not exists)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload  # Development
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4  # Production
```

## Configuration

### Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SENDER_EMAIL=your_sender_email@example.com
SMTP_FROM=Your Sender Name

# Application Configuration
ENVIRONMENT=development  # or production
CORS_ORIGINS=http://localhost:3000
API_PREFIX=/api/v1
```

### Server Configuration

You can customize the server by setting environment variables:

- `HOST`: Server host (default: `0.0.0.0`)
- `PORT`: Server port (default: `8000`)
- `WORKERS`: Number of worker processes for production (default: `4`)
- `ENVIRONMENT`: Environment mode - `development` or `production`

## Server Endpoints

Once the server is running, you can access:

- **API Base URL**: `http://localhost:8000`
- **Health Check**: `http://localhost:8000/health`
- **API Documentation (Swagger)**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`
- **API Prefix**: `/api/v1`

## Development vs Production

### Development Mode
- Auto-reload enabled (restarts on code changes)
- Single worker process
- Debug logging enabled
- Set `ENVIRONMENT=development` in `.env`

### Production Mode
- Multiple worker processes (4 by default)
- Access logging enabled
- Optimized for performance
- Set `ENVIRONMENT=production` in `.env`

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Start server
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop server
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Using Docker directly

```bash
# Build image
docker build -t invite-code-api .

# Run container
docker run -d \
  --name invite-code-backend \
  -p 8000:8000 \
  --env-file .env \
  invite-code-api

# View logs
docker logs -f invite-code-backend

# Stop container
docker stop invite-code-backend
docker rm invite-code-backend
```

## Troubleshooting

### Port Already in Use

If port 8000 is already in use, change it:

```bash
# In .env file
PORT=8001

# Or set environment variable
export PORT=8001
./run-server.sh
```

### Virtual Environment Issues

If you encounter virtual environment issues:

```bash
# Remove old virtual environment
rm -rf venv

# Create new one
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Docker Issues

If Docker container fails to start:

```bash
# Check logs
docker-compose logs backend

# Rebuild container
docker-compose build --no-cache
docker-compose up -d
```

### Environment Variables Not Loading

Ensure:
1. `.env` file exists in the `backend` directory
2. No extra spaces around `=` in `.env` file
3. String values don't need quotes unless they contain special characters

## Testing the Server

Once the server is running, test it:

```bash
# Health check
curl http://localhost:8000/health

# Root endpoint
curl http://localhost:8000/

# API documentation
open http://localhost:8000/docs
```

## Production Deployment Considerations

1. **Use a reverse proxy** (nginx, Caddy) for SSL/TLS
2. **Set proper CORS origins** in production `.env`
3. **Use environment-specific configuration**
4. **Enable rate limiting** at the reverse proxy level
5. **Set up monitoring and logging**
6. **Use process manager** (systemd, PM2, supervisord) for auto-restart
7. **Configure proper firewall rules**

## Security Notes

- Never commit `.env` file to version control
- Use strong, unique keys for Supabase
- Keep SMTP credentials secure
- Set appropriate CORS origins for production
- Use HTTPS in production
- Regularly update dependencies

## Support

For issues or questions, refer to the main `README.md` file or check the API documentation at `/docs` endpoint when the server is running.

