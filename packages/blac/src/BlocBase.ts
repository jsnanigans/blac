import { generateUUID } from './utils/uuid';
import { BlocPlugin } from './plugins/types';
import { BlocPluginRegistry } from './plugins/BlocPluginRegistry';
import { SubscriptionManager } from './subscription/SubscriptionManager';
import { SubscriptionResult } from './subscription/types';
import {
  BlocLifecycleManager,
  BlocLifecycleState,
  StateTransitionResult,
} from './lifecycle/BlocLifecycle';
import { BatchingManager } from './utils/BatchingManager';
import { Blac } from './Blac';

export type BlocInstanceId = string | number | undefined;

interface BlocStaticProperties {
  isolated: boolean;
  keepAlive: boolean;
  plugins?: BlocPlugin<any, any>[];
}

/**
 * Base class for both Blocs and Cubits using unified subscription model.
 */
export abstract class BlocBase<S> {
  public uid = generateUUID();
  blacInstance?: Blac;

  static isolated = false;
  get isIsolated() {
    return this._isolated;
  }

  static keepAlive = false;
  get isKeepAlive() {
    return this._keepAlive;
  }


  public _isolated = false;
  public _id: BlocInstanceId;
  public _instanceRef?: string;
  public _name: string;

  /**
   * Unified subscription manager for all state notifications
   */
  public _subscriptionManager: SubscriptionManager<S>;

  _state: S;
  private _lifecycleManager = new BlocLifecycleManager();
  private _batchingManager = new BatchingManager<S>();
  _keepAlive = false;
  public lastUpdate?: number;

  _plugins = new BlocPluginRegistry<S, any>();

  /**
   * Called synchronously when disposal is scheduled (subscriptionCount === 0).
   * Use this to clean up intervals, timers, pending promises, and other resources
   * that might prevent disposal.
   *
   * IMPORTANT:
   * - Must be synchronous (no async/await)
   * - Errors are logged but do not prevent disposal
   * - Called before disposal microtask is queued
   * - Cannot prevent disposal (that's what plugins are for)
   *
   * @example
   * ```typescript
   * class TimerCubit extends Cubit<number> {
   *   interval?: NodeJS.Timeout;
   *
   *   constructor() {
   *     super(0);
   *
   *     this.onDisposalScheduled = () => {
   *       if (this.interval) {
   *         clearInterval(this.interval);
   *         this.interval = undefined;
   *       }
   *     };
   *
   *     this.interval = setInterval(() => {
   *       this.emit(this.state + 1);
   *     }, 100);
   *   }
   * }
   * ```
   */
  onDisposalScheduled?: () => void;

  /**
   * Called when disposal completes (bloc is fully disposed).
   * Use for final cleanup like closing connections, clearing caches, etc.
   *
   * IMPORTANT:
   * - Must be synchronous (no async/await)
   * - Errors are logged but do not prevent disposal completion
   * - Called after all subscriptions are cleared
   *
   * @example
   * ```typescript
   * class DatabaseBloc extends Bloc<DbState, DbEvents> {
   *   constructor(private connection: DbConnection) {
   *     super(initialState);
   *
   *     this.onDispose = () => {
   *       this.connection.close();
   *     };
   *   }
   * }
   * ```
   */
  onDispose?: () => void;

  /**
   * Creates a new BlocBase instance with unified subscription management
   */
  constructor(initialState: S) {
    this._state = initialState;
    this._id = this.constructor.name;
    this._name = this.constructor.name;

    // Initialize unified subscription system
    this._subscriptionManager = new SubscriptionManager(this as any);

    // Access static properties
    const Constructor = this.constructor as typeof BlocBase &
      BlocStaticProperties;

    this._keepAlive =
      typeof Constructor.keepAlive === 'boolean'
        ? Constructor.keepAlive
        : false;
    this._isolated =
      typeof Constructor.isolated === 'boolean' ? Constructor.isolated : false;

    // Initialize plugin registry
    this._plugins = new BlocPluginRegistry<S, any>();

    // Register static plugins
    if (Constructor.plugins && Array.isArray(Constructor.plugins)) {
      for (const plugin of Constructor.plugins) {
        this._plugins.add(plugin);
      }
    }

    // Attach all plugins
    this._plugins.attach(this);
  }

  /**
   * Returns the current state
   */
  get state(): S {
    if (this._lifecycleManager.isDisposed) {
      return this._state; // Return last known state for disposed blocs
    }
    return this._state;
  }

