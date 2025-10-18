# BlaC Plugin System Architecture Research

## Overview

The BlaC state management library implements a sophisticated two-tier plugin system:

1. **System-level Plugins (BlacPlugin)**: Global plugins that observe all blocs and adapters
2. **Bloc-level Plugins (BlocPlugin)**: Bloc-specific plugins that can transform behavior and be attached/detached dynamically

---

## 1. Plugin Interface Definitions

### BlocPlugin Interface (Bloc-level)
**Location**: `/packages/blac/src/plugins/types.ts` (lines 83-96)

```typescript
export interface BlocPlugin<TState = any, TEvent = never> extends Plugin {
  // Transform hooks - can modify data (requires transformState capability)
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

**Key Capabilities**:
- `transformState`: Can intercept and modify state before it's applied
- `transformEvent`: Can intercept and modify or cancel events (return null to cancel)
- `onAttach`: Called when plugin is attached to a bloc (for initialization)
- `onDetach`: Called when plugin is removed or bloc is disposed
- `onStateChange`: Observes state changes (read-only)
- `onEvent`: Observes events added to bloc (read-only)
- `onError`: Error handler for plugin-related errors

### BlacPlugin Interface (System-level)
**Location**: `/packages/blac/src/plugins/types.ts` (lines 54-78)

```typescript
export interface BlacPlugin extends Plugin {
  // Lifecycle hooks - all synchronous
  beforeBootstrap?(): void;
  afterBootstrap?(): void;
  beforeShutdown?(): void;
  afterShutdown?(): void;

  // System-wide observations
  onBlocCreated?(bloc: BlocBase<any>): void;
  onBlocDisposed?(bloc: BlocBase<any>): void;
  onStateChanged?(bloc: BlocBase<any>, previousState: any, currentState: any): void;
  onEventAdded?(bloc: Vertex<any, any>, event: any): void;
  onError?(error: Error, bloc: BlocBase<unknown>, context: ErrorContext): void;

  // Adapter lifecycle hooks (React integration)
  onAdapterCreated?(adapter: any, metadata: AdapterMetadata): void;
  onAdapterMount?(adapter: any, metadata: AdapterMetadata): void;
  onAdapterUnmount?(adapter: any, metadata: AdapterMetadata): void;
  onAdapterRender?(adapter: any, metadata: AdapterMetadata): void;
  onAdapterDisposed?(adapter: any, metadata: AdapterMetadata): void;
}
```

### Base Plugin Interface
**Location**: `/packages/blac/src/plugins/types.ts` (lines 31-35)

```typescript
export interface Plugin {
  readonly name: string;
  readonly version: string;
  readonly capabilities?: PluginCapabilities;
}
```

### PluginCapabilities
**Location**: `/packages/blac/src/plugins/types.ts` (lines 20-26)

```typescript
export interface PluginCapabilities {
  readonly readState: boolean;
  readonly transformState: boolean;
  readonly interceptEvents: boolean;
  readonly persistData: boolean;
  readonly accessMetadata: boolean;
}
```

**Validation**: BlocPluginRegistry validates that:
- `transformState` capability requires `readState` capability
- `interceptEvents` capability requires `readState` capability

---

## 2. Plugin Registry Implementations

### BlocPluginRegistry (Bloc-level)
**Location**: `/packages/blac/src/plugins/BlocPluginRegistry.ts`

Manages bloc-specific plugins with transformation and notification capabilities:

**Key Methods**:
- `add(plugin)`: Register a plugin
- `remove(pluginName)`: Remove a plugin (calls `onDetach` if attached)
- `attach(bloc)`: Attach all registered plugins to a bloc
- `transformState(previousState, nextState)`: Apply state transformations in registration order
- `transformEvent(event)`: Apply event transformations in registration order
- `notifyStateChange(previousState, currentState)`: Notify all plugins of state change
- `notifyEvent(event)`: Notify all plugins of event
- `notifyError(error, context)`: Notify plugins of errors

**Features**:
- Maintains execution order of plugins
- Capability-based access control
- Error handling with plugin removal on failure
- Supports both transformations and observations

### SystemPluginRegistry (System-level)
**Location**: `/packages/blac/src/plugins/SystemPluginRegistry.ts`

Manages global plugins that observe all blocs:

**Key Methods**:
- `add(plugin)`: Register a system plugin
- `remove(pluginName)`: Remove a system plugin
- `getAll()`: Get all plugins in execution order
- `executeHook(hookName, args, errorHandler)`: Execute a hook on all plugins
- `bootstrap()`: Call bootstrap lifecycle hooks
- `shutdown()`: Call shutdown lifecycle hooks
- `notifyBlocCreated(bloc)`
- `notifyBlocDisposed(bloc)`
- `notifyStateChanged(bloc, previousState, currentState)`
- `notifyEventAdded(bloc, event)`
- `notifyAdapterCreated/Mount/Unmount/Render/Disposed(adapter, metadata)`

**Features**:
- Performance metrics collection (execution time, count, errors)
- Hook execution with error handling
- Double-fault protection for error handlers

---

## 3. Plugin Lifecycle Flow

### Bloc-Level Plugin Lifecycle

```
1. Plugin Created
   └─ Plugin instance created with configuration

