/**
 * BlocBase v3.0.0 - Full generator implementation
 * This file shows what BlocBase will look like after removing deprecated callback APIs
 */

import { generateUUID } from './utils/uuid';
import { BlocPlugin } from './plugins/types';
import { BlocPluginRegistry } from './plugins/BlocPluginRegistry';
import { Blac } from './Blac';

export type BlocInstanceId = string | number | undefined;
type DependencySelector<S> = (
  currentState: S,
  previousState: S | undefined,
  instance: any,
) => unknown[];

/**
 * Simplified lifecycle states - no more complex disposal state machine
 */
export enum BlocLifecycleState {
  ACTIVE = 'ACTIVE',
  DISPOSED = 'DISPOSED',
}

interface BlocStaticProperties {
  isolated: boolean;
  keepAlive: boolean;
  plugins?: BlocPlugin<any, any>[];
}

/**
 * Base class for both Blocs and Cubits with full generator-based implementation
 * All callback-based observer APIs have been removed in favor of async generators
 * 
 * @abstract This class should be extended, not instantiated directly
 * @template S The type of state managed by this Bloc
 */
export abstract class BlocBase<S> {
  public uid = generateUUID();
  
  static isolated = false;
  get isIsolated() {
    return this._isolated;
  }

  static keepAlive = false;
  get isKeepAlive() {
    return this._keepAlive;
  }

  defaultDependencySelector: DependencySelector<S> | undefined;

  public _isolated = false;
  public _id: BlocInstanceId;
  public _instanceRef?: string;
  public _keepAlive = false;
  public readonly _createdAt = Date.now();
  
  /**
   * Simplified lifecycle state - just active or disposed
   */
  private _lifecycleState: BlocLifecycleState = BlocLifecycleState.ACTIVE;
  
  /**
   * Generator-based state channel for efficient streaming
   */
  private _stateChannel: {
    send: (state: S) => void;
    close: () => void;
    generator: AsyncGenerator<S, void, void>;
  };
  
  /**
   * Active state stream iterators for cleanup
   */
  private _activeIterators = new Set<AsyncGenerator<any, void, void>>();
  
  public _state: S;
  public _oldState: S | undefined;
  
  private _batchingEnabled = false;
  private _pendingUpdates: Array<{
    newState: S;
    oldState: S;
    action?: unknown;
  }> = [];
  
  private _consumerRefs = new Map<string, WeakRef<object>>();
  protected _plugins: BlocPluginRegistry<S, any>;
  
  _validateConsumers = (): void => {
    const deadConsumers: string[] = [];

    for (const [consumerId, weakRef] of this._consumerRefs) {
      if (weakRef.deref() === undefined) {
        deadConsumers.push(consumerId);
      }
    }

    // Clean up dead consumers
    for (const consumerId of deadConsumers) {
      this._consumers.delete(consumerId);
      this._consumerRefs.delete(consumerId);
    }

    // Auto-dispose if no consumers and not keep-alive
    if (this._consumers.size === 0 && !this._keepAlive) {
      this._dispose();
    }
  };

  constructor(initialState: S) {
    this._state = initialState;
    this._id = this.constructor.name;

    const Constructor = this.constructor as typeof BlocBase & BlocStaticProperties;

    this._keepAlive = typeof Constructor.keepAlive === 'boolean' 
      ? Constructor.keepAlive 
      : false;
    this._isolated = typeof Constructor.isolated === 'boolean' 
      ? Constructor.isolated 
      : false;

    // Initialize plugin registry
    this._plugins = new BlocPluginRegistry<S, any>();

    // Register static plugins
    if (Constructor.plugins && Array.isArray(Constructor.plugins)) {
      for (const plugin of Constructor.plugins) {
        this.addPlugin(plugin);
      }
    }
    
    // Create the state channel
    this._stateChannel = this._createStateChannel();
    
    // Set up cleanup on dispose
    this.onDispose = () => {
      this._stateChannel.close();
      this._cleanupIterators();
    };
  }

  get state(): S {
    return this._state;
  }

  get isDisposed(): boolean {
    return this._lifecycleState === BlocLifecycleState.DISPOSED;
  }

  get lifecycleState(): BlocLifecycleState {
    return this._lifecycleState;
  }

  get consumerCount(): number {
    return this._consumerSet.size;
  }

  get hasConsumers(): boolean {
    return this._consumerSet.size > 0;
  }

  get _consumers(): Set<string> {
    return this._consumerSet;
  }

  /**
   * Public dispose method for manual disposal
   */
  dispose(): boolean {
    return this._dispose();
  }

