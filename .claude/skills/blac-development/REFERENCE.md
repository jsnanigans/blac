# BlaC API Reference

## StateContainer (Base Class)

All state containers inherit from `StateContainer<S, P>` where `S` is state type and `P` is props type.

### Properties
| Property | Type | Description |
|----------|------|-------------|
| `state` | `S` | Current state (readonly) |
| `props` | `P` | Current props (readonly) |
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
| `updateProps(newProps)` | Update props (triggers `propsUpdated` event) |

### Protected Methods (for subclasses)
| Method | Description |
|--------|-------------|
| `emit(newState)` | Emit new state (with `===` change detection) |
| `update(fn)` | Update state with function `(current) => next` |
| `onSystemEvent(event, handler)` | Subscribe to system lifecycle events |

### Static Methods
| Method | Description |
|--------|-------------|
| `.resolve(id?, ...args)` | Get/create instance with ownership (increments ref count) |
| `.get(id?)` | Get existing instance (throws if not found) |
| `.getSafe(id?)` | Get existing instance (returns `{ instance }` or `{ error }`) |
| `.connect(id?, ...args)` | Get/create for B2B (no ref count change, tracks deps) |
| `.release(id?, force?)` | Release reference (force=true ignores keepAlive) |
| `.hasInstance(id?)` | Check if instance exists |
| `.getRefCount(id?)` | Get reference count |
| `.getAll()` | Get all instances (returns array) |
| `.forEach(callback)` | Iterate safely (disposal-safe, memory-efficient) |
| `.clear()` | Clear all instances of this type |
| `StateContainer.clearAllInstances()` | Clear all instances from all types |
| `StateContainer.getStats()` | Get registry statistics |

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

## Vertex

Extends StateContainer with event-driven architecture.

### BaseEvent Interface
```typescript
interface BaseEvent {
  readonly type: string;
  readonly timestamp: number;
  readonly source?: string;
}
```

### Methods
| Method | Description |
|--------|-------------|
| `add(event)` | Add event to be processed (public) |
| `on(EventClass, handler)` | Register event handler (protected) |

### Error Handling
```typescript
class MyVertex extends Vertex<State> {
  protected onEventError(event: BaseEvent, error: Error): void {
    console.error('Event error:', event, error);
  }
}
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
function useBloc<T extends StateContainer<S, P>, S, P>(
  BlocClass: BlocConstructor<T>,
  options?: UseBlocOptions<T, S, P>
): [S, T, ComponentRef]
```

### Options
| Option | Type | Description |
|--------|------|-------------|
| `props` | `P` | Constructor arguments |
| `instanceId` | `string \| number` | Custom instance ID for shared blocs |
| `dependencies` | `(state, bloc) => any[]` | Manual dependency tracking |
| `autoTrack` | `boolean` | Enable/disable auto tracking (default: true) |
| `disableGetterCache` | `boolean` | Disable getter value caching (default: false) |
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

## useBlocActions Hook

```typescript
function useBlocActions<T extends StateContainer<S, P>, S, P>(
  BlocClass: BlocConstructor<T>,
  options?: UseBlocActionsOptions<T, P>
): T
```

Returns bloc instance without state subscription. Component never re-renders from bloc state changes.

### Options
| Option | Type | Description |
|--------|------|-------------|
| `props` | `P` | Constructor arguments |
| `instanceId` | `string \| number` | Custom instance ID |
| `onMount` | `(bloc) => void` | Mount callback |
| `onUnmount` | `(bloc) => void` | Unmount callback |

## System Events

Available events for `onSystemEvent()`:

| Event | Payload | Description |
|-------|---------|-------------|
| `stateChanged` | `{ state, previousState }` | Fired after state changes |
| `propsUpdated` | `{ props, previousProps }` | Fired when props are updated |
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
  onEventAdded?(vertex, event, context): void;
  onInstanceDisposed?(instance, context): void;
  onUninstall?(): void;
}
```

### Registry Lifecycle Events
```typescript
import { globalRegistry } from '@blac/core';

globalRegistry.on('created', (container) => { });
globalRegistry.on('stateChanged', (container, prevState, newState, callstack) => { });
globalRegistry.on('eventAdded', (vertex, event) => { });
globalRegistry.on('disposed', (container) => { });
```

## Logging

```typescript
import { configureLogger, LogLevel, createLogger } from '@blac/core';

// Global configuration
configureLogger({
  enabled: true,
  level: LogLevel.DEBUG, // ERROR=0, WARN=1, INFO=2, DEBUG=3
  output: (entry) => console.log(JSON.stringify(entry)),
});

// Create custom logger
const logger = createLogger({ enabled: true, level: LogLevel.DEBUG });
logger.debug('Context', 'Message', { data });
```

## TypeScript Utilities

```typescript
import type { ExtractState, ExtractProps, BlocConstructor } from '@blac/core';

type CounterState = ExtractState<CounterCubit>; // number
type UserProps = ExtractProps<UserCubit>; // { userId: string }
```

## Performance Patterns

### Tracking Modes Comparison

| Mode | Re-renders | Setup | Best For |
|------|-----------|-------|----------|
| Auto-tracking (default) | Tracked properties | None | Most cases |
| Manual `dependencies` | Dependency array | Explicit list | Known patterns |
| `autoTrack: false` | Any state change | Set option | Simple state |
| `useBlocActions` | Never | Use different hook | Action-only |

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
- Core: `packages/blac/src/core/`
  - `StateContainer.ts` - Base class
  - `Cubit.ts` - Cubit implementation
  - `Vertex.ts` - Vertex implementation
- React: `packages/blac-react/src/`
  - `useBloc.ts` - Main hook
  - `useBlocActions.ts` - Actions-only hook
- Tracking: `packages/blac/src/tracking/`
  - `proxy-tracker.ts` - Proxy-based dependency tracking
- Adapter: `packages/blac/src/adapter/`
  - `framework-adapter.ts` - React subscription bridge
