import { Blac } from './Blac';
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
   * @internal
   * Reference to the global Blac manager instance.
   */
  public _blac = Blac.getInstance();
  
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
   * @internal
   * Tracks whether this bloc has been disposed to prevent double cleanup.
   */
  private _disposed = false;
  
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
    Blac.log('Bloc Created', this)
    this._id = this.constructor.name;

    // Use a type assertion for the constructor to access static properties safely
    const constructorWithStaticProps = this.constructor as BlocConstructor<this> & BlocStaticProperties;

    this._keepAlive = constructorWithStaticProps.keepAlive;
    this._isolated = constructorWithStaticProps.isolated;
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
    if (this._disposed) return;
    this._disposed = true;
    this._observer.clear();
    this.onDispose?.();
    // this._blac.dispatchEvent(BlacLifecycleEvent.BLOC_DISPOSED, this);
    Blac.log('BlocBase._dispose', this);
    Blac.instance.disposeBloc(this);
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
   */
  _addConsumer = (consumerId: string) => {
    if (this._consumers.has(consumerId)) return;
    this._consumers.add(consumerId);
    // this._blac.dispatchEvent(BlacLifecycleEvent.BLOC_CONSUMER_ADDED, this, { consumerId });
    Blac.log('BlocBase._addConsumer', this, consumerId);
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
    Blac.log('BlocBase._removeConsumer', this, consumerId);
  };

  lastUpdate = Date.now();

  /**
   * @internal
   * Updates the state and notifies all observers of the change.
   * 
   * @param newState The new state to be set
   * @param oldState The previous state for comparison
   * @param action Optional metadata about what caused the state change
   */
  _pushState = (newState: S, oldState: S, action?: unknown): void => {
    this._state = newState;
    this._observer.notify(newState, oldState, action);
    this.lastUpdate = Date.now();
  };
}
