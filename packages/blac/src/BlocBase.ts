import { generateUUID } from './utils/uuid';
import { BlocPlugin, ErrorContext } from './plugins/types';
import { BlocPluginRegistry } from './plugins/BlocPluginRegistry';
import { Blac } from './Blac';
import { SubscriptionManager } from './subscription/SubscriptionManager';

export type BlocInstanceId = string | number | undefined;
type DependencySelector<S> = (
  currentState: S,
  previousState: S | undefined,
  instance: any,
) => unknown[];

/**
 * Enum representing the lifecycle states of a Bloc instance
 */
export enum BlocLifecycleState {
  ACTIVE = 'active',
  DISPOSAL_REQUESTED = 'disposal_requested',
  DISPOSING = 'disposing',
  DISPOSED = 'disposed',
}

export interface StateTransitionResult {
  success: boolean;
  currentState: BlocLifecycleState;
  previousState: BlocLifecycleState;
}

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
  public _name: string;

  /**
   * Unified subscription manager for all state notifications
   */
  public _subscriptionManager: SubscriptionManager<S>;

  _state: S;
  private _disposalState = BlocLifecycleState.ACTIVE;
  private _disposalLock = false;
  _keepAlive = false;
  public lastUpdate?: number;

  _plugins = new BlocPluginRegistry<S, any>();

  onDispose?: () => void;

  private _disposalTimer?: NodeJS.Timeout | number;
  private _disposalHandler?: (bloc: BlocBase<unknown>) => void;

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
    if (this._disposalState === BlocLifecycleState.DISPOSED) {
      return this._state; // Return last known state for disposed blocs
    }
    return this._state;
  }

  /**
   * Subscribe to all state changes
   */
  subscribe(callback: (state: S) => void): () => void {
    return this._subscriptionManager.subscribe({
      type: 'observer',
      notify: (state) => callback(state as S),
    });
  }

  /**
   * Subscribe with a selector for optimized updates
   */
  subscribeWithSelector<T>(
    selector: (state: S) => T,
    callback: (value: T) => void,
    equalityFn?: (a: T, b: T) => boolean,
  ): () => void {
    return this._subscriptionManager.subscribe({
      type: 'consumer',
      selector: selector as any,
      equalityFn: equalityFn as any,
      notify: (value) => callback(value as T),
    });
  }

  /**
   * Subscribe with React component reference for automatic cleanup
   */
  subscribeComponent(
    componentRef: WeakRef<object>,
    callback: () => void,
  ): () => void {
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
    // Validate state emission conditions
    if (this._disposalState !== BlocLifecycleState.ACTIVE) {
      Blac.error(
        `[${this._name}:${this._id}] Attempted state update on ${this._disposalState} bloc. Update ignored.`,
      );
      return;
    }

    if (newState === undefined) {
      return; // Silent failure for undefined states
    }

    this._state = newState;

    // Apply plugins
    let transformedState = newState;
    transformedState = this._plugins.transformState(oldState, transformedState);
    this._state = transformedState;

    // Notify plugins of state change
    this._plugins.notifyStateChange(oldState, transformedState);

    // Notify system plugins of state change
    Blac.instance.plugins.notifyStateChanged(
      this as any,
      oldState,
      transformedState,
    );

    // Handle batching
    if (this._isBatching) {
      this._pendingUpdates.push({
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

  /**
   * Internal state update batching
   */
  private _pendingUpdates: Array<{
    newState: S;
    oldState: S;
    action?: unknown;
  }> = [];
  private _isBatching = false;

  _batchUpdates(callback: () => void): void {
    if (this._isBatching) {
      callback();
      return;
    }

    this._isBatching = true;
    this._pendingUpdates = [];

    try {
      callback();

      if (this._pendingUpdates.length > 0) {
        const finalUpdate =
          this._pendingUpdates[this._pendingUpdates.length - 1];
        this._subscriptionManager.notify(
          finalUpdate.newState,
          finalUpdate.oldState,
          finalUpdate.action,
        );
      }
    } finally {
      this._isBatching = false;
      this._pendingUpdates = [];
    }
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
    this._plugins.remove(plugin.id);
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
    return this._disposalState === BlocLifecycleState.DISPOSED;
  }

  /**
   * Atomic state transition for disposal
   */
  _atomicStateTransition(
    expectedState: BlocLifecycleState,
    newState: BlocLifecycleState,
  ): StateTransitionResult {
    if (this._disposalLock) {
      return {
        success: false,
        currentState: this._disposalState,
        previousState: this._disposalState,
      };
    }

    this._disposalLock = true;
    try {
      if (this._disposalState !== expectedState) {
        return {
          success: false,
          currentState: this._disposalState,
          previousState: this._disposalState,
        };
      }

      const previousState = this._disposalState;
      this._disposalState = newState;

      return {
        success: true,
        currentState: newState,
        previousState,
      };
    } finally {
      this._disposalLock = false;
    }
  }

  /**
   * Dispose the bloc and clean up resources
   */
  async dispose(): Promise<void> {
    const transitionResult = this._atomicStateTransition(
      BlocLifecycleState.ACTIVE,
      BlocLifecycleState.DISPOSING,
    );

    if (!transitionResult.success) {
      if (this._disposalState === BlocLifecycleState.DISPOSAL_REQUESTED) {
        this._atomicStateTransition(
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
        this.onDispose();
      }

      // Notify plugins of disposal
      for (const plugin of this._plugins.getAll()) {
        try {
          plugin.onDispose?.(this as any);
        } catch (error) {
          console.error('Plugin disposal error:', error);
        }
      }

      // Call disposal handler
      if (this._disposalHandler) {
        this._disposalHandler(this as any);
      }
    } finally {
      this._atomicStateTransition(
        BlocLifecycleState.DISPOSING,
        BlocLifecycleState.DISPOSED,
      );
    }
  }

  /**
   * Schedule disposal when no subscriptions remain
   */
  _scheduleDisposal(): void {
    // Cancel any existing disposal timer
    if (this._disposalTimer) {
      clearTimeout(this._disposalTimer as NodeJS.Timeout);
      this._disposalTimer = undefined;
    }

    const shouldDispose =
      this._subscriptionManager.size === 0 && !this._keepAlive;

    if (!shouldDispose) {
      return;
    }

    const transitionResult = this._atomicStateTransition(
      BlocLifecycleState.ACTIVE,
      BlocLifecycleState.DISPOSAL_REQUESTED,
    );

    if (!transitionResult.success) {
      return;
    }

    this._disposalTimer = setTimeout(() => {
      const stillShouldDispose =
        this._subscriptionManager.size === 0 &&
        !this._keepAlive &&
        this._disposalState === BlocLifecycleState.DISPOSAL_REQUESTED;

      if (stillShouldDispose) {
        this.dispose();
      } else {
        this._atomicStateTransition(
          BlocLifecycleState.DISPOSAL_REQUESTED,
          BlocLifecycleState.ACTIVE,
        );
      }
    }, 16);
  }

  /**
   * Set disposal handler
   */
  setDisposalHandler(handler: (bloc: BlocBase<unknown>) => void): void {
    this._disposalHandler = handler;
  }

  /**
   * Check if disposal should be scheduled (called by subscription manager)
   */
  checkDisposal(): void {
    if (
      this._subscriptionManager.size === 0 &&
      !this._keepAlive &&
      this._disposalState === BlocLifecycleState.ACTIVE
    ) {
      this._scheduleDisposal();
    }
  }
}
