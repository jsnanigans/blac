# Persistence Plugin

The persistence plugin automatically saves state to IndexedDB and restores it when instances are created. It is a [plugin](/plugins/overview) like any other — installed once at startup — but with one extra step: you tell it _which_ classes to persist by calling `.persist()`. Everything else (saving on change, hydrating on create, status tracking) happens through the registry lifecycle, driving the same [hydration API](/core/system-events#hydrationchanged) that any plugin can use.

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

```text
idle → hydrating → hydrated
                 → error (if load fails)
```

After hydration, on state changes:

```text
hydrated → saving → saved
                  → error (if save fails)
```

### Dirty state during hydration

If state changes before hydration completes (e.g., the user interacts with the component immediately), the persisted state is **discarded**. The user's changes take priority — stale data from disk should never clobber something the user just did.

You can detect this via the `changedWhileHydrating` field on the [`hydrationChanged` system event](/core/system-events#hydrationchanged). That event is the other side of this same mechanism: the persistence plugin reads the flag to decide whether to apply the loaded state, and you can observe the same flag to react in your own code.

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
import {
  createIndexedDbPersistPlugin,
  type IndexedDbPersistAdapter,
  type PersistedRecord,
} from '@blac/plugin-persist';

// A simple in-memory backend (handy for tests or non-IndexedDB environments).
const store = new Map<string, PersistedRecord>();

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

`waitForHydration()` is a public method on every state container, not something this plugin adds — it resolves once hydration settles (or immediately, if the bloc was never set up to hydrate). That makes it safe to call even on blocs you have not registered with `.persist()`. Use it in your Cubit to defer work until restored state is in place:

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

## Common mistakes

::: warning Watch for these
- **Persisting non-serializable state.** Functions, class instances, `Map`/`Set`, and DOM nodes do not round-trip through IndexedDB. Keep persisted state to plain JSON-compatible data, or use `stateToDb`/`dbToState` to project to and from a serializable shape.
- **Expecting persistence without `.persist()`.** Installing the plugin alone does nothing — a class is only saved and hydrated after you register it. Register before any instance of that class is acquired so hydration runs on first create.
- **Key collisions across instances.** The default key is `ClassName:instanceId`, which keeps multiple instances of the same class separate. If you set a static `key` string, every instance of that class shares one record and overwrites the others. For per-instance persistence, use a [dynamic key](#dynamic-keys) function instead.
:::

## See also

- [Plugin Overview](/plugins/overview) — the plugin catalog and the install API
- [System Events](/core/system-events#hydrationchanged) — the `hydrationChanged` event behind the dirty-state logic
- [Cubit](/core/cubit#public-properties) — `hydrationStatus`, `isHydrated`, and `waitForHydration()` on the container
- [Patterns](/guide/patterns) — hydration-aware loading recipes
- [Glossary](/guide/glossary) — definitions for hydration, plugin, and registry
