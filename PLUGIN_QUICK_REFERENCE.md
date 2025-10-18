# BlaC Plugin System - Quick Reference

## Quick Start: Creating a Bloc-Level Plugin

```typescript
import { BlocPlugin, BlocBase, PluginCapabilities } from '@blac/core';

class MyPlugin<TState> implements BlocPlugin<TState> {
  readonly name = 'my-plugin';
  readonly version = '1.0.0';
  readonly capabilities: PluginCapabilities = {
    readState: true,
    transformState: false,
    interceptEvents: false,
    persistData: false,
    accessMetadata: false,
  };

  onAttach(bloc: BlocBase<TState>): void {
    // Called when plugin is attached to bloc
    console.log(`Plugin attached to ${bloc._name}`);
  }

  onStateChange(previousState: TState, currentState: TState): void {
    // Called after state changes
    console.log('State changed:', currentState);
  }

  onDetach(): void {
    // Called when plugin is removed or bloc is disposed
    console.log('Plugin detached');
  }
}

// Usage 1: Static attachment (on bloc class)
class MyCubit extends Cubit<number> {
  static plugins = [new MyPlugin()];

  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
}

// Usage 2: Dynamic attachment
const cubit = new MyCubit();
cubit.addPlugin(new MyPlugin());

// Usage 3: Remove plugin
cubit.removePlugin(cubit.plugins[0]);
```

## Quick Start: Creating a System-Level Plugin

```typescript
import { BlacPlugin, BlacBase, AdapterMetadata } from '@blac/core';

class MySystemPlugin implements BlacPlugin {
  readonly name = 'my-system-plugin';
  readonly version = '1.0.0';

  onBlocCreated(bloc: BlocBase<any>): void {
    console.log(`Bloc created: ${bloc._name}`);
  }

  onStateChanged(bloc: BlocBase<any>, prev: any, current: any): void {
    console.log(`Bloc ${bloc._name} state changed`);
  }

  onBlocDisposed(bloc: BlocBase<any>): void {
    console.log(`Bloc disposed: ${bloc._name}`);
  }

  // React integration
  onAdapterRender(adapter: any, metadata: AdapterMetadata): void {
    console.log(`${metadata.componentName} rendered`);
  }
}

// Register globally
Blac.instance.plugins.add(new MySystemPlugin());
```

## Hook Reference

### Bloc-Level Hooks (BlocPlugin)

| Hook | Called | Access | Can Transform? |
|------|--------|--------|----------------|
| `onAttach()` | When plugin attached | `bloc` param | Read state |
| `onDetach()` | When plugin removed | None | - |
| `onStateChange()` | After state changes | `previousState`, `currentState` | Read only |
| `onEvent()` | After event added | `event` | Read only |
| `onError()` | On error in bloc | `error`, `context` | Read only |
| `transformState()` | Before state applied | `previousState`, `nextState` | **Modify** |
| `transformEvent()` | Before event processed | `event` | **Modify/Cancel** |

### System-Level Hooks (BlacPlugin)

| Hook | Called | Parameters |
|------|--------|------------|
| `beforeBootstrap()` | System startup | None |
| `afterBootstrap()` | System startup | None |
| `beforeShutdown()` | System shutdown | None |
| `afterShutdown()` | System shutdown | None |
| `onBlocCreated()` | When bloc created | `bloc` |
| `onBlocDisposed()` | When bloc disposed | `bloc` |
| `onStateChanged()` | When any bloc state changes | `bloc`, `prev`, `current` |
| `onEventAdded()` | When event added | `bloc`, `event` |
| `onError()` | On error | `error`, `bloc`, `context` |
| `onAdapterCreated()` | React adapter created | `adapter`, `metadata` |
| `onAdapterMount()` | React component mounts | `adapter`, `metadata` |
| `onAdapterUnmount()` | React component unmounts | `adapter`, `metadata` |
| `onAdapterRender()` | React component renders | `adapter`, `metadata` |
| `onAdapterDisposed()` | React adapter disposed | `adapter`, `metadata` |

## Capabilities Declaration

```typescript
const capabilities: PluginCapabilities = {
  readState: true,           // Can read bloc state (default: true)
  transformState: true,      // Can modify state (requires readState)
  interceptEvents: true,     // Can intercept events (requires readState)
  persistData: true,         // Indicates this is a persistence plugin
  accessMetadata: true,      // Can access adapter metadata (system plugins)
};
```

## Common Patterns

### Pattern 1: State Persistence

```typescript
class PersistencePlugin<T> implements BlocPlugin<T> {
  readonly name = 'persistence';
  readonly version = '1.0.0';
  readonly capabilities = {
    readState: true,
    transformState: false,
    interceptEvents: false,
    persistData: true,
    accessMetadata: false,
  };

  constructor(private storage: Storage, private key: string) {}

  async onAttach(bloc: BlocBase<T>): Promise<void> {
    const saved = this.storage.getItem(this.key);
    if (saved) {
      const state = JSON.parse(saved);
      (bloc as any).emit(state);
    }
  }

  onStateChange(_prev: T, current: T): void {
    this.storage.setItem(this.key, JSON.stringify(current));
  }
}
```

### Pattern 2: State Validation

```typescript
class ValidationPlugin<T> implements BlocPlugin<T> {
  readonly name = 'validation';
  readonly version = '1.0.0';
  readonly capabilities = {
    readState: true,
    transformState: true,
    interceptEvents: false,
    persistData: false,
    accessMetadata: false,
  };

  constructor(private validator: (state: T) => boolean) {}

  transformState(_prev: T, next: T): T {
    if (this.validator(next)) {
      return next;
    }
    // Reject state change
    return _prev;
  }
}
```

