#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}   BlaC Release Helper${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

show_status() {
  echo -e "${BLUE}Current status:${NC}"
  
  # Show current version
  version=$(node -p "require('./packages/blac/package.json').version")
  echo -e "  Version: ${GREEN}$version${NC}"
  
  # Count pending changesets
  changeset_count=$(find .changeset -name "*.md" ! -name "README.md" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$changeset_count" -gt 0 ]; then
    echo -e "  Pending changesets: ${YELLOW}$changeset_count${NC}"
  else
    echo -e "  Pending changesets: ${GREEN}0${NC}"
  fi
  echo ""
}

show_menu() {
  echo -e "${YELLOW}What would you like to do?${NC}"
  echo ""
  echo "  1) Create a changeset     - Document a change for the next release"
  echo "  2) Preview release        - See what the next release will look like"
  echo "  3) Version packages       - Bump versions (creates release commit)"
  echo "  4) Publish to npm         - Build, test, and publish packages"
  echo "  5) Enter prerelease mode  - Start alpha/beta/rc releases"
  echo "  6) Exit prerelease mode   - Return to stable releases"
  echo "  7) Show status            - Show current version info"
  echo "  q) Quit"
  echo ""
}

show_status
show_menu

read -p "Enter choice: " -n 1 -r choice
echo ""
echo ""

case $choice in
  1)
    echo -e "${BLUE}Creating a changeset...${NC}"
    echo ""
    pnpm changeset
    ;;
  2)
    echo -e "${BLUE}Previewing release...${NC}"
    echo ""
    pnpm changeset status --verbose
    ;;
  3)
    echo -e "${BLUE}Versioning packages...${NC}"
    echo ""
    pnpm changeset version
    echo ""
    echo -e "${GREEN}Done! Review the changes:${NC}"
    echo "  - CHANGELOGs have been updated"
    echo "  - Package versions have been bumped"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Review the changes (git diff)"
    echo "  2. Commit: git add -A && git commit -m 'chore: version packages'"
    echo "  3. Push to trigger CI release, or run option 4 for manual publish"
    ;;
  4)
    echo -e "${BLUE}Building and publishing...${NC}"
    echo ""
    echo -e "${YELLOW}Running build...${NC}"
    pnpm build
    echo ""
    echo -e "${YELLOW}Running tests...${NC}"
    pnpm test
    echo ""
    echo -e "${YELLOW}Running typecheck...${NC}"
    pnpm typecheck
    echo ""
    echo -e "${YELLOW}Publishing to npm...${NC}"
    pnpm changeset publish
    echo ""
    echo -e "${GREEN}Published! Don't forget to push git tags:${NC}"
    echo "  git push --follow-tags"
    ;;
  5)
    echo -e "${BLUE}Entering prerelease mode...${NC}"
    echo ""
    echo -e "${YELLOW}Select prerelease tag:${NC}"
    echo "  1) alpha"
    echo "  2) beta"
    echo "  3) rc"
    read -p "Enter choice (1-3): " -n 1 -r tag_choice
    echo ""
    
    case $tag_choice in
      1) tag="alpha" ;;
      2) tag="beta" ;;
      3) tag="rc" ;;
      *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
    esac
    
    pnpm changeset pre enter $tag
    echo ""
    echo -e "${GREEN}Now in prerelease mode ($tag)${NC}"
    echo "All version bumps will be prereleases until you exit."
    ;;
  6)
    echo -e "${BLUE}Exiting prerelease mode...${NC}"
    pnpm changeset pre exit
    echo ""
    echo -e "${GREEN}Back to stable releases${NC}"
    ;;
  7)
    show_status
    ;;
  q|Q)
    echo -e "${GREEN}Bye!${NC}"
    exit 0
    ;;
  *)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac
