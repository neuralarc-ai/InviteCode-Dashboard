#!/bin/bash

# Backend Server Startup Script
# This script starts the FastAPI backend server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Invite Code Dashboard Backend Server...${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "${YELLOW}Please create a .env file with your configuration.${NC}"
    echo -e "${YELLOW}You can copy .env.example and update it with your values.${NC}"
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

# Get environment from .env file
ENVIRONMENT=$(grep -E "^ENVIRONMENT=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "development")

# Determine host and port
HOST=${HOST:-0.0.0.0}
PORT=${PORT:-8000}
WORKERS=${WORKERS:-4}

# Determine if reload should be enabled (only for development)
if [ "$ENVIRONMENT" = "development" ]; then
    RELOAD_FLAG="--reload"
    WORKERS=""
    echo -e "${YELLOW}Running in DEVELOPMENT mode with auto-reload${NC}"
else
    RELOAD_FLAG=""
    echo -e "${GREEN}Running in PRODUCTION mode with $WORKERS workers${NC}"
fi

# Start the server
echo -e "${GREEN}Starting server on http://$HOST:$PORT${NC}"
echo -e "${GREEN}API Documentation: http://$HOST:$PORT/docs${NC}"
echo -e "${GREEN}ReDoc Documentation: http://$HOST:$PORT/redoc${NC}"
echo ""

if [ -n "$WORKERS" ]; then
    uvicorn app.main:app --host "$HOST" --port "$PORT" --workers "$WORKERS"
else
    uvicorn app.main:app --host "$HOST" --port "$PORT" $RELOAD_FLAG
fi

