# Creating Plugins

Learn how to create custom plugins to extend BlaC's functionality for your specific needs.

## Plugin Basics

Every plugin in BlaC implements either the `BlacPlugin` interface (for system-wide functionality) or the `BlocPlugin` interface (for bloc-specific functionality).

### Anatomy of a Plugin

```typescript
import { Plugin, PluginCapabilities } from '@blac/core';

class MyPlugin implements Plugin {
  // Required: Unique identifier
  readonly name = 'my-plugin';

  // Required: Semantic version
  readonly version = '1.0.0';

  // Optional: Declare capabilities
  readonly capabilities: PluginCapabilities = {
    readState: true,
    transformState: false,
    interceptEvents: false,
    persistData: false,
    accessMetadata: false,
  };
}
```

## System Plugin Tutorial

Let's create a performance monitoring plugin that tracks state update frequency.

### Step 1: Define the Plugin Structure

```typescript
import { BlacPlugin, BlocBase, Bloc } from '@blac/core';

interface PerformanceMetrics {
  stateChanges: number;
  eventsProcessed: number;
  lastUpdate: number;
  updateFrequency: number[]; // Updates per second over time
}

export class PerformanceMonitorPlugin implements BlacPlugin {
  readonly name = 'performance-monitor';
  readonly version = '1.0.0';
  readonly capabilities = {
    readState: true,
    transformState: false,
    interceptEvents: false,
    persistData: false,
    accessMetadata: true,
  };

  private metrics = new Map<string, PerformanceMetrics>();
  private updateTimers = new Map<string, number[]>();
}
```

### Step 2: Implement Lifecycle Hooks

```typescript
export class PerformanceMonitorPlugin implements BlacPlugin {
  // ... previous code ...

  onBlocCreated(bloc: BlocBase<any>) {
    const key = this.getBlocKey(bloc);
    this.metrics.set(key, {
      stateChanges: 0,
      eventsProcessed: 0,
      lastUpdate: Date.now(),
      updateFrequency: [],
    });
    this.updateTimers.set(key, []);
  }

  onBlocDisposed(bloc: BlocBase<any>) {
    const key = this.getBlocKey(bloc);
    this.metrics.delete(key);
    this.updateTimers.delete(key);
  }

  private getBlocKey(bloc: BlocBase<any>): string {
    return `${bloc._name}:${bloc._id}`;
  }
}
```

### Step 3: Track State Changes

```typescript
export class PerformanceMonitorPlugin implements BlacPlugin {
  // ... previous code ...

  onStateChanged(bloc: BlocBase<any>, previousState: any, currentState: any) {
    const key = this.getBlocKey(bloc);
    const metrics = this.metrics.get(key);
    if (!metrics) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - metrics.lastUpdate;

    // Update metrics
    metrics.stateChanges++;
    metrics.lastUpdate = now;

    // Track update frequency
    const timers = this.updateTimers.get(key)!;
    timers.push(now);

    // Keep only last minute of data
    const oneMinuteAgo = now - 60000;
    const recentTimers = timers.filter((t) => t > oneMinuteAgo);
    this.updateTimers.set(key, recentTimers);

    // Calculate updates per second
    if (recentTimers.length > 1) {
      const duration = (now - recentTimers[0]) / 1000; // seconds
      const frequency = recentTimers.length / duration;
      metrics.updateFrequency.push(frequency);

      // Keep only last 60 data points
      if (metrics.updateFrequency.length > 60) {
        metrics.updateFrequency.shift();
      }
    }
  }

  onEventAdded(bloc: Bloc<any, any>, event: any) {
    const key = this.getBlocKey(bloc);
    const metrics = this.metrics.get(key);
    if (metrics) {
      metrics.eventsProcessed++;
    }
  }
}
```

### Step 4: Add Reporting Methods

