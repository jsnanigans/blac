# React Overview

BlaC provides a single hook, `useBloc`, for React integration. It supports automatic dependency tracking, manual dependency selection, and untracked usage.

## Hook Summary

| Hook | Returns | Use when |
| --- | --- | --- |
| `useBloc` | `[state, bloc, ref]` | You need state and actions with optimized re-renders |

## Quick Example

```tsx
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.emit({ count: this.state.count + 1 });
}

function Counter() {
  const [state, counter] = useBloc(CounterCubit);
  return <button onClick={counter.increment}>{state.count}</button>;
}
```

## Tracking Modes

- Auto-tracking (default) uses proxies to track accessed state and getters.
- Manual dependencies let you define a dependency selector.
- No tracking (`autoTrack: false`) re-renders on any state change.
