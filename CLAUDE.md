# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Blac is a TypeScript-first state management library for React implementing the Bloc/Cubit pattern. It's a monorepo with two core packages (`@blac/core` and `@blac/react`) plus demo/docs applications.

## Development Commands

```bash
# Primary development workflow
pnpm dev                 # Run all apps in development mode
pnpm build              # Build all packages
pnpm test               # Run all tests across packages
pnpm lint               # Lint all packages with TypeScript rules

# Individual package development
pnpm run dev:demo       # Demo app (port 3002)
pnpm run dev:docs       # Documentation site
pnpm run dev:perf       # Performance testing app

# Testing specific packages
pnpm test:blac          # Test core package only
pnpm test:react         # Test React integration only

# Build pipeline
turbo build             # Use Turborepo for optimized builds
turbo test              # Run tests with caching
```

## Architecture

### Core State Management Pattern

The library implements two primary state container types:

- **`Cubit<State>`**: Simple state container with direct `emit()` and `patch()` methods
- **`Bloc<State, Event>`**: Event-driven container with reducer-based state transitions

### Instance Management System

- **Shared by default**: Same class instances automatically shared across React components
- **Isolation**: Use `static isolated = true` or unique IDs for component-specific state
- **Keep Alive**: Use `static keepAlive = true` to persist state beyond component lifecycle
- **Automatic disposal**: Instances dispose when no consumers remain (unless keep alive)

### React Integration

The `useBloc()` hook leverages React's `useSyncExternalStore` for efficient state subscriptions. It supports:

- Dependency tracking with selectors to minimize re-renders
- External store integration via `useExternalBlocStore`
- Smart instance creation and cleanup

## Monorepo Structure

### Core Packages (`/packages/`)

- **`@blac/core`**: Zero-dependency state management core
- **`@blac/react`**: React integration layer (peer deps: React 18/19+)

### Applications (`/apps/`)

- **`demo/`**: Comprehensive usage examples showcasing 13+ patterns
- **`docs/`**: VitePress documentation site with API docs and tutorials
- **`perf/`**: Performance testing and benchmarking

## Key Development Context

### Version Status

Currently on v2.0.0-rc-3 (Release Candidate). Development happens on `v2` branch, PRs target `v1`.

### Build Configuration

- **Turborepo** with pnpm workspaces for build orchestration
- **Vite** for bundling with dual ESM/CJS output
- **TypeScript 5.8.3** with strict configuration across all packages
- **Node 22+** and **pnpm 10.11.0+** required

### Testing Setup

- **Vitest** for unit testing with jsdom environment
- **React Testing Library** for component integration tests
- Tests run in parallel across packages via Turborepo

### TypeScript Configuration

Uses path mapping for internal package imports. All packages use strict TypeScript with comprehensive type checking enabled via `tsconfig.base.json`.

## Known Feature Gaps

See `/TODO.md` for planned features including:

- Event transformation (debouncing, filtering)
- Enhanced `patch()` method for nested state updates
- Improved debugging tools and DevTools integration
- SSR support considerations

## Development Patterns

When adding new functionality:

1. Core logic goes in `@blac/core`
2. React-specific features go in `@blac/react`
3. Add usage examples to the demo app
4. Update documentation in the docs app
5. Follow existing TypeScript strict patterns and testing approaches

## Commit messages

Keep commit messages short and sweet with no useless information. Add a title and a bullet point list in the body.

