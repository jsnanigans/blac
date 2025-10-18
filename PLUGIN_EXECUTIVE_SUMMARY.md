# BlaC Plugin System - Executive Summary

## System Architecture

BlaC implements a **two-tier plugin architecture**:

### Tier 1: Bloc-Level Plugins (BlocPlugin)
- Attached to specific bloc instances
- Can **transform** state and events
- Can be dynamically added/removed at runtime
- Support for state persistence, validation, logging
- Type-safe with generic `<TState, TEvent>` parameters

### Tier 2: System-Level Plugins (BlacPlugin)
- Observe all blocs globally
- Monitor bloc lifecycle and React component renders
- Provide performance metrics and error tracking
- Cannot transform state directly (observation-only)
- Support for advanced features like render logging

---

## Core Components

### 1. Type System
**Location**: `/packages/blac/src/plugins/types.ts`

- **BlocPlugin**: 7 hooks (lifecycle, transformation, observation, error handling)
- **BlacPlugin**: 15 hooks (bootstrap, bloc lifecycle, adapter lifecycle, error handling)
- **PluginCapabilities**: 5 flags (readState, transformState, interceptEvents, persistData, accessMetadata)
- **ErrorContext**: 4 error phases (initialization, state-change, event-processing, disposal)
- **AdapterMetadata**: 8 properties for React integration

### 2. BlocPluginRegistry
**Location**: `/packages/blac/src/plugins/BlocPluginRegistry.ts`

Manages bloc-specific plugins:
- Plugin registration/removal
- State and event transformation pipeline
- Execution order preservation
- Capability validation
- Error handling with plugin removal on failure

### 3. SystemPluginRegistry
**Location**: `/packages/blac/src/plugins/SystemPluginRegistry.ts`

Manages global plugins:
- Global plugin registration
- Hook execution with metrics collection
- Performance tracking (execution time, count, errors)
- Double-fault protection
- Bootstrap/shutdown lifecycle

---

## Plugin Lifecycle

### Bloc-Level Plugin Lifecycle
```
1. Created → 2. Registered → 3. Attached → 4. Active → 5. Detached → 6. Destroyed
                                                          ↓
                                            onStateChange()
                                            transformState()
                                            transformEvent()
                                            onEvent()
                                            onError()
```

### System-Level Plugin Lifecycle
```
1. Created → 2. Registered → 3. Bootstrap → 4. Active → 5. Shutdown → 6. Destroyed
                                                          ↓
                                            onBlocCreated()
                                            onStateChanged()
                                            onEventAdded()
                                            onAdapterRender()
                                            onBlocDisposed()
```

---

## Key Features

### Transformation Capabilities
Bloc-level plugins can intercept and modify:
- **State transformations**: `transformState(prev, next) → modified` 
- **Event transformations**: `transformEvent(event) → null | modified`
- **Event cancellation**: Return `null` from `transformEvent()` to prevent processing

### Observer Pattern
Both plugin types can observe:
- State changes (before/after)
- Event addition
- Bloc lifecycle (creation/disposal)
- React component renders (system plugins only)
- Error conditions

### Error Resilience
- Plugin errors don't crash the system
- Failed plugins automatically removed
- Error handlers have context (phase, operation, metadata)
- System plugins have double-fault protection

### Type Safety
- Generic type parameters `<TState>` for state typing
- Generic type parameters `<TEvent>` for event typing
- TypeScript compile-time checking

---

## Real-World Implementations

### PersistencePlugin
**Location**: `/packages/plugins/bloc/persistence/src/PersistencePlugin.ts`

Features:
- State serialization/deserialization
- Storage adapter abstraction
- State migrations
- Selective persistence (choose fields to save)
- Encryption support
- Version tracking
- Debounced saves

### RenderLoggingPlugin
**Location**: `/packages/plugins/system/render-logging/src/RenderLoggingPlugin.ts`

Features:
- Tracks React component renders
- Detects render reasons (mount, state change, dependency change)
- Analyzes proxy-tracked dependencies
- Logs changed paths in state
- Configurable filtering and output levels

---

## Integration Points

### In BlocBase
- Constructor: Registers and attaches static plugins
- `_pushState()`: Transforms state before emission
- `addPlugin()`: Runtime plugin addition
- `removePlugin()`: Plugin removal
- `dispose()`: Detaches all plugins on cleanup

### In Vertex (Events)
- `add()`: Transforms and notifies plugins of events
- Executes event handlers after plugin processing

