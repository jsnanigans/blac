---
title: 'Proposal: Web Storage Persistence'
description: Adoption preview of createWebStoragePersistPlugin(), a synchronous-hydration plugin that replaces hand-written localStorage persistence.
---

:::note[Built — adoption preview]
`createWebStoragePersistPlugin` is implemented in `@blac/plugin-persist` and documented in [Persistence](/plugins/persistence/). This page shows what adopting it replaces. The "before" code is a typical shape, not a copy of a real app.
:::

## Problem

The persistence plugin was IndexedDB-only, and IndexedDB is asynchronous. Containers that must be correct on the first paint (the signed-in user, a theme, a locale) cannot wait for it: the UI flashes the logged-out or default state first. Apps work around it with a hand-written helper:

- Read `localStorage` synchronously in the constructor.
- Subscribe and `JSON.stringify` the state on every change.
- Handle quota errors, versioning and tab close by hand, per container.

## API

```ts
import { createWebStoragePersistPlugin } from '@blac/plugin-persist';

const persist = createWebStoragePersistPlugin({
  storage: sessionStorage, // default: localStorage
  prefix: 'my-app:', // default: 'blac-persist:'
});
persist.persist(UserCubit, { debounceMs: 250 });
getPluginManager().install(persist);
```

- Hydration is synchronous: a stored value is applied before the first render.
- Writes are debounced per `debounceMs`, and pending writes flush on `pagehide`. `persist.flush()` does the same on demand.
- Storage errors, such as a full quota, reach the registration's `onError`.
- The adapter interface accepts synchronous or asynchronous results, so a custom backend can also hydrate synchronously.

## Before and after

```ts title="Before — a helper per container"
export function persistCubitState<S>(cubit: Cubit<S>, key: string) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) cubit.emit(JSON.parse(raw));
  } catch {}
  cubit.subscribe((state) => {
    try {
      localStorage.setItem(key, JSON.stringify(state)); // every change, no debounce
    } catch {}
  });
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super(initialState);
    persistCubitState(this, 'user'); // no flush on tab close, no versioning
  }
}
```

```ts title="After — one plugin, declared once at startup"
const persist = createWebStoragePersistPlugin({ prefix: 'app:' });
persist.persist(UserCubit, { debounceMs: 250 });
getPluginManager().install(persist);

class UserCubit extends Cubit<UserState> {
  constructor() {
    super(initialState);
  }
}
```

What goes away: the helper, the per-container wiring in constructors, and the empty `catch` blocks.

## Differences to review

- **Hydration is a lifecycle.** A write that lands before hydration finishes wins over the stored snapshot, so a container that writes in its constructor can hide persisted state. Gate early writes on `$blac.hydration.isHydrated`.
- **Storage keys change.** The plugin uses its own `prefix`. Migrating an app means reading the old key once, or accepting one reset.
