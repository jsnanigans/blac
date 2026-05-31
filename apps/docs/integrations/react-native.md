# React Native

BlaC's core and React bindings are platform-agnostic JavaScript — `@blac/core` and `@blac/react` install and run in React Native without modification. The one feature that needs a platform adapter is **persistence**: the built-in persist plugin uses IndexedDB, which does not exist in React Native. This page covers both topics.

## Installation

```bash
# npm / yarn / bun
npm install @blac/core @blac/react
```

`useBloc`, `watch`, `Cubit`, and every other core API work the same in React Native as in the browser. No polyfills are needed for the core reactive machinery.

## Basic usage

Nothing React Native-specific is required:

```tsx
import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';

interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.update((s) => ({ count: s.count + 1 }));
}

export function Counter() {
  const [state, cubit] = useBloc(CounterCubit);
  return (
    <View>
      <Text>{state.count}</Text>
      <Button title="+" onPress={cubit.increment} />
    </View>
  );
}
```

## Persistence: writing an AsyncStorage adapter

The official persist plugin ships one built-in adapter: `NativeIndexedDbAdapter`, which calls `window.indexedDB`. That API does not exist in React Native. The plugin's adapter interface is designed to be replaced — supply a custom `adapter` option that wraps React Native's `AsyncStorage` instead.

### The adapter interface

```ts
// IndexedDbPersistAdapter — four async methods + one sync availability check:
//
// isAvailable(): boolean
// get<T>(key: string): Promise<PersistedRecord<T> | null>
// put<T>(record: PersistedRecord<T>): Promise<void>
// delete(key: string): Promise<void>
// clear(): Promise<void>
```

### AsyncStorage adapter implementation

Install `@react-native-async-storage/async-storage` if you have not already, then implement the adapter:

```ts
import type {
  IndexedDbPersistAdapter,
  PersistedRecord,
} from '@blac/plugin-persist';

// AsyncStorage type stub — the real type comes from
// @react-native-async-storage/async-storage
interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: string[]): Promise<void>;
}

/**
 * AsyncStorage adapter for @blac/plugin-persist.
 *
 * Pass this to createIndexedDbPersistPlugin({ adapter: asyncStorageAdapter })
 * to use React Native AsyncStorage instead of IndexedDB.
 */
export function createAsyncStorageAdapter(
  storage: AsyncStorageLike,
  namespace = 'blac:',
): IndexedDbPersistAdapter {
  const prefixed = (key: string) => `${namespace}${key}`;

  return {
    isAvailable() {
      // AsyncStorage is always available in React Native.
      return true;
    },

    async get<T>(key: string): Promise<PersistedRecord<T> | null> {
      const raw = await storage.getItem(prefixed(key));
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as PersistedRecord<T>;
      } catch {
        return null;
      }
    },

    async put<T>(record: PersistedRecord<T>): Promise<void> {
      await storage.setItem(prefixed(record.id), JSON.stringify(record));
    },

    async delete(key: string): Promise<void> {
      await storage.removeItem(prefixed(key));
    },

    async clear(): Promise<void> {
      const all = await storage.getAllKeys();
      const ours = (all as string[]).filter((k) => k.startsWith(namespace));
      if (ours.length > 0) {
        await storage.multiRemove(ours);
      }
    },
  };
}
```

### Wiring it up

Create the plugin with the custom adapter once at app startup:

```ts
import { createIndexedDbPersistPlugin } from '@blac/plugin-persist';
import { getPluginManager } from '@blac/core';
// import AsyncStorage from '@react-native-async-storage/async-storage';

const persist = createIndexedDbPersistPlugin({
  adapter: createAsyncStorageAdapter(AsyncStorage),
});

persist.persist(UserSettingsCubit);
getPluginManager().install(persist);
```

From this point on `UserSettingsCubit` state is saved through AsyncStorage and restored when the instance is created — the same lifecycle as the IndexedDB adapter, only the storage backend differs.

::: info Serialization constraints
The same constraint as the browser plugin applies: state must be JSON-serializable. Functions, class instances, `Map`, `Set`, and any value that does not survive `JSON.parse(JSON.stringify(v))` cannot be persisted. Use `stateToDb` / `dbToState` to project to and from a serializable shape when needed. See [Persistence Plugin: registration options](/plugins/persistence#registration-options).
:::

## See also

- [Persistence Plugin](/plugins/persistence) — full plugin API, registration options, status monitoring, and the `waitForHydration()` method
- [Instance Management](/core/instance-management) — `acquire`, `release`, and the registry lifecycle
- [watch](/core/watch) — observing blocs outside React (useful for imperative React Native patterns)
- [Passing Inputs](/guide/inputs) — `args` and instance identity
