/**
 * StateContainer - Clean, minimal state management container
 *
 * Responsibilities:
 * - State storage and updates
 * - Change notifications to subscribers
 * - Lifecycle management
 */

import { generateSimpleId } from '../utils/idGenerator';
import {
  StateContainerRegistry,
  globalRegistry,
} from './StateContainerRegistry';

/**
 * Configuration options for StateContainer
 */
export interface StateContainerConfig {
  /** Container name for debugging */
  name?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom instance identifier */
  instanceId?: string;
}

/**
 * Listener function for state changes
 */
type StateListener<S> = (state: S) => void;

/**
 * Base abstract class for all state containers
 */
export abstract class StateContainer<S> {
  protected static _registry = globalRegistry;

  /**
   * Set a custom registry (mainly for testing)
   */
  static setRegistry(registry: StateContainerRegistry): void {
    StateContainer._registry = registry;
  }

  /**
   * Register a type as isolated or shared
   */
  static register<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    isolated = false,
  ): void {
    StateContainer._registry.register(this, isolated);
  }

  /**
   * Resolve an instance with ref counting (ownership semantics)
   *
   * This is the primary API for components/contexts that "own" an instance.
   * Gets or creates the instance and increments ref count to keep it alive
   * until .release() is called.
   *
   * Use this when:
   * - React components need to manage instance lifetime
   * - You want to ensure the instance stays alive during usage
   * - You need ownership semantics with automatic cleanup
   *
   * @example
   * ```typescript
   * // In React component
   * const counter = CounterCubit.resolve('main', 0);
   * // Component "owns" the instance, keeps it alive
   *
   * // Later, call release() on unmount
   * CounterCubit.release('main');
   * ```
   *
   * @param key - Optional instance key for shared instances
   * @param args - Constructor arguments
   * @returns Instance with incremented ref count
   */
  static resolve<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    key?: string,
    ...args: any[]
  ): T {
    return StateContainer._registry.getOrCreate(this, key, ...args);
  }

  /**
   * Get an existing instance without ref counting (borrowing semantics)
   *
   * This is for accessing instances without claiming ownership.
   * Does NOT increment ref count - assumes someone else is keeping it alive.
   * Throws error if instance doesn't exist.
   *
   * Use this when:
   * - Bloc-to-bloc communication (calling methods on other blocs)
   * - Event handlers where component already owns the instance
   * - Accessing keepAlive singleton instances
   * - You know the instance exists and is being managed elsewhere
   *
   * @example
   * ```typescript
   * // Bloc-to-bloc communication (no memory leak!)
   * class UserBloc {
   *   loadProfile = () => {
   *     const analytics = AnalyticsBloc.get('main');
   *     analytics.trackEvent('profile_loaded');
   *     // No .release() needed - we're just borrowing
   *   };
   * }
   *
   * // Event handler in component
   * function Counter() {
   *   const counter = CounterCubit.resolve('main', 0); // Component owns
   *
   *   const handleClick = () => {
   *     // Just borrow, don't create new ownership
   *     const counter = CounterCubit.get('main');
   *     counter.increment();
   *   };
   * }
   * ```
   *
   * @param key - Optional instance key
   * @returns Existing instance (no ref count change)
   * @throws Error if instance doesn't exist
   */
  static get<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    key?: string,
  ): T {
    const instance = StateContainer._registry.getInstance(this, key);
    if (!instance) {
      const instanceKey = key || 'default';
      throw new Error(
        `${this.name} instance "${instanceKey}" not found.\n` +
          `Use .resolve() to create and claim ownership, or .getSafe() for conditional access.`,
      );
    }
    return instance;
  }

  /**
   * Safely get an existing instance (borrowing semantics with error handling)
   *
   * Returns a discriminated union for type-safe conditional access.
   * Does NOT increment ref count - assumes someone else is keeping it alive.
   * Never throws - returns error object if instance doesn't exist.
   *
   * Use this when:
   * - Instance existence is conditional/uncertain
   * - You want type-safe error handling without try/catch
   * - Checking if another component has created an instance
   *
   * @example
   * ```typescript
   * // Conditional access
   * const result = NotificationCubit.getSafe('user-123');
   * if (result.error) {
   *   return null; // User not logged in
   * }
   * return <Badge count={result.instance.state.unreadCount} />;
   *
   * // Type-safe - TypeScript knows instance is non-null after check
   * if (!result.error) {
   *   result.instance.markAsRead(); // ✅ TypeScript knows it's safe
   * }
   * ```
   *
   * @param key - Optional instance key
   * @returns Discriminated union: {error: null, instance: T} or {error: Error, instance: null}
   */
  static getSafe<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    key?: string,
  ): { error: Error; instance: null } | { error: null; instance: T } {
    const instance = StateContainer._registry.getInstance(this, key);
    if (!instance) {
      const instanceKey = key || 'default';
      return {
        error: new Error(`${this.name} instance "${instanceKey}" not found`),
        instance: null,
      };
    }
    return { error: null, instance };
  }

  /**
   * Release a reference to an instance
   * @param key - Optional instance key
   * @param forceDispose - Force dispose regardless of ref count or keepAlive
   */
  static release<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    key?: string,
    forceDispose = false,
  ): void {
    StateContainer._registry.release(this, key, forceDispose);
  }

  /**
   * Get all instances of this type
   */
  static getAll<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
  ): T[] {
    return StateContainer._registry.getAll(this);
  }

  /**
   * Clear all instances of this type
   */
  static clear<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
  ): void {
    StateContainer._registry.clear(this);
  }

  /**
   * Clear all instances from all types (for testing)
   */
  static clearAllInstances(): void {
    StateContainer._registry.clearAll();
  }

  /**
   * Get registry statistics (for debugging)
   */
  static getStats(): {
    registeredTypes: number;
    totalInstances: number;
    typeBreakdown: Record<string, number>;
  } {
    return StateContainer._registry.getStats();
  }

  /**
   * Get reference count for an instance
   * @param key - Optional instance key
   */
  static getRefCount<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    key?: string,
  ): number {
    return StateContainer._registry.getRefCount(this, key);
  }

  /**
   * Check if an instance exists
   * @param key - Optional instance key
   */
  static hasInstance<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    key?: string,
  ): boolean {
    return StateContainer._registry.hasInstance(this, key);
  }

  private _state: S;
  private readonly listeners = new Set<StateListener<S>>();
  private _disposed = false;
  private readonly config: StateContainerConfig;

  readonly name: string;
  readonly debug: boolean;
  readonly instanceId: string;

  /**
   * Create a new StateContainer
   */
  constructor(initialState: S, config: StateContainerConfig = {}) {
    this._state = initialState;
    this.config = config;
    this.name = config.name || this.constructor.name;
    this.debug = config.debug ?? false;
    this.instanceId =
      config.instanceId || generateSimpleId(this.constructor.name);

    // Notify lifecycle listeners
    StateContainer._registry.emit('created', this);
  }

  /**
   * Get the current state
   */
  get state(): S {
    return this._state;
  }

  /**
   * Check if disposed
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: StateListener<S>): () => void {
    if (this._disposed) {
      throw new Error(`Cannot subscribe to disposed container ${this.name}`);
    }

    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Dispose the container
   */
  dispose(): void {
    if (this._disposed) return;

    if (this.debug) {
      console.log(`[${this.name}] Disposing...`);
    }

    this._disposed = true;

    // Call optional lifecycle hook
    this.onDispose?.();

    this.listeners.clear();

    // Notify lifecycle listeners
    StateContainer._registry.emit('disposed', this);

    if (this.debug) {
      console.log(`[${this.name}] Disposed successfully`);
    }
  }

  /**
   * Emit a new state (with change detection)
   */
  protected emit(newState: S): void {
    if (this._disposed) {
      throw new Error(`Cannot emit state from disposed container ${this.name}`);
    }

    // Skip if state hasn't changed (reference equality)
    if (this._state === newState) return;

    const previousState = this._state;
    this._state = newState;

    // Call optional lifecycle hook
    this.onStateChange?.(newState, previousState);

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(newState);
      } catch (error) {
        console.error(`[${this.name}] Error in listener:`, error);
      }
    }

    // Notify lifecycle listeners
    StateContainer._registry.emit(
      'stateChanged',
      this,
      previousState,
      newState,
    );
  }

  /**
   * Update state using a function
   */
  protected update(updater: (current: S) => S): void {
    if (this._disposed) {
      throw new Error(
        `Cannot update state from disposed container ${this.name}`,
      );
    }
    this.emit(updater(this._state));
  }

  /**
   * Optional disposal hook for subclasses
   */
  protected onDispose?(): void;

  /**
   * Optional state change hook for subclasses
   */
  protected onStateChange?(newState: S, previousState: S): void;
}
