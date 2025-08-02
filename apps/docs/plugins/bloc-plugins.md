# Bloc Plugins

Bloc plugins (implementing `BlocPlugin`) are attached to specific bloc instances, allowing you to add custom behavior to individual blocs without modifying their core logic.

## Creating a Bloc Plugin

To create a bloc plugin, implement the `BlocPlugin` interface:

```typescript
import { BlocPlugin, PluginCapabilities, ErrorContext } from '@blac/core';

class MyBlocPlugin<TState, TEvent = never>
  implements BlocPlugin<TState, TEvent>
{
  // Required properties
  readonly name = 'my-bloc-plugin';
  readonly version = '1.0.0';

  // Optional capabilities
  readonly capabilities: PluginCapabilities = {
    readState: true,
    transformState: true,
    interceptEvents: true,
    persistData: false,
    accessMetadata: false,
  };

  // Transform hooks - can modify data
  transformState(previousState: TState, nextState: TState): TState {
    // Modify state before it's applied
    return nextState;
  }

  transformEvent(event: TEvent): TEvent | null {
    // Modify or filter events (null to cancel)
    return event;
  }

  // Lifecycle hooks
  onAttach(bloc: BlocBase<TState>) {
    console.log(`Plugin attached to ${bloc._name}`);
  }

  onDetach() {
    console.log('Plugin detached');
  }

  // Observation hooks
  onStateChange(previousState: TState, currentState: TState) {
    console.log('State changed:', { from: previousState, to: currentState });
  }

  onEvent(event: TEvent) {
    console.log('Event processed:', event);
  }

  onError(error: Error, context: ErrorContext) {
    console.error(`Error during ${context.phase}:`, error);
  }
}
```

## Attaching Plugins to Blocs

Attach plugins during bloc creation or afterwards:

```typescript
// Method 1: During creation
class MyBloc extends Bloc<MyState, MyEvent> {
  constructor() {
    super(initialState);

    // Add plugin
    this.addPlugin(new MyBlocPlugin());
  }
}

// Method 2: After creation
const bloc = new MyBloc();
bloc.addPlugin(new MyBlocPlugin());

// Remove a plugin
bloc.removePlugin('my-bloc-plugin');

// Get a plugin
const plugin = bloc.getPlugin('my-bloc-plugin');

// Get all plugins
const plugins = bloc.getPlugins();
```

## Common Use Cases

### 1. State Validation Plugin

```typescript
interface ValidationRule<T> {
  validate: (state: T) => boolean;
  message: string;
}

class ValidationPlugin<TState> implements BlocPlugin<TState> {
  name = 'validation';
  version = '1.0.0';

  constructor(private rules: ValidationRule<TState>[]) {}

  transformState(previousState: TState, nextState: TState): TState {
    // Validate state before applying
    for (const rule of this.rules) {
      if (!rule.validate(nextState)) {
        console.error(`Validation failed: ${rule.message}`);
        // Return previous state to prevent invalid update
        return previousState;
      }
    }
    return nextState;
  }
}

// Usage
class UserBloc extends Cubit<UserState> {
  constructor() {
    super(initialState);

    this.addPlugin(
      new ValidationPlugin([
        {
          validate: (state) => state.email.includes('@'),
          message: 'Email must be valid',
        },
        {
          validate: (state) => state.age >= 0,
          message: 'Age cannot be negative',
        },
      ]),
    );
  }
}
```

### 2. Undo/Redo Plugin

```typescript
class UndoRedoPlugin<TState> implements BlocPlugin<TState> {
  name = 'undo-redo';
  version = '1.0.0';

  private history: TState[] = [];
  private currentIndex = -1;
  private maxHistory = 50;
  private bloc?: BlocBase<TState>;

  onAttach(bloc: BlocBase<TState>) {
    this.bloc = bloc;
    this.history = [bloc.state];
    this.currentIndex = 0;
  }

  onStateChange(previousState: TState, currentState: TState) {
    // Add to history if not from undo/redo
    if (!this.isUndoRedo) {
      this.currentIndex++;
      this.history = this.history.slice(0, this.currentIndex);
      this.history.push(currentState);

      // Limit history size
      if (this.history.length > this.maxHistory) {
        this.history.shift();
        this.currentIndex--;
      }
    }
    this.isUndoRedo = false;
  }

  private isUndoRedo = false;

  undo() {
    if (this.currentIndex > 0 && this.bloc) {
      this.currentIndex--;
      this.isUndoRedo = true;
      (this.bloc as any).emit(this.history[this.currentIndex]);
    }
  }

  redo() {
    if (this.currentIndex < this.history.length - 1 && this.bloc) {
      this.currentIndex++;
      this.isUndoRedo = true;
      (this.bloc as any).emit(this.history[this.currentIndex]);
    }
  }

  get canUndo() {
    return this.currentIndex > 0;
  }

  get canRedo() {
    return this.currentIndex < this.history.length - 1;
  }
}

// Usage
const bloc = new EditorBloc();
const undoRedo = new UndoRedoPlugin<EditorState>();
bloc.addPlugin(undoRedo);

// Later in UI
<button onClick={() => undoRedo.undo()} disabled={!undoRedo.canUndo}>
  Undo
</button>
```

