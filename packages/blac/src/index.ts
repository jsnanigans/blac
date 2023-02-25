/**
 * OBSERVABLE
 */
export type BlacObserver<S> = (oldState: S, newState: S) => void | Promise<void>;
export class BlacObservable<S> {
  private _observers = new Set<BlacObserver<S>>();

  subscribe(observer: BlacObserver<S>) {
    this._observers.add(observer);
  }

  unsubscribe(observer: BlacObserver<S>) {
    this._observers.delete(observer);
  }

  notify(newState: S, oldState: S) {
    this._observers.forEach(observer => observer(newState, oldState));
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
  static isBlacClass = true;
  public _state: S;
  public observer: BlacObservable<S>;
  public blac?: Blac;

  constructor(initialState: S, options?: BlocOptions) {
    this.observer = new BlacObservable();
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
    this.observer.subscribe(callback);
    return () => this.observer.unsubscribe(callback);
  };
}

export type InferBlocType<T> = new (...args: never[]) => T;

/**
 * BLOC
 */
export abstract class Bloc<S, A> extends BlocBase<S> {
  abstract reducer(action: A, state: S): S;

  emit = (action: A): void => {
    const oldState = this.state;
    const newState = this.reducer(action, this.state);
    this._state = newState;
    this.observer.notify(newState, oldState);
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

    const oldState = this.state;
    const newState = state;
    this._state = state;
    this.observer.notify(newState, oldState);
  }
}
