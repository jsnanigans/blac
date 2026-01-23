# What is BlaC?

BlaC is a TypeScript state management library implementing the BLoC (Business Logic Component) pattern for React applications. It provides type-safe state containers with automatic dependency tracking for optimal re-renders.

## Key Features

- **Type-Safe**: Full TypeScript support with inferred state and props types
- **Auto-Tracking**: Proxy-based dependency tracking - only re-render when accessed properties change
- **Simple API**: Cubit pattern for straightforward state management
- **DevTools**: Built-in Chrome extension for debugging

## More Than State Management

BlaC is a pattern that lets you forget about state management so you can focus on building features.

**Separation of Concerns**

```
┌─────────────────┐
│   UI (React)    │  Components only render and dispatch actions
├─────────────────┤
│ Business Logic  │  Cubits handle all logic
│    (BlaC)       │
├─────────────────┤
│   Data Layer    │  APIs, databases, storage
└─────────────────┘
```

**Testability**

Business logic lives in plain TypeScript classes. Test without React, without hooks, without rendering:

```typescript
// No React testing library needed
const counter = new CounterCubit();
counter.increment();
expect(counter.state.count).toBe(1);
```

## Cubit Pattern

Cubit provides direct state mutations with a simple API:

```typescript
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.patch({ count: this.state.count + 1 });
  decrement = () => this.patch({ count: this.state.count - 1 });
}
```

**State Update Methods:**
- `emit(newState)` - Replace entire state
- `update(fn)` - Update via function `(current) => next`
- `patch(partial)` - Shallow merge partial state

## Next Steps

- [Core Getting Started](/core/getting-started) - Installation and basic usage
- [React Getting Started](/react/getting-started) - React integration
