import { BlacObservable } from './BlacObserver';

export type BlocInstanceId = string | number | undefined;
type DependencySelector<S> = (newState: S) => unknown[][];

// Define an interface for the static properties expected on a Bloc/Cubit constructor
interface BlocStaticProperties {
  isolated: boolean;
  keepAlive: boolean;
}

/**
 * Base class for both Blocs and Cubits that provides core state management functionality.
 * Handles state transitions, observer notifications, lifecycle management, and addon integration.
 * 
 * @abstract This class should be extended, not instantiated directly
 * @template S The type of state managed by this Bloc
 * @template P The type of props that can be passed during instance creation (optional)
 */
export abstract class BlocBase<
  S,
  P = unknown
> {
  public uid = crypto.randomUUID();
  /**
   * When true, every consumer will receive its own unique instance of this Bloc.
   * Use this when state should not be shared between components.
   * @default false
   */
  static isolated = false;
  get isIsolated() {
    return this._isolated;
  }
  
  /**
   * When true, the Bloc instance persists even when there are no active consumers.
   * Useful for maintaining state between component unmount/remount cycles.
   * @default false
   */
  static keepAlive = false;
  get isKeepAlive() {
    return this._keepAlive;
  }
  
  /**
   * Defines how dependencies are selected from the state for efficient updates.
   * When provided, observers will only be notified when selected dependencies change.
   */
  defaultDependencySelector: DependencySelector<S> | undefined;
  
  /**
   * @internal
   * Indicates if this specific Bloc instance is isolated from others of the same type.
   */
  public _isolated = false;
  
  /**
   * @internal
   * Observable responsible for managing state listeners and notifying consumers.
   */
  public _observer: BlacObservable<S>;
  
  /**
   * The unique identifier for this Bloc instance.
   * Defaults to the class name, but can be customized.
   */
  public _id: BlocInstanceId;
  
  /**
   * @internal
   * Reference string used internally for tracking and debugging.
   */
  public _instanceRef?: string;
  
  /**
   * @internal
   * Indicates if this specific Bloc instance should be kept alive when no consumers are present.
   */
  public _keepAlive = false;
  
  /**
   * @readonly
   * Timestamp when this Bloc instance was created, useful for debugging and performance tracking.
   */
  public readonly _createdAt = Date.now();

  /**
   * @internal
   * Disposal state to prevent race conditions
   */
  private _disposalState: 'active' | 'disposing' | 'disposed' = 'active';

  /**
   * @internal
   * The current state of the Bloc.
   */
  public _state: S;
  
  /**
   * @internal
   * The previous state of the Bloc, maintained for comparison and history.
   */
  public _oldState: S | undefined;
  
  /**
   * Props passed during Bloc instance creation.
   * Can be used to configure or parameterize the Bloc's behavior.
   */
  public props: P | null = null;

  /**
   * @internal
   * Flag to prevent batching race conditions
   */
  private _batchingLock = false;

  /**
   * @internal
   * Pending batched updates
   */
  private _pendingUpdates: Array<{newState: S, oldState: S, action?: unknown}> = [];

  /**
   * @internal
   * Map of consumer IDs to their WeakRef objects for proper cleanup
   */
  private _consumerRefs = new Map<string, WeakRef<object>>();

  /**
   * @internal
   * Validates that all consumer references are still alive
   * Removes dead consumers automatically
   */
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
    
    // Schedule disposal if no live consumers remain
    if (this._consumers.size === 0 && !this._keepAlive && this._disposalState === 'active') {
      this._scheduleDisposal();
    }
  };

  /**
   * Creates a new BlocBase instance with the given initial state.
   * Sets up the observer, registers with the Blac manager, and initializes addons.
   * 
   * @param initialState The initial state value for this Bloc
   */
  constructor(initialState: S) {
    this._state = initialState;
    this._observer = new BlacObservable(this);
    this._id = this.constructor.name;

    // Access static properties safely with proper type checking
    const Constructor = this.constructor as typeof BlocBase & BlocStaticProperties;
    
    // Validate that the static properties exist and are boolean
    this._keepAlive = typeof Constructor.keepAlive === 'boolean' ? Constructor.keepAlive : false;
    this._isolated = typeof Constructor.isolated === 'boolean' ? Constructor.isolated : false;
  }

  /**
   * Returns the current state of the Bloc.
   * Use this getter to access the state in a read-only manner.
   */
  get state(): S {
    return this._state;
  }

  /**
   * @internal
   * Returns the name of the Bloc class for identification and debugging.
   */
  get _name() {
    return this.constructor.name;
  }

  /**
   * @internal
   * Updates the Bloc instance's ID to a new value.
   * Only updates if the new ID is defined and different from the current one.
   * 
   * @param id The new ID to assign to this Bloc instance
   */
  _updateId = (id?: BlocInstanceId) => {
    const originalId = this._id;
    if (!id || id === originalId) return;
    this._id = id;
  };

  /**
   * @internal
   * Cleans up resources and removes this Bloc from the system.
   * Notifies the Blac manager and clears all observers.
   */
  _dispose() {
    // Prevent re-entrant disposal using atomic state change
    if (this._disposalState !== 'active') {
      return;
    }
    this._disposalState = 'disposing';
    
    // Clear all consumers and their references
    this._consumers.clear();
    this._consumerRefs.clear();
    
    // Clear observer subscriptions
    this._observer.clear();
    
    // Call user-defined disposal hook
    this.onDispose?.();
    
    // Mark as fully disposed
    this._disposalState = 'disposed';
    
    // The Blac manager will handle removal from registry
    // This method is called by Blac.disposeBloc, so we don't need to call it again
  }

  /**
   * @internal
   * Optional function to be called when the Bloc is disposed.
   */
  onDispose?: () => void;

  /**
   * @internal
   * Set of consumer IDs currently listening to this Bloc's state changes.
   */
  _consumers = new Set<string>();

  /**
   * @internal
   * Registers a new consumer to this Bloc instance.
   * Notifies the Blac manager that a consumer has been added.
   * 
   * @param consumerId The unique ID of the consumer being added
   * @param consumerRef Optional reference to the consumer object for cleanup validation
   */
  _addConsumer = (consumerId: string, consumerRef?: object) => {
    // Prevent adding consumers to disposed blocs
    if (this._disposalState !== 'active') {
      return;
    }
    
    if (this._consumers.has(consumerId)) return;
    this._consumers.add(consumerId);
    
    // Store WeakRef for proper memory management
    if (consumerRef) {
      this._consumerRefs.set(consumerId, new WeakRef(consumerRef));
    }
    
    // this._blac.dispatchEvent(BlacLifecycleEvent.BLOC_CONSUMER_ADDED, this, { consumerId });
  };

  /**
   * @internal
   * Unregisters a consumer from this Bloc instance.
   * Notifies the Blac manager that a consumer has been removed.
   * 
   * @param consumerId The unique ID of the consumer being removed
   */
  _removeConsumer = (consumerId: string) => {
    if (!this._consumers.has(consumerId)) return;
    
    this._consumers.delete(consumerId);
    this._consumerRefs.delete(consumerId);
    // this._blac.dispatchEvent(BlacLifecycleEvent.BLOC_CONSUMER_REMOVED, this, { consumerId });
    
    // If no consumers remain and not keep-alive, schedule disposal
    if (this._consumers.size === 0 && !this._keepAlive && this._disposalState === 'active') {
      this._scheduleDisposal();
    }
  };

  /**
   * @internal
   * Handler function for disposal (can be set by Blac manager)
   */
  private _disposalHandler?: (bloc: BlocBase<unknown>) => void;

  /**
   * @internal
   * Sets the disposal handler for this bloc
   */
  _setDisposalHandler(handler: (bloc: BlocBase<unknown>) => void) {
    this._disposalHandler = handler;
  }

  /**
   * @internal
   * Schedules disposal of this bloc instance if it has no consumers
   */
  private _scheduleDisposal() {
    // Prevent multiple disposal attempts
    if (this._disposalState !== 'active') {
      return;
    }
    
    // Double-check conditions before disposal
    if (this._consumers.size === 0 && !this._keepAlive) {
      if (this._disposalHandler) {
        this._disposalHandler(this as any);
      } else {
        this._dispose();
      }
    }
  }

  lastUpdate = Date.now();

  /**
   * @internal
   * Flag to indicate if batching is enabled for this bloc
   */
  private _batchingEnabled = false;

  /**
   * @internal
   * Updates the state and notifies all observers of the change.
   * 
   * @param newState The new state to be set
   * @param oldState The previous state for comparison
   * @param action Optional metadata about what caused the state change
   */
  _pushState = (newState: S, oldState: S, action?: unknown): void => {
    // Validate newState
    if (newState === undefined) {
      console.warn('BlocBase._pushState: newState is undefined', this);
      return;
    }

    // Validate action type if provided
    if (action !== undefined && typeof action !== 'object' && typeof action !== 'function') {
      console.warn('BlocBase._pushState: Invalid action type', this, action);
      return;
    }

    if (this._batchingEnabled) {
      // When batching, just accumulate the updates
      this._pendingUpdates.push({ newState, oldState, action });
      
      // Update internal state for consistency
      this._oldState = oldState;
      this._state = newState;
      return;
    }

    // Normal state update flow
    this._oldState = oldState;
    this._state = newState;
    
    // Notify observers of the state change
    this._observer.notify(newState, oldState, action);
    this.lastUpdate = Date.now();
  };

  /**
   * Enables batching for multiple state updates
   * @param batchFn Function to execute with batching enabled
   */
  batch = <T>(batchFn: () => T): T => {
    // Prevent batching race conditions
    if (this._batchingLock) {
      // If already batching, just execute the function without nesting batches
      return batchFn();
    }
    
    this._batchingLock = true;
    this._batchingEnabled = true;
    this._pendingUpdates = [];

    try {
      const result = batchFn();
      
      // Process all batched updates
      if (this._pendingUpdates.length > 0) {
        // Only notify once with the final state
        const finalUpdate = this._pendingUpdates[this._pendingUpdates.length - 1];
        this._observer.notify(finalUpdate.newState, finalUpdate.oldState, finalUpdate.action);
        this.lastUpdate = Date.now();
      }
      
      return result;
    } finally {
      this._batchingEnabled = false;
      this._batchingLock = false;
      this._pendingUpdates = [];
    }
  };
}
