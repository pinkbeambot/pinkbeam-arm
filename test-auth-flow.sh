#!/bin/bash
# Test the full auth flow

echo "=== Testing Auth Flow ==="
echo ""

# 1. Test that the signup page loads
echo "1. Testing signup page..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/signup
echo " - /signup page status"

# 2. Test the auth callback route (GET without code)
echo "2. Testing auth callback route (no code)..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/callback
echo " - /auth/callback (no code) status"

# 3. Test the auth callback with a fake code
echo "3. Testing auth callback with fake code..."
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/auth/callback?code=fake_code_123"
echo " - /auth/callback (fake code) status"

echo ""
echo "=== Done ==="
