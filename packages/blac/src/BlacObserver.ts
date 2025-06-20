import { Blac } from './Blac';
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
  /** Dispose function for the observer */
  dispose?: () => void;
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
    Blac.log('BlacObservable.subscribe: Subscribing observer.', this.bloc, observer);
    this._observers.add(observer);
    // Don't initialize lastState here - let it remain undefined for first-time detection
    return () => {
      Blac.log('BlacObservable.subscribe: Unsubscribing observer.', this.bloc, observer);
      this.unsubscribe(observer);
    }
  }

  /**
   * Unsubscribes an observer from state changes
   * @param observer - The observer to unsubscribe
   */
  unsubscribe(observer: BlacObserver<S>) {
    this._observers.delete(observer);
    // Blac.instance.dispatchEvent(BlacLifecycleEvent.LISTENER_REMOVED, this.bloc, { listenerId: observer.id });

    if (this.size === 0) {
      Blac.log('BlacObservable.unsubscribe: No observers left.', this.bloc);
      // The bloc will handle its own disposal through consumer management
    }
  }

  /**
   * Notifies all observers of a state change
   * @param newState - The new state value
   * @param oldState - The previous state value
   * @param action - Optional action that triggered the state change
   */
  notify(newState: S, oldState: S, action?: unknown) {
    this._observers.forEach((observer) => {
      let shouldUpdate = false;

      if (observer.dependencyArray) {
        const lastDependencyCheck = observer.lastState;
        const newDependencyCheck = observer.dependencyArray(newState);

        // If this is the first time (no lastState), always update
        if (!lastDependencyCheck) {
          shouldUpdate = true;
        } else {
          // Compare dependency arrays for changes
          if (lastDependencyCheck.length !== newDependencyCheck.length) {
            shouldUpdate = true;
          } else {
            // Compare each part of the dependency arrays
            for (let o = 0; o < newDependencyCheck.length; o++) {
              const partNew = newDependencyCheck[o];
              const partOld = lastDependencyCheck[o] || [];
              
              // If the part lengths are different, definitely update
              if (partNew.length !== partOld.length) {
                shouldUpdate = true;
                break;
              }
              
              // Compare each value in the parts
              for (let i = 0; i < partNew.length; i++) {
                if (!Object.is(partNew[i], partOld[i])) {
                  shouldUpdate = true;
                  break;
                }
              }
              
              if (shouldUpdate) break;
            }
          }
        }

        observer.lastState = newDependencyCheck;
      } else {
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        void observer.fn(newState, oldState, action);
      }
    });
  }

  /**
   * Clears the observer set
   */
  clear() {
    // Just clear the observers without calling unsubscribe to avoid circular disposal
    this._observers.clear();
  }
}