```typescript
export class PerformanceMonitorPlugin implements BlacPlugin {
  // ... previous code ...

  getMetrics(bloc: BlocBase<any>): PerformanceMetrics | undefined {
    return this.metrics.get(this.getBlocKey(bloc));
  }

  getAllMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  getReport(): string {
    const reports: string[] = [];

    this.metrics.forEach((metrics, key) => {
      const avgFrequency =
        metrics.updateFrequency.length > 0
          ? metrics.updateFrequency.reduce((a, b) => a + b, 0) /
            metrics.updateFrequency.length
          : 0;

      reports.push(`
        Bloc: ${key}
        State Changes: ${metrics.stateChanges}
        Events Processed: ${metrics.eventsProcessed}
        Avg Update Frequency: ${avgFrequency.toFixed(2)}/sec
      `);
    });

    return reports.join('\n---\n');
  }

  // High-frequency detection
  getHighFrequencyBlocs(threshold = 10): string[] {
    const results: string[] = [];

    this.metrics.forEach((metrics, key) => {
      const recent = metrics.updateFrequency.slice(-10);
      const avgRecent =
        recent.length > 0
          ? recent.reduce((a, b) => a + b, 0) / recent.length
          : 0;

      if (avgRecent > threshold) {
        results.push(`${key} (${avgRecent.toFixed(1)}/sec)`);
      }
    });

    return results;
  }
}
```

### Step 5: Use the Plugin

```typescript
import { Blac } from '@blac/core';
import { PerformanceMonitorPlugin } from './PerformanceMonitorPlugin';

// Register globally
const perfMonitor = new PerformanceMonitorPlugin();
Blac.plugins.add(perfMonitor);

// Later, get performance report
console.log(perfMonitor.getReport());

// Check for performance issues
const highFreq = perfMonitor.getHighFrequencyBlocs();
if (highFreq.length > 0) {
  console.warn('High frequency updates detected:', highFreq);
}
```

## Bloc Plugin Tutorial

Let's create a computed properties plugin that automatically calculates derived values.

### Step 1: Define the Plugin

```typescript
import { BlocPlugin, BlocBase } from '@blac/core';

type ComputedFunction<TState> = (state: TState) => any;

interface ComputedConfig<TState> {
  [key: string]: ComputedFunction<TState>;
}

export class ComputedPropertiesPlugin<TState> implements BlocPlugin<TState> {
  readonly name = 'computed-properties';
  readonly version = '1.0.0';

  private computedValues = new Map<string, any>();
  private bloc?: BlocBase<TState>;

  constructor(private computers: ComputedConfig<TState>) {}
}
```

### Step 2: Implement Lifecycle Methods

```typescript
export class ComputedPropertiesPlugin<TState> implements BlocPlugin<TState> {
  // ... previous code ...

  onAttach(bloc: BlocBase<TState>) {
    this.bloc = bloc;
    // Calculate initial values
    this.recalculate(bloc.state);
  }

  onDetach() {
    this.bloc = undefined;
    this.computedValues.clear();
  }

  onStateChange(previousState: TState, currentState: TState) {
    this.recalculate(currentState);
  }

  private recalculate(state: TState) {
    Object.entries(this.computers).forEach(([key, computer]) => {
      try {
        const value = computer(state);
        this.computedValues.set(key, value);
      } catch (error) {
        console.error(`Error computing ${key}:`, error);
        this.computedValues.set(key, undefined);
      }
    });
  }
}
```

### Step 3: Add Access Methods

```typescript
export class ComputedPropertiesPlugin<TState> implements BlocPlugin<TState> {
  // ... previous code ...

  get<T = any>(key: string): T | undefined {
    return this.computedValues.get(key);
  }

  getAll(): Record<string, any> {
    return Object.fromEntries(this.computedValues);
  }

  // Create a proxy for dot notation access
  get values(): Record<string, any> {
    return new Proxy(
      {},
      {
        get: (_, prop: string) => this.get(prop),
      },
    );
  }
}
```

### Step 4: Use the Plugin