### 3. Computed Properties Plugin

```typescript
class ComputedPlugin<TState> implements BlocPlugin<TState> {
  name = 'computed';
  version = '1.0.0';

  private computedValues = new Map<string, any>();
  private computers = new Map<string, (state: TState) => any>();

  constructor(computers: Record<string, (state: TState) => any>) {
    Object.entries(computers).forEach(([key, computer]) => {
      this.computers.set(key, computer);
    });
  }

  onStateChange(previousState: TState, currentState: TState) {
    // Recompute values
    this.computers.forEach((computer, key) => {
      const newValue = computer(currentState);
      this.computedValues.set(key, newValue);
    });
  }

  get<T>(key: string): T | undefined {
    return this.computedValues.get(key);
  }

  getAll(): Record<string, any> {
    return Object.fromEntries(this.computedValues);
  }
}

// Usage
interface CartState {
  items: Array<{ price: number; quantity: number }>;
  taxRate: number;
}

const cartBloc = new CartBloc();
const computed = new ComputedPlugin<CartState>({
  subtotal: (state) =>
    state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  tax: (state) => {
    const subtotal = state.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    return subtotal * state.taxRate;
  },
  total: (state) => {
    const subtotal = state.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    return subtotal * (1 + state.taxRate);
  },
});

cartBloc.addPlugin(computed);

// Access computed values
const total = computed.get<number>('total');
```

### 4. Event Filtering Plugin

```typescript
class EventFilterPlugin<TState, TEvent> implements BlocPlugin<TState, TEvent> {
  name = 'event-filter';
  version = '1.0.0';

  constructor(
    private filter: (event: TEvent) => boolean,
    private onFiltered?: (event: TEvent) => void,
  ) {}

  transformEvent(event: TEvent): TEvent | null {
    if (this.filter(event)) {
      return event; // Allow event
    }

    // Event filtered out
    this.onFiltered?.(event);
    return null; // Cancel event
  }
}

// Usage: Rate limiting
class RateLimitPlugin<TState, TEvent> extends EventFilterPlugin<
  TState,
  TEvent
> {
  private lastEventTime = new Map<string, number>();

  constructor(
    private getEventType: (event: TEvent) => string,
    private minInterval: number = 1000,
  ) {
    super((event) => {
      const type = this.getEventType(event);
      const now = Date.now();
      const last = this.lastEventTime.get(type) || 0;

      if (now - last >= this.minInterval) {
        this.lastEventTime.set(type, now);
        return true;
      }
      return false;
    });
  }
}

// Apply rate limiting to search
class SearchBloc extends Bloc<SearchState, SearchEvent> {
  constructor() {
    super(initialState);

    this.addPlugin(
      new RateLimitPlugin(
        (event) => event.constructor.name,
        500, // Min 500ms between same event types
      ),
    );
  }
}
```

## Advanced Patterns

### 1. Plugin Composition

Combine multiple plugins for complex behavior:

```typescript
class CompositePlugin<TState, TEvent> implements BlocPlugin<TState, TEvent> {
  name = 'composite';
  version = '1.0.0';

  constructor(private plugins: BlocPlugin<TState, TEvent>[]) {}

  transformState(prev: TState, next: TState): TState {
    return this.plugins.reduce(
      (state, plugin) => plugin.transformState?.(prev, state) ?? state,
      next,
    );
  }

  onAttach(bloc: BlocBase<TState>) {
    this.plugins.forEach((p) => p.onAttach?.(bloc));
  }

  onStateChange(prev: TState, curr: TState) {
    this.plugins.forEach((p) => p.onStateChange?.(prev, curr));
  }
}
```

