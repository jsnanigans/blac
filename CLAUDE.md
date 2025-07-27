# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `pnpm dev` - Run all apps in parallel in development mode
- `pnpm app` - Run only the user app in development mode
- `pnpm build` - Build all packages and apps
- `pnpm lint` - Run linting across all packages
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm format` - Format code with Prettier

### Testing
- `pnpm test` - Run all tests once
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test packages/blac` - Run tests for a specific package
- `pnpm test:watch packages/blac` - Run tests in watch mode for a specific package
- To run a single test file: `cd packages/blac && pnpm vitest run path/to/test.ts`

### Package-specific Commands
The main packages are located in:
- `packages/blac` - Core BlaC state management library (@blac/core)
- `packages/blac-react` - React integration for BlaC (@blac/react)

## Architecture Overview

### BlaC Pattern
BlaC (Business Logic as Components) is a state management library inspired by the BLoC pattern from Flutter. It provides predictable state management through:

1. **Cubit**: Simple state container with direct state emissions via `emit()` method
2. **Bloc**: Event-driven state container using event classes and handlers registered with `on(EventClass, handler)`
3. **React Integration**: `useBloc` hook with automatic dependency tracking for optimized re-renders

### Key Architecture Principles

1. **Arrow Functions Required**: All methods in Bloc/Cubit classes must use arrow function syntax (`method = () => {}`) to maintain proper `this` binding when called from React components.

2. **Event-Driven Architecture for Blocs**: 
   - Events are class instances (not strings or objects)
   - Handlers are registered using `this.on(EventClass, handler)` in constructor
   - Events are dispatched via `this.add(new EventInstance())`

3. **State Management Patterns**:
   - **Shared State** (default): Single instance shared across all consumers
   - **Isolated State**: Set `static isolated = true` for component-specific instances
   - **Persistent State**: Set `static keepAlive = true` to persist when no consumers

4. **Lifecycle Management**:
   - Atomic state transitions prevent race conditions during disposal
   - Automatic cleanup when no consumers remain (unless keepAlive)
   - React Strict Mode compatible with deferred disposal

### Monorepo Structure
- Uses pnpm workspaces and Turbo for monorepo management
- Workspace packages defined in `pnpm-workspace.yaml`
- Shared dependencies managed via catalog in workspace file
- Build orchestration via `turbo.json`

### Testing Infrastructure
- Vitest for unit testing with jsdom environment
- Test utilities provided via `@blac/core/testing`
- Coverage reporting configured in `vitest.config.ts`

## Important Implementation Details

1. **Disposal Safety**: The disposal system uses atomic state transitions (ACTIVE → DISPOSAL_REQUESTED → DISPOSING → DISPOSED) to handle React Strict Mode's double-mounting behavior.

2. **Event Queue**: Bloc events are queued and processed sequentially to prevent race conditions in async handlers.

3. **Dependency Tracking**: The React integration uses Proxies to automatically track which state properties are accessed during render, enabling fine-grained updates.

4. **Memory Management**: Uses WeakRef for consumer tracking to prevent memory leaks and enable proper garbage collection.

5. **Plugin System**: Extensible via BlacPlugin interface for adding logging, persistence, or analytics functionality.

## Code Conventions

1. **TypeScript**: Strict mode enabled, avoid `any` types except where necessary (e.g., event constructor parameters)
2. **File Organization**: Core logic in `src/`, tests alongside source files or in `__tests__`
3. **Exports**: Public API exported through index.ts files
4. **Error Handling**: Enhanced error messages with context for debugging
5. **Logging**: Use `Blac.log()`, `Blac.warn()`, and `Blac.error()` for consistent logging