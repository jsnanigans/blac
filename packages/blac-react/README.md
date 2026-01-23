# @blac/react

React integration for the BlaC state management library with automatic re-render optimization.

## Installation

```bash
npm install @blac/react @blac/core
# or
pnpm add @blac/react @blac/core
# or
yarn add @blac/react @blac/core
```

## Quick Start

```tsx
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
}

function Counter() {
  const [state, counter] = useBloc(CounterCubit);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={counter.increment}>+</button>
      <button onClick={counter.decrement}>-</button>
    </div>
  );
}
```

## Hooks

### useBloc

Connects a component to a state container with automatic re-renders on state changes.

```tsx
const [state, bloc, ref] = useBloc(MyBloc);
```

**Returns:** `[state, bloc, ref]`

- `state` - Current state (reactive)
- `bloc` - The bloc instance for calling methods
- `ref` - Component reference for isolated instances

#### Tracking Modes

**Auto-tracking (default):** Automatically detects which properties you access and only re-renders when those change.

```tsx
function UserProfile() {
  const [state, user] = useBloc(UserBloc);

  // Only re-renders when state.name changes
  // (state.email changes won't cause re-render)
  return <h1>{state.name}</h1>;
}
```

**Manual dependencies:** Explicit dependency array like `useEffect`.

```tsx
function Counter() {
  const [state] = useBloc(CounterBloc, {
    dependencies: (state) => [state.count],
  });

  return <p>{state.count}</p>;
}
```

**No tracking:** Returns full state, re-renders on any change.

```tsx
function FullState() {
  const [state] = useBloc(MyBloc, { autoTrack: false });

  return <pre>{JSON.stringify(state)}</pre>;
}
```

#### Options

```tsx
useBloc(MyBloc, {
  // Tracking mode
  autoTrack: true, // Enable/disable auto-tracking (default: true)
  dependencies: (state) => [state.prop], // Manual dependencies

  // Instance management
  instanceId: 'unique-id', // Custom instance identifier

  // Lifecycle callbacks
  onMount: (bloc) => console.log('Mounted', bloc),
  onUnmount: (bloc) => console.log('Unmounted', bloc),
});
```

### useBlocActions

Connects to a state container without subscribing to state changes. Use for calling actions without re-renders, or for stateless containers.

```tsx
const bloc = useBlocActions(MyBloc);
```

**Use cases:**

```tsx
// Stateless services (analytics, navigation, etc.)
function TrackButton() {
  const analytics = useBlocActions(AnalyticsService);

  return (
    <button onClick={() => analytics.trackClick('button')}>Click me</button>
  );
}

// Actions-only (no state subscription)
function IncrementButton() {
  const counter = useBlocActions(CounterCubit);

  return <button onClick={counter.increment}>+</button>;
}
```

#### Options

```tsx
useBlocActions(MyBloc, {
  instanceId: 'unique-id', // Custom instance identifier
  onMount: (bloc) => bloc.initialize(),
  onUnmount: (bloc) => bloc.cleanup(),
});
```

## Instance Management

### Shared Instances (Default)

By default, all components using the same bloc class share one instance:

```tsx
function ComponentA() {
  const [state] = useBloc(CounterCubit);
  // Uses shared instance
}

function ComponentB() {
  const [state] = useBloc(CounterCubit);
  // Uses same shared instance
}
```

### Isolated Instances

For component-scoped state, use the `@blac({ isolated: true })` decorator:

```tsx
import { Cubit, blac } from '@blac/core';

@blac({ isolated: true })
class FormCubit extends Cubit<FormState> {
  // ...
}

function FormA() {
  const [state] = useBloc(FormCubit);
  // Gets its own instance
}

function FormB() {
  const [state] = useBloc(FormCubit);
  // Gets a different instance
}
```

### Named Instances

Share instances across specific components with `instanceId`:

```tsx
function EditorA() {
  const [state] = useBloc(EditorCubit, { instanceId: 'editor-1' });
}

function EditorB() {
  const [state] = useBloc(EditorCubit, { instanceId: 'editor-1' });
  // Same instance as EditorA
}

function EditorC() {
  const [state] = useBloc(EditorCubit, { instanceId: 'editor-2' });
  // Different instance
}
```

## Configuration

Configure global behavior:

```tsx
import { configureBlacReact } from '@blac/react';

configureBlacReact({
  autoTrack: true, // Enable auto-tracking by default (default: true)
});
```

## API Reference

### useBloc

```tsx
function useBloc<T extends StateContainerConstructor>(
  BlocClass: T,
  options?: UseBlocOptions<T>,
): [ExtractState<T>, InstanceType<T>, ComponentRef];
```

### useBlocActions

```tsx
function useBlocActions<T extends StateContainerConstructor>(
  BlocClass: T,
  options?: UseBlocActionsOptions<InstanceType<T>>,
): InstanceType<T>;
```

### UseBlocOptions

| Option         | Type               | Description                          |
| -------------- | ------------------ | ------------------------------------ |
| `autoTrack`    | `boolean`          | Enable auto-tracking (default: true) |
| `dependencies` | `(state) => any[]` | Manual dependency selector           |
| `instanceId`   | `string \| number` | Custom instance identifier           |
| `onMount`      | `(bloc) => void`   | Called when component mounts         |
| `onUnmount`    | `(bloc) => void`   | Called when component unmounts       |

### UseBlocActionsOptions

| Option       | Type               | Description                      |
| ------------ | ------------------ | -------------------------------- |
| `instanceId` | `string \| number` | Custom instance identifier       |
| `onMount`    | `(bloc) => void`   | Called when component mounts     |
| `onUnmount`  | `(bloc) => void`   | Called when component unmounts   |

## Compatibility

- React 18.0+ or React 19.0+
- Works with React Compiler
- Supports concurrent rendering via `useSyncExternalStore`

## License

MIT
