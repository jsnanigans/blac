# Task: Refactor BlocBase

**Priority:** High
**Category:** Short-term Improvements
**Estimated Effort:** 2-3 weeks
**Dependencies:**
- Recommended: Complete "Break Circular Dependencies" first
- Optional: Complete "Fix Silent Failures" first for cleaner error handling

## Overview

Decompose the monolithic BlocBase class into focused, single-responsibility components to improve maintainability, testability, and extensibility.

## Problem Statement

The `BlocBase` class violates the Single Responsibility Principle by handling too many concerns:

1. **State Management** - Holding and emitting state
2. **Lifecycle Management** - Managing disposal and lifecycle states
3. **Consumer Tracking** - Tracking React components and observers
4. **Plugin Management** - Managing and executing plugins
5. **Configuration** - Managing bloc-specific configuration

This creates:
- **High complexity** - Difficult to understand and modify
- **Poor testability** - Hard to test individual concerns in isolation
- **Tight coupling** - Changes ripple across unrelated functionality
- **Limited extensibility** - Hard to customize individual aspects

### Current BlocBase Responsibilities

**File:** `packages/blac/src/BlocBase.ts` (~600+ lines)

```typescript
export abstract class BlocBase<TState> {
  // State management
  protected _state: TState;
  protected _emitState(newState: TState): void { }

  // Lifecycle management
  protected _disposalState: DisposalState;
  async dispose(): Promise<void> { }

  // Consumer tracking
  private _consumerRefs: Map<string, WeakRef<any>>;
  _validateConsumers(): void { }

  // Plugin management
  private _plugins: BlacPlugin[];
  private _executePluginLifecycleEvent(): void { }

  // Configuration
  static isolated: boolean;
  static keepAlive: boolean;

  // ... and more
}
```

## Goals

1. **Decompose BlocBase** into focused, single-responsibility classes
2. **Improve testability** through composition and dependency injection
3. **Maintain API compatibility** for existing users
4. **Enable extensibility** through clear interfaces
5. **Reduce complexity** of each individual component

## Proposed Architecture

### Component Breakdown

```
BlocBase (Facade/Coordinator)
├── StateManager<TState>          - State holding and emission
├── LifecycleManager              - Disposal and lifecycle states
├── ConsumerTracker               - Consumer/observer tracking
├── PluginHost                    - Plugin execution and management
└── ConfigurationManager          - Configuration and metadata
```

## Acceptance Criteria

### Must Have
- [ ] BlocBase decomposed into 5 separate classes
- [ ] Each class has single, well-defined responsibility
- [ ] All existing tests pass without modification
- [ ] Public API remains backwards compatible
- [ ] Each component is independently testable
- [ ] Components communicate through clear interfaces

### Should Have
- [ ] Components use dependency injection for flexibility
- [ ] Each component has comprehensive unit tests
- [ ] Performance is maintained or improved
- [ ] Documentation explains new architecture
- [ ] Migration guide for advanced users

### Nice to Have
- [ ] Components are replaceable (e.g., custom StateManager)
- [ ] Architecture diagram in documentation
- [ ] Each component exported for advanced usage
- [ ] Performance benchmarks comparing old vs new

## Detailed Component Design

### 1. StateManager<TState>

**Responsibility:** Manage state storage and emission

```typescript
// packages/blac/src/core/StateManager.ts
export class StateManager<TState> {
  private _state: TState;
  private _previousState: TState | undefined;
  private observers: Set<StateObserver<TState>>;

  constructor(initialState: TState) {
    this._state = initialState;
    this.observers = new Set();
  }

  get state(): TState {
    return this._state;
  }

  get previousState(): TState | undefined {
    return this._previousState;
  }

  emit(newState: TState): void {
    if (newState === undefined) {
      throw new Error('Cannot emit undefined state');
    }

    this._previousState = this._state;
    this._state = newState;
    this.notifyObservers();
  }

  subscribe(observer: StateObserver<TState>): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  private notifyObservers(): void {
    for (const observer of this.observers) {
      observer.onStateChange(this._state, this._previousState);
    }
  }
}

export interface StateObserver<TState> {
  onStateChange(newState: TState, previousState?: TState): void;
}
```

