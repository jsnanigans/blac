# Persistence Plugin

The Persistence Plugin provides automatic state persistence for your BlaC blocs and cubits. It saves state changes to storage and restores state when your application restarts.

## Installation

```bash
npm install @blac/plugin-persistence
```

## Quick Start

```typescript
import { Cubit } from '@blac/core';
import { PersistencePlugin } from '@blac/plugin-persistence';

class SettingsCubit extends Cubit<SettingsState> {
  constructor() {
    super(defaultSettings);

    // Add persistence
    this.addPlugin(
      new PersistencePlugin({
        key: 'app-settings',
      }),
    );
  }
}
```

That's it! Your settings will now persist across app restarts.

## Configuration Options

```typescript
interface PersistenceOptions<TState> {
  // Required: Storage key
  key: string;

  // Storage adapter (defaults to localStorage)
  storage?: StorageAdapter;

  // Custom serialization
  serialize?: (state: TState) => string;
  deserialize?: (data: string) => TState;

  // Debounce saves (ms)
  debounceMs?: number;

  // Version for migrations
  version?: string;

  // Selective persistence
  select?: (state: TState) => Partial<TState>;
  merge?: (persisted: Partial<TState>, current: TState) => TState;

  // Encryption
  encrypt?: {
    encrypt: (data: string) => string | Promise<string>;
    decrypt: (data: string) => string | Promise<string>;
  };

  // Migrations from old keys
  migrations?: Array<{
    from: string;
    transform?: (oldState: any) => TState;
  }>;

  // Error handling
  onError?: (error: Error, operation: 'save' | 'load' | 'migrate') => void;
}
```

## Storage Adapters

### Built-in Adapters

```typescript
import {
  getDefaultStorage,
  createLocalStorage,
  createSessionStorage,
  createAsyncStorage,
  createMemoryStorage,
} from '@blac/plugin-persistence';

// Browser localStorage (default)
const localStorage = createLocalStorage();

// Browser sessionStorage
const sessionStorage = createSessionStorage();

// React Native AsyncStorage
const asyncStorage = createAsyncStorage();

// In-memory storage (testing)
const memoryStorage = createMemoryStorage();
```

### Custom Storage Adapter

Implement the `StorageAdapter` interface:

```typescript
interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

// Example: IndexedDB adapter
class IndexedDBAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    const db = await this.openDB();
    const tx = db.transaction('store', 'readonly');
    const result = await tx.objectStore('store').get(key);
    return result?.value ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction('store', 'readwrite');
    await tx.objectStore('store').put({ key, value });
  }

  async removeItem(key: string): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction('store', 'readwrite');
    await tx.objectStore('store').delete(key);
  }

  private async openDB() {
    // IndexedDB setup logic
  }
}
```

## Usage Examples

### Basic Persistence

```typescript
class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({ todos: [], filter: 'all' });

    this.addPlugin(
      new PersistencePlugin({
        key: 'todos',
      }),
    );
  }

  addTodo = (text: string) => {
    this.patch({
      todos: [...this.state.todos, { id: Date.now(), text, done: false }],
    });
  };
}
```

### Selective Persistence

Only persist specific parts of state:

```typescript
class UserCubit extends Cubit<UserState> {
  constructor() {
    super(initialState);

    this.addPlugin(
      new PersistencePlugin({
        key: 'user-preferences',

        // Only persist preferences, not temporary UI state
        select: (state) => ({
          theme: state.theme,
          language: state.language,
          notifications: state.notifications,
        }),

        // Merge persisted data with current state
        merge: (persisted, current) => ({
          ...current,
          ...persisted,
        }),
      }),
    );
  }
}
```

### Custom Serialization

Handle complex data types:

```typescript
class MapCubit extends Cubit<{ locations: Map<string, Location> }> {
  constructor() {
    super({ locations: new Map() });

    this.addPlugin(
      new PersistencePlugin({
        key: 'map-data',

        // Convert Map to JSON-serializable format
        serialize: (state) =>
          JSON.stringify({
            locations: Array.from(state.locations.entries()),
          }),

        // Restore Map from JSON
        deserialize: (data) => {
          const parsed = JSON.parse(data);
          return {
            locations: new Map(parsed.locations),
          };
        },
      }),
    );
  }
}
```

### Encrypted Storage

Protect sensitive data:

```typescript
import { encrypt, decrypt } from 'your-crypto-lib';

class AuthCubit extends Cubit<AuthState> {
  constructor() {
    super({ isAuthenticated: false, token: null });

    this.addPlugin(
      new PersistencePlugin({
        key: 'auth',

        encrypt: {
          encrypt: async (data) => {
            const key = await getEncryptionKey();
            return encrypt(data, key);
          },
          decrypt: async (data) => {
            const key = await getEncryptionKey();
            return decrypt(data, key);
          },
        },
      }),
    );
  }
}
```

### Migrations

Handle data structure changes:

```typescript
class SettingsCubit extends Cubit<SettingsV2> {
  constructor() {
    super(defaultSettingsV2);

    this.addPlugin(
      new PersistencePlugin({
        key: 'settings-v2',
        version: '2.0.0',

        migrations: [
          {
            from: 'settings-v1',
            transform: (oldSettings: SettingsV1): SettingsV2 => ({
              ...oldSettings,
              newFeature: 'default-value',
              // Map old structure to new
              preferences: {
                theme: oldSettings.isDarkMode ? 'dark' : 'light',
                ...oldSettings.preferences,
              },
            }),
          },
        ],
      }),
    );
  }
}
```

### Debounced Saves

Optimize performance for frequent updates:

