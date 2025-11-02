# Plugin System

## Overview

BlaC provides a lightweight lifecycle event system that enables you to observe and react to state container events. This plugin system is designed for building developer tools, debugging utilities, analytics integrations, and other cross-cutting concerns.

### Key Features

- **Type-Safe Events**: Conditional types ensure listeners receive correct arguments
- **Zero Overhead**: No performance cost when no plugins are active
- **Error Isolation**: Plugin errors don't crash your application
- **Simple API**: Clean functional unsubscribe pattern

### Common Use Cases

- Redux DevTools integration
- Logging and debugging
- Analytics and metrics
- Performance monitoring
- State persistence
- Time-travel debugging

## Quick Start

```typescript
import { globalRegistry } from '@blac/core';

// Subscribe to state changes
const unsubscribe = globalRegistry.on('stateChanged', (container, prev, next) => {
  console.log(`${container.name} changed:`, prev, '->', next);
});

// Later: clean up
unsubscribe();
```

## Lifecycle Events

BlaC emits four lifecycle events that you can observe:

### `created`

Emitted when a new StateContainer is constructed.

```typescript
globalRegistry.on('created', (container: StateContainer<any>) => {
  console.log('Container created:', container.name);
});
```

**When it fires**: Immediately after construction, before any state changes.

### `stateChanged`

Emitted when a container's state changes.

```typescript
globalRegistry.on('stateChanged', (container, previousState, currentState) => {
  console.log('State changed:', {
    container: container.name,
    from: previousState,
    to: currentState,
  });
});
```

**When it fires**: After state changes via `emit()` or `update()`. Only fires when state actually changes (reference inequality).

### `eventAdded`

Emitted when an event is added to a Vertex (Bloc).

```typescript
globalRegistry.on('eventAdded', (vertex, event) => {
  console.log('Event added:', {
    bloc: vertex.name,
    event: event.type,
    payload: event,
  });
});
```

**When it fires**: Before the event is processed, useful for debugging event flow.

### `disposed`

Emitted when a container is disposed.

```typescript
globalRegistry.on('disposed', (container) => {
  console.log('Container disposed:', container.name);
});
```

**When it fires**: After the container is cleaned up but before listeners are cleared.

## Basic Examples

### Simple Logging Plugin

```typescript
export function createLogger() {
  const logs: string[] = [];

  const unsubscribeCreated = globalRegistry.on('created', (container) => {
    logs.push(`[CREATED] ${container.name} (${container.instanceId})`);
  });

  const unsubscribeState = globalRegistry.on('stateChanged', (container, prev, next) => {
    logs.push(`[STATE] ${container.name}: ${JSON.stringify(prev)} -> ${JSON.stringify(next)}`);
  });

  const unsubscribeDisposed = globalRegistry.on('disposed', (container) => {
    logs.push(`[DISPOSED] ${container.name}`);
  });

  return {
    logs,
    disconnect: () => {
      unsubscribeCreated();
      unsubscribeState();
      unsubscribeDisposed();
    },
  };
}

// Usage
const logger = createLogger();

// Your app runs...

// Later
logger.disconnect();
console.log(logger.logs);
```

### Analytics Plugin

```typescript
interface AnalyticsEvent {
  type: string;
  containerName: string;
  timestamp: number;
  metadata?: any;
}

export class AnalyticsPlugin {
  private events: AnalyticsEvent[] = [];
  private unsubscribers: Array<() => void> = [];

  connect() {
    // Track state changes
    this.unsubscribers.push(
      globalRegistry.on('stateChanged', (container) => {
        this.events.push({
          type: 'state_change',
          containerName: container.name,
          timestamp: Date.now(),
        });
      })
    );

    // Track Bloc events
    this.unsubscribers.push(
      globalRegistry.on('eventAdded', (container, event) => {
        this.events.push({
          type: 'bloc_event',
          containerName: container.name,
          timestamp: Date.now(),
          metadata: { eventType: event.type },
        });
      })
    );
  }

  disconnect() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  getStats() {
    return {
      totalEvents: this.events.length,
      byType: this.events.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
```