  /**
   * Subscribe to all state changes
   * @returns Object containing subscription ID and unsubscribe function
   */
  subscribe(callback: (state: S) => void): SubscriptionResult {
    return this._subscriptionManager.subscribe({
      type: 'observer',
      notify: (state) => callback(state as S),
    });
  }

  /**
   * Subscribe with a selector for optimized updates
   * @returns Object containing subscription ID and unsubscribe function
   */
  subscribeWithSelector<T>(
    selector: (state: S) => T,
    callback: (value: T) => void,
    equalityFn?: (a: T, b: T) => boolean,
  ): SubscriptionResult {
    return this._subscriptionManager.subscribe({
      type: 'consumer',
      selector: selector as any,
      equalityFn: equalityFn as any,
      notify: (value) => callback(value as T),
    });
  }

  /**
   * Subscribe with React component reference for automatic cleanup
   * @returns Object containing subscription ID and unsubscribe function
   */
  subscribeComponent(
    componentRef: WeakRef<object>,
    callback: () => void,
  ): SubscriptionResult {
    return this._subscriptionManager.subscribe({
      type: 'consumer',
      weakRef: componentRef,
      notify: callback,
    });
  }

  /**
   * Get current subscription count
   */
  get subscriptionCount(): number {
    return this._subscriptionManager.size;
  }

  /**
   * Track property access for a subscription
   */
  trackAccess(subscriptionId: string, path: string, value?: unknown): void {
    this._subscriptionManager.trackAccess(subscriptionId, path, value);
  }

  /**
   * Emit a new state
   */
  protected emit(newState: S, action?: unknown): void {
    this._pushState(newState, this._state, action);
  }

  /**
   * Internal state push method used by Bloc
   */
  _pushState(newState: S, oldState: S, action?: unknown): void {
    const currentState = this._lifecycleManager.currentState;

    // Only allow emissions on ACTIVE blocs
    if (currentState !== BlocLifecycleState.ACTIVE) {
      this.blacInstance?.error(
        `[${this._name}:${this._id}] Cannot emit state on ${currentState} bloc. ` +
          `State update ignored. ` +
          `If this bloc uses setInterval/setTimeout, clean up in onDisposalScheduled hook.`,
      );
      return;
    }

    if (newState === undefined) {
      return; // Silent failure for undefined states
    }

    this._state = newState;

    // Apply plugins
    const transformedState = this._plugins.transformState(
      oldState,
      newState,
    ) as S;
    this._state = transformedState;

    // Notify plugins of state change
    this._plugins.notifyStateChange(oldState, transformedState);

    // Notify system plugins of state change
    this.blacInstance?.plugins.notifyStateChanged(
      this as any,
      oldState,
      transformedState,
    );

    // Handle batching
    if (this._batchingManager.isCurrentlyBatching) {
      this._batchingManager.addUpdate({
        newState: transformedState,
        oldState,
        action,
      });
      return;
    }

    // Notify all subscriptions
    this._subscriptionManager.notify(transformedState, oldState, action);
    this.lastUpdate = Date.now();
  }

  _batchUpdates(callback: () => void): void {
    this._batchingManager.batchUpdates(callback, (finalUpdate) => {
      this._subscriptionManager.notify(
        finalUpdate.newState,
        finalUpdate.oldState,
        finalUpdate.action,
      );
    });
  }

  /**
   * Add a plugin
   */
  addPlugin(plugin: BlocPlugin<S, any>): void {
    this._plugins.add(plugin);

    // If plugins are already attached (bloc is active), attach the new plugin
    if ((this._plugins as any).attached && plugin.onAttach) {
      try {
        plugin.onAttach(this);
      } catch (error) {
        console.error(`Plugin '${plugin.name}' error in onAttach:`, error);
      }
    }
  }

  /**
   * Remove a plugin
   */
  removePlugin(plugin: BlocPlugin<S, any>): void {
    this._plugins.remove(plugin.name);
  }

  /**
   * Get all plugins
   */
  get plugins(): ReadonlyArray<BlocPlugin<S, any>> {
    return this._plugins.getAll();
  }

  /**
   * Disposal management
   */
  get isDisposed(): boolean {
    return this._lifecycleManager.isDisposed;
  }

  /**
   * Atomic state transition for disposal
   */
  _atomicStateTransition(
    expectedState: BlocLifecycleState,
    newState: BlocLifecycleState,
  ): StateTransitionResult {
    return this._lifecycleManager.atomicStateTransition(
      expectedState,
      newState,
    );
  }

