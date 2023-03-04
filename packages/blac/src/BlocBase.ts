import { Blac } from './Blac';
import { BlacObservable } from './BlacObserver';
import { BlocClass } from './types';

export interface BlocOptions {}

export abstract class BlocBase<S> {
  static isBlacClass = true;
  public isBlacLive = true;
  public _state: S;
  public observer: BlacObservable<S>;
  public blac?: Blac<any, any> = (globalThis as any).blac;
  public uid = Math.random().toString(36).split('.')[1];

  constructor(initialState: S, options?: BlocOptions) {
    this.observer = new BlacObservable();
    this._state = initialState;
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

  getGlobalBloc<B extends BlocBase<any>>(blocClass: BlocClass<B>): B | undefined {
    return this.blac?.getBloc(blocClass);
  }

  dispose() {
    this.isBlacLive = false;
    this.observer.dispose();
  }
}
