# useExternalBlocStore

A React hook for subscribing to external bloc instances that are created and managed outside of React components.

## Overview

`useExternalBlocStore` allows you to connect React components to bloc instances that exist independently of React's lifecycle. This is useful for:

- Blocs created at the module level
- Blocs managed by external systems
- Testing scenarios where you need direct bloc control
- Integration with non-React parts of your application

## Signature

```typescript
function useExternalBlocStore<B extends BlocBase<any>>(
  bloc: B,
  options?: {
    selector?: (
      currentState: BlocState<B>,
      previousState: BlocState<B> | undefined,
      instance: B,
    ) => unknown[];
  },
): BlocState<B>;
```

## Parameters

| Name               | Type                      | Required | Description                                        |
| ------------------ | ------------------------- | -------- | -------------------------------------------------- |
| `bloc`             | `B extends BlocBase<any>` | Yes      | The bloc instance to subscribe to                  |
| `options.selector` | `Function`                | No       | Custom dependency selector for render optimization |

## Returns

Returns the current state of the bloc. The component will re-render when:

- Any state property changes (if no selector provided)
- Selected dependencies change (if selector provided)

## Basic Usage

### Module-Level Bloc

```typescript
// store.ts - Create bloc outside React
import { Cubit } from '@blac/core';

export class AppSettingsCubit extends Cubit<{
  theme: 'light' | 'dark';
  language: string;
}> {
  constructor() {
    super({ theme: 'light', language: 'en' });
  }

  toggleTheme = () => {
    this.patch({
      theme: this.state.theme === 'light' ? 'dark' : 'light',
    });
  };

  setLanguage = (language: string) => {
    this.patch({ language });
  };
}

// Create singleton instance
export const appSettings = new AppSettingsCubit();
```

```typescript
// App.tsx - Use in React component
import { useExternalBlocStore } from '@blac/react';
import { appSettings } from './store';

function ThemeToggle() {
  const state = useExternalBlocStore(appSettings);

  return (
    <button onClick={appSettings.toggleTheme}>
      Current theme: {state.theme}
    </button>
  );
}
```

## Advanced Usage

### With Selector

Optimize re-renders by selecting specific dependencies:

```typescript
function LanguageDisplay() {
  // Only re-render when language changes
  const state = useExternalBlocStore(appSettings, {
    selector: (state) => [state.language]
  });

  return <div>Language: {state.language}</div>;
}
```

### Shared External State

Multiple components can subscribe to the same external bloc:

```typescript
// WebSocket managed state
class WebSocketCubit extends Cubit<{
  connected: boolean;
  messages: string[]
}> {
  constructor() {
    super({ connected: false, messages: [] });
  }

  addMessage = (message: string) => {
    this.patch({
      messages: [...this.state.messages, message]
    });
  };
}

// Created and managed by WebSocket service
export const wsState = new WebSocketCubit();

// Multiple components can subscribe
function ConnectionStatus() {
  const state = useExternalBlocStore(wsState, {
    selector: (state) => [state.connected]
  });

  return <div>Status: {state.connected ? '🟢' : '🔴'}</div>;
}

function MessageList() {
  const state = useExternalBlocStore(wsState, {
    selector: (state) => [state.messages.length]
  });

  return <div>Messages: {state.messages.length}</div>;
}
```

### Testing with External Blocs

```typescript
// In tests, create and control blocs directly
describe('Component Tests', () => {
  let testBloc: CounterCubit;

  beforeEach(() => {
    testBloc = new CounterCubit();
  });

  it('responds to external state changes', () => {
    const { result, rerender } = renderHook(() =>
      useExternalBlocStore(testBloc),
    );

    expect(result.current.count).toBe(0);

    // Change state externally
    act(() => {
      testBloc.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

## Best Practices

### 1. Lifecycle Management

External blocs aren't automatically disposed. Manage their lifecycle explicitly:

```typescript
// Dispose when no longer needed
appSettings.dispose();

// Or use keepAlive for persistent blocs
class PersistentCubit extends Cubit<State> {
  static keepAlive = true;
}
```

### 2. Avoid Memory Leaks

Ensure proper cleanup for dynamically created external blocs:

```typescript
function useWebSocketBloc(url: string) {
  const blocRef = useRef<WebSocketCubit>();

  useEffect(() => {
    blocRef.current = new WebSocketCubit(url);

    return () => {
      blocRef.current?.dispose();
    };
  }, [url]);

  const state = useExternalBlocStore(blocRef.current!);

  return [state, blocRef.current] as const;
}
```

### 3. Type Safety

Leverage TypeScript for type-safe external stores:

```typescript
// Type-safe store module
interface StoreBlocs {
  auth: AuthCubit;
  settings: SettingsCubit;
  notifications: NotificationsCubit;
}

class Store {
  auth = new AuthCubit();
  settings = new SettingsCubit();
  notifications = new NotificationsCubit();

  dispose() {
    Object.values(this).forEach(bloc => bloc.dispose());
  }
}

export const store = new Store();

// Type-safe hook
function useStore<K extends keyof StoreBlocs>(
  key: K
): BlocState<StoreBlocs[K]> {
  return useExternalBlocStore(store[key]);
}

// Usage
function AuthStatus() {
  const authState = useStore('auth');
  return <div>{authState.isAuthenticated ? 'Logged in' : 'Guest'}</div>;
}
```

## Common Patterns

### Global App State

```typescript
// Global state management
export const globalState = {
  auth: new AuthCubit(),
  theme: new ThemeCubit(),
  i18n: new I18nCubit(),
};

// Hook for global state
export function useGlobalState<T extends keyof typeof globalState>(key: T) {
  return useExternalBlocStore(globalState[key]);
}
```

### Service Integration

```typescript
// Service that manages its own state
class DataService {
  private cubit = new DataCubit();

  get state() {
    return this.cubit;
  }

  async fetchData() {
    this.cubit.setLoading(true);
    try {
      const data = await api.getData();
      this.cubit.setData(data);
    } finally {
      this.cubit.setLoading(false);
    }
  }
}

export const dataService = new DataService();

// Component subscribes to service state
function DataDisplay() {
  const state = useExternalBlocStore(dataService.state);

  if (state.loading) return <div>Loading...</div>;
  return <div>{state.data}</div>;
}
```

## Comparison with useBloc

| Feature              | useBloc         | useExternalBlocStore  |
| -------------------- | --------------- | --------------------- |
| Bloc creation        | Automatic       | Manual                |
| Lifecycle management | Automatic       | Manual                |
| Instance sharing     | Configurable    | Always shared         |
| Props support        | Yes             | No                    |
| Good for             | Component state | Global/external state |

## Troubleshooting

### Component Not Re-rendering

Ensure the bloc is emitting new state objects:

```typescript
// ❌ Bad - mutating state
this.state.count++;

// ✅ Good - new state object
this.emit({ ...this.state, count: this.state.count + 1 });
```

### Stale State

Check that you're subscribing to the correct bloc instance:

```typescript
// ❌ Creating new instance each render
function Component() {
  const state = useExternalBlocStore(new MyCubit()); // New instance!
}

// ✅ Using stable instance
const myCubit = new MyCubit();
function Component() {
  const state = useExternalBlocStore(myCubit);
}
```

## Next Steps

- [useBloc](/api/react/use-bloc) - Standard hook for component-managed blocs
- [Instance Management](/concepts/instance-management) - Learn about bloc lifecycle
- [Plugin System](/plugins/overview) - Extend bloc functionality
