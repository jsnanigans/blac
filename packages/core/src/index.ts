/**
 * OBSERVABLE
 */
export type BlacObserver<S> = (oldState: S, newState: S) => void;
export class BlacObservable<S> {
  private _observers: BlacObserver<S>[] = [];

  subscribe(observer: BlacObserver<S>) {
    this._observers.push(observer);
  }

  unsubscribe(observer: BlacObserver<S>) {
    this._observers = this._observers.filter((obs) => obs !== observer);
  }

  notify(newState: S, oldState: S) {
    this._observers.forEach((observer) => observer(newState, oldState));
  }
}

/**
 * BLAC
 */
export class Blac {
  globalState: any = {};
}

/**
 * BLOC BASE
 */

export interface BlocOptions {
  blac?: Blac;
}
export interface CubitOptions extends BlocOptions {}
export abstract class BlocBase<S> {
  public _state: S;
  public observable: BlacObservable<S>;
  public blac?: Blac;

  constructor(initialState: S, options?: BlocOptions) {
    this.observable = new BlacObservable();
    this._state = initialState;

    if (options?.blac) {
      this.blac = options?.blac;
      this.blac.globalState[this.name] = this.state;
    }
  }

  get state() {
    return this._state;
  }

  get name() {
    return this.constructor.name;
  }

  onStateChange = (
    callback: (newState: S, oldState: S) => void
  ): (() => void) => {
    this.observable.subscribe(callback);
    return () => this.observable.unsubscribe(callback);
  };
}

/**
 * BLOC
 */
export abstract class Bloc<S, A> extends BlocBase<S> {
  abstract reducer(action: A, state: S): S;

  emit = (action: A): void => {
    const newState = this.reducer(action, this.state);
    this.observable.notify(newState, this.state);
    this._state = newState;
  };
}

/**
 * CUBIT
 */
export abstract class Cubit<S> extends BlocBase<S> {
  emit(state: S) {
    if (state === this.state) {
      return;
    }

    this.observable.notify(state, this.state);
    this._state = state;
  }
}
