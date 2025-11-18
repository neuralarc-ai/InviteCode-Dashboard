# Invite Code Dashboard Backend API

FastAPI backend service for the Invite Code Dashboard application. This service provides a RESTful API for managing invite codes, users, credits, emails, and usage logs.

## Features

- **Invite Code Management**: Generate, delete, archive, and manage invite codes
- **User Management**: Create, delete, and manage user profiles
- **Credit Management**: Assign and track user credits
- **Email Service**: Send bulk and individual emails with templates
- **Usage Logs**: Aggregate and query usage logs
- **Authentication**: Supabase Auth JWT token verification
- **OpenAPI Documentation**: Automatic API documentation at `/docs`

## Prerequisites

- Python 3.11+
- Supabase account and project
- SMTP server credentials for email sending

## Installation

1. **Clone the repository** (if not already done):
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Configure environment variables** in `.env`:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
   - `SUPABASE_ANON_KEY`: Supabase anonymous key
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: SMTP configuration
   - `SENDER_EMAIL`, `SMTP_FROM`: Email sender configuration
   - `CORS_ORIGINS`: Comma-separated list of allowed origins

## Running the Application

### Development Mode

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or using Python directly:

```bash
python -m app.main
```

The API will be available at:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### Invite Codes
- `GET /api/v1/invite-codes` - Get all invite codes
- `POST /api/v1/invite-codes/generate` - Generate invite code
- `DELETE /api/v1/invite-codes/{code_id}` - Delete invite code
- `POST /api/v1/invite-codes/bulk-delete` - Bulk delete invite codes
- `POST /api/v1/invite-codes/archive` - Archive invite code
- `POST /api/v1/invite-codes/unarchive` - Unarchive invite code
- `POST /api/v1/invite-codes/bulk-archive-used` - Bulk archive used codes

### Users
- `GET /api/v1/users` - Get all users
- `POST /api/v1/users` - Create user
- `DELETE /api/v1/users/{user_id}` - Delete user
- `POST /api/v1/users/bulk-delete` - Bulk delete users
- `POST /api/v1/users/fetch-emails` - Fetch user emails

### Credits
- `GET /api/v1/credits/balances` - Get credit balances
- `POST /api/v1/credits/assign` - Assign credits to user

### Emails
- `POST /api/v1/emails/bulk` - Send bulk email
- `POST /api/v1/emails/individual` - Send individual email
- `GET /api/v1/emails/images` - Get email images as base64

### Usage Logs
- `POST /api/v1/usage-logs/aggregated` - Get aggregated usage logs

## Authentication

All endpoints (except `/health` and `/`) require authentication using Supabase JWT tokens.

Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Deployment

### Vercel Serverless (Recommended)

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.**

Quick start:
1. Connect your GitHub repository to Vercel
2. Set root directory to `backend/` in Vercel project settings
3. Add all required environment variables (see DEPLOYMENT.md)
4. Deploy automatically on push to `main` branch

The deployment includes:
- Automatic deployments from GitHub
- Serverless function scaling
- Static file serving for email images
- Health check and API documentation endpoints

### Docker

1. Build image:
   ```bash
   docker build -t invite-code-api .
   ```

2. Run container:
   ```bash
   docker run -p 8000:8000 --env-file .env invite-code-api
   ```

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/          # API route handlers
│   ├── core/            # Core utilities (config, database, email, auth)
│   ├── models/          # Pydantic models
│   ├── services/        # Business logic services
│   └── main.py          # FastAPI application entry point
├── static/
│   └── images/          # Email template images
├── requirements.txt     # Python dependencies
├── .env.example         # Environment variable template
└── README.md            # This file
```

## Development

### Code Style

This project follows PEP 8 style guidelines. Use a linter like `flake8` or `black` for formatting.

### Testing

```bash
# Run tests (when implemented)
pytest
```

### Logging

Logs are configured to output to console with INFO level. Adjust logging level in `app/main.py` if needed.

## Troubleshooting

### Database Connection Issues

- Verify Supabase credentials in `.env`
- Check network connectivity to Supabase
- Ensure service role key has proper permissions

### Email Sending Issues

- Verify SMTP credentials
- Check SMTP server allows connections from your IP
- Test SMTP connection separately

### Authentication Issues

- Verify JWT token is valid and not expired
- Check token is included in Authorization header
- Ensure Supabase Auth is properly configured

## License

[Your License Here]

## Support

For issues and questions, please contact [your support email].

