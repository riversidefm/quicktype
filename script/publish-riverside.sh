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

VERSION=$(jq -r '.version' package.json)
echo "Publishing @riversidefm/quicktype workspace packages version $VERSION to GitHub Packages..."

# Publish workspace packages
PACKAGES=("quicktype-core" "quicktype-graphql-input" "quicktype-typescript-input")
for pkg in "${PACKAGES[@]}"; do
    echo ""
    echo "Publishing @riversidefm/$pkg..."
    pushd packages/$pkg
    if [ "$DRY_RUN" = true ]; then
        npm publish --dry-run
    else
        npm publish
    fi
    popd
done

# Publish main quicktype package
echo ""
echo "Publishing @riversidefm/quicktype@$VERSION..."
if [ "$DRY_RUN" = true ]; then
    npm publish --dry-run
else
    npm publish
fi

if [ "$DRY_RUN" = true ]; then
    echo ""
    echo "[DRY RUN] Completed - no actual publishing occurred"
else
    echo ""
    echo "Successfully published all packages to GitHub Packages!"
    echo "Install with: npm install @riversidefm/quicktype@$VERSION"
fi

