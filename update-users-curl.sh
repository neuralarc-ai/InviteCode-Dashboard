#!/bin/bash
# Script to update user status via curl
# Usage: ./update-users-curl.sh [API_URL]

API_URL=${1:-http://localhost:3000}

echo "🔄 Updating user status..."
echo "📧 Emails: neelmptl.07@gmail.com, cholayilfaisalhyder@gmail.com"
echo "🌐 API URL: $API_URL/api/mark-users-sent-by-email"
echo ""

curl -X POST "$API_URL/api/mark-users-sent-by-email" \
  -H "Content-Type: application/json" \
  -d '{"emails":["neelmptl.07@gmail.com","cholayilfaisalhyder@gmail.com"]}' \
  | jq '.'

echo ""
echo "✅ Done!"
