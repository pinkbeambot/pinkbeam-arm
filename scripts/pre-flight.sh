#!/bin/bash
# Pre-flight Checklist — Run before committing
# Usage: ./scripts/pre-flight.sh

set -e  # Exit on first error

echo "🧪 Running pre-flight checks..."

# 1. Type check
echo "📋 TypeScript check..."
npm run typecheck

# 2. Build
echo "🔨 Build check..."
npm run build

# 3. Lint (if exists)
if npm run lint --silent 2>/dev/null; then
  echo "🧹 Lint check..."
  npm run lint
fi

# 4. Tests (if exists)
if [ -f "jest.config.js" ] || [ -f "vitest.config.ts" ]; then
  echo "🧪 Test check..."
  npm run test -- --passWithNoTests --silent
fi

echo "✅ All checks passed! Ready to commit."
