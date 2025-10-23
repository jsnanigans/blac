# CLAUDE.md

This is an internal project with no external users, so we can do a clean changes and refactoring, without worrying about migrating from older versions or backwards compatibility.

This project uses `jujutsu` instead of `git` for version control.
if you are instructed to do anything git related, use `jj` commands to interact with the repository.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# BlaC State Management Library

A sophisticated TypeScript state management library implementing the BLoC (Business Logic Component) pattern with innovative proxy-based dependency tracking for JavaScript/TypeScript applications.

## Project Overview

BlaC is a monorepo containing:
- **Core state management library** (`@blac/core`) with reactive Bloc/Cubit pattern
- **React integration** (`@blac/react`) with **Adapter Pattern** for optimal React 18 compatibility
- **Plugin ecosystem** for persistence, logging, and extensibility
- **Demo applications** showcasing patterns and usage
- **Comprehensive documentation** and examples

## ⚠️ Important: React Integration Migration (2025-10-21)

The React integration has been **fully migrated** to the **Adapter Pattern**:

- **Old Implementation** (Unified Tracking): Archived in `packages/blac-react/src/__archived__/`
- **New Implementation** (Adapter Pattern): `useBloc` and `useBlocAdapter` now use the same implementation
- **Key Change**: `useBloc` now uses selector-based subscriptions instead of automatic proxy tracking

### What Changed
- ✅ **Clean architecture** with adapter layer separating React and BlaC concerns
- ✅ **Version-based change detection** instead of deep comparisons (better performance)
- ✅ **React 18 compliance** via `useSyncExternalStore`
- ✅ **Selector support** for fine-grained reactivity
- ✅ **Proper lifecycle management** with reference counting

### Migration Guide
Old unified tracking tests are in `__archived__/tests/` but **not running**. The new adapter pattern is the only supported implementation.

See `/spec/2025-10-20-optimized-react-integration/` for complete migration documentation.

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
```bash
# Core package tests
cd packages/blac
pnpm test                    # Run all tests
pnpm test:watch              # Watch mode
pnpm coverage                # Generate coverage report
pnpm test -- path/to/test.ts # Run specific test file

# React package tests
cd packages/blac-react
pnpm test                    # Uses happy-dom environment
pnpm test:watch              # Watch mode

# Run specific test by name pattern
pnpm test -- -t "test name pattern"
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
│   ├── blac/              # Core state management (@blac/core)
│   ├── blac-react/        # React integration (@blac/react)
│   └── plugins/
│       ├── bloc/
│       │   └── persistence/    # Persistence plugin (@blac/plugin-persistence)
│       └── system/
│           └── render-logging/ # Render logging plugin (@blac/plugin-render-logging)
├── apps/
│   ├── playground/        # Interactive playground with Monaco editor
│   ├── docs/              # Documentation site
│   └── perf/              # Performance testing app
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
- **Core package** (`@blac/core`): Uses `jsdom` environment
- **React package** (`@blac/react`): Uses `happy-dom` environment
- Both use Vitest with different configurations

## Additional Resources

- **Documentation**: `/apps/docs/` contains comprehensive guides
- **Interactive Playground**: `/apps/playground/` - Monaco editor-based playground for experimentation
- **Performance Testing**: `/apps/perf/` - Performance benchmarks and testing
- **Architecture Review**: `/blac-improvements.md` - Detailed improvement proposals for subscription architecture
- **Code Review**: `/review.md` - Comprehensive codebase analysis and observations

## Core Architecture Insights

### Subscription System
- **Dual subscription model**: Consumers (WeakRef-based) and Observers (dependency-based)
- **BlacAdapter**: Orchestrates connections between Blocs and React components
- **ProxyFactory**: Creates proxies for automatic dependency tracking (configurable)
- **SubscriptionManager**: Handles observer lifecycle and notifications
- **ConsumerTracker**: Tracks component consumers with automatic cleanup

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

## Contributing

1. Follow arrow function convention for all Bloc/Cubit methods
2. Write comprehensive tests for new features using Vitest
3. Add changesets for version tracking: `pnpm changeset`
4. Update documentation for public API changes
5. Run full test suite before submitting PRs: `pnpm test && pnpm typecheck`
6. Follow existing TypeScript strict mode conventions
7. Use catalog references for dependencies in package.json

---

*This codebase implements advanced state management patterns with sophisticated dependency tracking. Pay special attention to the arrow function requirement and proxy-based optimizations when working with the code.*

---

# Direct Integration with Clean Architecture

The recommendation clearly states we're doing a Comprehensive Overhaul with:
1. Parallel Development - Building new architecture alongside old
2. No backward compatibility concerns - This is an internal project
3. Clean slate opportunity - Fundamentally improve the architecture

