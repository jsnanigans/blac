# Plugin API Reference

Complete API reference for BlaC's plugin system, including interfaces, types, and methods.

## Core Interfaces

### Plugin

Base interface for all plugins:

```typescript
interface Plugin {
  readonly name: string;
  readonly version: string;
  readonly capabilities?: PluginCapabilities;
}
```

### PluginCapabilities

Declares what a plugin can do:

```typescript
interface PluginCapabilities {
  readonly readState: boolean; // Can read bloc state
  readonly transformState: boolean; // Can modify state before it's applied
  readonly interceptEvents: boolean; // Can intercept and modify events
  readonly persistData: boolean; // Can persist data externally
  readonly accessMetadata: boolean; // Can access internal bloc metadata
}
```

## System Plugin API

### BlacPlugin Interface

System-wide plugins that observe all blocs:

```typescript
interface BlacPlugin extends Plugin {
  // Lifecycle hooks
  beforeBootstrap?(): void;
  afterBootstrap?(): void;
  beforeShutdown?(): void;
  afterShutdown?(): void;

  // Bloc lifecycle observations
  onBlocCreated?(bloc: BlocBase<any>): void;
  onBlocDisposed?(bloc: BlocBase<any>): void;

  // State observations
  onStateChanged?(
    bloc: BlocBase<any>,
    previousState: any,
    currentState: any,
  ): void;

  // Event observations (Bloc only, not Cubit)
  onEventAdded?(bloc: Bloc<any, any>, event: any): void;

  // Error handling
  onError?(error: Error, bloc: BlocBase<unknown>, context: ErrorContext): void;

  // React adapter hooks
  onAdapterCreated?(adapter: any, metadata: AdapterMetadata): void;
  onAdapterMount?(adapter: any, metadata: AdapterMetadata): void;
  onAdapterUnmount?(adapter: any, metadata: AdapterMetadata): void;
  onAdapterRender?(adapter: any, metadata: AdapterMetadata): void;
  onAdapterDisposed?(adapter: any, metadata: AdapterMetadata): void;
}
```

### ErrorContext

Context provided when errors occur:

```typescript
interface ErrorContext {
  readonly phase:
    | 'initialization'
    | 'state-change'
    | 'event-processing'
    | 'disposal';
  readonly operation: string;
  readonly metadata?: Record<string, unknown>;
}
```

### AdapterMetadata

Metadata about React component adapters:

```typescript
interface AdapterMetadata {
  componentName?: string;
  blocInstance: BlocBase<any>;
  renderCount: number;
  trackedPaths?: string[];
  isUsingDependencies?: boolean;
  lastState?: any;
  lastDependencyValues?: any[];
  currentDependencyValues?: any[];
}
```

## Bloc Plugin API

### BlocPlugin Interface

Instance-specific plugins attached to individual blocs:

```typescript
interface BlocPlugin<TState = any, TEvent = never> extends Plugin {
  // Transform hooks - can modify data
  transformState?(previousState: TState, nextState: TState): TState;
  transformEvent?(event: TEvent): TEvent | null;

  // Lifecycle hooks
  onAttach?(bloc: BlocBase<TState>): void;
  onDetach?(): void;

  // Observation hooks
  onStateChange?(previousState: TState, currentState: TState): void;
  onEvent?(event: TEvent): void;
  onError?(error: Error, context: ErrorContext): void;
}
```

## Plugin Registry APIs

### System Plugin Registry

Global registry for system plugins:

```typescript
class SystemPluginRegistry {
  // Add a plugin
  add(plugin: BlacPlugin): void;

  // Remove a plugin by name
  remove(pluginName: string): boolean;

  // Get a specific plugin
  get(pluginName: string): BlacPlugin | undefined;

  // Get all plugins
  getAll(): ReadonlyArray<BlacPlugin>;

  // Clear all plugins
  clear(): void;

  // Bootstrap all plugins
  bootstrap(): void;

  // Shutdown all plugins
  shutdown(): void;

  // Notify plugins of bloc lifecycle events
  notifyBlocCreated(bloc: BlocBase<any>): void;
  notifyBlocDisposed(bloc: BlocBase<any>): void;
}
```

