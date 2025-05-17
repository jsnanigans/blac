#!/bin/bash
set -e

echo "Starting publish process..."

# Get the version bump type from the user
read -p "Enter the version bump type (e.g., patch, minor, major, or a specific version like 1.2.3): " VERSION_BUMP

if [ -z "$VERSION_BUMP" ]; then
  echo "No version bump type provided. Exiting."
  exit 1
fi

# Navigate to the first package
cd packages/blac

echo "------------------------------------"
echo "Processing package: blac"
echo "------------------------------------"

# Update version, build and publish
echo "Updating version for blac to $VERSION_BUMP..."
npm version "$VERSION_BUMP"
echo "Building blac..."
pnpm run build
echo "Publishing blac..."
pnpm publish --no-git-checks --access public --tag preview

# Navigate back to root or to the next package
cd ../../

# Navigate to the second package
cd packages/blac-react

echo "------------------------------------"
echo "Processing package: blac-react"
echo "------------------------------------"

# Update version, build and publish
echo "Updating version for blac-react to $VERSION_BUMP..."
npm version "$VERSION_BUMP"
echo "Building blac-react..."
pnpm run build
echo "Publishing blac-react..."
pnpm publish --no-git-checks --access public --tag preview

cd ../../

echo "------------------------------------"
echo "Publish process completed for version $VERSION_BUMP!"
echo "------------------------------------" 