# System Plugins

System plugins (implementing `BlacPlugin`) observe and interact with all bloc instances in your application. They're registered globally and receive lifecycle notifications for every bloc.

## Creating a System Plugin

To create a system plugin, implement the `BlacPlugin` interface:

```typescript
import {
  BlacPlugin,
  BlocBase,
  ErrorContext,
  AdapterMetadata,
} from '@blac/core';

class MySystemPlugin implements BlacPlugin {
  // Required properties
  readonly name = 'my-plugin';
  readonly version = '1.0.0';

  // Optional capabilities declaration
  readonly capabilities = {
    readState: true,
    transformState: false,
    interceptEvents: false,
    persistData: true,
    accessMetadata: false,
  };

  // Lifecycle hooks
  beforeBootstrap() {
    console.log('Plugin system starting up');
  }

  afterBootstrap() {
    console.log('Plugin system ready');
  }

  beforeShutdown() {
    console.log('Plugin system shutting down');
  }

  afterShutdown() {
    console.log('Plugin system shut down');
  }

  // Bloc lifecycle hooks
  onBlocCreated(bloc: BlocBase<any>) {
    console.log(`Bloc created: ${bloc._name}`);
  }

  onBlocDisposed(bloc: BlocBase<any>) {
    console.log(`Bloc disposed: ${bloc._name}`);
  }

  // State observation
  onStateChanged(bloc: BlocBase<any>, previousState: any, currentState: any) {
    console.log(`State changed in ${bloc._name}`, {
      from: previousState,
      to: currentState,
    });
  }

  // Event observation (for Bloc instances only)
  onEventAdded(bloc: Bloc<any, any>, event: any) {
    console.log(`Event added to ${bloc._name}:`, event);
  }

  // Error handling
  onError(error: Error, bloc: BlocBase<any>, context: ErrorContext) {
    console.error(`Error in ${bloc._name} during ${context.phase}:`, error);
  }

  // React adapter hooks
  onAdapterCreated(adapter: any, metadata: AdapterMetadata) {
    console.log('React component connected', metadata.componentName);
  }

  onAdapterRender(adapter: any, metadata: AdapterMetadata) {
    console.log(`Component rendered (${metadata.renderCount} times)`);
  }
}
```

## Registering System Plugins

Register system plugins using the global plugin registry:

```typescript
import { Blac } from '@blac/core';

// Add a plugin
const plugin = new MySystemPlugin();
Blac.instance.plugins.add(plugin);

// Remove a plugin
Blac.instance.plugins.remove('my-plugin');

// Get a specific plugin
const myPlugin = Blac.instance.plugins.get('my-plugin');

// Get all plugins
const allPlugins = Blac.instance.plugins.getAll();

// Clear all plugins
Blac.instance.plugins.clear();
```

## Common Use Cases

### 1. Development Logger

```typescript
class DevLoggerPlugin implements BlacPlugin {
  name = 'dev-logger';
  version = '1.0.0';

  onStateChanged(bloc, previousState, currentState) {
    if (process.env.NODE_ENV !== 'development') return;

    console.groupCollapsed(`[${bloc._name}] State Update`);
    console.log('Previous:', previousState);
    console.log('Current:', currentState);
    console.log('Time:', new Date().toISOString());
    console.groupEnd();
  }

  onError(error, bloc, context) {
    console.error(`[${bloc._name}] Error in ${context.phase}:`, error);
  }
}
```

### 2. Analytics Tracker

```typescript
class AnalyticsPlugin implements BlacPlugin {
  name = 'analytics';
  version = '1.0.0';

  private analytics: AnalyticsService;

  constructor(analytics: AnalyticsService) {
    this.analytics = analytics;
  }

  onBlocCreated(bloc) {
    this.analytics.track('bloc_created', {
      bloc_type: bloc._name,
      timestamp: Date.now(),
    });
  }

  onStateChanged(bloc, previousState, currentState) {
    this.analytics.track('state_changed', {
      bloc_type: bloc._name,
      state_snapshot: this.sanitizeState(currentState),
    });
  }

  private sanitizeState(state: any) {
    // Remove sensitive data before tracking
    const { password, token, ...safe } = state;
    return safe;
  }
}
```

### 3. Performance Monitor

```typescript
class PerformancePlugin implements BlacPlugin {
  name = 'performance';
  version = '1.0.0';

  private metrics = new Map<string, PerformanceMetrics>();

  onStateChanged(bloc, previousState, currentState) {
    const start = performance.now();

    // Track state change performance
    process.nextTick(() => {
      const duration = performance.now() - start;
      this.recordMetric(bloc._name, 'stateChange', duration);
    });
  }

  onAdapterRender(adapter, metadata) {
    this.recordMetric(
      metadata.blocInstance._name,
      'render',
      metadata.renderCount,
    );
  }

  private recordMetric(blocName: string, metric: string, value: number) {
    if (!this.metrics.has(blocName)) {
      this.metrics.set(blocName, {});
    }
    // Record performance data
  }

  getReport() {
    return Array.from(this.metrics.entries());
  }
}
```

### 4. State Snapshot Plugin

