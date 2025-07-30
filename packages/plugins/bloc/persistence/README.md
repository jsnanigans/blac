# @blac/plugin-persistence

Official persistence plugin for BlaC state management library. Automatically saves and restores bloc state to various storage backends.

## Installation

```bash
npm install @blac/plugin-persistence
# or
yarn add @blac/plugin-persistence
# or
pnpm add @blac/plugin-persistence
```

## Quick Start

```typescript
import { Cubit } from '@blac/core';
import { PersistencePlugin } from '@blac/plugin-persistence';

class CounterCubit extends Cubit<number> {
  static plugins = [
    new PersistencePlugin({
      key: 'counter-state'
    })
  ];
  
  constructor() {
    super(0);
  }
  
  increment = () => this.emit(this.state + 1);
}

// State will be automatically saved to localStorage
// and restored when the app reloads
```

## Features

- 🔄 Automatic state persistence and restoration
- 💾 Multiple storage adapters (localStorage, sessionStorage, async storage, in-memory)
- ⚡ Debounced saves for performance
- 🔐 Optional encryption support
- 📦 Data migrations
- 🏷️ Versioning support
- 🛡️ Comprehensive error handling
- 📱 React Native AsyncStorage support

## Configuration

### Basic Options

```typescript
new PersistencePlugin({
  // Required: Storage key
  key: 'my-app-state',
  
  // Optional: Storage adapter (defaults to localStorage)
  storage: new LocalStorageAdapter(),
  
  // Optional: Debounce saves (ms)
  debounceMs: 100,
  
  // Optional: Error handler
  onError: (error, operation) => {
    console.error(`Persistence ${operation} failed:`, error);
  }
})
```

### Custom Serialization

```typescript
new PersistencePlugin({
  key: 'user-state',
  
  // Custom serialization
  serialize: (state) => {
    // Transform dates to ISO strings, etc.
    return JSON.stringify(state, dateReplacer);
  },
  
  deserialize: (data) => {
    // Restore dates from ISO strings, etc.
    return JSON.parse(data, dateReviver);
  }
})
```

### Encryption

```typescript
import { encrypt, decrypt } from 'your-crypto-lib';

new PersistencePlugin({
  key: 'secure-state',
  
  encrypt: {
    encrypt: async (data) => encrypt(data, SECRET_KEY),
    decrypt: async (data) => decrypt(data, SECRET_KEY)
  }
})
```

### Migrations

Handle data structure changes between versions:

```typescript
new PersistencePlugin({
  key: 'user-settings',
  version: 2,
  
  migrations: [
    {
      from: 'old-user-settings',
      transform: (oldData) => ({
        ...oldData,
        // Add new fields
        notifications: {
          email: oldData.emailNotifications ?? true,
          push: oldData.pushNotifications ?? false
        }
      })
    }
  ]
})
```

## Storage Adapters

### LocalStorageAdapter (Default)

```typescript
import { LocalStorageAdapter } from '@blac/plugin-persistence';

new PersistencePlugin({
  key: 'state',
  storage: new LocalStorageAdapter()
})
```

### SessionStorageAdapter

Data persists only for the session:

```typescript
import { SessionStorageAdapter } from '@blac/plugin-persistence';

new PersistencePlugin({
  key: 'session-state',
  storage: new SessionStorageAdapter()
})
```

### InMemoryStorageAdapter

Useful for testing or SSR:

```typescript
import { InMemoryStorageAdapter } from '@blac/plugin-persistence';

const storage = new InMemoryStorageAdapter();

new PersistencePlugin({
  key: 'test-state',
  storage
})
```

### AsyncStorageAdapter

For React Native or other async storage backends:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageAdapter } from '@blac/plugin-persistence';

new PersistencePlugin({
  key: 'app-state',
  storage: new AsyncStorageAdapter(AsyncStorage)
})
```

### Custom Storage Adapter

Implement the `StorageAdapter` interface:

```typescript
import { StorageAdapter } from '@blac/plugin-persistence';

class CustomStorage implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    // Your implementation
  }
  
  async setItem(key: string, value: string): Promise<void> {
    // Your implementation
  }
  
  async removeItem(key: string): Promise<void> {
    // Your implementation
  }
}
```

## Advanced Usage

### Clearing Persisted State

```typescript
const cubit = new CounterCubit();
const plugin = cubit.getPlugin('persistence') as PersistencePlugin<number>;

// Clear persisted state
await plugin.clear();
```

### Conditional Persistence

Only persist certain states:

```typescript
class SettingsCubit extends Cubit<Settings> {
  static plugins = [
    new PersistencePlugin({
      key: 'settings',
      // Only save if user is logged in
      shouldSave: (state) => state.isLoggedIn
    })
  ];
}
```

### Multiple Storage Keys

Different parts of state in different storage:

```typescript
class AppCubit extends Cubit<AppState> {
  static plugins = [
    // User preferences in localStorage
    new PersistencePlugin({
      key: 'user-prefs',
      serialize: (state) => JSON.stringify(state.preferences)
    }),
    
    // Sensitive data in sessionStorage
    new PersistencePlugin({
      key: 'session-data',
      storage: new SessionStorageAdapter(),
      serialize: (state) => JSON.stringify(state.session)
    })
  ];
}
```

## Best Practices

1. **Use meaningful keys**: Choose descriptive storage keys to avoid conflicts
2. **Handle errors**: Always provide an error handler for production apps
3. **Version your data**: Use versioning when data structure might change
4. **Debounce saves**: Adjust debounceMs based on your state update frequency
5. **Encrypt sensitive data**: Use encryption for sensitive information
6. **Test migrations**: Thoroughly test data migrations before deploying

## TypeScript

Full TypeScript support with type inference:

```typescript
interface UserState {
  id: string;
  name: string;
  preferences: {
    theme: 'light' | 'dark';
    language: string;
  };
}

const plugin = new PersistencePlugin<UserState>({
  key: 'user',
  // TypeScript ensures serialize/deserialize handle UserState
  serialize: (state) => JSON.stringify(state),
  deserialize: (data) => JSON.parse(data) as UserState
});
```

## Contributing

See the main BlaC repository for contribution guidelines.

## License

MIT