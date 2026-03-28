# @blac/plugin-persist

IndexedDB persistence plugin for BlaC. Automatically hydrates state from storage on instance creation and persists state changes with debouncing.

**[Documentation](https://blac-docs.pages.dev/plugins/persistence)** · **[npm](https://www.npmjs.com/package/@blac/plugin-persist)**

## Installation

```bash
pnpm add @blac/plugin-persist
```

## Quick Start

```ts
import { getPluginManager } from '@blac/core';
import { createIndexedDbPersistPlugin } from '@blac/plugin-persist';

const persist = createIndexedDbPersistPlugin();
persist.persist(UserSettingsCubit);
getPluginManager().install(persist);
```

That's it — `UserSettingsCubit` state will be saved to IndexedDB and restored automatically.

## Configuration

### Plugin Options

```ts
createIndexedDbPersistPlugin({
  databaseName: 'blac-persist', // IndexedDB database name
  storeName: 'state', // Object store name
  adapter: customAdapter, // Custom storage adapter (optional)
});
```

### Per-Cubit Options

```ts
persist.persist(UserSettingsCubit, {
  key: 'user-settings', // custom storage key (default: class name)
  debounceMs: 500, // debounce saves (default: 0)
  stateToDb: (state) => state.preferences, // transform before saving
  dbToState: (persisted) => ({
    // transform when hydrating
    ...defaultState,
    preferences: persisted,
  }),
  onHydrated: (state, ctx) => {
    // callback after hydration
    console.log('Restored:', state);
  },
  onError: (error, ctx) => {
    // error handler
    console.error('Persist error:', error);
  },
});
```

### Dynamic Keys

```ts
persist.persist(UserSettingsCubit, {
  key: (ctx) => `settings-${ctx.instanceId}`,
});
```

## Status Tracking

```ts
const status = persist.getStatus(instance);
// { phase: 'hydrated', hydratedFromStorage: true, savedAt: 1234567890, ... }

const unsub = persist.subscribe((event) => {
  console.log(event.status.phase); // 'idle' | 'hydrating' | 'hydrated' | 'saving' | 'saved' | 'error'
});
```

## Clearing Data

```ts
await persist.clearRecord('user-settings');
await persist.clearAll();
```

## Custom Storage Adapter

Implement `IndexedDbPersistAdapter` to use a different storage backend:

```ts
interface IndexedDbPersistAdapter {
  isAvailable(): boolean;
  get<T>(key: string): Promise<PersistedRecord<T> | null>;
  put<T>(record: PersistedRecord<T>): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

## License

MIT
