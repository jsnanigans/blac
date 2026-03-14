# @blac/react

React integration for BlaC with automatic re-render optimization.

**[Full documentation](https://jsnanigans.github.io/blac/react/getting-started)**

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

## useBloc

Connects a component to a state container with automatic re-renders on state changes.

```tsx
const [state, bloc, ref] = useBloc(MyBloc);
```

**Returns:** `[state, bloc, ref]`

- `state` - Current state snapshot
- `bloc` - Bloc instance (proxied for tracking; call methods on it)
- `ref` - Internal component ref (advanced usage)

### Tracking Modes

**Auto-tracking (default):** Tracks accessed properties and getters.

```tsx
function UserProfile() {
  const [state] = useBloc(UserBloc);
  return <h1>{state.name}</h1>;
}
```

**Manual dependencies:** Provide a dependency selector (disables auto-tracking).

```tsx
function Counter() {
  const [state] = useBloc(CounterCubit, {
    dependencies: (state) => [state.count],
  });

  return <p>{state.count}</p>;
}
```

**No tracking:** Re-render on any state change.

```tsx
function FullState() {
  const [state] = useBloc(MyBloc, { autoTrack: false });
  return <pre>{JSON.stringify(state)}</pre>;
}
```

### Options

```tsx
useBloc(MyBloc, {
  autoTrack: true,
  dependencies: (state, bloc) => [state.count, bloc],
  instanceId: 'editor-1',
  onMount: (bloc) => console.log('Mounted', bloc),
  onUnmount: (bloc) => console.log('Unmounted', bloc),
});
```

| Option         | Type                         | Description                          |
| -------------- | ---------------------------- | ------------------------------------ |
| `autoTrack`    | `boolean`                    | Enable auto-tracking (default: true) |
| `dependencies` | `(state, bloc) => unknown[]` | Manual dependency selector           |
| `instanceId`   | `string \| number`           | Custom instance identifier           |
| `onMount`      | `(bloc) => void`             | Called when component mounts         |
| `onUnmount`    | `(bloc) => void`             | Called when component unmounts       |

## Instance Management

### Shared Instances (Default)

```tsx
function A() {
  useBloc(CounterCubit); // shared instance
}

function B() {
  useBloc(CounterCubit); // same shared instance
}
```

### Isolated Instances

```tsx
import { Cubit, blac } from '@blac/core';

@blac({ isolated: true })
class FormCubit extends Cubit<FormState> {}

function FormA() {
  useBloc(FormCubit); // unique instance per component
}
```

### Named Instances

```tsx
useBloc(EditorCubit, { instanceId: 'editor-1' });
useBloc(EditorCubit, { instanceId: 'editor-1' }); // same instance
useBloc(EditorCubit, { instanceId: 'editor-2' }); // different instance
```

## Configuration

Configure global defaults:

```tsx
import { configureBlacReact } from '@blac/react';

configureBlacReact({
  autoTrack: true,
});
```

## Compatibility

- React 18+ (uses `useSyncExternalStore`)

## License

MIT