### Performance Monitor

```typescript
export class PerformanceMonitor {
  private metrics = {
    stateChanges: 0,
    averageTime: 0,
    slowChanges: [] as Array<{ container: string; duration: number }>,
  };

  private startTimes = new Map<any, number>();
  private unsubscribers: Array<() => void> = [];

  connect() {
    this.unsubscribers.push(
      globalRegistry.on('created', (container) => {
        this.startTimes.set(container, performance.now());
      })
    );

    this.unsubscribers.push(
      globalRegistry.on('stateChanged', (container) => {
        const start = this.startTimes.get(container);
        if (!start) return;

        const duration = performance.now() - start;
        this.metrics.stateChanges++;

        // Update average
        this.metrics.averageTime =
          (this.metrics.averageTime * (this.metrics.stateChanges - 1) + duration) /
          this.metrics.stateChanges;

        // Track slow changes (> 16ms)
        if (duration > 16) {
          this.metrics.slowChanges.push({
            container: container.name,
            duration,
          });
        }

        this.startTimes.set(container, performance.now());
      })
    );
  }

  disconnect() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.startTimes.clear();
  }

  getReport() {
    return {
      ...this.metrics,
      slowChangesCount: this.metrics.slowChanges.length,
    };
  }
}
```

## Advanced: Redux DevTools Integration

Here's a complete example of integrating with Redux DevTools:

```typescript
import { StateContainerRegistry } from '@blac/core';

export class ReduxDevToolsPlugin {
  private extension: any;
  private unsubscribers: Array<() => void> = [];

  constructor(private registry: StateContainerRegistry) {}

  connect() {
    // Connect to Redux DevTools Extension
    this.extension = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.connect({
      name: 'BlaC State',
      features: {
        pause: true,
        export: true,
        import: true,
        jump: true,
      },
    });

    if (!this.extension) {
      console.warn('Redux DevTools Extension not found');
      return;
    }

    // Track container creation
    this.unsubscribers.push(
      this.registry.on('created', (container) => {
        this.extension.send(
          { type: '@@INIT', containerName: container.name },
          { [container.name]: container.state }
        );
      })
    );

    // Track state changes
    this.unsubscribers.push(
      this.registry.on('stateChanged', (container, prev, next) => {
        this.extension.send(
          {
            type: `${container.name}/STATE_CHANGE`,
            payload: { prev, next },
          },
          {
            [container.name]: next,
          }
        );
      })
    );

    // Track Bloc events
    this.unsubscribers.push(
      this.registry.on('eventAdded', (container, event) => {
        this.extension.send(
          {
            type: `${container.name}/${event.type}`,
            payload: event,
          },
          {
            [container.name]: container.state,
          }
        );
      })
    );

    // Track disposal
    this.unsubscribers.push(
      this.registry.on('disposed', (container) => {
        this.extension.send(
          { type: '@@DISPOSE', containerName: container.name },
          {}
        );
      })
    );
  }

  disconnect() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.extension?.disconnect();
  }
}

// Usage
import { globalRegistry } from '@blac/core';

const devTools = new ReduxDevToolsPlugin(globalRegistry);
devTools.connect();
```

## Best Practices

### Always Unsubscribe

Plugins create listeners that hold references to your callback functions. Always unsubscribe to prevent memory leaks:

```typescript
// ❌ Bad: Memory leak
globalRegistry.on('stateChanged', (container, prev, next) => {
  console.log('State changed');
});

// ✅ Good: Proper cleanup
const unsubscribe = globalRegistry.on('stateChanged', (container, prev, next) => {
  console.log('State changed');
});

// In cleanup (component unmount, app shutdown, etc.)
unsubscribe();
```

