# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Critical Context

1. **Version Control:** This project uses **`jujutsu`** (`jj`), not `git`. Always use `jj` commands for version control operations.
2. **Internal Project:** No external users or backwards compatibility concerns. Clean refactoring and breaking changes are acceptable.
3. **Test Strategy:** NEVER run all tests at once in this monorepo. Always scope tests to specific packages or test files using workspace filters.

## Quick Reference: Common Commands

```bash
# Testing (ALWAYS use --filter to scope to specific package)
pnpm --filter @blac/core test              # Test core package
pnpm --filter @blac/react test             # Test React package
pnpm --filter @blac/core test BlocBase    # Test specific pattern

# Development
pnpm dev                                   # Start playground (port 3003)
pnpm --filter @blac/core dev              # Watch build core package
pnpm typecheck                            # Type check all packages

# Code Quality
pnpm lint                                  # Lint all packages
pnpm lint:fix                             # Auto-fix linting issues
pnpm format                               # Format with Prettier

# Building & Publishing
pnpm build                                # Build all packages (uses Turbo cache)
pnpm changeset                            # Create version changeset
pnpm release                              # Build, test, typecheck, and publish

# Version Control (Jujutsu)
jj status                                 # Check working directory status
jj diff                                   # View changes
jj log                                    # View commit history
jj commit -m "message"                    # Create commit
```

# BlaC State Management Library

A sophisticated TypeScript state management library implementing the BLoC (Business Logic Component) pattern with innovative proxy-based dependency tracking for JavaScript/TypeScript applications.

## Project Overview

BlaC is a monorepo containing:
- **Core state management library** (`@blac/core`) with reactive Bloc/Cubit pattern
- **React integration** (`@blac/react`) with **Adapter Pattern** for optimal React 18 compatibility
- **Plugin ecosystem** for persistence, logging, and extensibility
- **Demo applications** showcasing patterns and usage
- **Comprehensive documentation** and examples

## ⚠️ Important: V2 Architecture (2025-10)

### Recent Major Changes

**1. React Integration Migration (2025-10-21)**

The React integration was **fully migrated** to the **Adapter Pattern**:

- **Old Implementation** (Unified Tracking): Archived in `packages/blac-react/src/__archived__/`
- **New Implementation** (Adapter Pattern): `useBloc` now uses `ReactBridge` for clean separation
- **Key Change**: Selector-based subscriptions instead of automatic proxy tracking
- **Benefits:**
  - Clean architecture with adapter layer separating React and BlaC concerns
  - Version-based change detection instead of deep comparisons (better performance)
  - React 18 compliance via `useSyncExternalStore`
  - Proper lifecycle management with reference counting

See `/spec/2025-10-20-optimized-react-integration/` for complete documentation.

**2. Disposal Race Condition Fix (2025-10-17)**

Implemented **Generation Counter Pattern** to prevent memory leaks in React Strict Mode:

- Each disposal request gets a unique generation number
- Microtasks validate generation before executing
- Cancellation increments generation, invalidating pending microtasks
- **Result:** Zero memory leaks in all React Strict Mode scenarios

See `/spec/2025-10-16-disposal-race-condition/` for implementation details.

## Architecture

### Core Concepts
- **Blocs**: Event-driven state containers using class-based event handlers
- **Cubits**: Simple state containers with direct state emission
- **Adapter Pattern**: Clean separation between React lifecycle and BlaC state management
- **Selector-based reactivity**: Fine-grained subscriptions for optimal re-render control
- **Plugin system**: Extensible architecture for custom functionality
- **Instance management**: Shared, isolated, and persistent state patterns

### Key Design Patterns
- Arrow function methods required for proper `this` binding in React
- Type-safe event handling with class-based events
- Automatic memory management with WeakRef-based consumer tracking
- Configuration-driven behavior (proxy tracking, logging, etc.)

## Development Setup

### Prerequisites
- Node.js 22+
- pnpm 9+

### Installation
```bash
pnpm install
```

### Key Commands
- **Development**: `pnpm dev` - Start all apps in parallel (playground on port 3003)
- **Build**: `pnpm build` - Build all packages (uses Turbo for caching)
- **Test**: `pnpm test` - Run all tests across packages
- **Test (watch)**: `pnpm test:watch` - Run tests in watch mode
- **Lint**: `pnpm lint` - Run ESLint across all packages
- **Lint (fix)**: `pnpm lint:fix` - Auto-fix ESLint issues
- **Type check**: `pnpm typecheck` - Verify TypeScript types
- **Format**: `pnpm format` - Format code with Prettier
- **Changesets**: `pnpm changeset` - Create a changeset for versioning
- **Release**: `pnpm release` - Build, test, typecheck, and publish packages

