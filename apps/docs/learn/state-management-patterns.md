# State Management Patterns

Blac offers several powerful patterns for managing state container instances and their lifecycles. Understanding these patterns will help you choose the best approach for different scenarios in your application, balancing state sharing, isolation, and persistence needs.

## 1. Shared State (Default)

By default, when you request a `Bloc` or `Cubit` using `useBloc(MyBlocClass)`, Blac provides a single, shared instance of that class (identified by its class name). All components requesting `MyBlocClass` will interact with this same instance and its state.

This is the most common pattern and is ideal for global state or any state that needs to be synchronized across multiple parts of your application.

### Implementation

No special configuration is needed on your `Bloc` or `Cubit` class for shared state; it's the default.

```typescript
// src/blocs/UserBloc.ts
import { Bloc } from '@blac/core';
// Define UserState, UserAction, initialUserState appropriately

export class UserBloc extends Bloc<UserState, UserAction extends BlocEventConstraint> {
  constructor() {
    super(initialUserState);
  }
  // ... business logic ...
}
```

### Usage

```tsx
// src/components/ProfileHeader.tsx
import { useBloc } from '@blac/react';
import { UserBloc } from '../blocs/UserBloc';

function ProfileHeader() {
  const [userState] = useBloc(UserBloc);
  return <h1>Welcome, {userState.name}</h1>;
}

// src/components/SettingsPage.tsx
import { useBloc } from '@blac/react';
import { UserBloc } from '../blocs/UserBloc';

function SettingsPage() {
  const [userState, userBloc] = useBloc(UserBloc);
  // Both ProfileHeader and SettingsPage use the SAME UserBloc instance.
  // ...
}
```

### Best For

- Global application state (e.g., user authentication, theme, global settings).
- State that needs to be consistently synchronized between distinct components.
- Features where multiple components interact with or display the same slice of data.

## 2. Isolated State

There are times when you need each component (or a specific part of your UI) to have its own independent instance of a `Bloc` or `Cubit`. This is achieved through isolated state.

### Implementation Methods

1.  **Static Property**: Set `static isolated = true;` on your `Bloc` or `Cubit` class. Every `useBloc(MyIsolatedBloc)` call will then result in a new instance tied to the calling component's lifecycle.

    ```typescript
    // src/blocs/WidgetSettingsCubit.ts
    import { Cubit } from '@blac/core';

    interface SettingsState {
      color: string;
      fontSize: number;
    }

    export class WidgetSettingsCubit extends Cubit<SettingsState> {
      static isolated = true; // Each component gets its own instance

      constructor(initialColor = 'blue') {
        super({ color: initialColor, fontSize: 12 });
      }

      setColor = (color: string) => this.patch({ color });
      setFontSize = (size: number) => this.patch({ fontSize: size });
    }
    ```

2.  **Dynamic ID with `useBloc`**: Provide a unique `instanceId` string in the `options` argument of `useBloc`.

    ```tsx
    // src/components/ConfigurableWidget.tsx
    import { useBloc } from '@blac/react';
    import { WidgetSettingsCubit } from '../blocs/WidgetSettingsCubit';

    function ConfigurableWidget({
      widgetId,
      initialColor,
    }: {
      widgetId: string;
      initialColor?: string;
    }) {
      // WidgetSettingsCubit does NOT need `static isolated = true` for this to work.
      // The unique `instanceId` ensures a distinct instance for this widgetId.
      const [settings, settingsCubit] = useBloc(WidgetSettingsCubit, {
        instanceId: `widget-settings-${widgetId}`,
        staticProps: initialColor, // Assuming constructor takes props for initialColor
      });
      // ... render widget based on settings ...
    }
    ```

### Usage

If `WidgetSettingsCubit` has `static isolated = true;`:

```tsx
// Two instances of MyWidget will have separate WidgetSettingsCubit states
function App() {
  return (
    <>
      <MyWidget />
      <MyWidget />
    </>
  );
}
```

### Best For

- Components that require their own, non-shared state (e.g., a reusable form Bloc, settings for multiple instances of a widget on one page).
- Avoiding state conflicts when multiple instances of the same component are rendered.

## 3. In-Memory Persistence (`keepAlive`)

