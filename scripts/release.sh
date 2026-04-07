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
  version=$(node -p "require('./packages/blac-core/package.json').version")
  echo -e "  Core version: ${GREEN}$version${NC}"
  
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
  echo "  2) Check release          - Build, verify, test, and typecheck"
  echo "  3) Version packages       - Apply pending changesets locally"
  echo "  4) Publish to npm         - Run checks and publish current versions"
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
    echo -e "${BLUE}Running release checks...${NC}"
    echo ""
    pnpm release:check
    ;;
  3)
    echo -e "${BLUE}Versioning packages...${NC}"
    echo ""
    pnpm release:version
    echo ""
    echo -e "${GREEN}Done! Review the changes:${NC}"
    echo "  - Package versions have been bumped"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Review the changes (git diff)"
    echo "  2. Commit: git add -A && git commit -m 'chore: version packages'"
    echo "  3. Run option 4 to publish, or push your version commit"
    ;;
  4)
    echo -e "${YELLOW}Run release checks before publishing? (y/n)${NC}"
    read -p "" -n 1 -r run_checks
    echo ""
    if [[ $run_checks =~ ^[Yy]$ ]]; then
      echo -e "${BLUE}Running release checks...${NC}"
      pnpm release:check
      echo ""
    fi
    echo -e "${BLUE}Publishing...${NC}"
    echo ""
    pnpm release:publish
    echo ""
    echo -e "${GREEN}Published current package versions.${NC}"
    echo "Push your version commit and any tags if you created them separately."
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
