#!/bin/bash
set -e

echo "Starting publish process..."
echo ""

# Function to get package version
get_version() {
  local package_dir=$1
  local version=$(cat "$package_dir/package.json" | grep '"version"' | head -1 | awk -F'"' '{print $4}')
  echo "$version"
}

# Display current versions
echo "Current package versions:"
echo "------------------------------------"
echo "@blac/core: $(get_version "packages/blac")"
echo "@blac/react: $(get_version "packages/blac-react")"
echo "@blac/plugin-persistence: $(get_version "packages/plugins/bloc/persistence")"
echo "------------------------------------"
echo ""

# Get the version bump type from the user
read -p "Enter the version bump type (e.g., patch, minor, major, or a specific version like 1.2.3): " VERSION_BUMP

if [ -z "$VERSION_BUMP" ]; then
  echo "No version bump type provided. Exiting."
  exit 1
fi

echo ""
echo "Updating all packages to version: $VERSION_BUMP"
echo ""

# Process @blac/core
cd packages/blac

echo "------------------------------------"
echo "Processing package: @blac/core"
echo "------------------------------------"

# Update version, build and publish
echo "Current version: $(get_version ".")"
echo "Updating version for @blac/core to $VERSION_BUMP..."
npm version "$VERSION_BUMP"
echo "New version: $(get_version ".")"
echo "Building @blac/core..."
pnpm run build
echo "Publishing @blac/core..."
pnpm publish --no-git-checks --access public --tag preview

# Navigate back to root
cd ../../

# Process @blac/react
cd packages/blac-react

echo ""
echo "------------------------------------"
echo "Processing package: @blac/react"
echo "------------------------------------"

# Update version, build and publish
echo "Current version: $(get_version ".")"
echo "Updating version for @blac/react to $VERSION_BUMP..."
npm version "$VERSION_BUMP"
echo "New version: $(get_version ".")"
echo "Building @blac/react..."
pnpm run build
echo "Publishing @blac/react..."
pnpm publish --no-git-checks --access public --tag preview

cd ../../

# Process @blac/plugin-persistence
cd packages/plugins/bloc/persistence

echo ""
echo "------------------------------------"
echo "Processing package: @blac/plugin-persistence"
echo "------------------------------------"

# Update version, build and publish
echo "Current version: $(get_version ".")"
echo "Updating version for @blac/plugin-persistence to $VERSION_BUMP..."
npm version "$VERSION_BUMP"
echo "New version: $(get_version ".")"
echo "Building @blac/plugin-persistence..."
pnpm run build
echo "Publishing @blac/plugin-persistence..."
pnpm publish --no-git-checks --access public --tag preview

cd ../../../../

echo ""
echo "------------------------------------"
echo "Publish process completed!"
echo "All packages updated to version: $VERSION_BUMP"
echo "------------------------------------"
echo ""
echo "Published packages:"
echo "- @blac/core"
echo "- @blac/react"
echo "- @blac/plugin-persistence"
echo ""
echo "All packages published with tag: preview"