Access via `Blac.instance.plugins`:

```typescript
import { Blac } from '@blac/core';

Blac.instance.plugins.add(myPlugin);
Blac.instance.plugins.remove('plugin-name');
const plugin = Blac.instance.plugins.get('plugin-name');
const all = Blac.instance.plugins.getAll();
```

### Bloc Plugin Registry

Instance-level registry for bloc plugins:

```typescript
class BlocPluginRegistry<TState, TEvent> {
  // Add a plugin
  add(plugin: BlocPlugin<TState, TEvent>): void;

  // Remove a plugin by name
  remove(pluginName: string): boolean;

  // Get a specific plugin
  get(pluginName: string): BlocPlugin<TState, TEvent> | undefined;

  // Get all plugins
  getAll(): ReadonlyArray<BlocPlugin<TState, TEvent>>;

  // Clear all plugins
  clear(): void;
}
```

Access via bloc instance methods:

```typescript
bloc.addPlugin(myPlugin);
bloc.removePlugin('plugin-name');
const plugin = bloc.getPlugin('plugin-name');
const all = bloc.getPlugins();
```

## Hook Execution Order

### System Plugin Hooks

1. **Bootstrap Phase**

   ```
   beforeBootstrap() → afterBootstrap()
   ```

2. **Bloc Creation**

   ```
   onBlocCreated(bloc)
   ```

3. **State Change**

   ```
   onStateChanged(bloc, prev, curr)
   ```

4. **Event Processing** (Bloc only)

   ```
   onEventAdded(bloc, event)
   ```

5. **Error Handling**

   ```
   onError(error, bloc, context)
   ```

6. **React Integration**

   ```
   onAdapterCreated() → onAdapterMount() →
   onAdapterRender() → onAdapterUnmount() →
   onAdapterDisposed()
   ```

7. **Bloc Disposal**

   ```
   onBlocDisposed(bloc)
   ```

8. **Shutdown Phase**
   ```
   beforeShutdown() → afterShutdown()
   ```

### Bloc Plugin Hooks

1. **Attachment**

   ```
   onAttach(bloc)
   ```

2. **Event Transform** (Bloc only)

   ```
   transformEvent(event) → [event processed] → onEvent(event)
   ```

3. **State Transform**

   ```
   transformState(prev, next) → [state applied] → onStateChange(prev, curr)
   ```

4. **Error Handling**

   ```
   onError(error, context)
   ```

5. **Detachment**
   ```
   onDetach()
   ```

## Transform Hook Behavior

### State Transformation

```typescript
transformState?(previousState: TState, nextState: TState): TState;
```

- Called **before** state is applied
- Return modified state to change what gets applied
- Return `previousState` to reject the update
- Throwing an error prevents the state change

Example:

```typescript
transformState(prev, next) {
  // Validate
  if (!isValid(next)) {
    return prev; // Reject invalid state
  }

  // Transform
  return {
    ...next,
    lastModified: Date.now()
  };
}
```

### Event Transformation

```typescript
transformEvent?(event: TEvent): TEvent | null;
```

- Called **before** event is processed
- Return modified event to change what gets processed
- Return `null` to cancel the event
- Only available for `Bloc`, not `Cubit`

Example:

```typescript
transformEvent(event) {
  // Filter
  if (shouldIgnore(event)) {
    return null; // Cancel event
  }

  // Transform
  return {
    ...event,
    timestamp: Date.now()
  };
}
```

## Performance Metrics

### PluginExecutionContext

Track plugin performance:

```typescript
interface PluginExecutionContext {
  readonly pluginName: string;
  readonly hookName: string;
  readonly startTime: number;
  readonly blocName?: string;
  readonly blocId?: string;
}
```

### PluginMetrics

Performance statistics:

