#!/bin/bash
# Verify production deployment readiness

set -e

echo "🔍 Verifying production deployment readiness..."

ERRORS=0

# Check 1: Environment variables
echo "Checking environment variables..."
REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "NEXT_PUBLIC_APP_URL"
    "RESEND_API_KEY"
    "NEXT_PUBLIC_SENTRY_DSN"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "  ❌ Missing: $var"
        ERRORS=$((ERRORS + 1))
    else
        echo "  ✓ $var"
    fi
done

# Check 2: Security - DEV_AUTH_BYPASS should NOT be set
echo ""
echo "Checking security settings..."
if [ -n "$DEV_AUTH_BYPASS" ]; then
    echo "  ❌ DEV_AUTH_BYPASS is set - CRITICAL SECURITY ISSUE"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✓ DEV_AUTH_BYPASS not set"
fi

# Check 3: Git status
echo ""
echo "Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    echo "  ⚠️  Uncommitted changes detected"
else
    echo "  ✓ Working directory clean"
fi

# Check 4: Branch
echo ""
echo "Checking branch..."
CURRENT_BRANCH=$(git branch --show-current)
echo "  Current branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "  ⚠️  Not on main branch"
fi

# Check 5: Build
echo ""
echo "Checking build..."
if [ -d ".next" ]; then
    echo "  ✓ Build directory exists"
else
    echo "  ⚠️  No build found - run 'npm run build'"
fi

# Check 6: TypeScript
echo ""
echo "Running type check..."
if npx tsc --noEmit 2>/dev/null; then
    echo "  ✓ TypeScript check passed"
else
    echo "  ❌ TypeScript errors found"
    ERRORS=$((ERRORS + 1))
fi

# Check 7: Tests
echo ""
echo "Running unit tests..."
if npm run test -- --run 2>/dev/null; then
    echo "  ✓ Unit tests passed"
else
    echo "  ❌ Unit tests failed"
    ERRORS=$((ERRORS + 1))
fi

# Check 8: Lint
echo ""
echo "Running lint..."
if npm run lint 2>/dev/null; then
    echo "  ✓ Lint passed"
else
    echo "  ❌ Lint failed"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "==================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ Ready for deployment!"
    exit 0
else
    echo "❌ $ERRORS issues found - fix before deploying"
    exit 1
fi