Normally, a shared `Bloc` or `Cubit` is disposed of when it no longer has any active listeners (i.e., components using it via `useBloc` have unmounted). If you need a shared instance to persist in memory _even when no components are currently using it_, you can set `static keepAlive = true;`.

This is useful for caching data, managing background tasks, or maintaining state across navigations where components might unmount and remount later, expecting the state to be preserved.

### Implementation

```typescript
// src/blocs/DataCacheBloc.ts
import { Cubit } from '@blac/core';

interface CacheState {
  data: Record<string, any> | null;
  isLoading: boolean;
}

export class DataCacheBloc extends Cubit<CacheState> {
  static keepAlive = true; // Instance persists in memory

  constructor() {
    super({ data: null, isLoading: false });
    this.loadInitialData(); // Example: load data on init
  }

  loadInitialData = async () => {
    /* ... */
  };
  fetchData = async (key: string) => {
    /* ... update state ... */
  };
  getCachedData = (key: string) => this.state.data?.[key];
}
```

### Usage

When a component using `DataCacheBloc` unmounts, the `DataCacheBloc` instance (and its current state) will remain in memory. If another component (or the same one remounting) calls `useBloc(DataCacheBloc)`, it will receive this existing, persisted instance.

### Best For

- Caching data that is expensive to fetch, across component lifecycles or navigation.
- Managing application-wide services or settings that should always be available.
- Background tasks that need to maintain state independently of the UI.

**Note**: `keepAlive` prevents disposal from lack of listeners. It does not inherently save state to disk or browser storage.

## 4. Storage Persistence (Using Addons)

To persist state across browser sessions (e.g., to `localStorage` or `sessionStorage`), Blac relies on its **addon** system. The `@blac/core` package includes a `Persist` addon for this purpose.

### Conceptual Implementation (with `Persist` Addon)

```typescript
// src/blocs/ThemeCubit.ts
import { Cubit, Persist } from '@blac/core';

interface ThemeState {
  mode: 'light' | 'dark';
}

export class ThemeCubit extends Cubit<ThemeState> {
  // Connect the Persist addon
  static addons = [Persist({ keyName: 'appTheme' })]; // `keyName` is the localStorage key
  // Optionally, combine with keepAlive if needed
  // static keepAlive = true;

  constructor() {
    // Initial state can be a default, Persist addon will load from storage if available.
    super({ mode: 'light' });
  }

  toggleTheme = () => {
    const newMode = this.state.mode === 'light' ? 'dark' : 'light';
    this.emit({ mode: newMode }); // Persist addon will automatically save the new state
  };
}
```

### Key Points for Storage Persistence:

- Use an addon like `Persist` (or create your own).
- Configure the addon (e.g., with a storage key, storage type).
- The addon typically handles loading state from storage on initialization and saving state to storage on changes.
- You might combine this with `static keepAlive = true;` if you want the instance managing the persisted state to also stay in memory regardless of listeners.

Refer to documentation on specific addons (like `Persist`) for detailed setup and options.

## Combining Patterns

You can combine these patterns. For example, an isolated Bloc that also stays alive:

```typescript
// src/blocs/UserTaskBloc.ts
import { Bloc } from '@blac/core';

export class UserTaskBloc extends Bloc<TaskState, TaskAction extends BlocEventConstraint> {
  static isolated = true;
  static keepAlive = true;
  // ...
}
```

This would create a unique `UserTaskBloc` for each component instance that requests it, and each of those unique instances would persist in memory even if its originating component unmounts.

## Choosing the Right Pattern

Consider these questions:

1.  **Shared vs. Unique Instance?**
    - Multiple components need the _exact same_ state instance: Use **Shared State** (default).
    - Each component (or context) needs its _own independent_ state: Use **Isolated State** (via `static isolated` or dynamic `id` in `useBloc`).

2.  **Lifecycle when No Components Listen?**
    - State/Instance can be discarded if nothing is listening: Default behavior (no `keepAlive`).
    - State/Instance _must remain in memory_ even if nothing is listening: Use **In-Memory Persistence (`keepAlive`)**.

3.  **Persistence Across Browser Sessions?**
    - State should be saved to `localStorage`/`sessionStorage` and reloaded: Use **Storage Persistence (Addons)** like `Persist`.

By understanding these distinctions, you can architect your state management effectively with Blac.
