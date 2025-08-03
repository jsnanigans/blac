#!/bin/bash
set -e

echo "==================================="
echo "New Publish Process with Changesets"
echo "==================================="
echo ""
echo "The new workflow is:"
echo ""
echo "1. For regular development:"
echo "   - Create changesets during development: pnpm changeset"
echo "   - This will prompt you to select packages and describe changes"
echo ""
echo "2. For automated releases (via GitHub Actions):"
echo "   - Push to v1 branch"
echo "   - GitHub Actions will create a release PR"
echo "   - Merge the PR to trigger publish"
echo ""
echo "3. For manual releases:"
echo "   - Run: pnpm version-packages"
echo "   - Review changes"
echo "   - Run: pnpm release"
echo ""
echo "4. For legacy manual publish (not recommended):"
echo "   - Use the old publish.sh script"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Which action would you like to take?${NC}"
echo "1) Create a changeset (recommended for development)"
echo "2) Version packages (prepare for release)"
echo "3) Build and publish (release to npm)"
echo "4) Exit"
echo ""

read -p "Enter your choice (1-4): " -n 1 -r choice
echo ""

case $choice in
  1)
    echo -e "${BLUE}Creating a changeset...${NC}"
    pnpm changeset
    ;;
  2)
    echo -e "${BLUE}Versioning packages...${NC}"
    pnpm version-packages
    echo -e "${GREEN}✓ Packages versioned!${NC}"
    echo -e "${YELLOW}Review the changes and run 'pnpm release' when ready to publish${NC}"
    ;;
  3)
    echo -e "${BLUE}Building and publishing packages...${NC}"
    pnpm release
    ;;
  4)
    echo -e "${GREEN}Exiting...${NC}"
    exit 0
    ;;
  *)
    echo -e "${YELLOW}Invalid choice. Exiting...${NC}"
    exit 1
    ;;
esac