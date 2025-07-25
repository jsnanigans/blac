# Blac Framework Adapter Architecture

## Overview

The Blac Framework Adapter is a core utility that abstracts away all the complex state management logic, dependency tracking, and subscription management from framework-specific integrations. This adapter enables any UI framework (React, Vue, Angular, Svelte, etc.) to integrate with Blac's state management system with minimal effort.

## Goals

1. **Framework Agnostic**: Move all framework-independent logic to the core package
2. **Simplified Integration**: Make framework integrations as thin as possible
3. **Consistent Behavior**: Ensure identical behavior across all framework integrations
4. **Performance**: Maintain or improve current performance characteristics
5. **Type Safety**: Preserve full TypeScript type safety throughout

## Architecture Components

### 1. StateAdapter Class

The main adapter class that handles all state management complexities:

```typescript
// @blac/core/src/StateAdapter.ts
export class StateAdapter<TBloc extends BlocBase<any>> {
  // Core functionality
  constructor(options: StateAdapterOptions<TBloc>);

  // Subscription management
  subscribe(listener: StateListener<TBloc>): UnsubscribeFn;
  getSnapshot(): BlocState<TBloc>;
  getServerSnapshot(): BlocState<TBloc>;

  // Dependency tracking
  createStateProxy(state: BlocState<TBloc>): BlocState<TBloc>;
  createClassProxy(instance: TBloc): TBloc;

  // Lifecycle management
  activate(): void;
  dispose(): void;

  // Consumer tracking
  addConsumer(consumerId: string, consumerRef: object): void;
  removeConsumer(consumerId: string): void;
}
```

### 2. Dependency Tracking System

Move all dependency tracking logic to core:

```typescript
// @blac/core/src/tracking/DependencyTracker.ts
export interface DependencyTracker {
  // Track property access
  trackStateAccess(path: string): void;
  trackClassAccess(path: string): void;

  // Compute dependencies
  computeDependencies(state: any, instance: any): DependencyArray;

  // Reset tracking
  reset(): void;

  // Metrics
  getMetrics(): DependencyMetrics;
}

// @blac/core/src/tracking/ConsumerTracker.ts
export interface ConsumerTracker {
  // Register consumers
  registerConsumer(consumerId: string, consumerRef: object): void;
  unregisterConsumer(consumerId: string): void;

  // Track access per consumer
  trackAccess(consumerRef: object, type: 'state' | 'class', path: string): void;

  // Get consumer dependencies
  getConsumerDependencies(consumerRef: object): DependencyArray;

  // Check if consumer should update
  shouldNotifyConsumer(consumerRef: object, changedPaths: Set<string>): boolean;
}
```

### 3. Subscription Management

Centralized subscription handling with intelligent dependency detection:

```typescript
// @blac/core/src/subscription/SubscriptionManager.ts
export interface SubscriptionManager<TBloc extends BlocBase<any>> {
  // Add subscription with dependency tracking
  subscribe(options: {
    listener: StateListener<TBloc>;
    selector?: DependencySelector<TBloc>;
    consumerId: string;
    consumerRef: object;
  }): UnsubscribeFn;

  // Notify subscribers based on dependencies
  notifySubscribers(
    previousState: BlocState<TBloc>,
    newState: BlocState<TBloc>,
  ): void;

  // Get snapshot with memoization
  getSnapshot(): BlocState<TBloc>;

  // Handle server-side rendering
  getServerSnapshot(): BlocState<TBloc>;
}
```

### 4. Configuration Options

Flexible configuration for different frameworks:

```typescript
export interface StateAdapterOptions<TBloc extends BlocBase<any>> {
  // Bloc configuration
  blocConstructor: BlocConstructor<TBloc>;
  blocId?: string;
  blocProps?: any;

  // Behavior flags
  isolated?: boolean;
  keepAlive?: boolean;

  // Dependency tracking
  enableProxyTracking?: boolean;
  selector?: DependencySelector<TBloc>;

  // Performance
  enableBatching?: boolean;
  batchTimeout?: number;
  enableMetrics?: boolean;

  // Lifecycle hooks
  onMount?: (bloc: TBloc) => void;
  onUnmount?: (bloc: TBloc) => void;
  onError?: (error: Error) => void;
}
```

## Integration Pattern

### React Integration Example

The React integration becomes a thin wrapper:

```typescript
// @blac/react/src/useBloc.tsx
export function useBloc<B extends BlocConstructor<BlocBase<any>>>(
  bloc: B,
  options?: BlocHookOptions<InstanceType<B>>,
): [BlocState<InstanceType<B>>, InstanceType<B>] {
  // Create unique consumer ID
  const consumerId = useMemo(() => generateUUID(), []);
  const consumerRef = useRef({});

  // Create adapter instance
  const adapter = useMemo(() => {
    return new StateAdapter({
      blocConstructor: bloc,
      blocId: options?.id,
      blocProps: options?.props,
      selector: options?.selector,
      onMount: options?.onMount,
      onUnmount: options?.onUnmount,
      enableProxyTracking: !options?.selector,
    });
  }, [bloc, options?.id, options?.props]);

  // Register consumer
  useEffect(() => {
    adapter.addConsumer(consumerId, consumerRef.current);
    return () => adapter.removeConsumer(consumerId);
  }, [adapter, consumerId]);

  // Use React's useSyncExternalStore
  const state = useSyncExternalStore(
    adapter.subscribe.bind(adapter),
    adapter.getSnapshot.bind(adapter),
    adapter.getServerSnapshot.bind(adapter),
  );

  // Return proxied state and instance
  const [proxiedState, proxiedInstance] = useMemo(() => {
    return [
      adapter.createStateProxy(state),
      adapter.createClassProxy(adapter.getInstance()),
    ];
  }, [state, adapter]);

  return [proxiedState, proxiedInstance];
}
```

### Vue Integration Example

```typescript
// @blac/vue/src/useBloc.ts
export function useBloc<B extends BlocConstructor<BlocBase<any>>>(
  bloc: B,
  options?: BlocOptions<InstanceType<B>>,
): UseBlocReturn<InstanceType<B>> {
  const consumerId = generateUUID();
  const consumerRef = {};

  // Create adapter
  const adapter = new StateAdapter({
    blocConstructor: bloc,
    blocId: options?.id,
    blocProps: options?.props,
    selector: options?.selector,
    enableProxyTracking: !options?.selector,
  });

  // Vue reactive state
  const state = ref<BlocState<InstanceType<B>>>(adapter.getSnapshot());

  // Subscribe to changes
  onMounted(() => {
    adapter.addConsumer(consumerId, consumerRef);
    const unsubscribe = adapter.subscribe(() => {
      state.value = adapter.getSnapshot();
    });

    onUnmounted(() => {
      unsubscribe();
      adapter.removeConsumer(consumerId);
    });
  });

  // Return reactive proxies
  return {
    state: computed(() => adapter.createStateProxy(state.value)),
    bloc: adapter.createClassProxy(adapter.getInstance()),
  };
}
```

## Migration Strategy

### Phase 1: Core Adapter Implementation

1. Create StateAdapter class in @blac/core
2. Move DependencyTracker to core
3. Move ConsumerTracker logic to core
4. Implement SubscriptionManager

### Phase 2: React Migration

1. Create new useBloc to use StateAdapter
2. Update tests to verify behavior

### Phase 3: Documentation & Examples

1. Create integration guides for popular frameworks
2. Provide example implementations
3. Document best practices

## Benefits

1. **Reduced Duplication**: All complex logic lives in one place
2. **Easier Framework Support**: New frameworks can integrate in ~50 lines
3. **Consistent Behavior**: All frameworks behave identically
4. **Better Testing**: Core logic can be tested independently
5. **Performance**: Optimizations benefit all frameworks

## Technical Considerations

### Memory Management

- Use WeakMap/WeakRef for consumer tracking
- Automatic cleanup when consumers are garbage collected
- Configurable cache sizes for proxies

### Performance Optimizations

- Memoized dependency calculations
- Batched notifications
- Lazy proxy creation
- Minimal re-render detection

### Type Safety

- Full TypeScript support with generics
- Inferred types from Bloc classes
- Type-safe selectors and dependencies

### Server-Side Rendering

```typescript
// @blac/core/src/ssr/ServerAdapter.ts
export interface ServerSideRenderingSupport {
  // Server snapshot management
  getServerSnapshot(): BlocState<any>;
  
  // Hydration support
  hydrateFromServer(serverState: string): void;
  serializeForClient(): string;
  
  // Memory management
  registerServerInstance(id: string, instance: BlocBase<any>): void;
  clearServerInstances(): void;
  
  // Hydration mismatch detection
  detectHydrationMismatch(clientState: any, serverState: any): HydrationMismatch | null;
  onHydrationMismatch?: (mismatch: HydrationMismatch) => void;
}

export interface HydrationMismatch {
  path: string;
  clientValue: any;
  serverValue: any;
  suggestion: string;
}

// Implementation details:
// 1. Server instances stored in global registry with automatic cleanup
// 2. Serialization uses JSON with special handling for Date, Set, Map
// 3. Hydration validation compares structural equality
// 4. Mismatch recovery strategies: use client state, use server state, or merge

### Error Boundaries and Logging

```typescript
// @blac/core/src/error/ErrorBoundary.ts
export interface ErrorBoundarySupport {
  // Error handling
  handleError(error: Error, context: ErrorContext): void;
  recoverFromError?(error: Error): boolean;
  