```typescript
// Define your state and cubit
interface CartState {
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  taxRate: number;
  discountPercent: number;
}

class CartCubit extends Cubit<CartState> {
  constructor() {
    super({
      items: [],
      taxRate: 0.08,
      discountPercent: 0
    });

    // Add computed properties
    const computed = new ComputedPropertiesPlugin<CartState>({
      subtotal: (state) =>
        state.items.reduce((sum, item) =>
          sum + (item.price * item.quantity), 0
        ),

      discount: (state) => {
        const subtotal = state.items.reduce((sum, item) =>
          sum + (item.price * item.quantity), 0
        );
        return subtotal * (state.discountPercent / 100);
      },

      taxableAmount: (state) => {
        const subtotal = state.items.reduce((sum, item) =>
          sum + (item.price * item.quantity), 0
        );
        const discount = subtotal * (state.discountPercent / 100);
        return subtotal - discount;
      },

      tax: (state) => {
        const subtotal = state.items.reduce((sum, item) =>
          sum + (item.price * item.quantity), 0
        );
        const discount = subtotal * (state.discountPercent / 100);
        const taxable = subtotal - discount;
        return taxable * state.taxRate;
      },

      total: (state) => {
        const subtotal = state.items.reduce((sum, item) =>
          sum + (item.price * item.quantity), 0
        );
        const discount = subtotal * (state.discountPercent / 100);
        const taxable = subtotal - discount;
        const tax = taxable * state.taxRate;
        return taxable + tax;
      },

      itemCount: (state) =>
        state.items.reduce((sum, item) => sum + item.quantity, 0),

      isEmpty: (state) => state.items.length === 0
    });

    this.addPlugin(computed);

    // Store reference for easy access
    this.computed = computed;
  }

  computed!: ComputedPropertiesPlugin<CartState>;

  addItem = (item: CartState['items'][0]) => {
    this.patch({
      items: [...this.state.items, item]
    });
  };

  setDiscount = (percent: number) => {
    this.patch({ discountPercent: percent });
  };
}

// Use in component
function ShoppingCart() {
  const [state, cart] = useBloc(CartCubit);

  return (
    <div>
      <h2>Shopping Cart ({cart.computed.get('itemCount')} items)</h2>

      <div>Subtotal: ${cart.computed.values.subtotal.toFixed(2)}</div>
      <div>Discount: -${cart.computed.values.discount.toFixed(2)}</div>
      <div>Tax: ${cart.computed.values.tax.toFixed(2)}</div>
      <div>Total: ${cart.computed.values.total.toFixed(2)}</div>

      {cart.computed.get<boolean>('isEmpty') && (
        <p>Your cart is empty</p>
      )}
    </div>
  );
}
```

## Advanced Plugin Patterns

### Conditional Activation

```typescript
class ConditionalPlugin implements BlacPlugin {
  name = 'conditional';
  version = '1.0.0';

  private isActive = false;

  constructor(private condition: () => boolean) {}

  beforeBootstrap() {
    this.isActive = this.condition();
  }

  onStateChanged(bloc, prev, curr) {
    if (!this.isActive) return;
    // Plugin logic here
  }
}

// Use based on environment
Blac.plugins.add(
  new ConditionalPlugin(() => process.env.NODE_ENV === 'development'),
);
```

### Plugin Communication

```typescript
class CommunicatingPlugin implements BlacPlugin {
  name = 'communicator';
  version = '1.0.0';

  private handlers = new Map<string, Function>();

  // Register message handler
  on(event: string, handler: Function) {
    this.handlers.set(event, handler);
  }

  // Send message to other plugins
  emit(event: string, data: any) {
    // Find other plugins that can receive
    const plugins = Blac.plugins.getAll();
    plugins.forEach((plugin) => {
      if ('onMessage' in plugin && plugin !== this) {
        (plugin as any).onMessage(event, data, this.name);
      }
    });
  }

  // Receive messages
  onMessage(event: string, data: any, from: string) {
    const handler = this.handlers.get(event);
    handler?.(data, from);
  }
}
```

### Async Operations in Plugins

```typescript
class AsyncPlugin<TState> implements BlocPlugin<TState> {
  name = 'async-plugin';
  version = '1.0.0';

  private pendingOperations = new Set<Promise<any>>();

  onStateChange(prev: TState, curr: TState) {
    // Don't block state updates
    const operation = this.performAsyncWork(curr).finally(() =>
      this.pendingOperations.delete(operation),
    );

    this.pendingOperations.add(operation);
  }

  private async performAsyncWork(state: TState) {
    try {
      // Async operations here
      await fetch('/api/analytics', {
        method: 'POST',
        body: JSON.stringify(state),
      });
    } catch (error) {
      console.error('Plugin async error:', error);
    }
  }

  onDetach() {
    // Cancel pending operations
    this.pendingOperations.clear();
  }
}
```

## Testing Your Plugins

### Unit Testing

