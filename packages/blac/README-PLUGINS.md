# BlaC Plugin System

BlaC provides a powerful dual-plugin system that allows you to extend functionality at both the system and bloc levels.

## Overview

The plugin system consists of two types of plugins:

1. **System Plugins (BlacPlugin)** - Global plugins that observe all blocs in the system
2. **Bloc Plugins (BlocPlugin)** - Plugins attached to specific bloc instances

## Quick Start

### System Plugin Example

```typescript
import { Blac, BlacPlugin } from '@blac/core';

// Create a system-wide logging plugin
const loggingPlugin: BlacPlugin = {
  name: 'logging',
  version: '1.0.0',
  onStateChanged: (bloc, prev, next) => {
    console.log(`${bloc._name} changed:`, { prev, next });
  },
};

// Register globally
Blac.instance.plugins.add(loggingPlugin);
```

### Bloc Plugin Example

```typescript
import { Cubit, BlocPlugin } from '@blac/core';

// Create a bloc-specific persistence plugin
class CounterCubit extends Cubit<number> {
  static plugins = [new PersistencePlugin<number>({ key: 'counter' })];

  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
}
```

## System Plugins (BlacPlugin)

System plugins are registered globally and receive notifications about all blocs in the system. They're perfect for cross-cutting concerns like logging, analytics, or debugging.

### Creating a System Plugin

```typescript
import { BlacPlugin, ErrorContext } from '@blac/core';

class LoggingPlugin implements BlacPlugin {
  readonly name = 'logging';
  readonly version = '1.0.0';

  // Lifecycle hooks
  beforeBootstrap(): void {
    console.log('System bootstrapping...');
  }

  afterBootstrap(): void {
    console.log('System ready');
  }

  // Bloc lifecycle hooks
  onBlocCreated<T>(bloc: BlocBase<T>): void {
    console.log(`Bloc created: ${bloc._name}`);
  }

  onBlocDisposed<T>(bloc: BlocBase<T>): void {
    console.log(`Bloc disposed: ${bloc._name}`);
  }

  // State observation
  onStateChanged<T>(bloc: BlocBase<T>, prev: T, next: T): void {
    console.log(`State changed in ${bloc._name}:`, { prev, next });
  }

  // Event observation (Blocs only)
  onEventAdded<T, E>(bloc: Bloc<E, T>, event: E): void {
    console.log(`Event dispatched to ${bloc._name}:`, event);
  }

  // Error handling
  onError(error: Error, bloc: BlocBase<unknown>, context: ErrorContext): void {
    console.error(`Error in ${bloc._name}:`, error);
  }
}
```

### Registering System Plugins

```typescript
import { Blac } from '@blac/core';

// Add plugin
Blac.instance.plugins.add(new LoggingPlugin());

// Remove plugin
Blac.instance.plugins.remove('logging');

// Get plugin
const plugin = Blac.instance.plugins.get('logging');
```

## Bloc Plugins (BlocPlugin)

Bloc plugins are attached to specific bloc instances and can transform state and events. They're ideal for bloc-specific concerns like validation, persistence, or state transformation.

### Creating a Bloc Plugin

```typescript
import { BlocPlugin, PluginCapabilities } from '@blac/core';

class ValidationPlugin<T> implements BlocPlugin<T> {
  readonly name = 'validation';
  readonly version = '1.0.0';

  // Declare capabilities
  readonly capabilities: PluginCapabilities = {
    readState: true,
    transformState: true,
    interceptEvents: false,
    persistData: false,
    accessMetadata: false,
  };

  constructor(private validator: (state: T) => boolean) {}

  // Transform state before it's applied
  transformState(prevState: T, nextState: T): T {
    if (this.validator(nextState)) {
      return nextState;
    }
    console.warn('State validation failed');
    return prevState; // Reject invalid state
  }

  // Lifecycle hooks
  onAttach(bloc: BlocBase<T>): void {
    console.log(`Validation attached to ${bloc._name}`);
  }

  onDetach(): void {
    console.log('Validation detached');
  }

  // Observe state changes
  onStateChange(prev: T, next: T): void {
    console.log('State changed:', { prev, next });
  }
}
```

### Attaching Bloc Plugins

There are two ways to attach plugins to blocs:

#### 1. Static Declaration

```typescript
class UserCubit extends Cubit<UserState> {
  static plugins = [
    new ValidationPlugin<UserState>(isValidUser),
    new PersistencePlugin<UserState>({ key: 'user-state' }),
  ];

  constructor() {
    super(initialState);
  }
}
```

#### 2. Dynamic Attachment

```typescript
const cubit = new UserCubit();
cubit.addPlugin(new ValidationPlugin(isValidUser));
cubit.removePlugin('validation');
```

## Plugin Capabilities

Bloc plugins declare their capabilities for security and optimization:

```typescript
interface PluginCapabilities {
  readState: boolean; // Can read bloc state
  transformState: boolean; // Can modify state transitions
  interceptEvents: boolean; // Can modify events (Bloc only)
  persistData: boolean; // Can persist data externally
  accessMetadata: boolean; // Can access bloc metadata
}
```

## Example: Persistence Plugin

```typescript
class PersistencePlugin<T> implements BlocPlugin<T> {
  readonly name = 'persistence';
  readonly version = '1.0.0';
  readonly capabilities = {
    readState: true,
    transformState: true,
    interceptEvents: false,
    persistData: true,
    accessMetadata: false,
  };

  constructor(
    private key: string,
    private storage = localStorage,
  ) {}

  onAttach(bloc: BlocBase<T>): void {
    // Restore state from storage
    const saved = this.storage.getItem(this.key);
    if (saved) {
      const state = JSON.parse(saved);
      (bloc as any)._state = state; // Restore state
    }
  }

  onStateChange(prev: T, next: T): void {
    // Save state to storage
    this.storage.setItem(this.key, JSON.stringify(next));
  }
}
```

## Plugin Execution Order

1. **Bloc Plugins execute first** - They can transform state/events
2. **System Plugins execute second** - They observe the final state

For multiple plugins of the same type:

- Plugins execute in the order they were added
- State transformations are chained
- Event transformations are chained

## Performance Monitoring

The system tracks plugin performance automatically:

```typescript
// Get metrics for a system plugin
const metrics = Blac.instance.plugins.getMetrics('logging');

// Metrics include:
// - executionTime: Total time spent in plugin
// - executionCount: Number of times called
// - errorCount: Number of errors
// - lastExecutionTime: Most recent execution duration
```

## Best Practices

1. **Keep plugins focused** - Each plugin should have a single responsibility
2. **Handle errors gracefully** - Plugins should not crash the system
3. **Use capabilities** - Declare only the capabilities you need
4. **Avoid side effects in transforms** - Keep transformations pure
5. **Debounce expensive operations** - Like persistence or network calls

## Migration from Old Plugin System

The old plugin system has been completely replaced. Key differences:

1. **Two plugin types** instead of one
2. **Synchronous execution** - No more async race conditions
3. **Type safety** - Full TypeScript support
4. **Capability-based security** - Plugins declare what they need
5. **Better performance** - Metrics and optimizations built-in

To migrate:

1. Determine if your plugin is system-wide or bloc-specific
2. Implement the appropriate interface (BlacPlugin or BlocPlugin)
3. Update hook method signatures (all synchronous now)
4. Register using the new API