**Benefits:**
- Focused on state only
- Easy to test
- Simple, clear interface
- Can be replaced with custom implementation

### 2. LifecycleManager

**Responsibility:** Manage disposal and lifecycle states

```typescript
// packages/blac/src/core/LifecycleManager.ts
export enum LifecycleState {
  ACTIVE = 'ACTIVE',
  DISPOSAL_REQUESTED = 'DISPOSAL_REQUESTED',
  DISPOSING = 'DISPOSING',
  DISPOSED = 'DISPOSED'
}

export class LifecycleManager {
  private _state: LifecycleState = LifecycleState.ACTIVE;
  private _disposalPromise?: Promise<void>;
  private lifecycleHooks: LifecycleHooks;

  constructor(hooks?: Partial<LifecycleHooks>) {
    this.lifecycleHooks = {
      onBeforeDispose: hooks?.onBeforeDispose ?? (() => Promise.resolve()),
      onAfterDispose: hooks?.onAfterDispose ?? (() => {})
    };
  }

  get state(): LifecycleState {
    return this._state;
  }

  get isActive(): boolean {
    return this._state === LifecycleState.ACTIVE;
  }

  get isDisposed(): boolean {
    return this._state === LifecycleState.DISPOSED;
  }

  async dispose(): Promise<void> {
    if (this._state !== LifecycleState.ACTIVE) {
      return this._disposalPromise;
    }

    this._state = LifecycleState.DISPOSAL_REQUESTED;

    this._disposalPromise = (async () => {
      this._state = LifecycleState.DISPOSING;

      await this.lifecycleHooks.onBeforeDispose();

      this._state = LifecycleState.DISPOSED;

      this.lifecycleHooks.onAfterDispose();
    })();

    return this._disposalPromise;
  }

  assertActive(operation: string): void {
    if (!this.isActive) {
      throw new Error(
        `Cannot ${operation} on ${this._state} instance`
      );
    }
  }
}

export interface LifecycleHooks {
  onBeforeDispose: () => Promise<void>;
  onAfterDispose: () => void;
}
```

**Benefits:**
- Clear lifecycle state management
- Reusable across different bloc types
- Easy to test disposal logic
- Hooks for lifecycle events

### 3. ConsumerTracker

**Responsibility:** Track consumers and observers with automatic cleanup

```typescript
// packages/blac/src/core/ConsumerTracker.ts
export class ConsumerTracker {
  private consumerRefs: Map<string, WeakRef<any>>;
  private cleanupCallbacks: Map<string, () => void>;

  constructor() {
    this.consumerRefs = new Map();
    this.cleanupCallbacks = new Map();
  }

  registerConsumer(id: string, consumer: any, onCleanup?: () => void): void {
    this.consumerRefs.set(id, new WeakRef(consumer));

    if (onCleanup) {
      this.cleanupCallbacks.set(id, onCleanup);
    }
  }

  unregisterConsumer(id: string): void {
    const cleanup = this.cleanupCallbacks.get(id);
    if (cleanup) {
      cleanup();
    }

    this.consumerRefs.delete(id);
    this.cleanupCallbacks.delete(id);
  }

  getConsumer(id: string): any | undefined {
    const weakRef = this.consumerRefs.get(id);
    return weakRef?.deref();
  }

  hasConsumers(): boolean {
    this.validateConsumers();
    return this.consumerRefs.size > 0;
  }

  validateConsumers(): string[] {
    const deadConsumers: string[] = [];

    for (const [id, weakRef] of this.consumerRefs) {
      if (weakRef.deref() === undefined) {
        deadConsumers.push(id);
      }
    }

    for (const id of deadConsumers) {
      this.unregisterConsumer(id);
    }

    return deadConsumers;
  }

  dispose(): void {
    // Run all cleanup callbacks
    for (const cleanup of this.cleanupCallbacks.values()) {
      cleanup();
    }

    this.consumerRefs.clear();
    this.cleanupCallbacks.clear();
  }
}
```

**Benefits:**
- Focused on consumer tracking
- Automatic cleanup with WeakRef
- Callback support for cleanup actions
- Easy to test in isolation

### 4. PluginHost

