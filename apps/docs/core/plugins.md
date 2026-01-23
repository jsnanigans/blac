# Plugins

Plugins extend BlaC with custom functionality via lifecycle hooks.

## Simple Listeners

For quick debugging, use `globalRegistry.on()`:

```typescript
import { globalRegistry } from '@blac/core';

// Listen to instance creation
const unsubscribe = globalRegistry.on('created', (container) => {
  console.log('Created:', container.name);
});

// Listen to state changes
globalRegistry.on('stateChanged', (container, prevState, newState, callstack) => {
  console.log('State changed:', container.name);
  if (callstack) console.log('Callstack:', callstack);
});

// Listen to disposal
globalRegistry.on('disposed', (container) => {
  console.log('Disposed:', container.name);
});

// Stop listening
unsubscribe();
```

### Available Events

| Event | Callback Arguments |
|-------|-------------------|
| `created` | `(container)` |
| `stateChanged` | `(container, prevState, newState, callstack?)` |
| `disposed` | `(container)` |

## BlacPlugin Interface

For structured plugins:

```typescript
import type { BlacPlugin, PluginContext } from '@blac/core';

const myPlugin: BlacPlugin = {
  name: 'my-plugin',
  version: '1.0.0',

  onInstall(context: PluginContext) {
    console.log('Plugin installed');
  },

  onInstanceCreated(instance, context) {
    const meta = context.getInstanceMetadata(instance);
    console.log('Created:', meta.name, meta.instanceId);
  },

  onStateChanged(instance, previousState, currentState, callstack, context) {
    console.log('State changed:', instance.name);
  },

  onInstanceDisposed(instance, context) {
    console.log('Disposed:', instance.name);
  },

  onUninstall() {
    console.log('Plugin uninstalled');
  }
};
```

### Lifecycle Hooks

| Hook | When Called |
|------|-------------|
| `onInstall` | Plugin is registered |
| `onInstanceCreated` | State container created |
| `onStateChanged` | State emitted |
| `onInstanceDisposed` | Instance disposed |
| `onUninstall` | Plugin is removed |

## Plugin Context

`PluginContext` provides safe access to registry data:

```typescript
onInstanceCreated(instance, context) {
  // Get metadata about instance
  const meta = context.getInstanceMetadata(instance);
  // { name, instanceId, isIsolated, isKeepAlive, refCount, createdAt }

  // Get current state
  const state = context.getState(instance);

  // Query all instances of a type
  const counters = context.queryInstances(CounterCubit);

  // Get all registered type constructors
  const types = context.getAllTypes();

  // Get registry statistics
  const stats = context.getStats();
  // { registeredTypes, totalInstances, typeBreakdown }
}
```

## Example: Analytics Plugin

```typescript
const analyticsPlugin: BlacPlugin = {
  name: 'analytics',
  version: '1.0.0',

  onInstanceCreated(instance, context) {
    analytics.track('bloc_created', {
      name: instance.name,
      type: instance.constructor.name,
    });
  },

  onStateChanged(instance, prevState, newState, callstack, context) {
    analytics.track('state_changed', {
      bloc: instance.name,
      changes: Object.keys(newState).filter(
        key => newState[key] !== prevState[key]
      ),
    });
  },

  onInstanceDisposed(instance) {
    analytics.track('bloc_disposed', {
      name: instance.name,
    });
  },
};
```

## Example: Persistence Plugin

```typescript
const persistencePlugin: BlacPlugin = {
  name: 'persistence',
  version: '1.0.0',

  private persistedTypes = new Set<string>(),

  onInstall(context) {
    // Register which types to persist
    this.persistedTypes.add('SettingsCubit');
    this.persistedTypes.add('CartCubit');
  },

  onInstanceCreated(instance, context) {
    if (!this.persistedTypes.has(instance.constructor.name)) return;

    // Restore saved state
    const saved = localStorage.getItem(`blac:${instance.name}`);
    if (saved) {
      const state = JSON.parse(saved);
      instance.emit(state);
    }
  },

  onStateChanged(instance, prevState, newState, callstack, context) {
    if (!this.persistedTypes.has(instance.constructor.name)) return;

    // Save state
    localStorage.setItem(`blac:${instance.name}`, JSON.stringify(newState));
  },
};
```

## Example: Debug Logger Plugin

```typescript
const debugPlugin: BlacPlugin = {
  name: 'debug-logger',
  version: '1.0.0',

  onInstanceCreated(instance) {
    console.log(`[BlaC] Created: ${instance.name}`);
  },

  onStateChanged(instance, prevState, newState, callstack) {
    console.group(`[BlaC] ${instance.name} state changed`);
    console.log('Previous:', prevState);
    console.log('Current:', newState);
    if (callstack) console.log('Callstack:', callstack);
    console.groupEnd();
  },

  onInstanceDisposed(instance) {
    console.log(`[BlaC] Disposed: ${instance.name}`);
  },
};
```

## Use Cases

- **DevTools**: Inspect and debug state containers
- **Analytics**: Track user actions and state changes
- **Persistence**: Save and restore state
- **Logging**: Debug state flow
- **Performance**: Monitor state update frequency
- **Validation**: Validate state transitions

## See Also

- [System Events](/core/system-events) - Instance-level events
- [Logging](/core/logging) - Built-in logging
