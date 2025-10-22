/**
 * StateContainer - Base class for state management
 *
 * This is the new base class that replaces BlocBase with a clean architecture,
 * proper lifecycle management, and no type assertions needed.
 */

import { StateStream } from './StateStream';
import { EventStream } from './EventStream';
import {
  Generation,
  InstanceId,
  Version,
  generation,
  incrementGeneration,
  instanceId as createInstanceId
} from '../types/branded';
import {
  InternalStateContainer,
  StateContainerVisitor
} from '../types/internal';
import {
  BaseEvent,
  LifecycleEvent,
  StateChangeEvent,
  createLifecycleEvent,
} from '../types/events';

/**
 * Lifecycle states for a container
 */
export enum LifecycleState {
  CREATED = 'created',
  MOUNTING = 'mounting',
  ACTIVE = 'active',
  UNMOUNTING = 'unmounting',
  UNMOUNTED = 'unmounted',
  DISPOSAL_REQUESTED = 'disposal-requested',
  DISPOSING = 'disposing',
  DISPOSED = 'disposed',
}

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
 * Base abstract class for all state containers
 */
export abstract class StateContainer<S, E extends BaseEvent = BaseEvent>
  implements InternalStateContainer<S> {

  // State management
  protected readonly stateStream: StateStream<S>;
  protected readonly eventStream: EventStream<E>;

  // Lifecycle
  private lifecycleState: LifecycleState = LifecycleState.CREATED;
  private lifecycleGeneration: Generation = generation(0);
  private readonly lifecycleEvents = new EventStream<LifecycleEvent>();

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
   * Get class name
   */
  get className(): string {
    return this._className;
  }

  /**
   * Get instance name
   */
  get name(): string {
    return this._name;
  }

  /**
   * Subscribe to state changes
   * @param handler State change handler
   * @returns Unsubscribe function
   */
  subscribe(handler: (state: S) => void): () => void {
    const unsubscribeState = this.stateStream.subscribe((event) => {
      handler(event.current);
    });

    // Track consumer
    this.addConsumer(handler);

    return () => {
      unsubscribeState();
      this.removeConsumer(handler);
    };
  }

  /**
   * Subscribe to lifecycle events
   * @param handler Event handler
   * @returns Unsubscribe function
   */
  subscribeToLifecycle(handler: (event: LifecycleEvent) => void): () => void {
    return this.lifecycleEvents.subscribe(handler);
  }

  /**
   * Mount the container
   */
  async mount(): Promise<void> {
    if (this.lifecycleState !== LifecycleState.CREATED) {
      return;
    }

    this.setLifecycleState(LifecycleState.MOUNTING);

    try {
      await this.onMount();
      this.setLifecycleState(LifecycleState.ACTIVE);
    } catch (error) {
      this.setLifecycleState(LifecycleState.CREATED);
      throw error;
    }
  }

  /**
   * Unmount the container
   */
  async unmount(): Promise<void> {
    if (this.lifecycleState !== LifecycleState.ACTIVE) {
      return;
    }

    this.setLifecycleState(LifecycleState.UNMOUNTING);

    try {
      await this.onUnmount();
      this.setLifecycleState(LifecycleState.UNMOUNTED);
    } catch (error) {
      this.setLifecycleState(LifecycleState.ACTIVE);
      throw error;
    }
  }

  /**
   * Request disposal
   */
  requestDisposal(): void {
    if (this.isDisposed || this.isDisposing) {
      return;
    }

    this.setLifecycleState(LifecycleState.DISPOSAL_REQUESTED);
    this.scheduleDisposal();
  }

  /**
   * Cancel disposal if requested
   */
  cancelDisposal(): void {
    if (this.lifecycleState === LifecycleState.DISPOSAL_REQUESTED) {
      this.lifecycleGeneration = incrementGeneration(this.lifecycleGeneration);
      this.setLifecycleState(LifecycleState.ACTIVE);
    }
  }

  /**
   * Dispose the container
   */
  async dispose(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    if (this.isDisposing) {
      // Wait for ongoing disposal
      await this.waitForDisposal();
      return;
    }

    this.setLifecycleState(LifecycleState.DISPOSING);

    try {
      await this.onDispose();
      this.setLifecycleState(LifecycleState.DISPOSED);
    } catch (error) {
      // Disposal should not fail, but log error
      if (this.config.debug) {
        console.error('Disposal error:', error);
      }
      // Still mark as disposed
      this.setLifecycleState(LifecycleState.DISPOSED);
    }
  }

  /**
   * Accept a visitor for internal state access
   * @param visitor Visitor implementation
   * @returns Visitor result
   */
  accept<R>(visitor: StateContainerVisitor<S, R>): R {
    return visitor.visitState(this.state);
  }

  // ============================================
  // Internal State Access (for framework use)
  // ============================================

  /**
   * Check if disposed
   */
  get isDisposed(): boolean {
    return this.lifecycleState === LifecycleState.DISPOSED;
  }

  /**
   * Check if disposing
   */
  get isDisposing(): boolean {
    return this.lifecycleState === LifecycleState.DISPOSING;
  }

  /**
   * Check if disposal requested
   */
  get isDisposalRequested(): boolean {
    return this.lifecycleState === LifecycleState.DISPOSAL_REQUESTED;
  }

  /**
   * Get lifecycle generation
   */
  get generation(): Generation {
    return this.lifecycleGeneration;
  }

  /**
   * Get consumer count
   */
  getConsumerCount(): number {
    return this.consumerCount;
  }

  // ============================================
  // Protected Lifecycle Hooks (for subclasses)
  // ============================================

  /**
   * Called when container is mounted
   */
  protected async onMount(): Promise<void> {
    // Override in subclass
  }

  /**
   * Called when container is unmounted
   */
  protected async onUnmount(): Promise<void> {
    // Override in subclass
  }

  /**
   * Called when container is disposed
   */
  protected async onDispose(): Promise<void> {
    // Override in subclass
  }

  /**
   * Called when state changes
   */
  protected onStateChange(event: StateChangeEvent<S>): void {
    // Override in subclass for custom behavior
  }

  /**
   * Emit a new state
   * @param state New state
   */
  protected emit(state: S): void {
    this.stateStream.setState(state, {
      source: this._name,
    });
  }

  /**
   * Update state with updater function
   * @param updater State updater
   */
  protected update(updater: (current: S) => S): void {
    this.stateStream.update(updater, {
      source: this._name,
    });
  }

  // ============================================
  // Private Implementation
  // ============================================

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${this._className}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set lifecycle state and emit event
   */
  private setLifecycleState(state: LifecycleState): void {
    const previousState = this.lifecycleState;
    this.lifecycleState = state;

    // Map state to event type
    let eventType: LifecycleEvent['type'] | null = null;
    switch (state) {
      case LifecycleState.ACTIVE:
        eventType = 'mount';
        break;
      case LifecycleState.UNMOUNTED:
        eventType = 'unmount';
        break;
      case LifecycleState.DISPOSAL_REQUESTED:
        eventType = 'dispose-requested';
        break;
      case LifecycleState.DISPOSED:
        eventType = 'disposed';
        break;
    }

    if (eventType) {
      this.lifecycleEvents.dispatch(
        createLifecycleEvent(eventType, this._instanceId)
      );
    }

    if (this.config.debug) {
      console.log(`[${this._name}] Lifecycle: ${previousState} -> ${state}`);
    }
  }

  /**
   * Schedule disposal with generation check
   */
  private scheduleDisposal(): void {
    const currentGeneration = this.lifecycleGeneration;

    queueMicrotask(() => {
      // Check if generation is still valid
      if (this.lifecycleGeneration === currentGeneration &&
          this.lifecycleState === LifecycleState.DISPOSAL_REQUESTED) {
        this.dispose();
      }
    });
  }

  /**
   * Wait for ongoing disposal to complete
   */
  private async waitForDisposal(): Promise<void> {
    return new Promise((resolve) => {
      const checkDisposed = () => {
        if (this.isDisposed) {
          resolve();
        } else {
          setTimeout(checkDisposed, 10);
        }
      };
      checkDisposed();
    });
  }

  /**
   * Add a consumer
   */
  private addConsumer(consumer: object): void {
    const count = this.consumers.get(consumer) || 0;
    this.consumers.set(consumer, count + 1);
    this.consumerCount++;

    // Cancel disposal if requested
    if (this.isDisposalRequested) {
      this.cancelDisposal();
    }
  }

  /**
   * Remove a consumer
   */
  private removeConsumer(consumer: object): void {
    const count = this.consumers.get(consumer) || 0;
    if (count > 1) {
      this.consumers.set(consumer, count - 1);
    } else {
      this.consumers.delete(consumer);
    }

    this.consumerCount = Math.max(0, this.consumerCount - 1);

    // Request disposal if no consumers and not keep-alive
    if (this.consumerCount === 0 && !this.config.keepAlive) {
      this.requestDisposal();
    }
  }
}