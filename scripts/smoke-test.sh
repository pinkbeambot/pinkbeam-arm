#!/bin/bash
# Pre-deployment smoke tests
# Run this before deploying to production

set -e

echo "🧪 Running pre-deployment smoke tests..."

APP_URL="${1:-http://localhost:3000}"

echo "Testing against: $APP_URL"

# Test 1: Health check
echo "✓ Test 1: Health endpoint"
curl -sf "$APP_URL/api/health" > /dev/null || {
    echo "❌ Health check failed"
    exit 1
}

# Test 2: Homepage loads
echo "✓ Test 2: Homepage"
curl -sf "$APP_URL/" > /dev/null || {
    echo "❌ Homepage failed"
    exit 1
}

# Test 3: Login page loads
echo "✓ Test 3: Login page"
curl -sf "$APP_URL/login" > /dev/null || {
    echo "❌ Login page failed"
    exit 1
}

# Test 4: API responds with JSON
echo "✓ Test 4: API health format"
RESPONSE=$(curl -sf "$APP_URL/api/health")
echo "$RESPONSE" | grep -q "status" || {
    echo "❌ Health endpoint returned invalid format"
    exit 1
}

# Test 5: Static assets served
echo "✓ Test 5: Static assets"
curl -sf "$APP_URL/favicon.ico" > /dev/null || {
    echo "❌ Static assets failed"
    exit 1
}

echo ""
echo "✅ All smoke tests passed!"
