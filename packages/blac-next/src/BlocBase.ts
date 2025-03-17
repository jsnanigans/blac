import { Blac, BlacLifecycleEvent } from './Blac';
import { BlacObservable } from './BlacObserver';
import BlacAddon from './addons/BlacAddon';

export type BlocInstanceId = string | number | undefined;
type DependencySelector<S> = (newState: S, oldState?: S) => any[];

/**
 * @abstract
 * Base class for both Blocs and Cubits. Provides core state management functionalities.
 * @template S The type of the state.
 * @template P Optional type for props passed during instance creation.
 */
export abstract class BlocBase<S = any, P = any> {
  /**
   * Indicates if instances of this Bloc should be isolated: every consumer will get its own instance.
   * Defaults to `false`
   */
  static isolated = false;
  /**
   * If true, the Blac instance will not be disposed automatically when there are no active consumers.
   * Defaults to `false`
   */
  static keepAlive = false;
  /**
   * Optional function to define how dependencies are selected from the state for observers. [1]
   */
  defaultDependencySelector: DependencySelector<S> | undefined;

  /**
   * @internal
   * Optional array of addons to be applied to all instances of this Bloc. 
   */
  public _addons?: BlacAddon[];
  /**
   * @internal
   * Indicates if this specific Bloc instance is isolated.
   */
  public _isolated = false;
  /**
   * @internal
   * Observable responsible for managing listeners (consumers) of this Bloc's state.
   */
  public _observer: BlacObservable<any>;
  /**
   * @internal
   * Instance of the global Blac manager.
   */
  public _blac = Blac.getInstance();
  /**
   * The unique identifier for this Bloc instance. Defaults to the class name.
   */
  public _id: BlocInstanceId;
  /**
   * @internal
   * Optional reference string for this Bloc instance. Used internally for tracking.
   */
  public _instanceRef?: string;
  /**
   * @internal
   * Indicates if this specific Bloc instance should be kept alive.
   */
  public _keepAlive = false;
  /**
   * @readonly
   * Timestamp of when this Bloc instance was created.
   */
  public readonly _createdAt = Date.now();

  /**
   * @internal
   * The current state of the Bloc.
   */
  public _state: S;
  /**
   * @internal
   * The previous state of the Bloc.
   */
  public _oldState: S | undefined;
  /**
   * Optional props passed during Bloc instance creation. [2]
   */
  public props: P | null = null;

  /**
   * Initializes a new BlocBase instance with the given initial state.
   * Dispatches the creation event to the Blac instance.
   * Sets the initial `_id` to the constructor name and determines isolation and keep-alive status.
   * Connects any defined addons.
   * @param initialState The initial state of the Bloc.
   */
  constructor(initialState: S) {
    this._state = initialState;
    this._observer = new BlacObservable(this);
    this._blac.dispatchEvent(BlacLifecycleEvent.BLOC_CREATED, this);
    this._id = this.constructor.name;
    this._keepAlive = (this.constructor as any).keepAlive;
    this._isolated = (this.constructor as any).isolated;

    this._addons = (this.constructor as any).addons;
    this._connectAddons();
  }

  /**
   * Returns the current state of the Bloc.
   */
  get state(): S {
    return this._state;
  }

  /**
   * @internal
   * Returns the name of the Bloc class.
   */
  get _name() {
    return this.constructor.name;
  }

  /**
   * @internal
   * Updates the Bloc instance's ID.
   * Does nothing if the provided ID is null/undefined or the same as the current ID.
   * @param id The new ID for the Bloc instance.
   */
  _updateId = (id?: BlocInstanceId) => {
    const originalId = this._id;
    if (!id || id === originalId) return;
    this._id = id;
  };

  /**
   * @internal
   * Disposes of the Bloc instance.
   * Dispatches the disposal event to the Blac instance.
   * Clears all observers.
   */
  _dispose() {
    this._blac.dispatchEvent(BlacLifecycleEvent.BLOC_DISPOSED, this);
    this._observer.dispose();
  }

  /**
   * @internal
   * Set of consumer IDs currently listening to this Bloc.
   */
  _consumers = new Set<string>();

  /**
   * @internal
   * Adds a consumer ID to the set of active consumers.
   * Dispatches the addition of a consumer event to the Blac instance.
   * @param consumerId The ID of the consumer being added.
   */
  _addConsumer = (consumerId: string) => {
    this._consumers.add(consumerId);
    this._blac.dispatchEvent(BlacLifecycleEvent.BLOC_CONSUMER_ADDED, this, { consumerId });
  };

  /**
   * @internal
   * Removes a consumer ID from the set of active consumers.
   * Dispatches the removal of a consumer event to the Blac instance.
   * @param consumerId The ID of the consumer being removed.
   */
  _removeConsumer = (consumerId: string) => {
    this._consumers.delete(consumerId);
    this._blac.dispatchEvent(BlacLifecycleEvent.BLOC_CONSUMER_REMOVED, this, { consumerId });
  };

  /**
   * @internal
   * Connects and initializes the addons for this Bloc instance.
   */
  _connectAddons = () => {
    const { _addons: addons } = this;
    if (addons) {
      addons.forEach(addon => {
        addon.onInit?.(this);
      });
    }
  };

  /**
   * @internal
   * Updates the state of the Bloc and notifies all observers.
   * @param newState The new state of the Bloc.
   * @param oldState The previous state of the Bloc.
   * @param action Optional action that triggered the state change.
   */
  _pushState = (newState: S, oldState: S, action?: any): void => {
    this._state = newState;
    this._observer.notify(newState, oldState, action);
  };
}
