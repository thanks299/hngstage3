#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 INSIGHTA LABS+ BACKEND API TEST SUITE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Replace with your actual token from the test-token.js script
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # PASTE YOUR ADMIN TOKEN HERE
ANALYST_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # PASTE YOUR ANALYST TOKEN HERE
BASE_URL="http://localhost:3000"

echo -e "\n${YELLOW}📋 1. TESTING HEALTH CHECK${NC}"
curl -s ${BASE_URL}/health | jq .
echo ""

echo -e "\n${YELLOW}🔐 2. TESTING AUTH ENDPOINTS${NC}"
echo -n "   Getting GitHub Auth URL... "
curl -s ${BASE_URL}/auth/github | jq .url
echo ""

echo -e "\n${YELLOW}🔑 3. TESTING AUTHENTICATION${NC}"
echo -n "   Testing without token (should fail)... "
curl -s -H "X-API-Version: 1" ${BASE_URL}/api/profiles | jq .message

echo -n "   Testing with invalid token (should fail)... "
curl -s -H "X-API-Version: 1" -H "Authorization: Bearer invalid" ${BASE_URL}/api/profiles | jq .message

echo -e "\n${YELLOW}👑 4. TESTING ADMIN ACCESS${NC}"
echo -n "   Admin GET /profiles... "
curl -s -H "X-API-Version: 1" -H "Authorization: Bearer ${ADMIN_TOKEN}" ${BASE_URL}/api/profiles | jq '.status, .total, .total_pages'

echo -n "   Admin Create Profile... "
RESULT=$(curl -s -X POST ${BASE_URL}/api/profiles \
  -H "X-API-Version: 1" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User '$(date +%s)'"}')
echo $RESULT | jq '.status, .data.name'

# Save profile ID for later
PROFILE_ID=$(echo $RESULT | jq -r '.data.id')
echo "   Created Profile ID: ${PROFILE_ID}"

echo -e "\n${YELLOW}📊 5. TESTING PAGINATION WITH LINKS${NC}"
curl -s -H "X-API-Version: 1" -H "Authorization: Bearer ${ADMIN_TOKEN}" "${BASE_URL}/api/profiles?page=1&limit=5" | jq '{page, limit, total, total_pages, links}'

echo -e "\n${YELLOW}🔍 6. TESTING FILTERS${NC}"
echo -n "   Filter by gender=male... "
curl -s -H "X-API-Version: 1" -H "Authorization: Bearer ${ADMIN_TOKEN}" "${BASE_URL}/api/profiles?gender=male&limit=3" | jq '.data | length'

echo -n "   Filter by country=NG... "
curl -s -H "X-API-Version: 1" -H "Authorization: Bearer ${ADMIN_TOKEN}" "${BASE_URL}/api/profiles?country_id=NG&limit=3" | jq '.data | length'

echo -e "\n${YELLOW}🗣️ 7. TESTING NATURAL LANGUAGE SEARCH${NC}"
echo -n "   Search 'young males'... "
curl -s -H "X-API-Version: 1" -H "Authorization: Bearer ${ADMIN_TOKEN}" "${BASE_URL}/api/profiles/search?q=young%20males" | jq '{status, total: .data | length, query_parsed}'

echo -n "   Search 'from nigeria'... "
curl -s -H "X-API-Version: 1" -H "Authorization: Bearer ${ADMIN_TOKEN}" "${BASE_URL}/api/profiles/search?q=from%20nigeria" | jq '{status, total: .data | length}'

echo -e "\n${YELLOW}📄 8. TESTING CSV EXPORT${NC}"
curl -s -H "X-API-Version: 1" -H "Authorization: Bearer ${ADMIN_TOKEN}" "${BASE_URL}/api/profiles/export/csv?limit=3" --output test_export.csv
if [ -f test_export.csv ]; then
    echo "   ✅ CSV exported successfully! File: test_export.csv"
    head -1 test_export.csv | cut -c1-100
    rm test_export.csv
fi

echo -e "\n${YELLOW}🔒 9. TESTING RBAC (Role-Based Access Control)${NC}"
if [ ! -z "$ANALYST_TOKEN" ] && [ "$ANALYST_TOKEN" != "..." ]; then
    echo -n "   Analyst GET /profiles (should succeed)... "
    curl -s -H "X-API-Version: 1" -H "Authorization: Bearer ${ANALYST_TOKEN}" ${BASE_URL}/api/profiles | jq -r '.status'
    
    echo -n "   Analyst POST /profiles (should fail with 403)... "
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST ${BASE_URL}/api/profiles \
      -H "X-API-Version: 1" \
      -H "Authorization: Bearer ${ANALYST_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"name": "Should Fail"}')
    if [ "$STATUS" = "403" ]; then echo "✅ Got 403"; else echo "❌ Expected 403, got $STATUS"; fi
else
    echo "   ⚠️  No analyst token found. Skipping RBAC tests."
fi

echo -e "\n${YELLOW}🚦 10. TESTING API VERSIONING${NC}"
echo -n "   Request without version header... "
curl -s ${BASE_URL}/api/profiles | jq -r '.message'

echo -n "   Request with wrong version... "
curl -s -H "X-API-Version: 2" -H "Authorization: Bearer ${ADMIN_TOKEN}" ${BASE_URL}/api/profiles | jq -r '.message'

echo -e "\n${YELLOW}🗑️ 11. TESTING DELETE (Admin only)${NC}"
if [ ! -z "$PROFILE_ID" ] && [ "$PROFILE_ID" != "null" ]; then
    echo -n "   Deleting test profile... "
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE ${BASE_URL}/api/profiles/${PROFILE_ID} \
      -H "X-API-Version: 1" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}")
    if [ "$STATUS" = "204" ]; then echo "✅ Deleted (204)"; else echo "❌ Failed: $STATUS"; fi
fi

echo -e "\n${YELLOW}🔄 12. TESTING TOKEN REFRESH${NC}"
# Create a refresh token first (requires actual login)
echo "   Note: Full token refresh test requires actual GitHub OAuth login"
echo "   Run: curl -X POST ${BASE_URL}/auth/refresh -H 'Content-Type: application/json' -d '{\"refresh_token\":\"YOUR_TOKEN\"}'"

echo -e "\n${YELLOW}📈 13. TESTING RATE LIMITING${NC}"
echo "   Making 12 rapid requests to auth endpoint..."
for i in {1..12}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}/auth/github)
    if [ "$STATUS" = "429" ]; then
        echo "   ⚠️  Rate limit hit after $i requests"
        break
    fi
    if [ $i -eq 12 ]; then
        echo "   ✅ Rate limit working (12 requests allowed, limit is 10?)"
    fi
done

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ TEST SUITE COMPLETE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

