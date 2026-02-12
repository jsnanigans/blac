# BlaC API Reference

## StateContainer (Base Class)

All state containers inherit from `StateContainer<S>` where `S` is the state type.

### Properties
| Property | Type | Description |
|----------|------|-------------|
| `state` | `S` | Current state (readonly) |
| `isDisposed` | `boolean` | Check if disposed |
| `name` | `string` | Debug name |
| `debug` | `boolean` | Debug mode flag |
| `instanceId` | `string` | Unique instance identifier |
| `createdAt` | `number` | Creation timestamp |
| `lastUpdateTimestamp` | `number` | Last state update timestamp |

### Instance Methods
| Method | Description |
|--------|-------------|
| `subscribe(callback)` | Subscribe to state changes, returns unsubscribe function |
| `dispose()` | Clean up the container |

### Protected Methods (for subclasses)
| Method | Description |
|--------|-------------|
| `emit(newState)` | Emit new state (with `===` change detection) |
| `update(fn)` | Update state with function `(current) => next` |
| `onSystemEvent(event, handler)` | Subscribe to system lifecycle events |

### Registry Helpers
| Function | Description |
|----------|-------------|
| `acquire(BlocClass, instanceKey?)` | Get/create instance with ownership (increments ref count) |
| `release(BlocClass, instanceKey?)` | Release reference (decrements ref count) |
| `ensure(BlocClass, instanceKey?)` | Get/create instance without ownership |
| `borrow(BlocClass, instanceKey?)` | Get existing instance (throws if not found) |
| `borrowSafe(BlocClass, instanceKey?)` | Get existing instance (returns `{ error, instance }`) |
| `hasInstance(BlocClass, instanceKey?)` | Check if instance exists |
| `getRefCount(BlocClass, instanceKey?)` | Get reference count |
| `getAll(BlocClass)` | Get all instances (returns array) |
| `forEach(BlocClass, callback)` | Iterate safely (disposal-safe, memory-efficient) |
| `clear(BlocClass)` | Clear all instances of this type |
| `clearAll()` | Clear all instances from all types |
| `getStats()` | Get registry statistics |

## Cubit

Extends StateContainer with **public** state mutation methods.

### Additional Public Methods
| Method | Description |
|--------|-------------|
| `emit(newState)` | Emit new state directly |
| `update(fn)` | Update with function `(current) => next` |
| `patch(partial)` | Shallow merge partial state (object state only) |

### patch() Behavior
```typescript
// patch() performs SHALLOW merge only
this.patch({ name: 'John' }); // OK for flat properties

// For nested updates, use update()
this.update(state => ({
  ...state,
  settings: { ...state.settings, theme: 'dark' }
}));
```

## @blac() Decorator Options

`BlacOptions` is a **union type** - only ONE option can be specified at a time:

```typescript
type BlacOptions =
  | { isolated: true }           // Each component gets its own instance
  | { keepAlive: true }          // Never auto-dispose when ref count reaches 0
  | { excludeFromDevTools: true }; // Hide from DevTools panels

// ✅ Valid
@blac({ isolated: true })
@blac({ keepAlive: true })

// ❌ Invalid - cannot combine
@blac({ isolated: true, keepAlive: true }) // TypeScript error!
```

## useBloc Hook

```typescript
function useBloc<T extends StateContainerConstructor>(
  BlocClass: T,
  options?: UseBlocOptions<T>
): [ExtractState<T>, InstanceReadonlyState<T>, RefObject<ComponentRef>]
```

### Options
| Option | Type | Description |
|--------|------|-------------|
| `instanceId` | `string \| number` | Custom instance ID for shared blocs |
| `dependencies` | `(state, bloc) => any[]` | Manual dependency tracking |
| `autoTrack` | `boolean` | Enable/disable auto tracking (default: true) |
| `onMount` | `(bloc) => void` | Mount callback |
| `onUnmount` | `(bloc) => void` | Unmount callback |

### Dependency Tracking Modes

**Auto-tracking (default):**
```typescript
const [user] = useBloc(UserBloc);
return <div>{user.name}</div>; // Only re-renders when name changes
```

**Manual dependencies:**
```typescript
const [state] = useBloc(UserBloc, {
  dependencies: (state) => [state.name, state.email]
});
```

**No tracking:**
```typescript
const [state] = useBloc(UserBloc, { autoTrack: false });
// Re-renders on any state change
```

## System Events

Available events for `onSystemEvent()`:

| Event | Payload | Description |
|-------|---------|-------------|
| `stateChanged` | `{ state, previousState }` | Fired after state changes |
| `dispose` | `void` | Fired when dispose() is called |

## Plugin System

### BlacPlugin Interface
```typescript
interface BlacPlugin {
  name: string;
  version: string;
  onInstall?(context: PluginContext): void;
  onInstanceCreated?(instance, context): void;
  onStateChanged?(instance, previousState, currentState, callstack, context): void;
  onInstanceDisposed?(instance, context): void;
  onUninstall?(): void;
}
```

### Registry Lifecycle Events
```typescript
import { globalRegistry } from '@blac/core';

globalRegistry.on('created', (container) => { });
globalRegistry.on('stateChanged', (container, prevState, newState, callstack) => { });
globalRegistry.on('disposed', (container) => { });
```

## Logging

Logging is provided via the plugin system. Use `@blac/logging-plugin` (or a custom plugin) and install it with `getPluginManager()` from `@blac/core`.

## TypeScript Utilities

```typescript
import type { ExtractState, ExtractConstructorArgs } from '@blac/core';

type CounterState = ExtractState<CounterCubit>; // { count: number }
type UserCtorArgs = ExtractConstructorArgs<UserCubit>; // Constructor args tuple
```

## Performance Patterns

### Tracking Modes Comparison

| Mode | Re-renders | Setup | Best For |
|------|-----------|-------|----------|
| Auto-tracking (default) | Tracked properties | None | Most cases |
| Manual `dependencies` | Dependency array | Explicit list | Known patterns |
| `autoTrack: false` | Any state change | Set option | Simple state |
| Action-only (no state reads) | Never | Ignore state tuple | Buttons/handlers |

### Optimal Access Patterns

```typescript
// ✅ Direct property access - tracks only what's used
const [user] = useBloc(UserBloc);
return <h2>{user.name}</h2>; // Only tracks 'name'

// ✅ Nested access works
return <img src={user.profile.avatar} />; // Tracks 'profile.avatar'

// ✅ Conditional access is fine
return user.isAdmin ? <AdminPanel /> : null; // Tracks 'isAdmin'

// ❌ Destructuring tracks everything accessed
const { name, email } = user; // Tracks both!

// ❌ Spreading defeats tracking
return <Profile {...user} />; // Tracks everything!
```

### Getter Caching

Getters are cached per render cycle:
```typescript
class MyBloc extends Cubit<State> {
  get computed() {
    return expensiveComputation(this.state);
  }
}

// Same getter accessed multiple times = one computation
{cubit.computed} {cubit.computed} // Computed once, reused
```

## Source Code Locations

Key files in the repository:
- Core: `packages/blac-core/src/core/`
  - `StateContainer.ts` - Base class
  - `Cubit.ts` - Cubit implementation
- React: `packages/blac-react/src/`
  - `useBloc.ts` - Main hook
- Tracking: `packages/blac-core/src/tracking/`
  - `tracking-proxy.ts` - Proxy-based dependency tracking
- Adapter: `packages/blac-adapter/src/`
  - `index.ts` - Framework adapter utilities
