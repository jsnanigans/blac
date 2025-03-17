import { Blac, BlacLifecycleEvent } from './Blac';
import { BlocBase } from './BlocBase';
import { BlocHookDependencyArrayFn } from './types';

export type BlacObserver<S> = {
  fn: (newState: S, oldState: S, action?: any) => void | Promise<void>;
  dependencyArray?: BlocHookDependencyArrayFn<any>;
  lastState?: unknown[][];
  id: string;
  passive?: boolean;
};

export class BlacObservable<S> {
  bloc: BlocBase<any, any>;

  constructor(bloc: BlocBase<any, any>) {
    this.bloc = bloc;
  }

  private _observers = new Set<BlacObserver<S>>();

  get size(): number {
    return this._observers.size;
  }

  get observers() {
    return this._observers;
  }

  subscribe(observer: BlacObserver<S>): () => void {
    this._observers.add(observer);
    Blac.instance.dispatchEvent(BlacLifecycleEvent.LISTENER_ADDED, this.bloc);
    if (!observer.lastState) {
      observer.lastState = observer.dependencyArray
        ? observer.dependencyArray(this.bloc.state, this.bloc.state)
        : [];
    }
    return () => this.unsubscribe(observer);
  }

  unsubscribe(observer: BlacObserver<S>) {
    this._observers.delete(observer);
    Blac.instance.dispatchEvent(BlacLifecycleEvent.LISTENER_REMOVED, this.bloc);
  }

  notify(newState: S, oldState: S, action?: any) {
    this._observers.forEach((observer) => {
      let shouldUpdate = false;

      if (observer.dependencyArray) {
        let lastDependencyCheck = observer.lastState || [];
        const newDependencyCheck = observer.dependencyArray(newState, oldState);

        for (let o = 0; o < newDependencyCheck.length; o++) {
          const partNew = newDependencyCheck[o];
          const partOld = lastDependencyCheck[o] || [];
          for (let i = 0; i < partNew.length; i++) {
            if (partNew[i] !== partOld[i]) {
              shouldUpdate = true;
              break;
            }
          }
        }

        observer.lastState = newDependencyCheck;
      } else {
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        return observer.fn(newState, oldState, action);
      }
    });
  }

  dispose() {
    this._observers.clear();
  }
}
