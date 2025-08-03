# useExternalBlocStore

A low-level React hook that provides an external store interface for use with React's `useSyncExternalStore`. This hook is primarily for advanced use cases and library integrations.

## Overview

`useExternalBlocStore` creates an external store interface compatible with React 18's `useSyncExternalStore` API. This is useful for:

- Building custom hooks on top of BlaC
- Integration with third-party state management tools
- Advanced performance optimizations
- Library authors extending BlaC functionality

## Signature

```typescript
function useExternalBlocStore<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
  options?: {
    id?: string;
    staticProps?: ConstructorParameters<B>[0];
    selector?: (
      currentState: BlocState<InstanceType<B>>,
      previousState: BlocState<InstanceType<B>>,
      instance: InstanceType<B>,
    ) => any[];
  },
): {
  externalStore: ExternalStore<BlocState<InstanceType<B>>>;
  instance: { current: InstanceType<B> | null };
  usedKeys: { current: Set<string> };
  usedClassPropKeys: { current: Set<string> };
  rid: string;
};
```

## Parameters

| Name                  | Type                        | Required | Description                                        |
| --------------------- | --------------------------- | -------- | -------------------------------------------------- |
| `blocConstructor`     | `B extends BlocConstructor` | Yes      | The bloc class constructor                         |
| `options.id`          | `string`                    | No       | Unique identifier for the instance                 |
| `options.staticProps` | Constructor params          | No       | Props to pass to the constructor                   |
| `options.selector`    | `Function`                  | No       | Custom dependency selector for render optimization |

## Returns

Returns an object containing:

- `externalStore`: An external store interface with `getSnapshot`, `subscribe`, and `getServerSnapshot` methods
- `instance`: A ref containing the bloc instance
- `usedKeys`: A ref tracking used state keys
- `usedClassPropKeys`: A ref tracking used class property keys
- `rid`: A unique render ID

## Basic Usage

### Using with useSyncExternalStore

```typescript
import { useSyncExternalStore } from 'react';
import { useExternalBlocStore } from '@blac/react';
import { CounterCubit } from './CounterCubit';

function Counter() {
  const { externalStore, instance } = useExternalBlocStore(CounterCubit);

  const state = useSyncExternalStore(
    externalStore.subscribe,
    externalStore.getSnapshot,
    externalStore.getServerSnapshot
  );

  return (
    <div>
      <p>Count: {state?.count ?? 0}</p>
      <button onClick={() => instance.current?.increment()}>
        Increment
      </button>
    </div>
  );
}
```

## Advanced Usage

### Building a Custom Hook

```typescript
import { useSyncExternalStore } from 'react';
import { useExternalBlocStore } from '@blac/react';
import { BlocConstructor, BlocBase } from '@blac/core';

// Custom hook using external store
function useSimpleBloc<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
  options?: Parameters<typeof useExternalBlocStore>[1]
) {
  const { externalStore, instance } = useExternalBlocStore(
    blocConstructor,
    options
  );

  const state = useSyncExternalStore(
    externalStore.subscribe,
    externalStore.getSnapshot,
    externalStore.getServerSnapshot
  );

  return [state, instance.current] as const;
}

// Usage
function TodoList() {
  const [state, cubit] = useSimpleBloc(TodoCubit, {
    selector: (state) => [state.items.length]
  });

  return <div>Todos: {state?.items.length ?? 0}</div>;
}
```

### With Selector for Optimization

```typescript
function useOptimizedBloc<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
  selector: (state: any) => any
) {
  const { externalStore, instance } = useExternalBlocStore(
    blocConstructor,
    {
      selector: (currentState, previousState, bloc) => {
        // Track dependencies for optimization
        return [selector(currentState)];
      }
    }
  );

  const state = useSyncExternalStore(
    externalStore.subscribe,
    () => {
      const snapshot = externalStore.getSnapshot();
      return snapshot ? selector(snapshot) : undefined;
    },
    () => {
      const snapshot = externalStore.getServerSnapshot?.();
      return snapshot ? selector(snapshot) : undefined;
    }
  );

  return [state, instance.current] as const;
}

// Usage - only re-renders when count changes
function CountDisplay() {
  const [count] = useOptimizedBloc(
    ComplexStateCubit,
    state => state.metrics.count
  );

  return <div>Count: {count}</div>;
}
```

### Integration with State Libraries

```typescript
// Integrate with Zustand, Valtio, or other state libraries
import { create } from 'zustand';
import { useExternalBlocStore } from '@blac/react';
import { useSyncExternalStore } from 'react';

interface StoreState {
  bloc: CounterCubit | null;
  initializeBloc: () => void;
}

const useStore = create<StoreState>((set) => ({
  bloc: null,
  initializeBloc: () => {
    const { instance } = useExternalBlocStore(CounterCubit);
    set({ bloc: instance.current });
  },
}));

// Component using the integrated store
function Counter() {
  const bloc = useStore(state => state.bloc);
  const initializeBloc = useStore(state => state.initializeBloc);

  useEffect(() => {
    if (!bloc) initializeBloc();
  }, [bloc, initializeBloc]);

  if (!bloc) return null;

  // Use the bloc with external store
  const { externalStore } = useExternalBlocStore(CounterCubit);
  const state = useSyncExternalStore(
    externalStore.subscribe,
    externalStore.getSnapshot
  );

  return <div>Count: {state?.count ?? 0}</div>;
}
```

