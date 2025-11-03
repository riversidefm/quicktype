#!/usr/bin/env bash

set -e

# Parse command line arguments
DRY_RUN=false
if [ "$1" == "--dry-run" ]; then
    DRY_RUN=true
    echo "Running in DRY RUN mode - no actual publishing will occur"
fi

# Check for NPM_TOKEN
if [ -z "$NPM_TOKEN" ]; then
    echo "Error: NPM_TOKEN environment variable is not set"
    echo "Please set it with: export NPM_TOKEN=your_npm_token"
    exit 1
fi

echo "Building quicktype..."
npm run build

# Update package name to include @riversidefm scope
echo "Updating package.json for riverside publishing..."
jq '.name = "@riversidefm/quicktype"' package.json > package.json.tmp
mv package.json.tmp package.json

VERSION=$(jq -r '.version' package.json)
echo "Publishing @riversidefm/quicktype@$VERSION to GitHub Packages..."

if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] - No actual publishing will occur"
    npm publish --dry-run
else
    echo "Publishing to GitHub Packages..."
    npm publish
fi

# Revert package name
echo "Reverting package.json..."
jq '.name = "quicktype"' package.json > package.json.tmp
mv package.json.tmp package.json

if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Completed - no actual publishing occurred"
else
    echo "Successfully published to GitHub Packages!"
    echo "Install with: npm install @riversidefm/quicktype@$VERSION"
fi