  /**
   * Dispose the bloc and clean up resources
   */
  async dispose(): Promise<void> {
    const transitionResult = this._lifecycleManager.atomicStateTransition(
      BlocLifecycleState.ACTIVE,
      BlocLifecycleState.DISPOSING,
    );

    if (!transitionResult.success) {
      if (
        this._lifecycleManager.currentState ===
        BlocLifecycleState.DISPOSAL_REQUESTED
      ) {
        this._lifecycleManager.atomicStateTransition(
          BlocLifecycleState.DISPOSAL_REQUESTED,
          BlocLifecycleState.DISPOSING,
        );
      } else {
        return;
      }
    }

    try {
      // Clear subscriptions
      this._subscriptionManager.clear();

      // Call disposal hook
      if (this.onDispose) {
        try {
          this.onDispose();
        } catch (error) {
          // Log error but don't crash - disposal must complete
          this.blacInstance?.error(
            `[${this._name}:${this._id}] Error in onDispose hook:`,
            error,
          );
          // Continue with disposal
        }
      }

      // Notify bloc-level plugins of disposal
      for (const plugin of this._plugins.getAll()) {
        try {
          if ('onDispose' in plugin && typeof plugin.onDispose === 'function') {
            plugin.onDispose(this as any);
          }
        } catch (error) {
          console.error('Plugin disposal error:', error);
        }
      }

      // Notify system-level plugins (via Blac instance)
      if (this.blacInstance) {
        try {
          this.blacInstance.plugins.notifyBlocDisposed(this);
        } catch (error) {
          console.error('System plugin disposal notification error:', error);
        }
      }

      // Call disposal handler (for registry cleanup)
      const handler = this._lifecycleManager.getDisposalHandler();
      if (handler) {
        handler(this as any);
      }
    } finally {
      this._lifecycleManager.atomicStateTransition(
        BlocLifecycleState.DISPOSING,
        BlocLifecycleState.DISPOSED,
      );
    }
  }


  /**
   * Schedule disposal when no subscriptions remain
   */
  _scheduleDisposal(): void {
    const shouldDispose =
      this._subscriptionManager.size === 0 && !this._keepAlive;

    if (!shouldDispose) {
      return;
    }

    // Call cleanup hook synchronously BEFORE scheduling disposal
    if (this.onDisposalScheduled) {
      try {
        this.onDisposalScheduled();
      } catch (error) {
        // Log error but don't crash - disposal must proceed
        this.blacInstance?.error(
          `[${this._name}:${this._id}] Error in onDisposalScheduled hook:`,
          error,
        );
        // Continue with disposal
      }
    }

    this.blacInstance?.log(
      `[${this._name}:${this._id}] Scheduling disposal on next microtask`,
    );

    this._lifecycleManager.scheduleDisposal(
      () => this._subscriptionManager.size === 0 && !this._keepAlive,
      () => this.dispose(),
    );
  }

  /**
   * Set disposal handler
   */
  setDisposalHandler(handler: (bloc: BlocBase<unknown>) => void): void {
    this._lifecycleManager.setDisposalHandler(
      handler as (bloc: unknown) => void,
    );
  }

  /**
   * Check if disposal should be scheduled (called by subscription manager)
   */
  checkDisposal(): void {
    if (
      this._subscriptionManager.size === 0 &&
      !this._keepAlive &&
      this._lifecycleManager.currentState === BlocLifecycleState.ACTIVE
    ) {
      this._scheduleDisposal();
    }
  }

  /**
   * Cancel disposal if bloc is in disposal_requested state
   */
  _cancelDisposalIfRequested(): void {
    const currentState = this._lifecycleManager.currentState;

    this.blacInstance?.log(
      `[${this._name}:${this._id}] Attempting to cancel disposal. Current state: ${currentState}`,
    );

    // Only cancel if in DISPOSAL_REQUESTED state
    if (currentState !== BlocLifecycleState.DISPOSAL_REQUESTED) {
      if (
        currentState === BlocLifecycleState.DISPOSING ||
        currentState === BlocLifecycleState.DISPOSED
      ) {
        this.blacInstance?.warn(
          `[${this._name}:${this._id}] Cannot cancel disposal - ` +
            `already ${currentState}. This typically happens when trying to resubscribe ` +
            `after disposal has already started.`,
        );
      }
      return;
    }

    const success = this._lifecycleManager.cancelDisposal();

    if (success) {
      this.blacInstance?.log(
        `[${this._name}:${this._id}] Successfully cancelled disposal`,
      );
    } else {
      this.blacInstance?.error(
        `[${this._name}:${this._id}] Failed to cancel disposal ` +
          `despite being in DISPOSAL_REQUESTED state`,
      );
    }
  }
}
