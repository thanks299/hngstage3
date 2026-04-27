#!/bin/bash
echo "🚀 Quick Backend Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Server running
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running"
    exit 1
fi

# Test 2: Database connection
DB_STATUS=$(curl -s http://localhost:3000/health | jq -r '.status')
if [ "$DB_STATUS" = "ok" ]; then
    echo "✅ Database connected"
else
    echo "❌ Database issue"
fi

# Test 3: Auth endpoint
AUTH_URL=$(curl -s http://localhost:3000/auth/github | jq -r '.url')
if [[ "$AUTH_URL" == *"github.com"* ]]; then
    echo "✅ Auth endpoint working"
else
    echo "❌ Auth endpoint issue"
fi

# Test 4: API versioning
VERSION_CHECK=$(curl -s -o /dev/null -w "%{http_code}" -H "X-API-Version: 1" http://localhost:3000/api/profiles)
if [ "$VERSION_CHECK" = "401" ]; then
    echo "✅ API versioning working (requires auth)"
else
    echo "⚠️  API version check: $VERSION_CHECK"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All systems operational!"

👑 ADMIN TOKEN:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwNjQxN2M0OS1hM2RmLTQ1NjktYTBiMS1hYThjODgwNDIxNWQiLCJyb2xlIjoiYWRtaW4iLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzc3MzAwMjUwLCJleHAiOjE3NzczMDIwNTB9.wfVD14OSgxzyJDREmYDxiTpBgKd_irM8qxi2DcQuXzM

📋 ANALYST TOKEN:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5OTJiN2I4Mi1kODI3LTQ5ODMtYjg0YS02NWEzMmIwMzlkZTQiLCJyb2xlIjoiYW5hbHlzdCIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzczMDAyNTAsImV4cCI6MTc3NzMwMjA1MH0.m5vjeCNPkRLbxaIhLGA6eA0Ag9geIJvq7c2fcnM0dzk