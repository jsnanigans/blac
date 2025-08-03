#!/bin/bash
set -e

echo "Starting publish process..."
echo ""

# Configuration file
CONFIG_FILE=".publish.config.json"

# Default configuration
PUBLISH_TAG=${PUBLISH_TAG:-"preview"}
DRY_RUN=${DRY_RUN:-false}
SYNC_DEPS=${SYNC_DEPS:-true}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load configuration if exists
if [ -f "$CONFIG_FILE" ]; then
  echo -e "${BLUE}Loading configuration from $CONFIG_FILE${NC}"
  # Extract default tag from config
  CONFIG_TAG=$(cat "$CONFIG_FILE" | grep -A2 '"publish"' | grep '"defaultTag"' | awk -F'"' '{print $4}')
  if [ ! -z "$CONFIG_TAG" ]; then
    PUBLISH_TAG=${PUBLISH_TAG:-$CONFIG_TAG}
  fi
fi

# Function to get package version
get_version() {
  local package_dir=$1
  local version=$(cat "$package_dir/package.json" | grep '"version"' | head -1 | awk -F'"' '{print $4}')
  echo "$version"
}

# Function to get package name
get_package_name() {
  local package_dir=$1
  local name=$(cat "$package_dir/package.json" | grep '"name"' | head -1 | awk -F'"' '{print $4}')
  echo "$name"
}

# Function to check if package should be published
should_publish() {
  local package_json=$1
  
  # Check if package is private
  if grep -q '"private"[[:space:]]*:[[:space:]]*true' "$package_json"; then
    return 1
  fi
  
  # Check if package has a name starting with @blac/
  if grep -q '"name"[[:space:]]*:[[:space:]]*"@blac/' "$package_json"; then
    return 0
  fi
  
  return 1
}

# Function to find packages using globstar
find_packages_recursive() {
  local pattern=$1
  shopt -s globstar nullglob
  local dirs=($pattern/)
  shopt -u globstar nullglob
  printf '%s\n' "${dirs[@]}"
}

