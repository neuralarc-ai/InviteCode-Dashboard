#!/bin/bash

# Production Server Startup Script
# This script starts the FastAPI backend server in production mode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Invite Code Dashboard Backend Server (Production Mode)...${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "${YELLOW}Please create a .env file with your production configuration.${NC}"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Virtual environment not found. Creating one...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}Virtual environment created.${NC}"
fi

# Activate virtual environment
echo -e "${GREEN}Activating virtual environment...${NC}"
source venv/bin/activate

# Install/update dependencies
echo -e "${GREEN}Checking dependencies...${NC}"
pip install --upgrade pip -q
pip install -r requirements.txt -q

# Verify production environment
ENVIRONMENT=$(grep -E "^ENVIRONMENT=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "development")
if [ "$ENVIRONMENT" != "production" ]; then
    echo -e "${YELLOW}Warning: ENVIRONMENT in .env is not set to 'production'${NC}"
    echo -e "${YELLOW}Current value: $ENVIRONMENT${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Configuration
HOST=${HOST:-0.0.0.0}
PORT=${PORT:-8000}
WORKERS=${WORKERS:-4}

echo -e "${GREEN}Configuration:${NC}"
echo -e "  Host: $HOST"
echo -e "  Port: $PORT"
echo -e "  Workers: $WORKERS"
echo -e "  Environment: $ENVIRONMENT"
echo ""

# Start the server with multiple workers
echo -e "${GREEN}Starting production server...${NC}"
echo -e "${GREEN}API: http://$HOST:$PORT${NC}"
echo -e "${GREEN}API Documentation: http://$HOST:$PORT/docs${NC}"
echo ""

uvicorn app.main:app \
    --host "$HOST" \
    --port "$PORT" \
    --workers "$WORKERS" \
    --access-log \
    --log-level info \
    --no-use-colors

