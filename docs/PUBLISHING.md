# Publishing Guide

This guide explains how to publish packages in the BlaC monorepo.

## Quick Start

```bash
# Publish all packages with a patch version bump
./publish.sh

# Dry run to preview what will be published
DRY_RUN=true ./publish.sh

# Publish with a specific version
./publish.sh
# Then enter: 2.0.0-rc.14

# Publish with different tag
PUBLISH_TAG=latest ./publish.sh

# Skip build step (if already built)
SKIP_BUILD=true ./publish.sh
```

## Features

The new publish script provides:

1. **Automatic Package Discovery**: Finds all publishable packages in `packages/` and `packages/plugins/`
2. **Configurable Publishing**: Use environment variables or config file
3. **Dry Run Mode**: Preview changes before publishing
4. **Color-Coded Output**: Clear visual feedback
5. **Error Handling**: Continues with other packages if one fails
6. **Plugin Support**: Automatically discovers and publishes all plugins

## Configuration

### Environment Variables

- `PUBLISH_TAG`: NPM tag to publish under (default: "preview")
- `DRY_RUN`: Run without actually publishing (default: false)
- `SKIP_BUILD`: Skip the build step (default: false)
- `SYNC_DEPS`: Update workspace dependencies (default: true)

### Configuration File

The script reads from `.publish.config.json` if present:

```json
{
  "packages": {
    "include": ["packages/*", "packages/plugins/**"],
    "exclude": ["packages/test-utils"],
    "pattern": "@blac/*"
  },
  "publish": {
    "defaultTag": "preview",
    "access": "public",
    "registry": "https://registry.npmjs.org/",
    "gitChecks": false
  },
  "build": {
    "command": "pnpm run build",
    "required": true
  },
  "version": {
    "gitTag": false,
    "allowedBumps": ["patch", "minor", "major", "prerelease"],
    "syncWorkspaceDependencies": true
  }
}
```

## Package Detection

The script automatically detects packages that:
1. Have a `package.json` file
2. Are not marked as `"private": true`
3. Have a name starting with `@blac/`

## Adding New Plugins

To add a new plugin that will be automatically published:

1. Create your plugin in `packages/plugins/` directory
2. Ensure the package.json has:
   - `"name": "@blac/plugin-your-name"`
   - `"private": false` (or omit the field)
   - A `build` script
3. The publish script will automatically detect and include it

## Version Bumping

Supported version bump types:
- `patch`: 1.0.0 → 1.0.1
- `minor`: 1.0.0 → 1.1.0
- `major`: 1.0.0 → 2.0.0
- `prerelease`: 1.0.0 → 1.0.1-0
- Specific version: `2.0.0-rc.14`

## Examples

### Publishing a New Release

```bash
# 1. Run tests first
pnpm test

# 2. Build all packages
pnpm build

# 3. Dry run to check
DRY_RUN=true ./publish.sh

# 4. Publish for real
./publish.sh
# Enter: patch (or minor/major)
# Confirm: y
```

### Publishing a Release Candidate

```bash
# Publish with RC version
./publish.sh
# Enter: 2.0.0-rc.15
# Confirm: y
```

### Publishing to Latest Tag

```bash
# Publish stable release
PUBLISH_TAG=latest ./publish.sh
# Enter: minor
# Confirm: y
```

## Troubleshooting

### Build Failures
If a package fails to build, the script will continue with other packages and report failures at the end.

### Version Conflicts
The script updates versions sequentially. If you need to sync workspace dependencies, ensure `SYNC_DEPS=true` (default).

### Permission Errors
Ensure you're logged into npm:
```bash
npm login
```

### Checking Published Versions
```bash
# Check all published versions
npm view @blac/core versions --json
npm view @blac/react versions --json
npm view @blac/plugin-persistence versions --json
npm view @blac/plugin-render-logging versions --json
```