### Handle Errors in Listeners

While BlaC isolates listener errors, you should still handle them gracefully:

```typescript
globalRegistry.on('stateChanged', (container, prev, next) => {
  try {
    // Your plugin logic
    sendToAnalytics(container.state);
  } catch (error) {
    console.error('Analytics error:', error);
    // Optionally: report to error tracking service
  }
});
```

### Use Plugin Classes for Complex Logic

For anything beyond simple logging, create a plugin class:

```typescript
export class MyPlugin {
  private unsubscribers: Array<() => void> = [];

  connect() {
    // Subscribe to events
    this.unsubscribers.push(
      globalRegistry.on('created', this.handleCreated)
    );
    // ... more subscriptions
  }

  disconnect() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  private handleCreated = (container: StateContainer<any>) => {
    // Plugin logic here
  };
}
```

### Performance: Check Listener Count

If performance is critical and plugins are optional:

```typescript
// Only do expensive work if someone is listening
if (hasListeners) {
  performExpensiveOperation();
}
```

BlaC already optimizes this internally - when no listeners are registered, events have near-zero overhead.

### Development vs Production

Consider only enabling certain plugins in development:

```typescript
if (process.env.NODE_ENV === 'development') {
  const devTools = new ReduxDevToolsPlugin(globalRegistry);
  devTools.connect();

  const logger = createLogger();
  // ...
}
```

## API Reference

### `StateContainerRegistry`

The registry manages container instances and emits lifecycle events.

#### `on<E extends LifecycleEvent>(event: E, listener: LifecycleListener<E>): () => void`

Subscribe to a lifecycle event.

**Parameters**:
- `event`: The lifecycle event name (`'created'`, `'stateChanged'`, `'eventAdded'`, `'disposed'`)
- `listener`: Type-safe listener function (signature varies by event)

**Returns**: Unsubscribe function

**Example**:
```typescript
const unsubscribe = globalRegistry.on('created', (container) => {
  console.log('Created:', container.name);
});

// Later
unsubscribe();
```

#### `emit(event: LifecycleEvent, ...args: any[]): void`

**Internal use only**. Emit a lifecycle event to all listeners.

This method is called automatically by BlaC internals. You should not call it directly.

### Listener Types

```typescript
export type LifecycleListener<E extends LifecycleEvent> =
  E extends 'created'
    ? (container: StateContainer<any>) => void
    : E extends 'stateChanged'
      ? (container: StateContainer<any>, previousState: any, currentState: any) => void
      : E extends 'eventAdded'
        ? (container: Vertex<any, any>, event: any) => void
        : E extends 'disposed'
          ? (container: StateContainer<any>) => void
          : never;
```

### Global Registry

```typescript
import { globalRegistry } from '@blac/core';
```

The default global registry instance. Use this unless you need multiple isolated registries.

### Custom Registry

You can create custom registries for testing or isolation:

```typescript
import { StateContainerRegistry, StateContainer } from '@blac/core';

const customRegistry = new StateContainerRegistry();
StateContainer.setRegistry(customRegistry);

// Now all containers use the custom registry
```

## TypeScript Support

The plugin API is fully typed. TypeScript will enforce correct listener signatures:

```typescript
// ✅ Correct
globalRegistry.on('stateChanged', (container, prev, next) => {
  // All parameters are properly typed
});

// ❌ Type error: wrong number of parameters
globalRegistry.on('created', (container, prev, next) => {
  //                                    ^^^^ Error
});

// ✅ Type inference works
const unsubscribe = globalRegistry.on('created', (container) => {
  container.name; // ✅ string
  container.state; // ✅ any (or infer from context)
  container.dispose(); // ✅ () => void
});
```

## See Also

- [Instance Management](/core/instance-management) - How containers are created and destroyed
- [Lifecycle](/core/lifecycle) - Container lifecycle hooks
- [Logging](/core/logging) - Built-in logging system
