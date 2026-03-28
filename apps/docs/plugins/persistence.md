# Persistence Plugin

The persistence plugin automatically saves state to IndexedDB and restores it when instances are created.

## Installation

```bash
pnpm add @blac/plugin-persist
```

## Quick setup

```ts
import { createIndexedDbPersistPlugin } from '@blac/plugin-persist';
import { getPluginManager } from '@blac/core';

const persist = createIndexedDbPersistPlugin();
persist.persist(UserSettingsCubit);
getPluginManager().install(persist);
```

That's it. `UserSettingsCubit` state is now saved to IndexedDB on every change and restored when the instance is created.

## Plugin options

```ts
createIndexedDbPersistPlugin({
  databaseName: 'my-app', // default: 'blac-persist'
  storeName: 'app-state', // default: 'blac-state'
  pluginName: 'my-persist', // default: 'indexeddb-persist'
  adapter: customAdapter, // custom storage adapter
});
```

## Registering containers

Call `.persist()` for each class you want to persist. The method is chainable.

```ts
persist
  .persist(UserSettingsCubit)
  .persist(CartCubit, { debounceMs: 500 })
  .persist(ThemeCubit);
```

### Registration options

```ts
persist.persist(CartCubit, {
  key: 'cart', // custom storage key (default: ClassName:instanceId)
  debounceMs: 500, // debounce saves (default: 0)
  stateToDb: (state) => state.items, // transform before saving
  dbToState: (payload) => ({ items: payload }), // transform on load
  onHydrated: (state, ctx) => {
    // called after restore
    console.log('Cart restored with', state.items.length, 'items');
  },
  onError: (error, ctx) => {
    // called on save or load error
    console.error('Persist error:', error);
  },
});
```

| Option       | Type                        | Default                | Description                            |
| ------------ | --------------------------- | ---------------------- | -------------------------------------- |
| `key`        | `string \| (ctx) => string` | `ClassName:instanceId` | Storage key                            |
| `debounceMs` | `number`                    | `0`                    | Debounce save operations               |
| `stateToDb`  | `(state, ctx) => TPayload`  | Identity               | Transform state before saving          |
| `dbToState`  | `(payload, ctx) => S`       | Identity               | Transform persisted data back to state |
| `onHydrated` | `(state, ctx) => void`      | —                      | Called after successful hydration      |
| `onError`    | `(error, ctx) => void`      | —                      | Called on error                        |

### Dynamic keys

Use a function for per-instance storage keys:

```ts
persist.persist(EditorCubit, {
  key: (ctx) => `editor:${ctx.instanceId}`,
});
```

## Hydration lifecycle

When a persisted instance is created:

```
idle → hydrating → hydrated
                 → error (if load fails)
```

After hydration, on state changes:

```
hydrated → saving → saved
                  → error (if save fails)
```

### Dirty state during hydration

If state changes before hydration completes (e.g., the user interacts with the component immediately), the persisted state is **discarded**. The user's changes take priority.

You can detect this via the `changedWhileHydrating` field on the `hydrationChanged` system event.

## Status monitoring

### Per-instance status

```ts
const status = persist.getStatus(myInstance);
// { key, className, instanceId, phase, hydratedFromStorage, savedAt?, error? }
```

Phases: `'idle'` | `'hydrating'` | `'hydrated'` | `'saving'` | `'saved'` | `'error'`

### Subscribe to status changes

```ts
const unsub = persist.subscribe((event) => {
  // event: { instance, status }
  console.log(event.status.phase);
});
```

## Clearing stored data

```ts
await persist.clearRecord('cart'); // clear one record
await persist.clearAll(); // clear everything
```

## Custom storage adapter

Implement the `IndexedDbPersistAdapter` interface to use a different storage backend:

```ts
import type {
  IndexedDbPersistAdapter,
  PersistedRecord,
} from '@blac/plugin-persist';

const memoryAdapter: IndexedDbPersistAdapter = {
  isAvailable: () => true,
  get: async (key) => store.get(key) ?? null,
  put: async (record) => {
    store.set(record.id, record);
  },
  delete: async (key) => {
    store.delete(key);
  },
  clear: async () => {
    store.clear();
  },
};

const persist = createIndexedDbPersistPlugin({ adapter: memoryAdapter });
```

This is useful for testing or for environments where IndexedDB is not available.

## Waiting for hydration

In your Cubit, you can await hydration before performing actions:

```ts
class AuthCubit extends Cubit<AuthState> {
  constructor() {
    super({ user: null, token: null });
  }

  async initialize() {
    await this.waitForHydration();
    if (this.state.token) {
      await this.refreshSession();
    }
  }
}
```

The plugin automatically checks IndexedDB availability on install and disables itself with a warning if unavailable.