**Responsibility:** Manage and execute plugins

```typescript
// packages/blac/src/core/PluginHost.ts
export class PluginHost {
  private plugins: BlacPlugin[];
  private pluginContext: PluginContext;

  constructor(context: PluginContext) {
    this.plugins = [];
    this.pluginContext = context;
  }

  addPlugin(plugin: BlacPlugin): void {
    this.plugins.push(plugin);
  }

  removePlugin(name: string): boolean {
    const index = this.plugins.findIndex(p => p.name === name);
    if (index !== -1) {
      this.plugins.splice(index, 1);
      return true;
    }
    return false;
  }

  executeHook(event: BlacLifecycleEvent, params?: any): void {
    for (const plugin of this.plugins) {
      try {
        plugin.onEvent(event, this.pluginContext, params);
      } catch (error) {
        // Error handling (use error event system)
        console.error(`Plugin ${plugin.name} failed:`, error);
      }
    }
  }

  async dispose(): Promise<void> {
    this.plugins = [];
  }
}

export interface PluginContext {
  readonly id: string;
  readonly name: string;
  readonly state: any;
}
```

**Benefits:**
- Isolated plugin management
- Error boundaries for plugin execution
- Easy to test plugin behavior
- Clear plugin context interface

### 5. ConfigurationManager

**Responsibility:** Manage configuration and metadata

```typescript
// packages/blac/src/core/ConfigurationManager.ts
export class ConfigurationManager {
  readonly id: string;
  readonly name: string;
  readonly isolated: boolean;
  readonly keepAlive: boolean;

  constructor(config: BlocConfiguration) {
    this.id = config.id ?? this.generateId();
    this.name = config.name ?? this.constructor.name;
    this.isolated = config.isolated ?? false;
    this.keepAlive = config.keepAlive ?? false;
  }

  private generateId(): string {
    return `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface BlocConfiguration {
  id?: string;
  name?: string;
  isolated?: boolean;
  keepAlive?: boolean;
}
```

**Benefits:**
- Centralized configuration
- Easy to validate
- Simple to extend
- Clear configuration contract

### 6. Refactored BlocBase (Facade)

**Responsibility:** Coordinate components and provide public API

```typescript
// packages/blac/src/BlocBase.ts
export abstract class BlocBase<TState> implements StateObserver<TState> {
  // Components (composition)
  protected readonly stateManager: StateManager<TState>;
  protected readonly lifecycleManager: LifecycleManager;
  protected readonly consumerTracker: ConsumerTracker;
  protected readonly pluginHost: PluginHost;
  protected readonly config: ConfigurationManager;

  constructor(
    initialState: TState,
    configuration?: Partial<BlocConfiguration>
  ) {
    // Initialize configuration
    this.config = new ConfigurationManager({
      name: this.constructor.name,
      ...configuration
    });

    // Initialize components
    this.stateManager = new StateManager(initialState);
    this.lifecycleManager = new LifecycleManager({
      onBeforeDispose: () => this.onBeforeDispose(),
      onAfterDispose: () => this.onAfterDispose()
    });
    this.consumerTracker = new ConsumerTracker();
    this.pluginHost = new PluginHost({
      id: this.config.id,
      name: this.config.name,
      state: this.state
    });

    // Subscribe to state changes
    this.stateManager.subscribe(this);
  }

  // Public API (delegates to components)
  get state(): TState {
    return this.stateManager.state;
  }

  emit(state: TState): void {
    this.lifecycleManager.assertActive('emit state');
    this.pluginHost.executeHook(BlacLifecycleEvent.BEFORE_STATE_CHANGE);
    this.stateManager.emit(state);
    this.pluginHost.executeHook(BlacLifecycleEvent.STATE_CHANGED);
  }

  async dispose(): Promise<void> {
    await this.lifecycleManager.dispose();
  }

  // StateObserver implementation
  onStateChange(newState: TState, previousState?: TState): void {
    // Notify consumers through consumer tracker
    this.consumerTracker.validateConsumers();
  }

  // Lifecycle hooks (can be overridden)
  protected async onBeforeDispose(): Promise<void> {
    this.pluginHost.executeHook(BlacLifecycleEvent.BEFORE_DISPOSE);
    await this.pluginHost.dispose();
    this.consumerTracker.dispose();
  }

