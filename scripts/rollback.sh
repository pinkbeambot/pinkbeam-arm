#!/bin/bash
# Pink Beam ARM - Rollback Script
# Usage: ./scripts/rollback.sh [TAG]
# If no TAG provided, rolls back to the previous tag

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Pink Beam ARM Rollback Script ===${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d ".git" ]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    exit 1
fi

# Get list of tags sorted by version
TAGS=$(git tag | sort -V)

if [ -z "$TAGS" ]; then
    echo -e "${RED}Error: No tags found in repository${NC}"
    exit 1
fi

# Determine which tag to roll back to
if [ -z "$1" ]; then
    # Get the current and previous tags
    CURRENT_TAG=$(echo "$TAGS" | tail -1)
    PREVIOUS_TAG=$(echo "$TAGS" | tail -2 | head -1)
    
    if [ "$CURRENT_TAG" == "$PREVIOUS_TAG" ]; then
        echo -e "${RED}Error: Only one tag exists. Cannot rollback.${NC}"
        exit 1
    fi
    
    TARGET_TAG=$PREVIOUS_TAG
    echo -e "${YELLOW}Current tag: $CURRENT_TAG${NC}"
    echo -e "${GREEN}Rolling back to: $TARGET_TAG${NC}"
else
    TARGET_TAG=$1
    if ! echo "$TAGS" | grep -q "^$TARGET_TAG$"; then
        echo -e "${RED}Error: Tag '$TARGET_TAG' not found${NC}"
        echo "Available tags:"
        echo "$TAGS"
        exit 1
    fi
    echo -e "${GREEN}Rolling back to specified tag: $TARGET_TAG${NC}"
fi

echo ""
echo "Available tags:"
echo "$TAGS" | tail -5
echo ""

# Confirm with user
read -p "Are you sure you want to rollback to $TARGET_TAG? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Rollback cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Starting rollback process...${NC}"
echo ""

# Step 1: Checkout the target tag
echo "Step 1: Checking out tag $TARGET_TAG..."
git checkout $TARGET_TAG

# Step 2: Create a rollback branch
echo "Step 2: Creating rollback branch..."
ROLLBACK_BRANCH="rollback/$(date +%Y%m%d_%H%M%S)"
git checkout -b $ROLLBACK_BRANCH

# Step 3: Verify build
echo "Step 3: Verifying build..."
npm ci
npm run build

# Step 4: Deploy to Vercel (production)
echo ""
echo -e "${YELLOW}Step 4: Deploy to production${NC}"
echo "The rollback branch is ready: $ROLLBACK_BRANCH"
echo ""
echo "To complete the rollback:"
echo "  1. Push the branch: git push origin $ROLLBACK_BRANCH"
echo "  2. Create a PR targeting main"
echo "  3. Merge the PR (this will auto-deploy to staging)"
echo "  4. Tag the merge commit: git tag $TARGET_TAG-rollback.1"
echo "  5. Push the tag: git push origin $TARGET_TAG-rollback.1"
echo ""
echo -e "${GREEN}Rollback preparation complete!${NC}"
echo ""

# Step 5: Database considerations
echo -e "${YELLOW}Important: Database considerations${NC}"
echo "If database migrations were part of the bad deploy:"
echo "  1. Check if migrations are backwards-compatible"
echo "  2. If not, run compensating migrations manually"
echo "  3. See docs/INCIDENT-RESPONSE.md for details"
echo ""

# Step 6: Notifications
echo -e "${YELLOW}Post-rollback notifications${NC}"
echo "Remember to:"
echo "  - Notify CEO (@valis) of the rollback"
echo "  - Post in #engineering with summary"
echo "  - Monitor error rates for 30 minutes"
echo "  - Schedule post-mortem within 24 hours"
echo ""

# Return to main for safety
git checkout main

echo -e "${GREEN}=== Rollback script complete ===${NC}"