## Best Practices

### 1. Use useBloc Instead

For most use cases, prefer the higher-level `useBloc` hook:

```typescript
// ✅ Preferred for most cases
const [state, cubit] = useBloc(CounterCubit);

// ⚠️ Only use external store for advanced cases
const { externalStore } = useExternalBlocStore(CounterCubit);
```

### 2. Proper Instance Management

The external store creates and manages bloc instances:

```typescript
function MyComponent() {
  // Instance is created and managed by the hook
  const { instance } = useExternalBlocStore(CounterCubit, {
    id: 'my-counter',
    staticProps: { initialCount: 0 }
  });

  // Access the instance via ref
  const handleClick = () => {
    instance.current?.increment();
  };

  return <button onClick={handleClick}>Increment</button>;
}
```

### 3. Server-Side Rendering

The external store provides SSR support:

```typescript
function SSRComponent() {
  const { externalStore } = useExternalBlocStore(DataCubit);

  const state = useSyncExternalStore(
    externalStore.subscribe,
    externalStore.getSnapshot,
    externalStore.getServerSnapshot // SSR support
  );

  return <div>{state?.data}</div>;
}
```

## Common Patterns

### Custom Hook Library

```typescript
// Build a library of custom hooks
export function createBlocHook<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
) {
  return function useCustomBloc(
    options?: Parameters<typeof useExternalBlocStore>[1],
  ) {
    const { externalStore, instance } = useExternalBlocStore(
      blocConstructor,
      options,
    );

    const state = useSyncExternalStore(
      externalStore.subscribe,
      externalStore.getSnapshot,
      externalStore.getServerSnapshot,
    );

    return [state, instance.current] as const;
  };
}

// Create specific hooks
export const useCounter = createBlocHook(CounterCubit);
export const useTodos = createBlocHook(TodoCubit);
export const useAuth = createBlocHook(AuthCubit);
```

### Performance Monitoring

```typescript
// Track render performance
function useMonitoredBloc<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
) {
  const renderCount = useRef(0);
  const { externalStore, instance, usedKeys } =
    useExternalBlocStore(blocConstructor);

  useEffect(() => {
    renderCount.current++;
    console.log(`Render #${renderCount.current}`, {
      blocName: blocConstructor.name,
      usedKeys: Array.from(usedKeys.current),
    });
  });

  const state = useSyncExternalStore(
    externalStore.subscribe,
    externalStore.getSnapshot,
  );

  return [state, instance.current] as const;
}
```

## Comparison with useBloc

| Feature              | useBloc           | useExternalBlocStore  |
| -------------------- | ----------------- | --------------------- |
| Level of abstraction | High-level        | Low-level             |
| Use with             | Direct usage      | useSyncExternalStore  |
| Return value         | [state, instance] | External store object |
| Lifecycle management | Automatic         | Automatic             |
| Props support        | Yes               | Yes                   |
| Best for             | Most use cases    | Library authors       |

## Troubleshooting

### TypeScript Errors

Ensure proper type inference:

```typescript
// ❌ Type errors with generic constraints
const { externalStore } = useExternalBlocStore<CounterCubit>(CounterCubit);

// ✅ Let TypeScript infer types
const { externalStore } = useExternalBlocStore(CounterCubit);
```

### Missing State Updates

Check subscription setup:

```typescript
// ❌ Forgetting to use the subscribe method
const state = externalStore.getSnapshot();

// ✅ Proper subscription with useSyncExternalStore
const state = useSyncExternalStore(
  externalStore.subscribe,
  externalStore.getSnapshot,
  externalStore.getServerSnapshot,
);
```

## When to Use This Hook

Use `useExternalBlocStore` when:

1. Building custom React hooks on top of BlaC
2. Integrating with React 18's concurrent features
3. Creating a state management library wrapper
4. Need fine-grained control over subscriptions
5. Implementing server-side rendering with hydration

For standard application development, use the `useBloc` hook instead.

## API Reference

### ExternalStore Interface

```typescript
interface ExternalStore<T> {
  getSnapshot: () => T | undefined;
  subscribe: (listener: () => void) => () => void;
  getServerSnapshot?: () => T | undefined;
}
```

## Next Steps

- [useBloc](/api/react/hooks#usebloc) - High-level hook for most use cases
- [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore) - React documentation
- [Instance Management](/concepts/instance-management) - Learn about bloc lifecycle
