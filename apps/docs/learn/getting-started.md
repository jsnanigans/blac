# Getting Started

Welcome to Blac! This guide will walk you through setting up Blac and creating your first reactive state container.

Blac is a collection of packages designed for robust state management:

- `@blac/core`: The core engine providing `Cubit`, `Bloc`, `BlocBase`, and the underlying instance management logic.
- `@blac/react`: The React integration, offering hooks like `useBloc` to connect your components to Blac state containers.

## Installation

To add Blac to your React project, install the `@blac/react` package. This will automatically include `@blac/core`.

```bash
# Using pnpm (recommended for this monorepo)
pnpm add @blac/react

# Or using npm
npm install @blac/react

# Or using yarn
yarn add @blac/react
```

## Your First Cubit

Let's start with a `Cubit`, which is the simpler form of a state container in Blac. It exposes methods that directly `emit` new states.

Here's a simple counter example:

```tsx
// 1. Define your Cubit (e.g., in src/cubits/CounterCubit.ts)
import { Cubit } from '@blac/core';

interface CounterState {
  count: number;
}

export class CounterCubit extends Cubit<CounterState> {
  constructor() {
    // Initialize the state with a count of 0
    super({ count: 0 });
  }

  // Define methods to update the state using `emit`
  // Remember: methods must be arrow functions!
  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
  reset = () => this.emit({ count: 0 });
}

// 2. Use the Cubit in your React component (e.g., in src/components/CounterDisplay.tsx)
import { useBloc } from '@blac/react';
import { CounterCubit } from '../cubits/CounterCubit'; // Adjust path as needed

function CounterDisplay() {
  // Connect component to the Cubit.
  // useBloc returns a tuple: [currentState, cubitInstance]
  const [state, counterCubit] = useBloc(CounterCubit);

  return (
    <>
      <h1>Count: {state.count}</h1>
      <button onClick={counterCubit.increment}>Increment</button>
      <button onClick={counterCubit.decrement}>Decrement</button>
      <button onClick={counterCubit.reset}>Reset</button>
    </>
  );
}

export default CounterDisplay;
```

That's it! You've created a simple counter using a Blac `Cubit`.

## Configuration (Optional)

BlaC provides global configuration options to customize its behavior. The most common configuration is controlling proxy dependency tracking:

```tsx
import { Blac } from '@blac/core';

// Configure BlaC before your app starts
Blac.setConfig({
  // Control automatic re-render optimization (default: true)
  proxyDependencyTracking: true,
});
```

By default, BlaC uses proxy-based dependency tracking to automatically optimize re-renders. Components only re-render when the specific state properties they access change. You can disable this globally if needed:

```tsx
// Disable automatic optimization - components re-render on any state change
Blac.setConfig({ proxyDependencyTracking: false });
```

For more details, see the [Configuration](/api/configuration) documentation.

## Common Issues

### "Cannot access 'Blac' before initialization" Error

If you encounter this error, it's likely due to circular dependencies in your imports. This has been resolved in v2.0.0-rc-3+ with lazy initialization. Make sure you're using the latest version:

```bash
pnpm update @blac/core @blac/react
```

If the issue persists, avoid immediately accessing static Blac properties at module level. Instead, access them inside functions or component lifecycle:

```tsx
// ❌ Avoid this at module level
Blac.enableLog = true;

// ✅ Do this instead
useEffect(() => {
  Blac.enableLog = true;
}, []);
```

### TypeScript Type Inference Issues

If you're experiencing TypeScript errors with `useBloc` not properly inferring your Cubit/Bloc types, ensure you're using v2.0.0-rc-3+ which includes improved type constraints:

```tsx
// This should now work correctly with proper type inference
const [state, cubit] = useBloc(CounterCubit, {
  id: 'unique-id',
  props: { initialCount: 0 },
});
// state.count is properly typed as number
// cubit.increment is properly typed as () => void
```

### How It Works

