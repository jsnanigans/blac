---
title: Optimistic Update
description: Apply a mutation to local Cubit state immediately, snapshot for rollback, fire the request, and restore the previous state on failure.
---

**Use when:** you want the UI to reflect a mutation immediately, before the server
confirms it — then reconcile or roll back when the response arrives.
**Don't use when:** the action is destructive and hard to undo, or the server
response carries data that can't be predicted client-side.

## Pattern

Apply the change to local state immediately, record enough context to roll back,
fire the request, and on failure restore the previous state (or re-fetch the
authoritative list).

```ts twoslash
import { Cubit } from '@blac/core';

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

interface TodoState {
  items: Todo[];
  error: string | null;
}

declare const api: {
  markDone(id: string): Promise<void>;
};
// ---cut---
class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({ items: [], error: null });
  }

  toggleDone = async (id: string) => {
    // 1. Snapshot for rollback.
    const previous = this.state.items;

    // 2. Apply optimistically — update only the matching item.
    this.patch({
      items: previous.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      error: null,
    });

    try {
      await api.markDone(id);
      // Server confirmed — nothing more to do.
    } catch (e) {
      // 3. Roll back to the snapshot on failure.
      //    ⚠️ Do NOT ship the full state to an analytics sink before
      //    confirming — a rolled-back item would send false telemetry.
      this.patch({ items: previous, error: String(e) });
    }
  };
}
```

```tsx
function TodoItem({
  id,
  text,
  done,
}: {
  id: string;
  text: string;
  done: boolean;
}) {
  const [, todo] = useBloc(TodoCubit, { select: () => [] });

  return (
    <li style={{ opacity: done ? 0.5 : 1 }}>
      <input
        type="checkbox"
        checked={done}
        onChange={() => todo.toggleDone(id)}
      />
      {text}
    </li>
  );
}
```

:::tip[Snapshot granularity]
Snapshot only the slice you're mutating (`this.state.items`), not the whole
state — this avoids accidentally rolling back unrelated fields that changed
between the optimistic apply and the server response.
:::

:::caution[Race condition]
If `toggleDone` is called twice rapidly, both calls capture the _same_
`previous`. Use the [request-id guard](/guide/async#the-request-id-guard) or
disable the trigger while a request is in-flight to prevent the second rollback
from clobbering the first response.
:::

## See also

- [Async](/guide/async) — request-id guard for concurrent requests
- [Cubit](/core/cubit) — `patch` deep-merges; `emit` replaces wholesale
