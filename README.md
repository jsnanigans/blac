# BlaC

A sophisticated TypeScript state management library implementing the BLoC (Business Logic Component) pattern with proxy-based dependency tracking.

## Features

- **Event-driven state management** with Bloc/Cubit pattern
- **Automatic dependency tracking** via Proxies for optimized React re-renders
- **Type-safe** event handling and state management
- **Extensible plugin system** for custom functionality
- **Flexible instance management** (shared, isolated, persistent)

## Quick Start

```bash
pnpm install
pnpm dev        # Start playground on port 3003
```

## Basic Usage

### Cubit (Simple State)
```typescript
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}
```

### Bloc (Event-Driven)
```typescript
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
  const [state, bloc] = useBloc(CounterBloc);

  return (
    <div>
      <p>Count: {state}</p>
      <button onClick={bloc.increment}>+</button>
    </div>
  );
}
```

## Project Structure

```
packages/
├── blac/              # Core state management (@blac/core)
├── blac-react/        # React integration (@blac/react)
└── plugins/           # Persistence, logging, etc.

apps/
├── playground/        # Interactive playground
├── docs/              # Documentation site
└── perf/              # Performance benchmarks
```

## Key Commands

```bash
pnpm dev           # Start all apps
pnpm build         # Build all packages
pnpm test          # Run all tests
pnpm typecheck     # Verify types
pnpm lint          # Lint code
pnpm changeset     # Create version changeset
pnpm release       # Build, test, and publish
```

## Critical Convention

**Always use arrow functions for Bloc/Cubit methods:**

```typescript
// ✅ Correct
increment = () => {
  this.emit(this.state + 1);
};

// ❌ Incorrect - breaks React binding
increment() {
  this.emit(this.state + 1);
}
```

## Documentation

- Full docs: `/apps/docs/`
- Interactive playground: `/apps/playground/`
- Architecture details: `CLAUDE.md`

## License

MIT