### 2. Async Plugin Operations

Handle async operations carefully:

```typescript
class AsyncPersistencePlugin<TState> implements BlocPlugin<TState> {
  name = 'async-persistence';
  version = '1.0.0';

  private saveQueue: TState[] = [];
  private saving = false;

  onStateChange(prev: TState, curr: TState) {
    this.saveQueue.push(curr);
    this.processSaveQueue();
  }

  private async processSaveQueue() {
    if (this.saving || this.saveQueue.length === 0) return;

    this.saving = true;
    const state = this.saveQueue.pop()!;
    this.saveQueue = []; // Skip intermediate states

    try {
      await this.saveState(state);
    } catch (error) {
      console.error('Failed to save state:', error);
    } finally {
      this.saving = false;

      // Process any new states that arrived
      if (this.saveQueue.length > 0) {
        this.processSaveQueue();
      }
    }
  }

  private async saveState(state: TState) {
    // Async save operation
  }
}
```

### 3. Plugin Communication

Enable plugins to communicate:

```typescript
interface PluginMessage {
  from: string;
  to: string;
  type: string;
  data: any;
}

class MessagingPlugin<TState> implements BlocPlugin<TState> {
  name = 'messaging';
  version = '1.0.0';

  private bloc?: BlocBase<TState>;
  private handlers = new Map<string, (message: PluginMessage) => void>();

  onAttach(bloc: BlocBase<TState>) {
    this.bloc = bloc;
  }

  send(to: string, type: string, data: any) {
    const targetPlugin = this.bloc?.getPlugin(to);
    if (targetPlugin && 'onMessage' in targetPlugin) {
      (targetPlugin as any).onMessage({
        from: this.name,
        to,
        type,
        data,
      });
    }
  }

  onMessage(message: PluginMessage) {
    const handler = this.handlers.get(message.type);
    handler?.(message);
  }

  on(type: string, handler: (message: PluginMessage) => void) {
    this.handlers.set(type, handler);
  }
}
```

## Best Practices

### 1. State Immutability

Always return new state objects:

```typescript
class ImmutablePlugin<TState> implements BlocPlugin<TState> {
  name = 'immutable';
  version = '1.0.0';

  transformState(prev: TState, next: TState): TState {
    // Ensure new reference
    if (prev === next) {
      console.warn('State mutation detected!');
      return { ...next }; // Force new object
    }
    return next;
  }
}
```

### 2. Error Handling

Handle errors gracefully:

```typescript
class SafePlugin<TState> implements BlocPlugin<TState> {
  name = 'safe';
  version = '1.0.0';

  transformState(prev: TState, next: TState): TState {
    try {
      return this.validateState(next);
    } catch (error) {
      console.error('Plugin error:', error);
      return prev; // Fallback to previous state
    }
  }
}
```

### 3. Performance Optimization

Minimize overhead in frequently called methods:

```typescript
class OptimizedPlugin<TState> implements BlocPlugin<TState> {
  name = 'optimized';
  version = '1.0.0';

  private cache = new WeakMap();

  transformState(prev: TState, next: TState): TState {
    // Use caching for expensive operations
    if (this.cache.has(next)) {
      return this.cache.get(next);
    }

    const processed = this.expensiveProcess(next);
    this.cache.set(next, processed);
    return processed;
  }
}
```

## Testing Bloc Plugins

Test plugins in isolation and with blocs:

```typescript
describe('ValidationPlugin', () => {
  let bloc: UserBloc;
  let plugin: ValidationPlugin<UserState>;

  beforeEach(() => {
    plugin = new ValidationPlugin([
      {
        validate: (state) => state.age >= 0,
        message: 'Age must be positive',
      },
    ]);

    bloc = new UserBloc();
    bloc.addPlugin(plugin);
  });

  it('prevents invalid state updates', () => {
    const initialAge = bloc.state.age;

    // Try to set negative age
    bloc.updateAge(-5);

    // State should not change
    expect(bloc.state.age).toBe(initialAge);
  });

  it('allows valid state updates', () => {
    bloc.updateAge(25);
    expect(bloc.state.age).toBe(25);
  });
});
```

## Next Steps

- Explore the [Persistence Plugin](./persistence.md) for a real-world example
- Learn about [System Plugins](./system-plugins.md) for global functionality
- Check the [Plugin API Reference](./api-reference.md) for complete details
