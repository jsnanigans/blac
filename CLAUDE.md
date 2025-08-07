# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# BlaC State Management Library

A sophisticated TypeScript state management library implementing the BLoC (Business Logic Component) pattern with innovative proxy-based dependency tracking for JavaScript/TypeScript applications.

## Project Overview

BlaC is a monorepo containing:
- **Core state management library** (`@blac/core`) with reactive Bloc/Cubit pattern
- **React integration** (`@blac/react`) with optimized hooks and dependency tracking
- **Plugin ecosystem** for persistence, logging, and extensibility
- **Demo applications** showcasing patterns and usage
- **Comprehensive documentation** and examples

## Architecture

### Core Concepts
- **Blocs**: Event-driven state containers using class-based event handlers
- **Cubits**: Simple state containers with direct state emission
- **Proxy-based dependency tracking**: Automatic optimization of React re-renders
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
- **Development**: `pnpm dev` - Start all demo apps in parallel
- **Build**: `pnpm build` - Build all packages
- **Test**: `pnpm test` - Run all tests
- **Test (watch)**: `pnpm test:watch` - Run tests in watch mode
- **Lint**: `pnpm lint` - Run ESLint across all packages
- **Type check**: `pnpm typecheck` - Verify TypeScript types
- **Format**: `pnpm format` - Format code with Prettier

### Project Structure
```
/
├── packages/
│   ├── blac/              # Core state management (@blac/core)
│   ├── blac-react/        # React integration (@blac/react)
│   ├── plugin-render-logging/  # Render logging plugin
│   └── plugins/
│       └── bloc/
│           └── persistence/    # Persistence plugin
├── apps/
│   ├── demo/              # Main demo application
│   ├── docs/              # Documentation site
│   └── perf/              # Performance testing app
├── turbo.json             # Turbo build configuration
├── pnpm-workspace.yaml    # pnpm workspace configuration
└── tsconfig.base.json     # Base TypeScript configuration
```

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

class CounterBloc extends Bloc<number, IncrementEvent> {
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

### React Integration
```typescript
function Counter() {
  const [state, counterBloc] = useBloc(CounterBloc);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={counterBloc.increment}>+</button>
    </div>
  );
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
class UserProfileBloc extends Bloc<UserState, UserEvents, {userId: string}> {
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
# Start demo app
cd apps/demo && pnpm dev

# Run specific package tests
cd packages/blac && pnpm test

# Build specific package
cd packages/blac && pnpm build
```

### Publishing
```bash
# Build and publish core package
cd packages/blac && pnpm deploy

# Build and publish React package
cd packages/blac-react && pnpm deploy
```

## Additional Resources

- **Documentation**: `/apps/docs/` contains comprehensive guides
- **Examples**: `/apps/demo/` showcases all major patterns
- **Performance**: `/apps/perf/` for performance testing
- **Architecture Review**: `/blac-improvements.md` contains detailed improvement proposals
- **Code Review**: `/review.md` contains comprehensive codebase analysis

## Contributing

1. Follow arrow function convention for all Bloc/Cubit methods
2. Write comprehensive tests for new features
3. Update documentation for public API changes
4. Run full test suite before submitting PRs
5. Follow existing TypeScript strict mode conventions

---

*This codebase implements advanced state management patterns with sophisticated dependency tracking. Pay special attention to the arrow function requirement and proxy-based optimizations when working with the code.*