### In Blac (Global)
- `notifyBlocCreated()`: Informs system plugins
- `notifyStateChanged()`: Propagates state changes
- `notifyEventAdded()`: Tracks events
- `notifyBlocDisposed()`: Cleanup notifications

---

## Access Patterns

### Access to Bloc State and Metadata

**In bloc-level hooks**:
```typescript
onAttach(bloc) {
  const state = bloc.state;        // Current state
  const id = bloc._id;              // Bloc ID
  const name = bloc._name;          // Bloc name
}
```

**In transformation hooks**:
```typescript
transformState(previousState, nextState) {
  // Both states available
  return modifiedState;
}
```

**In system-level hooks**:
```typescript
onAdapterRender(adapter, metadata) {
  const state = metadata.blocInstance.state;
  const componentName = metadata.componentName;
  const trackedPaths = metadata.trackedPaths;
}
```

---

## Performance Considerations

### Metrics Tracking
System plugins track per-hook metrics:
- Total execution time
- Execution count
- Error count
- Last error
- Last execution time

Access via: `Blac.instance.plugins.getMetrics('plugin-name')`

### Optimization Tips
1. Keep transformation hooks fast
2. Use debouncing in `onStateChange()` for expensive operations
3. Use capability flags to enable only needed features
4. Use WeakMap/WeakRef for adapter tracking in system plugins

---

## File Structure Summary

```
packages/blac/src/plugins/
├── types.ts                           # Interface definitions
├── BlocPluginRegistry.ts              # Bloc-level registry
├── SystemPluginRegistry.ts            # System-level registry
└── index.ts                           # Public exports

packages/plugins/
├── bloc/persistence/src/
│   ├── PersistencePlugin.ts          # Persistence implementation
│   ├── storage-adapters/             # Storage implementations
│   ├── types.ts                      # Plugin types
│   └── __tests__/
│       └── PersistencePlugin.test.ts
│
└── system/render-logging/src/
    ├── RenderLoggingPlugin.ts        # Render logging implementation
    └── index.ts

packages/blac/src/
├── BlocBase.ts                        # Plugin integration
├── Vertex.ts                          # Event transformation
├── Blac.ts                            # Global plugin registry
└── __tests__/
    └── plugins.test.ts                # Plugin tests
```

---

## Best Practices

1. **Always declare capabilities**: Helps with security and enables registry validation
2. **Use static plugins for always-attached behavior**: Define `static plugins` on class
3. **Use dynamic plugins for runtime scenarios**: Call `addPlugin()` after instance creation
4. **Keep hooks synchronous**: Only `onAttach()` can be async
5. **Handle errors gracefully**: Plugin errors shouldn't crash the system
6. **Type your plugins**: Use generic parameters for type safety
7. **Test with mocks**: Mock storage and bloc for testing
8. **Monitor performance**: Check metrics on system plugins
9. **Use memory-efficient tracking**: WeakRef/WeakMap for long-lived tracking
10. **Document capabilities**: Declare exactly what your plugin needs

---

## Common Use Cases

| Use Case | Plugin Type | Key Hooks |
|----------|------------|-----------|
| State Persistence | Bloc-level | `onAttach`, `onStateChange` |
| State Validation | Bloc-level | `transformState` |
| Event Filtering | Bloc-level | `transformEvent` |
| Event Logging | System-level | `onEventAdded` |
| Render Optimization | System-level | `onAdapterRender` |
| Error Tracking | Both | `onError` |
| Performance Monitoring | System-level | All hooks (with metrics) |
| Undo/Redo | Bloc-level | `transformState` |
| State Time-Travel | System-level | `onStateChanged` |

---

## Quick Integration Example

```typescript
// 1. Create plugin
class MyPlugin<T> implements BlocPlugin<T> {
  readonly name = 'my-plugin';
  readonly version = '1.0.0';
  
  onStateChange(prev: T, current: T): void {
    console.log('State changed:', current);
  }
}

// 2. Attach to bloc
class MyBloc extends Vertex<State, Event> {
  static plugins = [new MyPlugin()];
  
  constructor() {
    super(initialState);
  }
}

// OR dynamically
const bloc = new MyBloc();
bloc.addPlugin(new MyPlugin());
```

---

**For detailed implementation examples and all hook signatures, see:**
- `/packages/blac/plugin-system-research.md` - Full research documentation
- `/packages/blac/PLUGIN_QUICK_REFERENCE.md` - Code examples and patterns