```typescript
interface PluginMetrics {
  readonly executionTime: number;
  readonly executionCount: number;
  readonly errorCount: number;
  readonly lastError?: Error;
  readonly lastExecutionTime?: number;
}
```

## Type Utilities

### Generic Constraints

```typescript
// Plugin that works with any state
class UniversalPlugin implements BlocPlugin {
  // TState defaults to any
}

// Plugin for specific state type
class TypedPlugin<T extends UserState> implements BlocPlugin<T> {
  // Constrained to UserState or subtypes
}

// Plugin for specific event types
class EventPlugin<S, E extends BaseEvent> implements BlocPlugin<S, E> {
  // Handles BaseEvent or subtypes
}
```

### Helper Types

```typescript
// Extract state type from a bloc
type StateOf<T> = T extends BlocBase<infer S> ? S : never;

// Extract event type from a bloc
type EventOf<T> = T extends Bloc<any, infer E> ? E : never;

// Plugin for specific bloc type
class MyBlocPlugin implements BlocPlugin<StateOf<MyBloc>, EventOf<MyBloc>> {
  // Type-safe for MyBloc
}
```

## Error Handling

### Plugin Errors

Plugins should handle errors gracefully:

```typescript
class SafePlugin implements BlacPlugin {
  onStateChanged(bloc, prev, curr) {
    try {
      this.riskyOperation(curr);
    } catch (error) {
      // Log but don't throw
      console.error(`Plugin error: ${error}`);

      // Optionally notify via error hook
      this.onError?.(error as Error, bloc, {
        phase: 'state-change',
        operation: 'riskyOperation',
      });
    }
  }
}
```

### Error Recovery

System continues even if plugins fail:

1. Plugin errors are caught by BlaC
2. Error logged to console
3. Other plugins continue executing
4. Bloc operation completes normally

## Security Model

### Capability Enforcement

Future versions will enforce declared capabilities:

```typescript
class SecurePlugin implements BlacPlugin {
  capabilities = {
    readState: true,
    transformState: false, // Can't modify
    interceptEvents: false,
    persistData: true,
    accessMetadata: false,
  };

  onStateChanged(bloc, prev, curr) {
    // ✅ Allowed: reading state
    console.log(curr);

    // ❌ Future: would throw if attempting to modify
    // bloc.emit(newState); // SecurityError
  }
}
```

### Best Practices

1. **Declare minimal capabilities**
2. **Sanitize sensitive data**
3. **Validate plugin sources**
4. **Use type constraints**
5. **Audit third-party plugins**

## Migration Guide

### From Custom Observers

Before (custom pattern):

```typescript
class MyBloc extends Bloc<State, Event> {
  private observers: Observer[] = [];

  addObserver(observer: Observer) {
    this.observers.push(observer);
  }

  protected emit(state: State) {
    super.emit(state);
    this.observers.forEach((o) => o.onStateChange(state));
  }
}
```

After (plugin system):

```typescript
class ObserverPlugin implements BlocPlugin<State> {
  onStateChange(prev, curr) {
    // Same logic here
  }
}

bloc.addPlugin(new ObserverPlugin());
```

### From Middleware

Before (middleware pattern):

```typescript
const withLogging = (bloc: BlocBase) => {
  const originalEmit = bloc.emit;
  bloc.emit = (state) => {
    console.log('State:', state);
    originalEmit.call(bloc, state);
  };
};
```

After (plugin system):

```typescript
class LoggingPlugin implements BlocPlugin {
  onStateChange(prev, curr) {
    console.log('State:', curr);
  }
}
```

## Future APIs

Planned additions to the plugin API:

- **Async hooks** for network operations
- **Priority levels** for execution order
- **Plugin dependencies** and ordering
- **Conditional activation** based on environment
- **Performance profiling** built-in
- **Plugin composition** utilities

## See Also

- [Plugin Overview](./overview.md)
- [Creating Plugins](./creating-plugins.md)
- [System Plugins](./system-plugins.md)
- [Bloc Plugins](./bloc-plugins.md)
- [Persistence Plugin](./persistence.md)
