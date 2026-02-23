#!/bin/bash
# Emergency production rollback script
# Use only when automated rollback is not working

set -e

echo "🚨 EMERGENCY PRODUCTION ROLLBACK 🚨"
echo ""
echo "This will rollback the production deployment to a previous version."
echo ""

# Confirm
read -p "Are you sure you want to rollback? Type 'ROLLBACK' to continue: " confirm
if [ "$confirm" != "ROLLBACK" ]; then
    echo "Cancelled."
    exit 1
fi

# Get available deployments
echo ""
echo "Fetching recent deployments..."
vercel list --production 2>/dev/null || {
    echo "❌ Failed to fetch deployments. Are you logged in?"
    exit 1
}

# Ask for deployment URL
read -p "Enter the deployment URL to rollback to (e.g., https://arm-xyz123-pinkbeam.vercel.app): " deployment_url

if [ -z "$deployment_url" ]; then
    echo "❌ No deployment URL provided"
    exit 1
fi

# Promote to production
echo ""
echo "Promoting $deployment_url to production..."
vercel promote "$deployment_url"

echo ""
echo "✅ Rollback complete!"
echo "Verify at: https://pinkbeam.io"
