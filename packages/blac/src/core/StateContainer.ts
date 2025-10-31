/**
 * StateContainer - Base class for state management
 *
 * This is the new base class that replaces BlocBase with a clean architecture,
 * proper lifecycle management, and no type assertions needed.
 */

import { StateStream } from './StateStream';
import { EventStream } from './EventStream';
import {
  LifecycleManager,
  LifecycleState,
  LifecycleEvent as LMLifecycleEvent,
} from './LifecycleManager';
import { debug, info, warn, error } from '../logging/Logger';
import {
  Generation,
  InstanceId,
  Version,
  generation,
  incrementGeneration,
  instanceId as createInstanceId,
} from '../types/branded';
import {
  InternalStateContainer,
  StateContainerVisitor,
} from '../types/internal';
import { BaseEvent, StateChangeEvent, StateChange } from '../types/events';
import { BLAC_DEFAULTS } from '../constants';
import { generateSimpleId } from '../utils/idGenerator';
import {
  SubscriptionSystem,
  SubscriptionOptions,
  Subscription,
} from '../subscription/SubscriptionSystem';

/**
 * Configuration options for StateContainer
 */
export interface StateContainerConfig {
  /** Custom instance ID */
  instanceId?: string;
  /** Container name for debugging */
  name?: string;
  /** Whether to keep container alive when no consumers */
  keepAlive?: boolean;
  /** Whether container is isolated (not shared) */
  isolated?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Instance entry for static instance registry
 */
interface StateContainerInstanceEntry {
  instance: StateContainer<any, any>;
  refCount: number;
}

/**
 * Base abstract class for all state containers
 */
export abstract class StateContainer<S, E extends BaseEvent = BaseEvent>
  implements InternalStateContainer<S>
{
  // ============================================
  // Static Instance Registry
  // ============================================

  /**
   * Global registry of all StateContainer instances
   * Key format: "ClassName:instanceKey"
   */
  private static readonly instances = new Map<
    string,
    StateContainerInstanceEntry
  >();

  /**
   * Get or create a StateContainer instance with reference counting
   *
   * @example
   * ```typescript
   * // Get or create the default shared instance
   * const counter = CounterBloc.getOrCreate();
   *
   * // Get or create a named instance
   * const counter = CounterBloc.getOrCreate('main');
   *
   * // With constructor arguments
   * const user = UserBloc.getOrCreate('user-123', { userId: '123' });
   *
   * // When done, release the reference
   * CounterBloc.release(); // Release default instance
   * CounterBloc.release('main'); // Release named instance
   * ```
   */
  static getOrCreate<T extends StateContainer<any, any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
    ...constructorArgs: any[]
  ): T {
    const className = this.name;
    const key = instanceKey ?? className;
    const fullKey = `${className}:${key}`;

    // Get existing instance
    const existing = StateContainer.instances.get(fullKey);
    if (existing) {
      existing.refCount++;
      return existing.instance as T;
    }

    // Create new instance
    const instance = new this(...constructorArgs);

    StateContainer.instances.set(fullKey, {
      instance,
      refCount: 1,
    });

    return instance;
  }