2. Plugin Registered
   └─ plugin.add(plugin) called on BlocPluginRegistry

3. Plugin Attached (on bloc initialization)
   └─ registry.attach(bloc) calls onAttach() for all plugins
   └─ Plugin can initialize, restore state, etc.

4. Active Phase
   ├─ On event add (Vertex only):
   │  ├─ transformEvent() called (can cancel event by returning null)
   │  └─ notifyEvent() called
   │
   ├─ On state change:
   │  ├─ transformState() called (can modify new state)
   │  └─ notifyStateChange() called
   │
   └─ On error:
      └─ onError() called with error context

5. Plugin Detached
   └─ onDetach() called when:
      - Plugin is explicitly removed via removePlugin()
      - Bloc is disposed
      - Plugin fails during attach (error cleanup)

6. Cleanup
   └─ Plugin resources released
```

### System-Level Plugin Lifecycle

```
1. Plugin Created
   └─ Plugin instance created with configuration

2. Plugin Registered
   └─ Blac.instance.plugins.add(plugin) called

3. Bootstrap Phase (optional, manual)
   ├─ beforeBootstrap() called
   └─ afterBootstrap() called

4. Active Phase (observes all blocs)
   ├─ onBlocCreated() - when bloc is created
   ├─ onBlocDisposed() - when bloc is disposed
   ├─ onStateChanged() - when any bloc's state changes
   ├─ onEventAdded() - when event added to any Vertex
   ├─ onAdapterCreated/Mount/Unmount/Render/Disposed() - React integration
   └─ onError() - on bloc errors

5. Shutdown Phase (optional, manual)
   ├─ beforeShutdown() called
   └─ afterShutdown() called