```typescript
class SnapshotPlugin implements BlacPlugin {
  name = 'snapshot';
  version = '1.0.0';

  private snapshots = new Map<string, any[]>();
  private maxSnapshots = 10;

  onStateChanged(bloc, previousState, currentState) {
    const key = `${bloc._name}:${bloc._id}`;

    if (!this.snapshots.has(key)) {
      this.snapshots.set(key, []);
    }

    const history = this.snapshots.get(key)!;
    history.push({
      state: currentState,
      timestamp: Date.now(),
    });

    // Keep only recent snapshots
    if (history.length > this.maxSnapshots) {
      history.shift();
    }
  }

  getHistory(bloc: BlocBase<any>) {
    const key = `${bloc._name}:${bloc._id}`;
    return this.snapshots.get(key) || [];
  }

  clearHistory() {
    this.snapshots.clear();
  }
}
```

## Best Practices

### 1. Minimal Performance Impact

System plugins are called frequently, so keep operations lightweight:

```typescript
class EfficientPlugin implements BlacPlugin {
  name = 'efficient';
  version = '1.0.0';

  private pendingUpdates = new Map();

  onStateChanged(bloc, prev, curr) {
    // Batch updates instead of immediate processing
    this.pendingUpdates.set(bloc._name, { prev, curr });

    if (!this.flushScheduled) {
      this.flushScheduled = true;
      setImmediate(() => this.flush());
    }
  }

  private flush() {
    // Process all updates at once
    this.pendingUpdates.forEach((update, blocName) => {
      this.processUpdate(blocName, update);
    });
    this.pendingUpdates.clear();
    this.flushScheduled = false;
  }
}
```

### 2. Error Boundaries

Always handle errors in plugins to prevent cascading failures:

```typescript
class SafePlugin implements BlacPlugin {
  name = 'safe';
  version = '1.0.0';

  onStateChanged(bloc, prev, curr) {
    try {
      this.riskyOperation(bloc, curr);
    } catch (error) {
      console.error(`Plugin error in ${this.name}:`, error);
      // Don't throw - let the app continue
    }
  }
}
```

### 3. Conditional Activation

Enable plugins based on environment or configuration:

```typescript
// Only in development
if (process.env.NODE_ENV === 'development') {
  Blac.instance.plugins.add(new DevLoggerPlugin());
}

// Feature flag
if (config.features.analytics) {
  Blac.instance.plugins.add(new AnalyticsPlugin(analyticsService));
}
```

### 4. Plugin Ordering

Plugins execute in registration order. Register critical plugins first:

```typescript
// Register in priority order
Blac.instance.plugins.add(new ErrorHandlerPlugin()); // First - catch errors
Blac.instance.plugins.add(new PerformancePlugin()); // Second - measure performance
Blac.instance.plugins.add(new LoggerPlugin()); // Third - log events
```

## Plugin Lifecycle

Understanding when hooks are called helps you choose the right one:

1. **Bootstrap Phase**
   - `beforeBootstrap()` - Before any initialization
   - `afterBootstrap()` - System ready

2. **Bloc Creation**
   - `onBlocCreated()` - Immediately after bloc instantiation

3. **State Changes**
   - `onStateChanged()` - After state is updated and subscribers notified

4. **Event Processing** (Bloc only)
   - `onEventAdded()` - When event is added to processing queue

5. **React Integration**
   - `onAdapterCreated()` - When component first uses bloc
   - `onAdapterMount()` - Component mounted
   - `onAdapterRender()` - Each render
   - `onAdapterUnmount()` - Component unmounted
   - `onAdapterDisposed()` - Adapter cleaned up

6. **Disposal**
   - `onBlocDisposed()` - Bloc is being cleaned up

7. **Shutdown**
   - `beforeShutdown()` - System shutting down
   - `afterShutdown()` - Cleanup complete

## Testing System Plugins

Test plugins in isolation:

```typescript
import { BlocTest } from '@blac/core';

describe('MyPlugin', () => {
  let plugin: MyPlugin;

  beforeEach(() => {
    BlocTest.setUp();
    plugin = new MyPlugin();
    Blac.instance.plugins.add(plugin);
  });

  afterEach(() => {
    BlocTest.tearDown();
  });

  it('tracks state changes', () => {
    const bloc = new CounterCubit();
    bloc.increment();

    expect(plugin.getStateChangeCount()).toBe(1);
  });
});
```

## Security Considerations

System plugins have broad access. Consider:

1. **Capability Declaration**: Always declare capabilities accurately
2. **Data Sanitization**: Remove sensitive data before logging/tracking
3. **Access Control**: Validate plugin sources in production
4. **Resource Limits**: Prevent memory leaks with data caps

```typescript
class SecurePlugin implements BlacPlugin {
  name = 'secure';
  version = '1.0.0';

  capabilities = {
    readState: true,
    transformState: false, // Can't modify state
    interceptEvents: false, // Can't block events
    persistData: true, // Can save externally
    accessMetadata: false, // No internal access
  };

  onStateChanged(bloc, prev, curr) {
    // Sanitize sensitive data
    const safe = this.removeSensitiveData(curr);
    this.logStateChange(bloc._name, safe);
  }

  private removeSensitiveData(state: any) {
    const { password, token, ssn, ...safe } = state;
    return safe;
  }
}
```

## Next Steps

- Learn about [Bloc Plugins](./bloc-plugins.md) for instance-specific functionality
- Explore the [Persistence Plugin](./persistence.md) implementation
- See the [Plugin API Reference](./api-reference.md) for complete details
