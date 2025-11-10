# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BlaC is a TypeScript-based state management library for React applications. It provides a clean, type-safe state container architecture inspired by the BLoC pattern with three main patterns:
- **StateContainer**: Abstract base class for all state containers
- **Cubit**: Simple state container with direct state emission
- **Vertex**: Event-driven state container following the BLoC pattern

The project is a pnpm workspace monorepo with packages, apps, and plugin architecture.

## Repository Structure

```
packages/
  blac/                  - Core state management library (@blac/core)
  blac-react/            - React integration hooks (@blac/react)
  devtools-connect/      - DevTools plugin and bridge (@blac/devtools-connect)
  devtools-ui/           - DevTools UI components
  plugins/
    bloc/                - BLoC-specific plugins
    system/              - System-level plugins

apps/
  devtools-extension/    - Chrome DevTools extension
  docs/                  - Documentation site
  examples/              - Example applications
  perf/                  - Performance testing

spec/                    - Feature specifications and design documents
```

## Core Architecture

### State Containers

All state containers inherit from `StateContainer<S>` (packages/blac/src/core/StateContainer.ts):
- Provides lifecycle management, subscription handling, and ref counting
- Uses a global registry (`StateContainerRegistry`) for instance management
- Supports isolated (component-scoped) and shared (singleton) instances

**Cubit** (packages/blac/src/core/Cubit.ts):
- Extends StateContainer with public `emit()`, `update()`, and `patch()` methods
- For simple state management with direct mutations

**Vertex** (packages/blac/src/core/Vertex.ts):
- Extends StateContainer with event-driven architecture
- Uses `on()` to register event handlers and `add()` to process events
- Events implement `BaseEvent` interface

### React Integration

The `useBloc` hook (packages/blac-react/src/useBloc.ts) integrates state containers with React:
- Uses `useSyncExternalStore` for concurrent mode compatibility
- Supports three tracking modes:
  - **Auto-tracking**: Automatic dependency detection via Proxy (default)
  - **Manual dependencies**: Explicit dependency array like useEffect
  - **No tracking**: Returns full state without optimization
- Handles instance lifecycle (resolve/release) with ref counting
- Supports isolated (per-component) and shared instances

### Dependency Tracking System

**ProxyTracker** (packages/blac/src/proxy/ProxyTracker.ts):
- Creates proxies that track property access paths
- Used by auto-tracking mode to detect which state properties are accessed during render
- Only triggers re-renders when tracked properties change

**Adapter** (packages/blac/src/adapter/framework-adapter.ts):
- Bridges state containers with React's subscription model
- Provides `createAutoTrackSubscribe`, `createManualDepsSubscribe`, `createNoTrackSubscribe`
- Manages external dependency tracking via `ExternalDependencyManager`

### Plugin System

Plugins extend BlaC functionality via lifecycle hooks (packages/blac/src/plugin/):
- `BlacPlugin` interface defines lifecycle methods: `onInstall`, `onInstanceCreated`, `onStateChanged`, `onEventAdded`, `onInstanceDisposed`, `onUninstall`
- `PluginContext` provides safe access to registry data
- `PluginManager` handles plugin registration and environment filtering
- DevTools connection is implemented as a plugin

## Common Commands

### Development
```bash
# Run dev mode (all packages)
pnpm dev

# Run specific package in dev mode
pnpm --filter @blac/core dev
pnpm --filter @blac/react dev
```

### Building
```bash
# Build all packages (with dependency ordering)
pnpm build

# Build specific package
pnpm --filter @blac/core build
pnpm --filter @blac/react build
```

### Testing

**CRITICAL**: Always run specific test files, not entire test suites in monorepo context.

```bash
# Run tests for specific package
pnpm --filter @blac/core test
pnpm --filter @blac/react test

# Run specific test file
pnpm --filter @blac/core test BlocBase.disposal.performance
pnpm --filter @blac/react test useBloc.strictMode

# Run with specific test name pattern (-t flag)
pnpm --filter @blac/react test dependency-tracking -t "should only trigger"

# React tests have special configs
pnpm --filter @blac/react test              # Standard tests
pnpm --filter @blac/react test:compiler     # With React Compiler
pnpm --filter @blac/react test:both         # Both standard and compiler
pnpm --filter @blac/react test:performance  # Performance benchmarks
pnpm --filter @blac/react test:memory       # Memory tests (with --expose-gc)

# Run tests with verbose output
pnpm --filter @blac/react test useBloc.strictMode --reporter=verbose
```