```

---

## 4. Integration with BlocBase

### Constructor Integration
**Location**: `/packages/blac/src/BlocBase.ts` (lines 140-150)

```typescript
constructor(initialState: S) {
  // ...
  // Initialize plugin registry
  this._plugins = new BlocPluginRegistry<S, any>();

  // Register static plugins (defined on class)
  if (Constructor.plugins && Array.isArray(Constructor.plugins)) {
    for (const plugin of Constructor.plugins) {
      this._plugins.add(plugin);
    }
  }

  // Attach all plugins
  this._plugins.attach(this);
}
```

### State Emission Integration
**Location**: `/packages/blac/src/BlocBase.ts` (lines 249-264)

```typescript
_pushState(newState: S, oldState: S, action?: unknown): void {
  // ... lifecycle checks ...

  // Apply plugins - transform state
  const transformedState = this._plugins.transformState(
    oldState,
    newState,
  ) as S;
  this._state = transformedState;

  // Notify bloc-level plugins
  this._plugins.notifyStateChange(oldState, transformedState);

  // Notify system-level plugins
  this.blacContext?.plugins.notifyStateChanged(
    this as any,
    oldState,
    transformedState,
  );

  // ... handle batching ...
  this._subscriptionManager.notify(transformedState, oldState, action);
}
```

### Plugin API Methods
**Location**: `/packages/blac/src/BlocBase.ts` (lines 307-322)

```typescript
addPlugin(plugin: BlocPlugin<S, any>): void {
  this._plugins.add(plugin);
  
  // If plugins are already attached (bloc is active), attach the new plugin
  if ((this._plugins as any).attached && plugin.onAttach) {
    try {
      plugin.onAttach(this);
    } catch (error) {
      console.error(`Plugin '${plugin.name}' error in onAttach:`, error);
    }
  }
}

removePlugin(plugin: BlocPlugin<S, any>): void {
  this._plugins.remove(plugin.name);
}

get plugins(): ReadonlyArray<BlocPlugin<S, any>> {
  return this._plugins.getAll();
}
```

### System Plugin Registration
**Location**: `/packages/blac/src/Blac.ts`

```typescript
export class Blac {
  readonly plugins = new SystemPluginRegistry();
  
  // When creating a bloc:
  this.plugins.notifyBlocCreated(newBloc);
}
```

---

## 5. Event Processing with Plugins

### Event Transformation & Notification
**Location**: `/packages/blac/src/Vertex.ts` (lines 57-87)

```typescript
public add = async (action: A): Promise<void> => {
  // 1. Transform event through bloc-level plugins
  let transformedAction: A | null = action;
  try {
    transformedAction = (this._plugins as any).transformEvent(action);
  } catch (error) {
    console.error('Error transforming event:', error);
  }

  // 2. Event was cancelled by plugin (if null returned)
  if (transformedAction === null) {
    return;
  }

  // 3. Notify bloc-level plugins
  try {
    (this._plugins as any).notifyEvent(transformedAction);
  } catch (error) {
    console.error('Error notifying plugins of event:', error);
  }

  // 4. Notify system-level plugins
  Blac.instance.plugins.notifyEventAdded(this as any, transformedAction);

  // 5. Queue for processing
  this._eventQueue.push(transformedAction);
  
  if (!this._isProcessingEvent) {
    await this._processEventQueue();
  }
};
```

---

## 6. Real-World Example: PersistencePlugin

**Location**: `/packages/plugins/bloc/persistence/src/PersistencePlugin.ts`

### Key Implementation Details

```typescript
export class PersistencePlugin<TState> implements BlocPlugin<TState> {
  readonly name = 'persistence';
  readonly version = '2.0.0';
  readonly capabilities: PluginCapabilities = {
    readState: true,
    transformState: false,
    interceptEvents: false,
    persistData: true,
    accessMetadata: false,
  };

  async onAttach(bloc: BlocBase<TState>): Promise<void> {
    // 1. Try migrations first
    if (this.options.migrations) {
      const migrated = await this.tryMigrations();
      if (migrated) {
        (bloc as any).emit(migrated);
        return;
      }
    }

    // 2. Restore state from storage
    const storedData = await Promise.resolve(this.storage.getItem(this.key));
    if (storedData) {
      // Handle deserialization, decryption, version checking
      let state: TState = this.deserialize(storedData);
      
      // Handle selective persistence with merge
      if (this.options.select && this.options.merge) {
        state = this.options.merge(state, bloc.state);
      }
      
      (bloc as any).emit(state);
    }
  }

