#!/bin/bash
BASE_URL="https://hngstage3.onrender.com"

echo "=== Testing Backend ==="

# 1. Health check
echo "1. Health check:"
curl -s $BASE_URL/health | jq .

# 2. Auth endpoint
echo -e "\n2. Auth endpoint:"
curl -s $BASE_URL/auth/github | jq .

# 3. API version header required
echo -e "\n3. API version required:"
curl -s -o /dev/null -w "Status: %{http_code}\n" $BASE_URL/api/profiles

# 4. Rate limiting test
echo -e "\n4. Rate limiting test (10 requests):"
for i in {1..11}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/auth/github)
  echo "Request $i: $STATUS"
  if [ "$STATUS" = "429" ]; then
    echo "✅ Rate limiting working!"
    break
  fi
done