Test files use Vitest with these patterns:
- `describe()` blocks for test grouping
- `it()` or `test()` for individual tests
- `beforeEach()` for setup
- Common locations: `src/__tests__/` or `src/**/*.test.ts`

### Linting and Type Checking
```bash
# Lint all packages
pnpm lint

# Lint specific package
pnpm --filter @blac/core lint
pnpm --filter @blac/react lint

# Fix linting issues
pnpm --filter @blac/core lint:fix

# Type check (respects turbo dependency graph)
pnpm typecheck
pnpm --filter @blac/react typecheck
```

### Cleaning
```bash
# Clean all build artifacts
pnpm clean

# Clean specific package
pnpm --filter @blac/core clean
```

## Development Workflow

### Adding New Features
1. Check `spec/` directory for existing specifications
2. Understand the three-layer architecture:
   - Core: StateContainer, Cubit, Vertex in `packages/blac/src/core/`
   - Tracking: Proxy tracking and adapters in `packages/blac/src/proxy/` and `packages/blac/src/adapter/`
   - React: Integration hooks in `packages/blac-react/src/`
3. Write tests alongside implementation
4. Ensure both `@blac/core` and `@blac/react` tests pass if changes affect React integration

### Running Tests During Development
- Run specific test files, never run all tests at once in monorepo
- Use `-t` flag to run specific test cases by name pattern
- Use `--reporter=verbose` for detailed output when debugging
- For React tests: be aware of React Compiler compatibility tests

### Package Dependencies
- `@blac/react` depends on `@blac/core`
- `@blac/devtools-connect` depends on `@blac/core`
- Apps depend on published packages via workspace protocol (`workspace:*`)
- Build order is managed by Turbo via `turbo.json`

### Instance Management
- Isolated instances: scoped to component lifecycle (one instance per component)
- Shared instances: singleton per instance key (multiple components share)
- Instance keys generated via `generateInstanceKey()` (packages/blac-react/src/utils/instance-keys.ts)
- Ref counting: `resolve()` increments, `release()` decrements, auto-disposed at 0

### TypeScript Configuration
- Uses shared `tsconfig.base.json` at root
- Packages have individual `tsconfig.json` and `tsconfig.build.json`
- Build tool: `tsdown` for bundling (produces ESM and CJS)
- Type declarations generated via `tsc -p tsconfig.build.json`

## Debugging Tips

### DevTools
- DevTools extension in `apps/devtools-extension/`
- Connection handled by `@blac/devtools-connect` plugin
- Bridge protocol defined in `packages/devtools-connect/src/protocol/messages.ts`
- State manager in `packages/devtools-connect/src/state/DevToolsStateManager.ts`

### Logging
- Core logging system in `packages/blac/src/logging/Logger.ts`
- Configure via `BLAC_LOG_LEVEL` environment variable
- Levels: debug, info, warn, error

### Common Issues
- **Ref counting**: Check `StateContainerRegistry` for ref count leaks
- **Tracking issues**: Examine `ProxyTracker` and adapter subscribe functions
- **React Strict Mode**: Tests include strict mode variants (double-invocation)
- **Memory leaks**: Use `test:memory` with `--expose-gc` flag

## Code Style

- Prefer arrow functions for class methods to maintain `this` binding in React
- Use explicit return types for public APIs
- Document complex logic with inline comments explaining "why" not "what"
- Test files should mirror source file structure
- Use branded types for IDs (packages/blac/src/types/branded.ts)

## Publishing

```bash
# Version packages (using changesets)
pnpm changeset

# Build and publish (runs build, test, typecheck)
pnpm release
```

Packages published to npm:
- `@blac/core`
- `@blac/react`
- `@blac/devtools-connect`