### Pattern 3: Event Filtering

```typescript
class EventFilterPlugin implements BlocPlugin {
  readonly name = 'event-filter';
  readonly version = '1.0.0';
  readonly capabilities = {
    readState: true,
    transformState: false,
    interceptEvents: true,
    persistData: false,
    accessMetadata: false,
  };

  transformEvent(event: any): any | null {
    // Cancel events that match criteria
    if (shouldFilter(event)) {
      return null;  // Event won't be processed
    }
    return event;
  }
}
```

### Pattern 4: Render Logging (System Plugin)

```typescript
class RenderTrackingPlugin implements BlacPlugin {
  readonly name = 'render-tracking';
  readonly version = '1.0.0';

  onAdapterRender(adapter: any, metadata: AdapterMetadata): void {
    const { componentName, blocInstance, renderCount } = metadata;
    console.log(
      `[${componentName}] render #${renderCount} with ${blocInstance.constructor.name}`
    );
  }
}

Blac.instance.plugins.add(new RenderTrackingPlugin());
```

## Error Handling

### ErrorContext Types

```typescript
type ErrorPhase = 
  | 'initialization'    // During bloc/plugin setup
  | 'state-change'      // During state emission
  | 'event-processing'  // During event handling
  | 'disposal';         // During bloc disposal

interface ErrorContext {
  readonly phase: ErrorPhase;
  readonly operation: string;
  readonly metadata?: Record<string, unknown>;
}
```

### Error Handler Pattern

```typescript
class ErrorHandlingPlugin<T> implements BlocPlugin<T> {
  readonly name = 'error-handler';
  readonly version = '1.0.0';

  onError(error: Error, context: ErrorContext): void {
    console.error(`Error during ${context.phase}: ${context.operation}`, error);
    
    // Optional: Send to error tracking service
    if (context.phase === 'state-change') {
      logToSentry(error, context);
    }
  }
}
```

## Metadata Access (System Plugins)

```typescript
interface AdapterMetadata {
  componentName?: string;              // React component name
  blocInstance: BlocBase<any>;         // The bloc instance
  renderCount: number;                 // Render count
  trackedPaths?: string[];             // Proxy-tracked paths
  isUsingDependencies?: boolean;       // Using manual deps
  lastState?: any;                     // Previous state
  lastDependencyValues?: any[];        // Previous deps
  currentDependencyValues?: any[];     // Current deps
}

// Example usage
onAdapterRender(adapter: any, metadata: AdapterMetadata): void {
  const state = metadata.blocInstance.state;
  const changedPaths = metadata.trackedPaths || [];
  console.log('Changed paths:', changedPaths);
}
```

## Plugin Lifecycle Diagram

```
BlocPlugin Lifecycle:
├─ Created (constructor)
├─ Registered (add to registry)
├─ Attached (onAttach called)
├─ Active
│  ├─ transformState called on each emit
│  ├─ onStateChange called on each emit
│  ├─ transformEvent called on each event (Vertex only)
│  ├─ onEvent called on each event (Vertex only)
│  └─ onError called on errors
├─ Detached (onDetach called)
└─ Destroyed

BlacPlugin Lifecycle:
├─ Created (constructor)
├─ Registered (add to Blac.instance.plugins)
├─ Bootstrap (beforeBootstrap → afterBootstrap)
├─ Active
│  ├─ onBlocCreated on each new bloc
│  ├─ onStateChanged on any state change
│  ├─ onEventAdded on any event (Vertex only)
│  ├─ onAdapterCreated/Mount/Render/Unmount/Disposed (React)
│  └─ onError on errors
└─ Shutdown (beforeShutdown → afterShutdown)
```

## Testing Pattern

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('MyPlugin', () => {
  it('should save state on change', () => {
    const storage = new MockStorage();
    const plugin = new PersistencePlugin(storage, 'key');
    const cubit = new TestCubit();
    
    cubit.addPlugin(plugin);
    cubit.emit(42);
    
    expect(storage.getItem('key')).toBe('42');
  });

  it('should restore state on attach', async () => {
    const storage = new MockStorage();
    storage.setItem('key', '100');
    
    const plugin = new PersistencePlugin(storage, 'key');
    const cubit = new TestCubit();
    cubit.addPlugin(plugin);
    
    await plugin.onAttach(cubit as any);
    
    expect(cubit.state).toBe(100);
  });
});
```

## File Locations

- **Interface definitions**: `/packages/blac/src/plugins/types.ts`
- **BlocPluginRegistry**: `/packages/blac/src/plugins/BlocPluginRegistry.ts`
- **SystemPluginRegistry**: `/packages/blac/src/plugins/SystemPluginRegistry.ts`
- **Examples** (Persistence): `/packages/plugins/bloc/persistence/src/PersistencePlugin.ts`
- **Examples** (Render Logging): `/packages/plugins/system/render-logging/src/RenderLoggingPlugin.ts`
- **Tests**: `/packages/blac/src/__tests__/plugins.test.ts`

## Key Points to Remember

1. **Plugin Order Matters**: Plugins execute in registration order
2. **Transformation vs Observation**: Only `transformState`/`transformEvent` modify data
3. **Async in onAttach Only**: Only `onAttach` can be async; other hooks must be sync
4. **Error Resilience**: Plugin errors don't crash the system; failed plugins are logged
5. **Capability Declaration**: Always declare capabilities for security
6. **Type Safety**: Use generic types `<TState>` and `<TEvent>` for type checking
7. **Static vs Dynamic**: Use `static plugins` for always-attached, `addPlugin()` for dynamic
8. **Memory Management**: Use `WeakRef`/`WeakMap` for adapter tracking in system plugins