  onStateChange(previousState: TState, currentState: TState): void {
    // Skip saving while hydrating
    if (this.isHydrating) return;

    // Debounce saves
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      void this.saveState(currentState);
    }, this.debounceMs);
  }

  onDetach(): void {
    // Clear pending saves
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
  }

  onError(error: Error, context: ErrorContext): void {
    if (this.options.onError) {
      this.options.onError(error, context.operation);
    } else {
      console.error(`PersistencePlugin error:`, error);
    }
  }

  // Additional features:
  // - Encryption support
  // - State migrations
  // - Selective persistence (only save certain fields)
  // - Version tracking
  // - Metadata storage
}
```

### How PersistencePlugin Works

1. **Attach**: Loads and restores saved state from storage
2. **State Change**: Debounces and saves new state
3. **Detach**: Clears pending saves
4. **Error Handling**: Custom error handler for storage errors

---

## 7. Advanced Example: RenderLoggingPlugin

**Location**: `/packages/plugins/system/render-logging/src/RenderLoggingPlugin.ts`

### System-Level Plugin with Adapter Hooks

```typescript
export class RenderLoggingPlugin implements BlacPlugin {
  readonly name = 'RenderLoggingPlugin';
  readonly version = '1.0.0';
  readonly capabilities = {
    readState: true,
    transformState: false,
    interceptEvents: false,
    persistData: false,
    accessMetadata: true, // Can access adapter metadata
  };

  private adapterLastState = new WeakMap<any, any>();
  private adapterLastDependencies = new WeakMap<any, any[]>();

  onAdapterCreated = (adapter: any, metadata: AdapterMetadata) => {
    // Initialize tracking for this adapter instance
    this.adapterLastState.set(adapter, metadata.lastState);
    this.adapterLastDependencies.set(adapter, metadata.lastDependencyValues);
  };

  onAdapterRender = (adapter: any, metadata: AdapterMetadata) => {
    if (!this.config.enabled) return;

    // Access adapter metadata to detect changes:
    const { 
      componentName, 
      blocInstance, 
      renderCount, 
      trackedPaths,        // Proxy-tracked dependency paths
      isUsingDependencies,
      currentDependencyValues 
    } = metadata;

    // Determine render reason and log it
    let reason = this.determineRenderReason(metadata);
    RerenderLogger.logRerender({ componentName, blocName, reason });
  };

  onAdapterDisposed = (adapter: any, metadata: AdapterMetadata) => {
    // Clean up tracking
    this.adapterLastState.delete(adapter);
    this.adapterLastDependencies.delete(adapter);
  };
}
```

### Access to AdapterMetadata

```typescript
export interface AdapterMetadata {
  componentName?: string;           // React component name
  blocInstance: BlocBase<any>;      // The bloc instance
  renderCount: number;              // Number of renders
  trackedPaths?: string[];          // Proxy-tracked property access paths
  isUsingDependencies?: boolean;    // Using manual dependencies
  lastState?: any;                  // Previous state
  lastDependencyValues?: any[];     // Previous dependency values
  currentDependencyValues?: any[];  // Current dependency values
}
```

---

## 8. How Plugins Access Bloc State and Metadata

### Direct Access Methods

1. **In `onAttach` / `onStateChange` hooks**:
   ```typescript
   onAttach(bloc: BlocBase<TState>): void {
     const state = bloc.state;  // Read current state
     const id = bloc._id;       // Access bloc ID
     const name = bloc._name;   // Access bloc name
   }
   ```

2. **In `transformState` hook**:
   ```typescript
   transformState(previousState: TState, nextState: TState): TState {
     // Access both previous and next states
     return modifiedState;
   }
   ```

3. **In adapter hooks** (system plugins):
   ```typescript
   onAdapterRender(adapter: any, metadata: AdapterMetadata): void {
     // Access bloc instance and metadata
     const state = metadata.blocInstance.state;
     const trackedPaths = metadata.trackedPaths;
     const componentName = metadata.componentName;
   }
   ```

### Capability-Based Access

Plugins can declare what they need via `PluginCapabilities`:

```typescript
const capabilities: PluginCapabilities = {
  readState: true,              // Can read state
  transformState: true,         // Can modify state
  interceptEvents: true,        // Can intercept events
  persistData: true,            // Can persist data
  accessMetadata: true,         // Can access metadata (system plugins)
};
```

---

## 9. Error Handling in Plugins

### ErrorContext Type
**Location**: `/packages/blac/src/plugins/types.ts` (lines 7-15)

```typescript
export interface ErrorContext {
  readonly phase: 'initialization' | 'state-change' | 'event-processing' | 'disposal';
  readonly operation: string;
  readonly metadata?: Record<string, unknown>;
}
```

### Error Handling Strategy

**Bloc-level Plugins**:
- Errors in `transformState`/`transformEvent` → continue with untransformed data
- Errors in `onAttach` → plugin is removed
- Errors in hooks → logged but don't prevent operation
- Plugins wrap errors with error category information

**System-level Plugins**:
- Errors in any hook → logged and continue
- Double-fault protection: if error handler fails, just log
- Metrics track error count per hook

---

## 10. Static Plugins on Class Definition

Plugins can be attached via static class properties:

```typescript
class UserBloc extends Vertex<UserState, UserEvent> {
  static plugins = [
    new PersistencePlugin({
      key: 'user-state',
      storage: localStorage,
    }),
  ];

