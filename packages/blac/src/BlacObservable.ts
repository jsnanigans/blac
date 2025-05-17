import { Blac, BlacLifecycleEvent } from './Blac';
import { BlocBase } from './BlocBase';
import { BlocHookDependencyArrayFn } from './types';

/**
 * Represents an observer that can subscribe to state changes in a Bloc
 * @template S - The type of state being observed
 */
export type BlacObserver<S> = {
  /** Function to be called when state changes */
  fn: (newState: S, oldState: S, action?: unknown) => void | Promise<void>;
  /** Optional function to determine if the observer should be notified of state changes */
  dependencyArray?: BlocHookDependencyArrayFn<S>;
  /** Cached state values used for dependency comparison */
  lastState?: unknown[][];
  /** Unique identifier for the observer */
  id: string;
};

/**
 * A class that manages observers for a Bloc's state changes
 * @template S - The type of state being observed
 */
export class BlacObservable<S = unknown> {
  /** The Bloc instance this observable is associated with */
  bloc: BlocBase<S>;

  /**
   * Creates a new BlacObservable instance
   * @param bloc - The Bloc instance to observe
   */
  constructor(bloc: BlocBase<S>) {
    this.bloc = bloc;
  }

  private _observers = new Set<BlacObserver<S>>();

  /**
   * Gets the number of active observers
   * @returns The number of observers currently subscribed
   */
  get size(): number {
    return this._observers.size;
  }

  /**
   * Gets the set of all observers
   * @returns The Set of all BlacObserver instances
   */
  get observers() {
    return this._observers;
  }

  /**
   * Subscribes an observer to state changes
   * @param observer - The observer to subscribe
   * @returns A function that can be called to unsubscribe the observer
   */
  subscribe(observer: BlacObserver<S>): () => void {
    this._observers.add(observer);
    Blac.instance.dispatchEvent(BlacLifecycleEvent.LISTENER_ADDED, this.bloc, { listenerId: observer.id });
    
    // Immediately notify the new observer with the current state
    // Pass current state as both newState and oldState for initial notification context
    void observer.fn(this.bloc.state, this.bloc.state, { initialSubscription: true });

    if (!observer.lastState) {
      observer.lastState = observer.dependencyArray
        ? observer.dependencyArray(this.bloc.state)
        : [];
    }
    return () => {
      this.unsubscribe(observer);
    }
  }

  /**
   * Unsubscribes an observer from state changes
   * @param observer - The observer to unsubscribe
   */
  unsubscribe(observer: BlacObserver<S>) {
    this._observers.delete(observer);
    Blac.instance.dispatchEvent(BlacLifecycleEvent.LISTENER_REMOVED, this.bloc, { listenerId: observer.id });
  }
}