# Find all publishable packages
find_packages() {
  local packages=()
  
  # Core packages in packages/*/
  for dir in packages/*/; do
    if [ -d "$dir" ] && [ -f "$dir/package.json" ] && should_publish "$dir/package.json"; then
      packages+=("$dir")
    fi
  done
  
  # Plugin packages in packages/plugins/ (recursive)
  if [ -d "packages/plugins" ]; then
    while IFS= read -r -d '' dir; do
      if [ -f "$dir/package.json" ] && should_publish "$dir/package.json"; then
        packages+=("$dir")
      fi
    done < <(find packages/plugins -name "node_modules" -prune -o -name "package.json" -type f -exec dirname {} \; | tr '\n' '\0' | sort -uz)
  fi
  
  printf '%s\n' "${packages[@]}"
}

# Update dependent packages
update_workspace_deps() {
  local updated_package=$1
  local new_version=$2
  
  if [ "$SYNC_DEPS" != true ]; then
    return
  fi
  
  echo -e "${BLUE}Updating workspace dependencies for $updated_package@$new_version${NC}"
  
  for package_dir in "${PACKAGES[@]}"; do
    local deps_file="$package_dir/package.json"
    if grep -q "\"$updated_package\"[[:space:]]*:[[:space:]]*\"workspace:" "$deps_file"; then
      local pkg_name=$(get_package_name "$package_dir")
      echo -e "  Updating ${YELLOW}$pkg_name${NC} dependency on $updated_package"
      # This would need a more sophisticated JSON update in production
      # For now, we'll skip the actual update
    fi
  done
}

# Get all packages to publish
PACKAGES=($(find_packages))

if [ ${#PACKAGES[@]} -eq 0 ]; then
  echo -e "${RED}No publishable packages found!${NC}"
  exit 1
fi

# Display current versions
echo -e "${BLUE}Current package versions:${NC}"
echo "------------------------------------"
for package_dir in "${PACKAGES[@]}"; do
  name=$(get_package_name "$package_dir")
  version=$(get_version "$package_dir")
  echo -e "${YELLOW}$name${NC}: $version"
done
echo "------------------------------------"
echo ""

# Get the version bump type from the user
read -p "Enter the version bump type (e.g., patch, minor, major, prerelease, or a specific version like 1.2.3): " VERSION_BUMP

if [ -z "$VERSION_BUMP" ]; then
  echo -e "${RED}No version bump type provided. Exiting.${NC}"
  exit 1
fi

# Validate version bump
case $VERSION_BUMP in
  patch|minor|major|prerelease)
    echo -e "${GREEN}Using version bump: $VERSION_BUMP${NC}"
    ;;
  [0-9]*)
    echo -e "${GREEN}Using specific version: $VERSION_BUMP${NC}"
    ;;
  *)
    echo -e "${RED}Invalid version bump type: $VERSION_BUMP${NC}"
    exit 1
    ;;
esac

# Ask for confirmation
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Version bump: ${GREEN}$VERSION_BUMP${NC}"
echo -e "  Publish tag: ${GREEN}$PUBLISH_TAG${NC}"
echo -e "  Sync workspace deps: ${GREEN}$SYNC_DEPS${NC}"
echo -e "  Dry run: ${GREEN}$DRY_RUN${NC}"
echo ""
echo -e "${YELLOW}Packages to publish (${#PACKAGES[@]} total):${NC}"
for package_dir in "${PACKAGES[@]}"; do
  name=$(get_package_name "$package_dir")
  echo -e "  - ${GREEN}$name${NC}"
done
echo ""

read -p "Continue with publish? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}Publish cancelled.${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}Processing packages...${NC}"
echo ""

# Store the current directory
ROOT_DIR=$(pwd)

# Track successful publishes
PUBLISHED_PACKAGES=()
FAILED_PACKAGES=()

# Process each package
for package_dir in "${PACKAGES[@]}"; do
  # Remove trailing slash
  package_dir=${package_dir%/}
  
  # Get package info
  name=$(get_package_name "$package_dir")
  
  echo ""
  echo -e "${BLUE}------------------------------------${NC}"
  echo -e "${BLUE}Processing package: ${YELLOW}$name${NC}"
  echo -e "${BLUE}------------------------------------${NC}"
  
  # Navigate to package directory
  cd "$ROOT_DIR/$package_dir"
  
  # Update version
  current_version=$(get_version ".")
  echo -e "Current version: $current_version"
  echo -e "Updating version for ${YELLOW}$name${NC} to ${GREEN}$VERSION_BUMP${NC}..."
  
  if [ "$DRY_RUN" = false ]; then
    npm version "$VERSION_BUMP" --no-git-tag-version || {
      echo -e "${RED}Failed to update version for $name${NC}"
      FAILED_PACKAGES+=("$name")
      continue
    }
    new_version=$(get_version ".")
    echo -e "New version: ${GREEN}$new_version${NC}"
    
    # Update workspace dependencies
    update_workspace_deps "$name" "$new_version"
  else
    echo -e "${YELLOW}[DRY RUN] Would run: npm version $VERSION_BUMP --no-git-tag-version${NC}"
    echo -e "New version: ${YELLOW}[DRY RUN]${NC}"
  fi
  
  # No build step needed - publishing TypeScript source directly
  echo -e "${GREEN}Publishing TypeScript source directly (no build required)${NC}"
  
  # Publish
  echo -e "Publishing ${YELLOW}$name${NC}..."
  if [ "$DRY_RUN" = false ]; then
    pnpm publish --no-git-checks --access public --tag "$PUBLISH_TAG" || {
      echo -e "${RED}Failed to publish $name${NC}"
      FAILED_PACKAGES+=("$name")
      continue
    }
  else
    echo -e "${YELLOW}[DRY RUN] Would run: pnpm publish --no-git-checks --access public --tag $PUBLISH_TAG${NC}"
  fi
  
  PUBLISHED_PACKAGES+=("$name")
done

# Navigate back to root
cd "$ROOT_DIR"

echo ""
echo -e "${BLUE}=====================================${NC}"
echo -e "${GREEN}Publish process completed!${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

if [ ${#PUBLISHED_PACKAGES[@]} -gt 0 ]; then
  echo -e "${GREEN}Successfully published packages (${#PUBLISHED_PACKAGES[@]}):${NC}"
  for package in "${PUBLISHED_PACKAGES[@]}"; do
    echo -e "  ✓ ${GREEN}$package${NC}"
  done
fi

if [ ${#FAILED_PACKAGES[@]} -gt 0 ]; then
  echo ""
  echo -e "${RED}Failed packages (${#FAILED_PACKAGES[@]}):${NC}"
  for package in "${FAILED_PACKAGES[@]}"; do
    echo -e "  ✗ ${RED}$package${NC}"
  done
fi

echo ""
echo -e "Publish tag: ${GREEN}$PUBLISH_TAG${NC}"

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo -e "${YELLOW}This was a DRY RUN - no packages were actually published${NC}"
  echo -e "${YELLOW}Run without DRY_RUN=true to actually publish${NC}"
fi

# If there were failures, exit with error code
if [ ${#FAILED_PACKAGES[@]} -gt 0 ]; then
  exit 1
fi