### Running Tests for Specific Packages

**IMPORTANT:** Always scope tests to specific packages or files. Running `pnpm test` at the root will run ALL tests across the entire monorepo, which is slow and unnecessary.

```bash
# Using pnpm workspace filters (recommended - run from root)
pnpm --filter @blac/core test                    # All core tests
pnpm --filter @blac/react test                   # All React tests
pnpm --filter @blac/core test BlocBase          # Specific test pattern in core
pnpm --filter @blac/react test useBloc          # Specific test pattern in React

# From within package directory
cd packages/blac
pnpm test                                        # All tests in this package
pnpm test:watch                                  # Watch mode
pnpm coverage                                    # Generate coverage report
pnpm test src/__tests__/specific.test.ts        # Specific test file

# React package has two test configs
cd packages/blac-react
pnpm test                                        # Standard tests (happy-dom)
pnpm test:compiler                               # Tests with React Compiler enabled
pnpm test:both                                   # Run both configurations

# Run specific test by name pattern
pnpm test -- -t "test name pattern"

# Run single test file with environment variable
NODE_ENV=test pnpm --filter @blac/react test src/__tests__/useBloc.test.tsx
```

### Development Workflow
```bash
# Start playground for interactive development
cd apps/playground && pnpm dev

# Run type checking during development
pnpm typecheck --watch

# Clean build artifacts
pnpm clean
```

### Project Structure
```
/
├── packages/
│   ├── blac/              # Core state management (@blac/core) v2.0.0-rc.2
│   ├── blac-react/        # React integration (@blac/react) v2.0.0-rc.2
│   ├── devtools-connect/  # DevTools integration (@blac/devtools-connect)
│   └── plugins/
│       ├── bloc/
│       │   └── persistence/        # State persistence plugin
│       └── system/
│           ├── graph/              # Graph-based state management
│           ├── graph-react/        # React bindings for graph plugin
│           └── render-logging/     # React render logging plugin
├── apps/
│   ├── playground/        # Interactive playground with Monaco editor (port 3003)
│   └── perf/              # Performance testing app
├── spec/                  # Architecture Decision Records (ADRs) and feature specs
│   ├── 2025-10-16-disposal-race-condition/    # Generation counter fix
│   ├── 2025-10-20-optimized-react-integration/ # Adapter pattern migration
│   └── [other specs]/     # Various feature specifications and research
├── turbo.json             # Turbo build configuration
├── pnpm-workspace.yaml    # Workspace configuration with catalog
└── tsconfig.base.json     # Base TypeScript configuration
```

## Workspace Configuration

This project uses **pnpm workspaces** with a **catalog** for dependency management:
- Shared dependency versions are defined in `pnpm-workspace.yaml` under `catalog:`
- Use `catalog:` references in package.json to ensure version consistency
- Example: `"typescript": "catalog:"` instead of hardcoded versions
- Build orchestration uses **Turbo** for caching and parallel execution

## Code Conventions

### Critical Requirements
1. **Arrow Functions**: All methods in Bloc/Cubit classes MUST use arrow function syntax:
   ```typescript
   // ✅ Correct
   increment = () => {
     this.emit(this.state + 1);
   };

   // ❌ Incorrect - will break in React
   increment() {
     this.emit(this.state + 1);
   }
   ```

2. **Type Safety**: Prefer explicit types over `any`, use proper generic constraints
3. **Event Classes**: Use class-based events for Blocs, not plain objects
4. **State Immutability**: Always emit new state objects, never mutate existing state

### Code Style
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **ESLint**: Strict TypeScript rules enforced
- **Prettier**: Automatic code formatting
- **Testing**: Comprehensive test coverage with Vitest

## State Management Patterns

### Basic Cubit Example
```typescript
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0); // Initial state
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };
}
```

### Event-Driven Bloc Example
```typescript
// Define event classes
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class CounterBloc extends Vertex<number, IncrementEvent> {
  constructor() {
    super(0);

    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });
  }

  increment = (amount = 1) => {
    this.add(new IncrementEvent(amount));
  };
}
```