1.  **`CounterCubit`**: Extends `Cubit` from `@blac/core`.
    - Defines its state structure (`CounterState`).
    - Sets an initial state in its constructor.
    - Provides methods (`increment`, `decrement`, `reset`) that call `this.emit()` with a new state object. `emit` replaces the entire state.
2.  **`CounterDisplay` Component**: Uses the `useBloc` hook from `@blac/react`.
    - `useBloc(CounterCubit)` gets (or creates) an instance of `CounterCubit`.
    - It returns an array `[state, counterCubit]`. The `state` object is a reactive proxy that tracks property access.
    - The component re-renders automatically and efficiently when `state.count` changes due to a `counterCubit` method call.

### Important: Arrow Functions for Methods

⚠️ **Crucial**: All methods in your `Cubit` (or `Bloc`) classes that interact with `this.state` or `this.emit` (or `this.setState`) **must** use arrow function syntax. This ensures `this` is correctly bound to the instance.

```tsx
// ✅ Correct (arrow function)
increment = () => {
  this.emit({ count: this.state.count + 1 });
};

// ❌ Incorrect (traditional method syntax - will lose 'this' context)
// increment() {
//   this.emit({ count: this.state.count + 1 });
// }
```

## Async Operations with Cubits

Cubits can easily handle asynchronous operations. Let's extend our counter to fetch a random count, showcasing loading and error states.

`Cubit` provides a `patch()` method for updating only specific parts of an object state.

::: code-group

```tsx [CounterCubit.ts]
import { Cubit } from '@blac/core';

interface AsyncCounterState {
  count: number;
  isLoading: boolean;
  error: string | null;
}

export class AsyncCounterCubit extends Cubit<AsyncCounterState> {
  constructor() {
    super({
      count: 0,
      isLoading: false,
      error: null,
    });
  }

  increment = () => {
    // `patch` merges the provided object with the current state
    this.patch({ count: this.state.count + 1 });
  };

  fetchRandomCount = async () => {
    this.patch({ isLoading: true, error: null });
    try {
      // Simulate API call (replace with your actual fetch logic)
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate delay
      const randomNumber = Math.floor(Math.random() * 100);
      // const response = await fetch('https://api.example.com/random-number');
      // if (!response.ok) throw new Error('Network response was not ok');
      // const data = await response.json(); // Assuming API returns { number: ... }

      this.patch({
        count: randomNumber, // data.number
        isLoading: false,
      });
    } catch (error) {
      this.patch({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch random count',
      });
    }
  };
}
```

```tsx [CounterDisplay.tsx]
import { useBloc } from '@blac/react';
import { AsyncCounterCubit } from '../cubits/AsyncCounterCubit'; // Adjust path

function AsyncCounterDisplay() {
  const [state, cubit] = useBloc(AsyncCounterCubit);

  return (
    <div>
      <h2>Count: {state.count}</h2>
      {state.isLoading && <p>Loading...</p>}
      {state.error && <p style={{ color: 'red' }}>Error: {state.error}</p>}
      <button onClick={cubit.increment} disabled={state.isLoading}>
        Increment
      </button>
      <button onClick={cubit.fetchRandomCount} disabled={state.isLoading}>
        {state.isLoading ? 'Fetching...' : 'Fetch Random'}
      </button>
    </div>
  );
}

export default AsyncCounterDisplay;
```

:::

Notice in the async example:

- The state (`AsyncCounterState`) now includes `isLoading` and `error` fields.
- `this.patch()` is used to update parts of the state without needing to spread the rest (`{ ...this.state, isLoading: true }`).
- Error handling is included within the `fetchRandomCount` method.
- The UI (`AsyncCounterDisplay`) conditionally renders loading/error messages and disables buttons during loading.

This covers the basics of getting started with Blac using `Cubit`. Explore further sections to learn about the more advanced `Bloc` class (which uses an event-handler pattern: `this.on(EventType, handler)` and `this.add(new EventType())`), advanced patterns, and API details.
