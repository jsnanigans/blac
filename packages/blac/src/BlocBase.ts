import { BlacObservable } from './BlacObserver';
import { BlocConstructor } from './types';

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
    // Clear all consumers
    this._consumers.clear();
    
    // Clear observer subscriptions
    this._observer.clear();
    
    // Call user-defined disposal hook
    this.onDispose?.();
    
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
   * WeakSet to track consumer references for cleanup validation
   */
  private _consumerRefs = new WeakSet<object>();

  /**
   * @internal
   * Registers a new consumer to this Bloc instance.
   * Notifies the Blac manager that a consumer has been added.
   * 
   * @param consumerId The unique ID of the consumer being added
   * @param consumerRef Optional reference to the consumer object for cleanup validation
   */
  _addConsumer = (consumerId: string, consumerRef?: object) => {
    if (this._consumers.has(consumerId)) return;
    this._consumers.add(consumerId);
    
    if (consumerRef) {
      this._consumerRefs.add(consumerRef);
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
    // this._blac.dispatchEvent(BlacLifecycleEvent.BLOC_CONSUMER_REMOVED, this, { consumerId });
    
    // If no consumers remain and not keep-alive, schedule disposal
    if (this._consumers.size === 0 && !this._keepAlive) {
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
    // Use setTimeout to avoid disposal during render cycles
    setTimeout(() => {
      if (this._consumers.size === 0 && !this._keepAlive) {
        if (this._disposalHandler) {
          this._disposalHandler(this as any);
        } else {
          this._dispose();
        }
      }
    }, 0);
  }

  lastUpdate = Date.now();

  /**
   * @internal
   * Flag to indicate if batching is enabled for this bloc
   */
  private _batchingEnabled = false;

  /**
   * @internal
   * Pending state updates when batching is enabled
   */
  private _pendingUpdates: Array<{newState: S, oldState: S, action?: unknown}> = [];

  /**
   * @internal
   * Updates the state and notifies all observers of the change.
   * 
   * @param newState The new state to be set
   * @param oldState The previous state for comparison
   * @param action Optional metadata about what caused the state change
   */
  _pushState = (newState: S, oldState: S, action?: unknown): void => {
    // Runtime validation for state changes
    if (newState === undefined) {
      console.warn('BlocBase._pushState: newState is undefined', this);
      return;
    }
    
    // Validate action type if provided
    if (action !== undefined && action !== null) {
      const actionType = typeof action;
      if (!(['string', 'object', 'number'].includes(actionType))) {
        console.warn('BlocBase._pushState: Invalid action type', this, action);
      }
    }

    // If batching is enabled, queue the update
    if (this._batchingEnabled) {
      this._pendingUpdates.push({ newState, oldState, action });
      return;
    }
    
    this._oldState = oldState;
    this._state = newState;
    this._observer.notify(newState, oldState, action);
    this.lastUpdate = Date.now();
  };

  /**
   * Enables batching for multiple state updates
   * @param batchFn Function to execute with batching enabled
   */
  batch = <T>(batchFn: () => T): T => {
    const wasBatching = this._batchingEnabled;
    this._batchingEnabled = true;
    
    try {
      const result = batchFn();
      
      // Process all pending updates
      if (this._pendingUpdates.length > 0) {
        const lastUpdate = this._pendingUpdates[this._pendingUpdates.length - 1];
        this._oldState = this._pendingUpdates[0].oldState;
        this._state = lastUpdate.newState;
        
        // Notify with the final state
        this._observer.notify(lastUpdate.newState, this._oldState, lastUpdate.action);
        this.lastUpdate = Date.now();
        
        this._pendingUpdates = [];
      }
      
      return result;
    } finally {
      this._batchingEnabled = wasBatching;
    }
  };
}