```typescript
import { BlocTest, Cubit } from '@blac/core';
import { PerformanceMonitorPlugin } from './PerformanceMonitorPlugin';

describe('PerformanceMonitorPlugin', () => {
  let plugin: PerformanceMonitorPlugin;

  beforeEach(() => {
    BlocTest.setUp();
    plugin = new PerformanceMonitorPlugin();
    Blac.plugins.add(plugin);
  });

  afterEach(() => {
    BlocTest.tearDown();
  });

  it('tracks state changes', () => {
    class TestCubit extends Cubit<{ count: number }> {
      constructor() {
        super({ count: 0 });
      }
      increment = () => this.emit({ count: this.state.count + 1 });
    }

    const cubit = new TestCubit();

    // Trigger state changes
    cubit.increment();
    cubit.increment();
    cubit.increment();

    const metrics = plugin.getMetrics(cubit);
    expect(metrics?.stateChanges).toBe(3);
  });

  it('detects high frequency updates', async () => {
    class RapidCubit extends Cubit<{ value: number }> {
      constructor() {
        super({ value: 0 });
      }
      update = () => this.emit({ value: Math.random() });
    }

    const cubit = new RapidCubit();

    // Rapid updates
    const interval = setInterval(cubit.update, 50);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    clearInterval(interval);

    const highFreq = plugin.getHighFrequencyBlocs();
    expect(highFreq.length).toBeGreaterThan(0);
  });
});
```

### Integration Testing

```typescript
describe('ComputedPropertiesPlugin Integration', () => {
  it('works with React components', () => {
    const { result } = renderHook(() => useBloc(CartCubit));
    const [, cart] = result.current;

    act(() => {
      cart.addItem({
        id: '1',
        name: 'Widget',
        price: 10,
        quantity: 2,
      });
    });

    expect(cart.computed.get('subtotal')).toBe(20);
    expect(cart.computed.get('itemCount')).toBe(2);
  });
});
```

## Best Practices

### 1. Performance Considerations

- Keep plugin operations lightweight
- Avoid blocking operations in sync hooks
- Use debouncing for expensive calculations
- Clean up resources in lifecycle hooks

### 2. Error Handling

```typescript
class ResilientPlugin implements BlacPlugin {
  name = 'resilient';
  version = '1.0.0';

  onStateChanged(bloc, prev, curr) {
    try {
      this.riskyOperation(curr);
    } catch (error) {
      // Log but don't crash
      console.error(`${this.name} error:`, error);

      // Optional: Report to error tracking
      this.reportError(error, bloc);
    }
  }

  private reportError(error: unknown, bloc: BlocBase<any>) {
    // Send to error tracking service
  }
}
```

### 3. Type Safety

```typescript
// Use generics for type safety
export function createTypedPlugin<TState>() {
  return class TypedPlugin implements BlocPlugin<TState> {
    name = 'typed-plugin';
    version = '1.0.0';

    onStateChange(prev: TState, curr: TState) {
      // Full type safety here
    }
  };
}

// Usage
const MyPlugin = createTypedPlugin<AppState>();
bloc.addPlugin(new MyPlugin());
```

### 4. Documentation

Always document your plugin's:

- Purpose and use cases
- Configuration options
- Performance characteristics
- Any side effects
- Example usage

## Publishing Your Plugin

### Package Structure

```
my-blac-plugin/
├── src/
│   ├── index.ts
│   ├── MyPlugin.ts
│   └── __tests__/
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

### Package.json

```json
{
  "name": "@myorg/blac-plugin-example",
  "version": "1.0.0",
  "description": "Example plugin for BlaC state management",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "peerDependencies": {
    "@blac/core": "^2.0.0"
  },
  "keywords": ["blac", "plugin", "state-management"],
  "license": "MIT"
}
```

### Export Pattern

```typescript
// index.ts
export * from './MyPlugin';
export * from './types';

// Optional: Provide factory function
export function createMyPlugin(options?: MyPluginOptions) {
  return new MyPlugin(options);
}
```

## Next Steps

- Explore the [Plugin API Reference](./api-reference.md)
- See real examples in [System Plugins](./system-plugins.md)
- Learn from the [Persistence Plugin](./persistence.md) implementation
- Share your plugins with the community!