### React Integration (Adapter Pattern)
```typescript
// Basic usage - full state
function Counter() {
  const [state, bloc] = useBloc(CounterBloc);
  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={bloc.increment}>+</button>
    </div>
  );
}

// Optimized with selector - fine-grained reactivity
function Counter() {
  const [count, bloc] = useBloc(CounterBloc, {
    selector: (state) => state.count
  });
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={bloc.increment}>+</button>
    </div>
  );
}

// With lifecycle callbacks
function DataLoader() {
  const [data, bloc] = useBloc(DataBloc, {
    onMount: (bloc) => bloc.loadData(),
    onUnmount: (bloc) => bloc.cleanup(),
  });
  return <div>{data}</div>;
}
```

## Configuration & Features

### Global Configuration
```typescript
import { Blac } from '@blac/core';

Blac.setConfig({
  proxyDependencyTracking: true, // Automatic dependency tracking
});
```

### Instance Management Patterns
- **Shared (default)**: Single instance across all consumers
- **Isolated**: Each consumer gets its own instance (`static isolated = true`)
- **Persistent**: Keep alive even without consumers (`static keepAlive = true`)

### Plugin System
```typescript
class LoggerPlugin implements BlacPlugin {
  name = 'LoggerPlugin';

  onEvent(event: BlacLifecycleEvent, bloc: BlocBase, params?: any) {
    if (event === BlacLifecycleEvent.STATE_CHANGED) {
      console.log(`[${bloc._name}] State changed:`, bloc.state);
    }
  }
}

Blac.addPlugin(new LoggerPlugin());
```

### V2 Logging System

BlaC v2 includes a unified logging system for debugging and development:

```typescript
import { BlacLogger, LogLevel } from '@blac/core';

// Enable logging with desired level
BlacLogger.configure({
  enabled: true,
  level: LogLevel.DEBUG  // ERROR, WARN, INFO, or DEBUG
});
```

**Log Levels:**
- `LogLevel.ERROR` - Critical errors only
- `LogLevel.WARN` - Warnings and errors
- `LogLevel.INFO` - Important informational messages
- `LogLevel.DEBUG` - Detailed diagnostic information (default when enabled)

**What's Logged:**
- State changes in StateStream and StateContainer
- Subscription lifecycle (register/unregister/cleanup)
- ReactBridge operations (v2 only)
- Error conditions in subscription pipelines

**Custom Output:**
```typescript
BlacLogger.configure({
  enabled: true,
  level: LogLevel.DEBUG,
  output: (entry) => {
    // Custom logging (e.g., send to remote service)
    console.log(JSON.stringify(entry));
  }
});
```

## Performance Considerations

- **Proxy overhead**: Automatic dependency tracking uses Proxies (can be disabled)
- **Consumer validation**: O(n) consumer cleanup on state changes
- **Memory management**: WeakRef-based consumer tracking prevents memory leaks
- **Batched updates**: State changes are batched for performance

## Common Patterns

### Conditional Dependencies
```typescript
const [state, bloc] = useBloc(UserBloc, {
  selector: (currentState, previousState, instance) => [
    currentState.isLoggedIn ? currentState.userData : null,
    instance.computedValue
  ]
});
```

### Props-Based Blocs
```typescript
class UserProfileBloc extends Vertex<UserState, UserEvents, {userId: string}> {
  constructor(props: {userId: string}) {
    super(initialState);
    this.userId = props.userId;
    this._name = `UserProfileBloc_${this.userId}`;
  }
}
```

## Known Issues & Limitations

### Current Architecture Challenges
- Circular dependencies between core classes
- Complex dual consumer/observer subscription system
- Performance bottlenecks with deep object proxies
- Security considerations with global state access

### Recommended Improvements
- Simplify subscription architecture
- Implement reference counting for lifecycle management
- Add selector-based optimization options
- Enhance type safety throughout

## Building & Deployment

### Local Development
```bash
# Start playground app
cd apps/playground && pnpm dev

# Start specific apps
cd apps/perf && pnpm dev
cd apps/docs && pnpm dev

# Run specific package tests
cd packages/blac && pnpm test

# Build specific package
cd packages/blac && pnpm build
```

### Publishing Workflow (using Changesets)
```bash
# 1. Create a changeset when making changes
pnpm changeset

# 2. Version packages (updates package.json and CHANGELOG)
pnpm version-packages

# 3. Build, test, typecheck, and publish
pnpm release

# Or manually publish individual packages
cd packages/blac && pnpm deploy
cd packages/blac-react && pnpm deploy
```

### Test Environments
- **Core package** (`@blac/core`):
  - Uses `jsdom` environment
  - Single Vitest configuration
  - Focus: Pure state management logic, lifecycle, subscriptions
- **React package** (`@blac/react`):
  - Uses `happy-dom` environment (faster than jsdom)
  - Two configurations:
    - `vitest.config.ts`: Standard React tests
    - `vitest.config.compiler.ts`: Tests with React Compiler enabled
  - Use `pnpm test:both` to run both configurations
  - Focus: React integration, hooks, component lifecycle