  /**
   * Release a reference to a StateContainer instance
   * Disposes the instance when reference count reaches zero
   *
   * @param instanceKey The instance key used in getOrCreate (defaults to className)
   * @param forceDispose If true, dispose immediately regardless of ref count
   */
  static release<T extends StateContainer<any, any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
    forceDispose = false,
  ): void {
    const className = this.name;
    const key = instanceKey ?? className;
    const fullKey = `${className}:${key}`;

    const entry = StateContainer.instances.get(fullKey);
    if (!entry) return;

    if (forceDispose) {
      entry.instance.dispose();
      StateContainer.instances.delete(fullKey);
      return;
    }

    entry.refCount--;

    // Only dispose if ref count reaches zero and not keepAlive
    if (entry.refCount <= 0 && !entry.instance.keepAlive) {
      entry.instance.dispose();
      StateContainer.instances.delete(fullKey);
    }
  }

  /**
   * Get the current reference count for an instance
   */
  static getRefCount<T extends StateContainer<any, any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
  ): number {
    const className = this.name;
    const key = instanceKey ?? className;
    const fullKey = `${className}:${key}`;
    const entry = StateContainer.instances.get(fullKey);
    return entry?.refCount ?? 0;
  }

  /**
   * Check if an instance exists
   */
  static hasInstance<T extends StateContainer<any, any>>(
    this: new (...args: any[]) => T,
    instanceKey?: string,
  ): boolean {
    const className = this.name;
    const key = instanceKey ?? className;
    const fullKey = `${className}:${key}`;
    return StateContainer.instances.has(fullKey);
  }

  /**
   * Clear all instances (useful for testing)
   */
  static clearAllInstances(): void {
    for (const entry of StateContainer.instances.values()) {
      entry.instance.dispose();
    }
    StateContainer.instances.clear();
  }

  // ============================================
  // Instance Properties
  // ============================================

  // State management
  protected readonly stateStream: StateStream<S>;
  protected readonly eventStream: EventStream<E>;
  protected readonly subscriptionSystem: SubscriptionSystem<S>;

  // Lifecycle
  private readonly lifecycleManager: LifecycleManager;
  private disposalGeneration: Generation = generation(0);
  private _isDisposalRequested: boolean = false;

  // Identity
  protected readonly _instanceId: InstanceId;
  protected readonly _className: string;
  protected readonly _name: string;

  // Configuration
  protected readonly config: Required<StateContainerConfig>;

  // Reference counting
  private consumerCount = 0;
  private readonly consumers = new WeakMap<object, number>();

  /**
   * Create a new StateContainer
   * @param initialState Initial state value
   * @param config Configuration options
   */
  constructor(initialState: S, config: StateContainerConfig = {}) {
    // Initialize state management
    this.stateStream = new StateStream(initialState);
    this.eventStream = new EventStream();

    // Set identity
    this._instanceId = createInstanceId(config.instanceId || this.generateId());
    this._className = this.constructor.name;
    this._name = config.name || this._className;

    // Set configuration with defaults
    this.config = {
      instanceId: this._instanceId,
      name: this._name,
      keepAlive: config.keepAlive ?? false,
      isolated: config.isolated ?? false,
      debug: config.debug ?? false,
    };

    // Initialize subscription system
    this.subscriptionSystem = new SubscriptionSystem<S>(this._instanceId, {
      enableMetrics: this.config.debug,
      enableWeakRefs: true,
      enableProxyTracking: false, // Disabled for synchronous performance
      maxSubscriptions: BLAC_DEFAULTS.MAX_SUBSCRIPTIONS,
      cleanupIntervalMs: BLAC_DEFAULTS.CLEANUP_INTERVAL_MS,
    });

    // Initialize lifecycle manager
    this.lifecycleManager = new LifecycleManager({
      instanceId: this._instanceId,
      debug: this.config.debug,
      onStateTransition: (event) => {
        if (this.config.debug) {
          console.log(
            `[${this._name}] Lifecycle transition: ${event.fromState} -> ${event.toState}`,
          );
        }
      },
    });

    // Set up state change forwarding
    this.stateStream.subscribe((event) => {
      this.onStateChange(event);
    });
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Get the current state
   */
  get state(): S {
    return this.stateStream.state;
  }

  /**
   * Get the current version
   */
  get version(): Version {
    return this.stateStream.version;
  }

  /**
   * Get instance ID
   */
  get instanceId(): InstanceId {
    return this._instanceId;
  }

  /**
   * Get container name
   */
  get name(): string {
    return this._name;
  }

  /**
   * Get class name
   */
  get className(): string {
    return this._className;
  }

  /**
   * Check if container is isolated
   */
  get isolated(): boolean {
    return this.config.isolated;
  }

  /**
   * Check if container should be kept alive
   */
  get keepAlive(): boolean {
    return this.config.keepAlive;
  }

  // ============================================
  // Lifecycle Management
  // ============================================

  /**
   * Mount the container
   */
  mount(): void {
    if (this.lifecycleManager.isMounted) {
      throw new Error(`Container ${this._name} is already mounted`);
    }

    if (this.lifecycleManager.isDisposed) {
      throw new Error(
        `Container ${this._name} is disposed and cannot be mounted`,
      );
    }

    // Transition to mounting
    this.lifecycleManager.mount();

    try {
      // Call lifecycle hook
      this.onMount();

      if (this.config.debug) {
        console.log(`[${this._name}] Mounted successfully`);
      }
    } catch (error) {
      // If mount fails, unmount
      this.lifecycleManager.unmount();
      throw error;
    }
  }

  /**
   * Unmount the container
   */
  unmount(): void {
    if (!this.lifecycleManager.isMounted) {
      throw new Error(`Container ${this._name} is not mounted`);
    }

    // Transition to unmounting
    this.lifecycleManager.unmount();

    try {
      // Call lifecycle hook
      this.onUnmount();

      if (this.config.debug) {
        console.log(`[${this._name}] Unmounted successfully`);
      }
    } catch (error) {
      console.error(`[${this._name}] Error during unmount:`, error);
      // Continue with unmount even if there's an error
    }
  }

  /**
   * Request disposal of the container
   * Uses generation pattern to prevent race conditions
   */
  requestDisposal(): void {
    if (this.lifecycleManager.isDisposed) {
      return; // Already disposed
    }

    // Mark disposal as requested
    this._isDisposalRequested = true;

    // Increment generation to invalidate any pending disposal
    this.disposalGeneration = incrementGeneration(this.disposalGeneration);
    const currentGeneration = this.disposalGeneration;

    if (this.config.debug) {
      console.log(
        `[${this._name}] Disposal requested (generation: ${currentGeneration})`,
      );
    }

    // Schedule disposal in next microtask
    queueMicrotask(() => {
      // Check if this disposal is still valid
      if (
        currentGeneration === this.disposalGeneration &&
        !this.lifecycleManager.isDisposed
      ) {
        this._isDisposalRequested = false;
        this.dispose();
      }
    });
  }

  /**
   * Cancel pending disposal
   */
  cancelDisposal(): void {
    // Increment generation to invalidate pending disposal
    this.disposalGeneration = incrementGeneration(this.disposalGeneration);
    this._isDisposalRequested = false;

    if (this.config.debug) {
      console.log(`[${this._name}] Disposal cancelled`);
    }
  }

  /**
   * Dispose the container
   */
  dispose(): void {
    if (this.lifecycleManager.isDisposed) {
      return; // Already disposed
    }

    if (this.config.debug) {
      console.log(`[${this._name}] Disposing...`);
    }

    try {
      // Transition to disposed
      this.lifecycleManager.dispose();

      // Call lifecycle hook
      this.onDispose();

      // Dispose subscription system
      this.subscriptionSystem.dispose();

      // Clear references - WeakMap doesn't have clear(), but we can reset count
      // WeakMap will automatically garbage collect the entries
      this.consumerCount = 0;

      if (this.config.debug) {
        console.log(`[${this._name}] Disposed successfully`);
      }
    } catch (error) {
      console.error(`[${this._name}] Error during disposal:`, error);
      // Still mark as disposed
      throw error;
    }
  }

  /**
   * Check if disposed
   */
  get isDisposed(): boolean {
    return this.lifecycleManager.isDisposed;
  }

  /**
   * Check if currently disposing
   */
  get isDisposing(): boolean {
    return this.lifecycleManager.getState() === LifecycleState.UNMOUNTING;
  }

  /**
   * Check if disposal is requested
   */
  get isDisposalRequested(): boolean {
    return this._isDisposalRequested;
  }

  /**
   * Get current generation for race condition prevention
   */
  get generation(): Generation {
    return this.disposalGeneration;
  }

  // ============================================
  // Lifecycle Hooks (for subclasses)
  // ============================================

  /**
   * Called when container is mounted
   */
  protected onMount(): void {
    // Override in subclasses
  }

  /**
   * Called when container is unmounted
   */
  protected onUnmount(): void {
    // Override in subclasses
  }

  /**
   * Called when container is disposed
   */
  protected onDispose(): void {
    // Override in subclasses
  }

  /**
   * Called when state changes
   */
  protected onStateChange(event: StateChangeEvent<S>): void {
    debug('StateContainer', 'stateChange', {
      version: event.version,
    });

    // Notify all subscribers through the subscription system
    this.subscriptionSystem.notify({
      type: 'state-change',
      current: event.current,
      previous: event.previous,
      version: event.version,
      timestamp: event.timestamp,
      metadata: event.metadata,
    } as StateChange<S>);

    // Emit state change event
    this.eventStream.emit(event as unknown as E);
  }

  // ============================================
  // Consumer Management
  // ============================================

  /**
   * Add a consumer
   */
  addConsumer(consumer: object): void {
    const count = this.consumers.get(consumer) || 0;
    this.consumers.set(consumer, count + 1);
    this.consumerCount++;

    if (this.config.debug) {
      console.log(
        `[${this._name}] Consumer added (total: ${this.consumerCount})`,
      );
    }

    // Cancel any pending disposal
    if (this.consumerCount === 1 && !this.config.keepAlive) {
      this.cancelDisposal();
    }
  }

  /**
   * Remove a consumer
   */
  removeConsumer(consumer: object): void {
    const count = this.consumers.get(consumer) || 0;
    if (count > 1) {
      this.consumers.set(consumer, count - 1);
    } else {
      this.consumers.delete(consumer);
    }

    this.consumerCount = Math.max(0, this.consumerCount - 1);

    if (this.config.debug) {
      console.log(
        `[${this._name}] Consumer removed (total: ${this.consumerCount})`,
      );
    }

    // Request disposal if no consumers and not keep-alive
    // Disposal can be requested even if not mounted (for unmounted containers)
    if (
      this.consumerCount === 0 &&
      !this.config.keepAlive &&
      !this.lifecycleManager.isDisposed
    ) {
      this.requestDisposal();
    }
  }

  /**
   * Get consumer count
   */
  getConsumerCount(): number {
    return this.consumerCount;
  }

  /**
   * Notify all consumers about state change
   */
  protected notifyConsumers(): void {
    // This is a placeholder - actual notification happens through eventStream
    // and external subscription management
  }

  // ============================================
  // Event Management
  // ============================================

  /**
   * Subscribe to state changes
   */
  subscribe(handler: (state: S) => void): () => void {
    // Add as consumer
    const consumer = { handler }; // Create a unique object for this subscription
    this.addConsumer(consumer);

    // Subscribe through the new subscription system
    const subscription = this.subscriptionSystem.subscribe({
      callback: handler,
      weakRef: consumer,
    });

    // Return unsubscribe function that also removes consumer
    return () => {
      subscription.unsubscribe();
      this.removeConsumer(consumer);
    };
  }

  /**
   * Subscribe with advanced options using the new subscription system
   */
  subscribeAdvanced(options: SubscriptionOptions): Subscription {
    // Create a consumer object if weakRef not provided
    const consumer = options.weakRef || { subscription: true };
    this.addConsumer(consumer);

    // Subscribe through the subscription system
    const subscription = this.subscriptionSystem.subscribe({
      ...options,
      weakRef: consumer,
    });

    // Wrap unsubscribe to also remove consumer
    const originalUnsubscribe = subscription.unsubscribe;
    subscription.unsubscribe = () => {
      originalUnsubscribe.call(subscription);
      this.removeConsumer(consumer);
    };

    return subscription;
  }

  /**
   * Subscribe to events
   */
  subscribeToEvents(handler: (event: E) => void): () => void {
    return this.eventStream.subscribe(handler);
  }

  /**
   * Subscribe to lifecycle events
   */
  subscribeToLifecycle(handler: (event: LMLifecycleEvent) => void): () => void {
    return this.lifecycleManager.subscribe(handler);
  }

  // ============================================
  // Visitor Pattern Support
  // ============================================

  /**
   * Accept a visitor for internal access
   */
  accept<R>(visitor: StateContainerVisitor<S, R>): R {
    // The visitor pattern in internal.ts defines individual visit methods
    // We need to call the appropriate visitor method
    // For now, we'll just return the state as a simple implementation
    return visitor.visitState(this.state);
  }

  /**
   * Get internal state stream (for visitors)
   */
  getStateStream(): StateStream<S> {
    return this.stateStream;
  }

  /**
   * Get internal event stream (for visitors)
   */
  getEventStream(): EventStream<E> {
    return this.eventStream;
  }

  // ============================================
  // Protected Methods for Subclasses
  // ============================================

  /**
   * Emit a new state
   */
  protected emit(newState: S): void {
    if (this.lifecycleManager.isDisposed) {
      throw new Error(
        `Cannot emit state from disposed container ${this._name}`,
      );
    }

    debug('StateContainer', 'emit', {
      container: this._name,
      version: this.version,
    });

    // StateStream.update expects a function, so wrap the new state
    this.stateStream.update(() => newState);
  }

  /**
   * Update state using a function
   */
  protected update(updater: (current: S) => S): void {
    if (this.lifecycleManager.isDisposed) {
      throw new Error(
        `Cannot update state from disposed container ${this._name}`,
      );
    }

    debug('StateContainer', 'update', {
      container: this._name,
      version: this.version,
    });

    this.stateStream.update(updater);
  }

  /**
   * Dispatch an event
   */
  protected dispatch(event: E): void {
    if (this.lifecycleManager.isDisposed) {
      throw new Error(
        `Cannot dispatch event from disposed container ${this._name}`,
      );
    }

    this.eventStream.dispatch(event);
  }

  // ============================================
  // Private Utilities
  // ============================================

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return generateSimpleId(this.constructor.name);
  }
}
