# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build, Test, and Development

```bash
# Build all packages
pnpm build

# Run tests
pnpm test
pnpm test:watch

# Run specific package tests
pnpm test --filter=@blac/core
pnpm test --filter=@blac/react

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format

# Run single test file
pnpm vitest run tests/specific-test.test.ts --filter=@blac/core
```

## Architecture Overview

Blac is a TypeScript-first state management library implementing the Bloc/Cubit pattern for React applications. It consists of two main packages:

### Core Architecture (`@blac/core`)

The foundation provides state management primitives:

- **BlocBase**: Abstract base class for all state containers
- **Cubit**: Simple state container with direct `emit()` and `patch()` methods
- **Bloc**: Event-driven state container using reducer pattern
- **Blac**: Central instance manager handling lifecycle, sharing, and cleanup
- **BlacObserver**: Global observer for monitoring state changes
- **Adapter System**: Smart dependency tracking using Proxy-based state wrapping

### React Integration (`@blac/react`)

- **useBloc**: Primary hook leveraging `useSyncExternalStore` for optimal React integration
- **useExternalBlocStore**: Lower-level hook for advanced use cases
- **Dependency Tracking**: Automatic detection of accessed state properties to minimize re-renders

### Key Design Patterns

1. **Instance Management**: Blac automatically manages instance lifecycle with smart sharing (default), isolation (via `static isolated = true`), and persistence (`static keepAlive = true`)

2. **Memory Safety**: Automatic cleanup when components unmount, with manual disposal available via `Blac.disposeBlocs()`

3. **Type Safety**: Full TypeScript support with comprehensive type inference

4. **Performance**: Proxy-based dependency tracking ensures components only re-render when accessed properties change

### Testing Architecture

- Unit tests use Vitest with jsdom environment
- Integration tests verify React component behavior
- Memory leak tests ensure proper cleanup
- Performance tests validate optimization strategies

## Development Guidelines

1. **Arrow Functions Required**: Always use arrow functions for Cubit/Bloc methods to maintain proper `this` binding
2. **State Immutability**: Always emit new state objects, never mutate existing state
3. **Dependency Tracking**: The adapter system automatically tracks state property access - avoid bypassing proxies
4. **Error Handling**: State containers should handle errors internally and emit error states rather than throwing

## Package Structure

```
packages/
  blac/           # Core state management library
    src/
      adapter/    # Proxy-based state tracking system
    tests/        # Comprehensive test suite
  blac-react/     # React integration
    src/
    tests/        # React-specific tests
apps/
  demo/           # Main demo application
  docs/           # Documentation site
  perf/           # Performance testing app
```

