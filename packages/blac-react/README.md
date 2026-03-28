# @blac/react

React bindings for BlaC — `useBloc` hook with proxy-based automatic re-render optimization.

**[Documentation](https://blac-docs.pages.dev/react/getting-started)** · **[npm](https://www.npmjs.com/package/@blac/react)**

## Installation

```bash
pnpm add @blac/react @blac/core
```

Requires React 18+ (`useSyncExternalStore`).

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

```tsx
const [state, bloc, ref] = useBloc(MyBloc, options?);
```

**Returns:** `[state, bloc, ref]`

- `state` — current state snapshot (proxied for auto-tracking)
- `bloc` — bloc instance for calling methods
- `ref` — internal component ref (advanced usage)

### Tracking Modes

**Auto-tracking (default):** Only re-renders when accessed properties change.

```tsx
const [state] = useBloc(UserBloc);
return <h1>{state.name}</h1>; // only re-renders when name changes
```

**Manual dependencies:** Explicit dependency array (disables auto-tracking).

```tsx
const [state] = useBloc(CounterCubit, {
  dependencies: (state) => [state.count],
});
```

**No tracking:** Re-renders on every state change.

```tsx
const [state] = useBloc(MyBloc, { autoTrack: false });
```

### Options

| Option         | Type                         | Description                                          |
| -------------- | ---------------------------- | ---------------------------------------------------- |
| `autoTrack`    | `boolean`                    | Enable proxy-based auto-tracking (default: `true`)   |
| `dependencies` | `(state, bloc) => unknown[]` | Manual dependency selector                           |
| `instanceId`   | `string \| number`           | Use a named instance instead of the shared singleton |
| `onMount`      | `(bloc) => void`             | Called when component mounts                         |
| `onUnmount`    | `(bloc) => void`             | Called when component unmounts                       |

### Instance Sharing

By default, all components using `useBloc(MyBloc)` share the same instance. Use `instanceId` for separate instances:

```tsx
useBloc(EditorCubit, { instanceId: 'editor-1' }); // instance A
useBloc(EditorCubit, { instanceId: 'editor-2' }); // instance B
```

## Configuration

```tsx
import { configureBlacReact } from '@blac/react';

configureBlacReact({ autoTrack: true });
```

## Testing

```tsx
import { renderWithBloc } from '@blac/react/testing';
```

See the [testing docs](https://blac-docs.pages.dev/testing/react) for details.

## License

MIT
