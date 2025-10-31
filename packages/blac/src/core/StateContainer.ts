/**
 * StateContainer - Simple state management container
 *
 * Simplified from ~770 lines to ~150 lines by removing:
 * - Subscription pipeline architecture
 * - Complex lifecycle management (5 states -> 1 disposed flag)
 * - Version tracking and history
 * - Multiple event streams
 * - Deep cloning and freezing
 */

import { generateSimpleId } from '../utils/idGenerator';
import { debug } from '../logging/Logger';

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
  instance: StateContainer<any>;
  refCount: number;
}

/**
 * Listener function for state changes
 */
type StateListener<S> = (state: S) => void;

/**
 * Base abstract class for all state containers
 * Simplified architecture with direct state management
 */
export abstract class StateContainer<S> {
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
   */
  static getOrCreate<T extends StateContainer<any>>(
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
   */
  static release<T extends StateContainer<any>>(
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
  static getRefCount<T extends StateContainer<any>>(
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
  static hasInstance<T extends StateContainer<any>>(
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

  private _state: S;
  private listeners = new Set<StateListener<S>>();
  private _disposed = false;

  // Identity
  protected readonly _instanceId: string;
  protected readonly _className: string;
  protected readonly _name: string;

  // Configuration
  protected readonly config: Required<StateContainerConfig>;

  /**
   * Create a new StateContainer
   */
  constructor(initialState: S, config: StateContainerConfig = {}) {
    this._state = initialState;
    this._instanceId = config.instanceId || this.generateId();
    this._className = this.constructor.name;
    this._name = config.name || this._className;

    this.config = {
      instanceId: this._instanceId,
      name: this._name,
      keepAlive: config.keepAlive ?? false,
      isolated: config.isolated ?? false,
      debug: config.debug ?? false,
    };
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Get the current state
   */
  get state(): S {
    return this._state;
  }

  /**
   * Get instance ID
   */
  get instanceId(): string {
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
   * Check if container should be kept alive
   */
  get keepAlive(): boolean {
    return this.config.keepAlive;
  }

  /**
   * Check if disposed
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateListener<S>): () => void {
    if (this._disposed) {
      throw new Error(`Cannot subscribe to disposed container ${this._name}`);
    }

    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Dispose the container
   */
  dispose(): void {
    if (this._disposed) {
      return; // Already disposed
    }

    if (this.config.debug) {
      console.log(`[${this._name}] Disposing...`);
    }

    this._disposed = true;

    // Call lifecycle hook
    this.onDispose();

    // Clear all listeners
    this.listeners.clear();

    if (this.config.debug) {
      console.log(`[${this._name}] Disposed successfully`);
    }
  }

  // ============================================
  // Lifecycle Hooks (for subclasses)
  // ============================================

  /**
   * Called when container is disposed
   */
  protected onDispose(): void {
    // Override in subclasses
  }

  /**
   * Called when state changes
   */
  protected onStateChange(newState: S, previousState: S): void {
    // Override in subclasses
  }

  // ============================================
  // Protected Methods for Subclasses
  // ============================================

  /**
   * Emit a new state
   */
  protected emit(newState: S): void {
    if (this._disposed) {
      throw new Error(
        `Cannot emit state from disposed container ${this._name}`,
      );
    }

    const previousState = this._state;
    this._state = newState;

    if (this.config.debug) {
      debug('StateContainer', 'emit', {
        container: this._name,
      });
    }

    // Call lifecycle hook
    this.onStateChange(newState, previousState);

    // Notify all listeners
    this.notifyListeners();
  }

  /**
   * Update state using a function
   */
  protected update(updater: (current: S) => S): void {
    if (this._disposed) {
      throw new Error(
        `Cannot update state from disposed container ${this._name}`,
      );
    }

    const newState = updater(this._state);
    this.emit(newState);
  }

  /**
   * Notify all listeners about state change
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this._state);
      } catch (error) {
        console.error(`[${this._name}] Error in listener:`, error);
      }
    }
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return generateSimpleId(this.constructor.name);
  }
}
