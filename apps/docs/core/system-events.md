# System Events

State containers emit system events for lifecycle management. Subscribe with `onSystemEvent()`.

## Available Events

| Event | Payload | When |
|-------|---------|------|
| `stateChanged` | `{ state, previousState }` | After state changes |
| `propsUpdated` | `{ props, previousProps }` | After props update |
| `dispose` | `void` | When `dispose()` is called |

## Usage

```typescript
class UserCubit extends Cubit<UserState, UserProps> {
  constructor() {
    super({ name: '', email: '' });

    // Subscribe to state changes
    this.onSystemEvent('stateChanged', ({ state, previousState }) => {
      console.log('State:', previousState, '->', state);
    });

    // Subscribe to props updates
    this.onSystemEvent('propsUpdated', ({ props, previousProps }) => {
      console.log('Props:', previousProps, '->', props);
    });

    // Subscribe to disposal
    this.onSystemEvent('dispose', () => {
      console.log('Cleaning up...');
    });
  }
}
```

## State Changed

Fired after every state change via `emit()`, `update()`, or `patch()`:

```typescript
class AnalyticsTrackingCubit extends Cubit<AppState> {
  constructor() {
    super(initialState);

    this.onSystemEvent('stateChanged', ({ state, previousState }) => {
      // Track specific state changes
      if (state.user !== previousState.user) {
        analytics.track('user_changed', { user: state.user });
      }

      if (state.cart.items.length !== previousState.cart.items.length) {
        analytics.track('cart_updated', { itemCount: state.cart.items.length });
      }
    });
  }
}
```

## Props Updated

Fired when `updateProps()` is called (typically by `useBloc` when props change):

```typescript
class UserProfileCubit extends Cubit<ProfileState, { userId: string }> {
  constructor() {
    super({ profile: null, isLoading: false });

    this.onSystemEvent('propsUpdated', ({ props, previousProps }) => {
      // Reload when userId changes
      if (props.userId !== previousProps?.userId) {
        this.loadProfile(props.userId);
      }
    });
  }

  loadProfile = async (userId: string) => {
    this.patch({ isLoading: true });
    const profile = await api.getProfile(userId);
    this.patch({ profile, isLoading: false });
  };
}
```

## Dispose

Fired when the instance is being disposed. Use for cleanup:

```typescript
class WebSocketCubit extends Cubit<SocketState> {
  private socket: WebSocket | null = null;

  constructor() {
    super({ connected: false, messages: [] });

    this.onSystemEvent('dispose', () => {
      // Clean up WebSocket connection
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
    });
  }

  connect = (url: string) => {
    this.socket = new WebSocket(url);
    this.socket.onopen = () => this.patch({ connected: true });
    this.socket.onclose = () => this.patch({ connected: false });
  };
}
```

## Common Patterns

### Releasing Owned Dependencies

```typescript
class AppCubit extends Cubit<AppState> {
  // Own a dependency
  private notifications = NotificationCubit.resolve();

  constructor() {
    super(initialState);

    // Release on dispose
    this.onSystemEvent('dispose', () => {
      NotificationCubit.release();
    });
  }
}
```

### Persisting State

```typescript
class SettingsCubit extends Cubit<SettingsState> {
  constructor() {
    // Load from storage
    const saved = localStorage.getItem('settings');
    super(saved ? JSON.parse(saved) : defaultSettings);

    // Save on change
    this.onSystemEvent('stateChanged', ({ state }) => {
      localStorage.setItem('settings', JSON.stringify(state));
    });
  }
}
```

### Logging State Changes

```typescript
class DebugCubit extends Cubit<State> {
  constructor() {
    super(initialState);

    if (process.env.NODE_ENV === 'development') {
      this.onSystemEvent('stateChanged', ({ state, previousState }) => {
        console.group(`${this.name} state changed`);
        console.log('Previous:', previousState);
        console.log('Current:', state);
        console.groupEnd();
      });
    }
  }
}
```

## Multiple Handlers

You can register multiple handlers for the same event:

```typescript
class MyCubit extends Cubit<State> {
  constructor() {
    super(initialState);

    // Handler 1: Analytics
    this.onSystemEvent('stateChanged', ({ state }) => {
      analytics.track('state_change', state);
    });

    // Handler 2: Logging
    this.onSystemEvent('stateChanged', ({ state }) => {
      logger.debug('State:', state);
    });
  }
}
```

## See Also

- [Plugins](/core/plugins) - Global lifecycle listeners
- [Instance Management](/core/instance-management) - Cleanup patterns