  protected onAfterDispose(): void {
    this.pluginHost.executeHook(BlacLifecycleEvent.DISPOSED);
  }

  // Static configuration (backwards compatibility)
  static isolated = false;
  static keepAlive = false;
}
```

**Benefits:**
- Clean facade over components
- Backwards compatible API
- Testable through component injection
- Clear separation of concerns

## Implementation Steps

### Phase 1: Create Core Components (Week 1)

1. **Create core directory**
   ```bash
   mkdir -p packages/blac/src/core
   ```

2. **Implement each component**
   - Day 1-2: StateManager
   - Day 2-3: LifecycleManager
   - Day 3-4: ConsumerTracker
   - Day 4-5: PluginHost
   - Day 5: ConfigurationManager

3. **Write component tests**
   - Each component has >90% test coverage
   - Test in complete isolation

### Phase 2: Refactor BlocBase (Week 2)

1. **Create new BlocBase with composition**
   - Start with minimal facade
   - Gradually migrate functionality

2. **Migrate functionality piece by piece**
   - State management first
   - Lifecycle second
   - Consumer tracking third
   - Plugin management fourth

3. **Run tests after each migration**
   - Ensure no regressions
   - Fix any issues immediately

### Phase 3: Update Dependent Code (Week 2-3)

1. **Update Bloc and Cubit classes**
   - Ensure they work with new BlocBase
   - Update any internal dependencies

2. **Update React integration**
   - Verify hooks work correctly
   - Test with real components

3. **Update plugins**
   - Ensure plugins work with new PluginHost
   - Update plugin interfaces if needed

### Phase 4: Documentation & Cleanup (Week 3)

1. **Update documentation**
   - Architecture overview
   - Component responsibilities
   - Migration guide

2. **Create architecture diagram**
   - Visual representation of components
   - Show relationships

3. **Performance benchmarks**
   - Compare old vs new implementation
   - Ensure no regression

## Testing Strategy

### Component Unit Tests
```typescript
// Example: StateManager tests
describe('StateManager', () => {
  it('should initialize with initial state', () => {
    const manager = new StateManager(0);
    expect(manager.state).toBe(0);
  });

  it('should emit new state', () => {
    const manager = new StateManager(0);
    manager.emit(1);
    expect(manager.state).toBe(1);
    expect(manager.previousState).toBe(0);
  });

  it('should notify observers on state change', () => {
    const manager = new StateManager(0);
    const observer = {
      onStateChange: jest.fn()
    };

    manager.subscribe(observer);
    manager.emit(1);

    expect(observer.onStateChange).toHaveBeenCalledWith(1, 0);
  });

  it('should throw when emitting undefined', () => {
    const manager = new StateManager(0);
    expect(() => manager.emit(undefined as any)).toThrow();
  });
});
```

### Integration Tests
- Test BlocBase with all components
- Test real-world scenarios
- Test with React hooks

### Performance Tests
- Benchmark state emission
- Benchmark consumer tracking
- Compare with old implementation

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking internal API | High | Comprehensive test suite, careful migration |
| Performance regression | Medium | Benchmark continuously, optimize hot paths |
| Increased bundle size | Low | Tree-shaking, monitor bundle size |
| Component interface changes | Medium | Design interfaces carefully upfront |

## Success Metrics

- BlocBase.ts reduced from 600+ lines to <200 lines
- Each component has single responsibility
- Test coverage >90% for each component
- All existing tests pass
- No performance regression (within 5%)
- Documentation complete

## Follow-up Tasks

- Allow custom component implementations (e.g., custom StateManager)
- Extract common patterns into reusable utilities
- Consider exposing components for advanced usage
- Create example of custom component implementation

## References

- Review Report: `review.md:30-38` (Excessive Responsibilities section)
- Review Report: `review.md:152-155` (Refactor BlocBase recommendation)
- Single Responsibility Principle: https://en.wikipedia.org/wiki/Single-responsibility_principle
- Composition over Inheritance: https://en.wikipedia.org/wiki/Composition_over_inheritance