## Additional Resources

### Applications
- **Interactive Playground**: `/apps/playground/` - Monaco editor-based playground for experimentation (port 3003)
- **Performance Testing**: `/apps/perf/` - Performance benchmarks and testing

### Specifications & Architecture Decisions
- **Spec Directory**: `/spec/` - Architecture Decision Records (ADRs) for all major features and fixes
  - Each spec follows structure: `research.md`, `discussion.md`, `recommendation.md`, `plan.md`
  - Critical specs:
    - `2025-10-16-disposal-race-condition/` - Generation counter implementation
    - `2025-10-20-optimized-react-integration/` - Adapter pattern migration
    - `2025-01-19-dependency-tracking-redesign/` - Proxy-based tracking design
- **Architecture Review**: `/blac-improvements.md` - Improvement proposals for subscription architecture
- **Code Review**: `/review.md` - Comprehensive codebase analysis

## Core Architecture Insights

### Subscription System

**V2 Architecture (Current):**
- **ReactBridge**: Clean adapter layer between BlaC and React
  - Uses `useSyncExternalStore` for React 18 compatibility
  - Selector-based subscriptions for fine-grained reactivity
  - Version-based change detection (no deep comparisons)
  - Reference counting for proper lifecycle management
- **StateStream**: Core reactive state container
- **StateContainer**: Simplified state management interface
- **ProxyFactory**: Creates proxies for automatic dependency tracking (configurable, V1 legacy)

**V1 Legacy (Archived):**
- **Dual subscription model**: Consumers (WeakRef-based) and Observers (dependency-based)
- **SubscriptionManager**: Handles observer lifecycle and notifications
- **ConsumerTracker**: Tracks component consumers with automatic cleanup

Note: V1 unified tracking implementation is archived in `packages/blac-react/src/__archived__/`

### Lifecycle Management
- States: `ACTIVE`, `DISPOSAL_REQUESTED`, `DISPOSING`, `DISPOSED`
- Instance patterns: Shared (default), Isolated (`static isolated = true`), Persistent (`static keepAlive = true`)
- WeakRef-based consumer tracking prevents memory leaks
- **Generation Counter Pattern**: Prevents disposal race conditions using integer versioning (see `spec/2025-10-16-disposal-race-condition/`)
  - Each disposal request gets a unique generation number
  - Microtasks validate generation before executing
  - Cancellation increments generation, invalidating pending microtasks
  - Eliminates memory leaks in React Strict Mode scenarios
- Reference counting considered for future improvements (see `blac-improvements.md`)

### Key Classes
- **BlocBase**: Abstract base class for state management
- **Cubit**: Simple state containers with direct emission
- **Bloc**: Event-driven state containers with event handlers
- **Blac**: Global registry and configuration manager
- **BlacPlugin**: Extensible plugin interface (System and Bloc-level)

## Development Best Practices

### Code Standards
1. **Arrow functions required**: All Bloc/Cubit methods MUST use arrow function syntax for proper `this` binding
2. **Type safety**: Prefer explicit types over `any`, use proper generic constraints
3. **State immutability**: Always emit new state objects, never mutate existing state
4. **Event classes**: Use class-based events for Blocs, not plain objects

### Testing Standards
1. Write comprehensive tests using Vitest
2. **Always scope tests** to specific packages using `pnpm --filter @blac/core test` or similar
3. Test both standard and React Compiler modes for React package changes
4. Ensure memory leak tests pass (especially after lifecycle changes)

### Version Control & Release
1. Use `jj` commands for all version control operations
2. Add changesets for version tracking: `pnpm changeset`
3. Follow semantic versioning: `patch` for fixes, `minor` for features, `major` for breaking changes
4. Update documentation for public API changes
5. Build and test before releasing: `pnpm release` (runs build, test, typecheck, publish)

### Code Quality Checks
```bash
pnpm typecheck        # TypeScript type checking
pnpm lint             # ESLint validation
pnpm lint:fix         # Auto-fix linting issues
pnpm format           # Format with Prettier
```

### Architectural Decisions
- Document significant architectural decisions in `/spec/` directory
- Follow existing spec structure: `research.md`, `discussion.md`, `recommendation.md`, `plan.md`
- Reference existing specs when making related changes

---

*This codebase implements advanced state management patterns with React 18+ integration. The V2 architecture uses a clean adapter pattern with selector-based subscriptions for optimal performance.*