  constructor() {
    super(initialState);
    // Plugins automatically registered and attached
  }
}
```

---

## 11. Plugin Performance Metrics

**SystemPluginRegistry** tracks per-plugin, per-hook metrics:

```typescript
export interface PluginMetrics {
  readonly executionTime: number;       // Total execution time (ms)
  readonly executionCount: number;      // Number of executions
  readonly errorCount: number;          // Number of errors
  readonly lastError?: Error;           // Last error encountered
  readonly lastExecutionTime?: number;  // Time of last execution
}
```

Access via:
```typescript
const metrics = Blac.instance.plugins.getMetrics('plugin-name');
```

---

## File Path Summary

| Component | File Path |
|-----------|-----------|
| Plugin Type Definitions | `/packages/blac/src/plugins/types.ts` |
| BlocPluginRegistry | `/packages/blac/src/plugins/BlocPluginRegistry.ts` |
| SystemPluginRegistry | `/packages/blac/src/plugins/SystemPluginRegistry.ts` |
| BlocBase Integration | `/packages/blac/src/BlocBase.ts` |
| Vertex (Event) Integration | `/packages/blac/src/Vertex.ts` |
| Blac Global Registry | `/packages/blac/src/Blac.ts` |
| PersistencePlugin | `/packages/plugins/bloc/persistence/src/PersistencePlugin.ts` |
| RenderLoggingPlugin | `/packages/plugins/system/render-logging/src/RenderLoggingPlugin.ts` |
| Plugin Tests | `/packages/blac/src/__tests__/plugins.test.ts` |
| PersistencePlugin Tests | `/packages/plugins/bloc/persistence/src/__tests__/PersistencePlugin.test.ts` |

---

## Key Design Principles

1. **Two-tier Architecture**: System plugins observe all blocs; bloc plugins are specific to instances
2. **Capability-based Security**: Plugins declare what they need; registry validates constraints
3. **Graceful Degradation**: Plugin errors don't crash system; failed plugins are removed or skipped
4. **Performance Metrics**: SystemPluginRegistry tracks execution times and errors
5. **Transformation Pipeline**: Plugins can modify state and events before they take effect
6. **Lifecycle Hooks**: Both attach/detach for resource management and observe hooks for monitoring
7. **Error Handling**: Different phases (initialization, state-change, event-processing, disposal) tracked
8. **Type Safety**: Generic type parameters for state and event types
9. **Flexibility**: Runtime plugin addition via `addPlugin()` on bloc instances
10. **React Integration**: System plugins get adapter metadata for React component tracking