```typescript
class EditorCubit extends Cubit<EditorState> {
  constructor() {
    super({ content: '', cursor: 0 });

    this.addPlugin(
      new PersistencePlugin({
        key: 'editor-draft',
        debounceMs: 1000, // Save at most once per second
      }),
    );
  }

  updateContent = (content: string) => {
    // State updates immediately
    this.patch({ content });
    // But saves are debounced
  };
}
```

### Error Handling

Handle storage failures gracefully:

```typescript
class DataCubit extends Cubit<DataState> {
  constructor() {
    super(initialState);

    this.addPlugin(
      new PersistencePlugin({
        key: 'app-data',

        onError: (error, operation) => {
          console.error(`Storage ${operation} failed:`, error);

          if (operation === 'save') {
            // Notify user that changes might not persist
            this.showStorageWarning();
          } else if (operation === 'load') {
            // Use default state if load fails
            console.log('Using default state');
          }
        },
      }),
    );
  }
}
```

## Advanced Patterns

### Multi-Storage Strategy

Use different storage for different data:

```typescript
class AppCubit extends Cubit<AppState> {
  constructor() {
    super(initialState);

    // Critical data in localStorage
    this.addPlugin(
      new PersistencePlugin({
        key: 'app-critical',
        storage: createLocalStorage(),
        select: (state) => ({
          userId: state.userId,
          settings: state.settings,
        }),
      }),
    );

    // Session data in sessionStorage
    this.addPlugin(
      new PersistencePlugin({
        key: 'app-session',
        storage: createSessionStorage(),
        select: (state) => ({
          currentView: state.currentView,
          tempData: state.tempData,
        }),
      }),
    );
  }
}
```

### Conditional Persistence

Enable/disable persistence dynamically:

```typescript
class FeatureCubit extends Cubit<FeatureState> {
  private persistencePlugin?: PersistencePlugin<FeatureState>;

  constructor(private userPreferences: UserPreferences) {
    super(initialState);

    if (userPreferences.enablePersistence) {
      this.enablePersistence();
    }
  }

  enablePersistence() {
    if (!this.persistencePlugin) {
      this.persistencePlugin = new PersistencePlugin({
        key: 'feature-state',
      });
      this.addPlugin(this.persistencePlugin);
    }
  }

  disablePersistence() {
    if (this.persistencePlugin) {
      this.removePlugin(this.persistencePlugin.name);
      this.persistencePlugin.clear(); // Clear stored data
      this.persistencePlugin = undefined;
    }
  }
}
```

### Sync Across Tabs

Sync state across browser tabs:

```typescript
class SharedCubit extends Cubit<SharedState> {
  constructor() {
    super(initialState);

    const plugin = new PersistencePlugin({
      key: 'shared-state',
    });

    this.addPlugin(plugin);

    // Listen for storage events from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'shared-state' && e.newValue) {
        const newState = JSON.parse(e.newValue);
        // Update state without triggering another save
        (this as any).emit(newState);
      }
    });
  }
}
```

## Best Practices

### 1. Choose Appropriate Keys

Use descriptive, unique keys:

```typescript
// Good
new PersistencePlugin({ key: 'app-user-preferences-v1' });

// Bad
new PersistencePlugin({ key: 'data' });
```

### 2. Version Your Storage

Plan for future changes:

```typescript
new PersistencePlugin({
  key: 'user-data-v2',
  version: '2.0.0',
  migrations: [{ from: 'user-data-v1' }, { from: 'legacy-user-data' }],
});
```

### 3. Handle Sensitive Data

Never store sensitive data in plain text:

```typescript
// Bad
this.patch({ password: userPassword });

// Good - store tokens with encryption
this.patch({ authToken: encryptedToken });
```

### 4. Consider Storage Limits

Be mindful of storage constraints:

```typescript
class CacheCubit extends Cubit<CacheState> {
  constructor() {
    super({ items: [] });

    this.addPlugin(
      new PersistencePlugin({
        key: 'cache',
        select: (state) => ({
          // Limit stored items
          items: state.items.slice(-100),
        }),
      }),
    );
  }
}
```

### 5. Test Persistence

Test with different storage states:

```typescript
describe('PersistenceCubit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('restores saved state', async () => {
    // Save state
    const cubit1 = new MyCubit();
    cubit1.updateValue('test');

    // Simulate app restart
    const cubit2 = new MyCubit();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(cubit2.state.value).toBe('test');
  });

  it('handles corrupted storage', () => {
    localStorage.setItem('my-key', 'invalid-json');

    const cubit = new MyCubit();
    // Should use initial state
    expect(cubit.state).toEqual(initialState);
  });
});
```

## API Reference

### PersistencePlugin

```typescript
class PersistencePlugin<TState> implements BlocPlugin<TState> {
  constructor(options: PersistenceOptions<TState>);

  // Clear stored state
  clear(): Promise<void>;
}
```

### Storage Adapters

```typescript
interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

// Factory functions
function createLocalStorage(): StorageAdapter;
function createSessionStorage(): StorageAdapter;
function createAsyncStorage(): StorageAdapter;
function createMemoryStorage(): StorageAdapter;
function getDefaultStorage(): StorageAdapter;
```

## Troubleshooting

### State Not Persisting

1. Check browser storage is not disabled
2. Verify key uniqueness
3. Check for errors in console
4. Ensure state is serializable

### Performance Issues

1. Increase debounce time
2. Use selective persistence
3. Limit stored data size
4. Consider async storage adapter

### Migration Failures

1. Test migrations thoroughly
2. Keep old keys during transition
3. Provide fallback values
4. Log migration errors

## Next Steps

- Learn about [Creating Custom Plugins](./creating-plugins.md)
- Explore other [Plugin Examples](./examples.md)
- Check the [Plugin API Reference](./api-reference.md)
