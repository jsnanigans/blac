# Build and Publish Workflow

This document describes the improved build and publish workflow for the BlaC monorepo.

## Overview

The project now uses:
- **TypeScript compilation** for proper build outputs
- **Changesets** for version management
- **GitHub Actions** for automated CI/CD
- **Turbo** for efficient monorepo builds

## Key Improvements

### 1. Proper Build Pipeline
- All packages now compile TypeScript to JavaScript
- Generates both ESM and CommonJS outputs
- Creates proper type definitions (.d.ts files)
- External dependencies are NOT bundled (each package is standalone)

### 2. Package Structure
Each package now has:
- `dist/index.js` - ESM build
- `dist/index.cjs` - CommonJS build  
- `dist/index.d.ts` - TypeScript definitions
- Proper `exports` field for modern module resolution

### 3. Dependency Management
- `@blac/react` has `@blac/core` as a peer dependency
- Plugins have `@blac/core` as a peer dependency
- Users must install dependencies separately (no bundling)

## Development Workflow

### Building Packages
```bash
# Build all packages
pnpm build

# Build specific package
cd packages/blac && pnpm build

# Watch mode for development
cd packages/blac && pnpm dev
```

### Creating Changes
```bash
# Create a changeset for your changes
pnpm changeset

# Select packages that changed
# Choose version bump type (patch/minor/major)
# Write a description of changes
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## Publishing Workflow

### Option 1: Automated Release (Recommended)

1. Create changesets during development:
   ```bash
   pnpm changeset
   ```

2. Push to `v1` branch
3. GitHub Actions will:
   - Create a "Version Packages" PR
   - Update versions and changelogs
   - After merge, automatically publish to npm

### Option 2: Manual Release

1. Create changesets:
   ```bash
   pnpm changeset
   ```

2. Version packages:
   ```bash
   pnpm version-packages
   ```

3. Review changes, then publish:
   ```bash
   pnpm release
   ```

### Option 3: Legacy Script (Not Recommended)

The old `publish.sh` script is still available but should be replaced with the new workflow.

## GitHub Actions

### CI Workflow (`.github/workflows/ci.yml`)
Runs on all PRs and pushes:
- Builds all packages
- Runs tests
- Type checks
- Lints code
- Checks formatting

### Release Workflow (`.github/workflows/release.yml`)
Runs on pushes to `v1`:
- Creates version PRs using changesets
- Publishes to npm after merge
- Creates GitHub releases

### Manual Release (`.github/workflows/release-manual.yml`)
Triggered manually:
- Choose npm tag (latest, preview, beta, alpha)
- Builds and publishes packages
- Creates GitHub release

## Configuration Files

### `turbo.json`
- Defines build pipeline and task dependencies
- Configures caching for efficient builds

### `.changeset/config.json`
- Links all @blac/* packages together
- Sets base branch to `v1`
- Configures public access for npm

### `tsconfig.build.json` (per package)
- Extends base tsconfig
- Configures output directory and source maps
- Excludes test files from build

## Migration Notes

### For Package Consumers
After these changes, consumers need to:
1. Install peer dependencies explicitly
2. Update imports (no change needed, still `@blac/core`)
3. Ensure their bundler handles the package format

### For Contributors
1. Always run `pnpm build` before publishing
2. Use changesets for version management
3. Don't manually edit version numbers
4. Ensure tests pass before creating PRs

## Troubleshooting

### Build Errors
- Ensure all dependencies are installed: `pnpm install`
- Clean build artifacts: `pnpm clean`
- Check TypeScript errors: `pnpm typecheck`

### Publishing Issues
- Ensure you have npm publish access
- Check npm authentication: `npm whoami`
- Verify package names are correct
- Ensure versions follow semver

### Module Resolution
- ESM is the default export
- CommonJS available as `.cjs` extension
- TypeScript projects will use type definitions automatically