  // Logging integration
  logError(error: Error, level: 'error' | 'warn' | 'info'): void;
  logStateChange(previous: any, current: any, metadata?: LogMetadata): void;
  logDependencyTracking(dependencies: string[], consumerId: string): void;
}

export interface ErrorContext {
  phase: 'initialization' | 'state-update' | 'subscription' | 'disposal';
  blocName: string;
  consumerId?: string;
  action?: string;
  metadata?: Record<string, any>;
}

// Integration with Blac.log
export class StateAdapter<TBloc extends BlocBase<any>> {
  private handleError(error: Error, context: ErrorContext): void {
    // Log error with Blac.log if available
    if (typeof Blac !== 'undefined' && Blac.log) {
      Blac.log({
        level: 'error',
        message: `[StateAdapter] ${context.phase} error in ${context.blocName}`,
        error: error,
        context: context,
        timestamp: new Date().toISOString()
      });
    }
    
    // Call user-provided error handler
    this.options.onError?.(error, context);
    
    // Attempt recovery based on phase
    if (context.phase === 'state-update' && this.canRecover(error)) {
      this.rollbackState();
    } else if (context.phase === 'subscription') {
      this.isolateFailedSubscriber(context.consumerId);
    }
  }
}
```

## Behavioral Contracts

### Core Behavioral Guarantees

All framework integrations MUST ensure these behaviors:

```typescript
// @blac/core/src/contracts/BehavioralContract.ts
export interface BlocAdapterContract {
  // 1. State Consistency
  // - State updates are atomic and synchronous
  // - No partial state updates are visible to consumers
  // - State snapshots are immutable
  stateConsistency: {
    atomicUpdates: true;
    immutableSnapshots: true;
    noIntermediateStates: true;
  };

  // 2. Subscription Guarantees
  // - Subscribers are notified in registration order
  // - Unsubscribe immediately stops notifications
  // - No notifications after disposal
  subscriptionBehavior: {
    orderedNotification: true;
    immediateUnsubscribe: true;
    noPostDisposalNotifications: true;
  };

  // 3. Instance Management
  // - Shared instances have identical state across all consumers
  // - Isolated instances are independent
  // - Keep-alive instances persist until explicitly disposed
  instanceManagement: {
    sharedStateConsistency: true;
    isolationGuarantee: true;
    keepAliveRespected: true;
  };

  // 4. Dependency Tracking
  // - Only accessed properties trigger re-renders
  // - Shallow tracking by default (no nested object tracking)
  // - Selector overrides proxy tracking
  dependencyTracking: {
    preciseTracking: true;
    shallowOnly: true;
    selectorPriority: true;
  };

  // 5. Error Handling
  // - Errors in one consumer don't affect others
  // - Failed state updates are rolled back
  // - Error boundaries prevent cascade failures
  errorIsolation: {
    consumerIsolation: true;
    stateRollback: true;
    boundaryProtection: true;
  };

  // 6. Performance Characteristics
  // - O(1) state access
  // - O(n) subscription notification (n = subscriber count)
  // - Minimal memory overhead per consumer
  performance: {
    constantStateAccess: true;
    linearNotification: true;
    boundedMemoryGrowth: true;
  };
}

// Compliance testing
export function verifyContract(
  adapter: StateAdapter<any>,
  framework: string
): ContractTestResult {
  return {
    framework,
    passed: boolean,
    violations: ContractViolation[],
    warnings: string[]
  };
}
```

### Testing Contract Compliance

```typescript
// @blac/core/src/contracts/ContractTests.ts
export const contractTests = {
  // Test atomic state updates
  testAtomicUpdates: async (adapter: StateAdapter<any>) => {
    // Verify no intermediate states are visible during updates
  },
  
  // Test subscription ordering
  testSubscriptionOrder: async (adapter: StateAdapter<any>) => {
    // Verify notifications happen in registration order
  },
  
  // Test error isolation
  testErrorIsolation: async (adapter: StateAdapter<any>) => {
    // Verify one failing consumer doesn't affect others
  },
  
  // Test dependency precision
  testDependencyTracking: async (adapter: StateAdapter<any>) => {
    // Verify only accessed properties trigger updates
  }
};
```

## API Design Principles

1. **Simple by Default**: Basic usage requires minimal configuration
2. **Progressive Enhancement**: Advanced features available when needed
3. **Framework Conventions**: Respect each framework's idioms
4. **Zero Breaking Changes**: Maintain backward compatibility

