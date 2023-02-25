import { Blac } from "./Blac";
import { BlacObservable } from "./BlacObserver";

export interface BlocOptions {
  blac?: Blac;
}

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
      this.blac.registerBloc(this);
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
