#!/bin/bash

# Script to check if the backend is running and accessible
# Usage: ./check-backend.sh [IP_ADDRESS] [PORT]

IP_ADDRESS="${1:-192.168.50.115}"
PORT="${2:-8000}"
BACKEND_URL="http://${IP_ADDRESS}:${PORT}"

echo "🔍 Checking backend connectivity..."
echo "📍 Backend URL: ${BACKEND_URL}"
echo ""

# Check if backend is running locally
echo "1. Checking if backend process is running..."
if pgrep -f "uvicorn.*app.main:app" > /dev/null || pgrep -f "python.*app.main" > /dev/null; then
    echo "   ✅ Backend process is running"
else
    echo "   ❌ Backend process is NOT running"
    echo "   💡 Start the backend with: uvicorn app.main:app --reload --host 0.0.0.0 --port ${PORT}"
    exit 1
fi

# Check if port is listening
echo ""
echo "2. Checking if port ${PORT} is listening..."
if lsof -i :${PORT} > /dev/null 2>&1 || netstat -an | grep -q ":${PORT}.*LISTEN" 2>/dev/null; then
    echo "   ✅ Port ${PORT} is listening"
else
    echo "   ❌ Port ${PORT} is NOT listening"
    echo "   💡 Make sure the backend is started with --host 0.0.0.0 (not localhost)"
    exit 1
fi

# Test health endpoint
echo ""
echo "3. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BACKEND_URL}/health" 2>/dev/null)

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "   ✅ Health check passed (HTTP ${HEALTH_RESPONSE})"
    echo ""
    echo "   📊 Backend is accessible at: ${BACKEND_URL}"
    echo "   📚 API docs available at: ${BACKEND_URL}/docs"
else
    echo "   ❌ Health check failed (HTTP ${HEALTH_RESPONSE})"
    echo "   💡 Check firewall settings and ensure backend is accessible from your network"
    exit 1
fi

# Get current IP address
echo ""
echo "4. Current network configuration:"
if command -v ifconfig > /dev/null; then
    CURRENT_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
elif command -v ip > /dev/null; then
    CURRENT_IP=$(ip addr show | grep -Eo 'inet ([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d'/' -f1)
else
    CURRENT_IP="Unable to determine"
fi

echo "   Current IP: ${CURRENT_IP}"
echo "   Configured IP: ${IP_ADDRESS}"

if [ "$CURRENT_IP" != "$IP_ADDRESS" ] && [ "$CURRENT_IP" != "Unable to determine" ]; then
    echo "   ⚠️  WARNING: IP addresses don't match!"
    echo "   💡 Update mobile/.env with: EXPO_PUBLIC_BACKEND_URL=http://${CURRENT_IP}:${PORT}"
fi

echo ""
echo "✅ Backend is running and accessible!"