  /**
   * Emit a new state
   */
  emit(newState: S): void {
    if (this.isDisposed) return;
    if (Object.is(newState, this._state)) return; // Skip identical states
    
    const oldState = this._state;
    this._pushState(newState, oldState);
  }

  get _name() {
    return this.constructor.name;
  }

  _updateId = (id?: BlocInstanceId) => {
    const originalId = this._id;
    if (!id || id === originalId) return;
    this._id = id;
  };

  /**
   * Simplified disposal - no more complex state transitions
   */
  _dispose(): boolean {
    if (this.isDisposed) return false;
    
    this._lifecycleState = BlocLifecycleState.DISPOSED;
    
    // Cleanup
    this._consumerSet.clear();
    this._consumerRefs.clear();
    this._stateChannel.close();
    this._cleanupIterators();
    
    // Call user-defined disposal hook
    this.onDispose?.();
    
    return true;
  }

  onDispose?: () => void;
  onMount?: () => void;
  onUnmount?: () => void;
  private _consumerSet = new Set<string>();

  _addConsumer = (consumerId: string, consumerRef?: object): boolean => {
    if (this.isDisposed) return false;
    if (this._consumerSet.has(consumerId)) return true;

    const wasEmpty = this._consumerSet.size === 0;
    this._consumerSet.add(consumerId);
    
    if (consumerRef) {
      this._consumerRefs.set(consumerId, new WeakRef(consumerRef));
    }

    // Call onMount when first consumer is added
    if (wasEmpty && this.onMount) {
      try {
        this.onMount();
      } catch (error) {
        Blac.error('Error in onMount:', error);
      }
    }

    Blac.log(
      `[${this._name}:${this._id}] Consumer added. Total consumers: ${this._consumerSet.size}`,
    );

    return true;
  };

  _removeConsumer = (consumerId: string) => {
    if (!this._consumerSet.has(consumerId)) return;

    this._consumerSet.delete(consumerId);
    this._consumerRefs.delete(consumerId);

    // Call onUnmount when last consumer is removed
    if (this._consumerSet.size === 0 && this.onUnmount) {
      try {
        this.onUnmount();
      } catch (error) {
        Blac.error('Error in onUnmount:', error);
      }
    }

    Blac.log(
      `[${this._name}:${this._id}] Consumer removed. Remaining consumers: ${this._consumerSet.size}`,
    );

    // Auto-dispose if no consumers and not keep-alive
    if (this._consumerSet.size === 0 && !this._keepAlive && !this.isDisposed) {
      // Use microtask to allow for immediate re-mount (React Strict Mode)
      queueMicrotask(() => {
        if (this._consumerSet.size === 0 && !this._keepAlive) {
          this._dispose();
        }
      });
    }
  };

  lastUpdate = Date.now();

  /**
   * Creates a generator-based state channel
   */
  private _createStateChannel(): {
    send: (state: S) => void;
    close: () => void;
    generator: AsyncGenerator<S, void, void>;
  } {
    const queue: S[] = [];
    let resolver: ((value: { state: S } | { done: true }) => void) | null = null;
    let closed = false;

    const generator = (async function* (): AsyncGenerator<S, void, void> {
      while (!closed) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else {
          const result = await new Promise<{ state: S } | { done: true }>(
            (resolve) => {
              resolver = resolve;
            },
          );

          if ('state' in result) {
            yield result.state;
          } else {
            break;
          }
        }
      }
    })();

    return {
      send: (state: S) => {
        if (closed) return;

        if (resolver) {
          resolver({ state });
          resolver = null;
        } else {
          queue.push(state);
        }
      },
      close: () => {
        closed = true;
        if (resolver) {
          resolver({ done: true });
          resolver = null;
        }
      },
      generator,
    };
  }
  
  /**
   * Clean up all active iterators
   */
  private _cleanupIterators(): void {
    for (const iterator of this._activeIterators) {
      iterator.return?.();
    }
    this._activeIterators.clear();
  }
  
  /**
   * Register an iterator for cleanup
   */
  private _registerIterator(iterator: AsyncGenerator<any, void, void>): void {
    this._activeIterators.add(iterator);
  }
  
  /**
   * Unregister an iterator after completion
   */
  private _unregisterIterator(iterator: AsyncGenerator<any, void, void>): void {
    this._activeIterators.delete(iterator);
  }

  /**
   * Simplified state push - notifies via state channel
   */
  _pushState = (newState: S, oldState: S, action?: unknown): void => {
    if (newState === undefined) return;

    // Transform state through plugins
    let transformedState: S = newState;
    try {
      transformedState = this._plugins.transformState(oldState, newState);
    } catch (error) {
      this._plugins.notifyError(error as Error, {
        phase: 'state-change',
        operation: 'transformState',
      });
    }

    if (this._batchingEnabled) {
      this._pendingUpdates.push({
        newState: transformedState,
        oldState,
        action,
      });
      this._oldState = oldState;
      this._state = transformedState;
      return;
    }

    // Update state
    this._oldState = oldState;
    this._state = transformedState;

    // Notify via state channel
    this._stateChannel.send(transformedState);
    
    // Notify plugins
    try {
      this._plugins.notifyStateChange(oldState, transformedState);
    } catch (error) {
      console.error('Error notifying bloc plugins of state change:', error);
    }
    
    // Notify system plugins
    Blac.instance.plugins.notifyStateChanged(this as any, oldState, transformedState);
    
    this.lastUpdate = Date.now();
  };

  /**
   * Enables batching for multiple state updates
   */
  batch = <T>(batchFn: () => T): T => {
    if (this._batchingEnabled) {
      return batchFn();
    }

    this._batchingEnabled = true;
    this._pendingUpdates = [];

    try {
      const result = batchFn();

      // Process all batched updates
      if (this._pendingUpdates.length > 0) {
        const finalUpdate = this._pendingUpdates[this._pendingUpdates.length - 1];
        this._stateChannel.send(finalUpdate.newState);
        this.lastUpdate = Date.now();
      }

      return result;
    } finally {
      this._batchingEnabled = false;
      this._pendingUpdates = [];
    }
  };

  /**
   * Advanced batching with async generator
   */
  async *batchStream(
    maxBatchSize = 100,
    flushInterval = 16,
  ): AsyncGenerator<S[], void, void> {
    const stateQueue: S[] = [];
    let lastFlush = Date.now();
    let isFirstState = true;

    const iterator = this.stateStream();
    this._registerIterator(iterator);

    try {
      for await (const state of iterator) {
        // Skip initial state on first iteration
        if (isFirstState) {
          isFirstState = false;
          continue;
        }

        stateQueue.push(state);

        const now = Date.now();
        const shouldFlush =
          stateQueue.length >= maxBatchSize ||
          (stateQueue.length > 0 && now - lastFlush >= flushInterval);

        if (shouldFlush) {
          yield [...stateQueue];
          stateQueue.length = 0;
          lastFlush = now;
        }
      }

      // Yield any remaining states
      if (stateQueue.length > 0) {
        yield stateQueue;
      }
    } finally {
      this._unregisterIterator(iterator);
    }
  }

  // Plugin management methods remain the same
  addPlugin(plugin: BlocPlugin<S, any>): void {
    this._plugins.add(plugin);

    if (!this.isDisposed) {
      try {
        if (plugin.onAttach) {
          plugin.onAttach(this as any);
        }
      } catch (error) {
        console.error(`Failed to attach plugin '${plugin.name}':`, error);
        this._plugins.remove(plugin.name);
        throw error;
      }
    }
  }

  removePlugin(pluginName: string): boolean {
    return this._plugins.remove(pluginName);
  }

  getPlugin(pluginName: string): BlocPlugin<S, any> | undefined {
    return this._plugins.get(pluginName);
  }

  getPlugins(): ReadonlyArray<BlocPlugin<S, any>> {
    return this._plugins.getAll();
  }

  _activatePlugins(): void {
    if (!this.isDisposed) {
      try {
        this._plugins.attach(this as any);
      } catch (error) {
        console.error(`Failed to activate plugins for ${this._name}:`, error);
      }
    }
  }

  /**
   * Returns an async generator that yields state changes
   * This is now the primary API for observing state
   */
  async *stateStream(): AsyncGenerator<S, void, void> {
    // Yield initial state
    yield this.state;

    if (this.isDisposed) return;

    // Create a new iterator from the channel
    const self = this;
    const channelIterator = (async function* (channel: typeof self._stateChannel) {
      for await (const state of channel.generator) {
        yield state;
      }
    })(this._stateChannel);

    this._registerIterator(channelIterator);

    try {
      for await (const state of channelIterator) {
        yield state;
      }
    } finally {
      this._unregisterIterator(channelIterator);
    }
  }

  /**
   * Returns an async generator that yields state changes with previous state
   */
  async *stateChanges(): AsyncGenerator<
    { previous: S; current: S },
    void,
    void
  > {
    let previous = this.state;

    const iterator = this.stateStream();
    this._registerIterator(iterator);

    try {
      // Skip initial state
      await iterator.next();

      for await (const current of iterator) {
        if (current !== previous) {
          yield { previous, current };
          previous = current;
        }
      }
    } finally {
      this._unregisterIterator(iterator);
    }
  }
}