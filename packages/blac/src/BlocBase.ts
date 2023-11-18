import { Blac, BlacEvent } from './Blac';
import { BlacObservable } from './BlacObserver';
import { BlocProps } from './Cubit';

export type BlocInstanceId = string | number | undefined;

export abstract class BlocBase<S, P extends BlocProps = {}> {
  static isolated = false;
  static keepAlive = false;
  static create: <S extends any>() => BlocBase<S>;
  static isBlacClass = true;
  public isolated = false;
  public isBlacLive = true;
  public observer: BlacObservable<any>;
  public blac = Blac.getInstance();
  public id: BlocInstanceId;
  public props: P = {} as P;

  constructor(initialState: S) {
    this.observer = new BlacObservable();
    this._state = initialState;
    this.blac.report(BlacEvent.BLOC_CREATED, this);
    this.id = this.constructor.name;
    this.isolated = (this.constructor as any).isolated;
  }

  public _state: S;

  get state(): S {
    return this._state;
  }

  get name() {
    return this.constructor.name;
  }

  updateId = (id?: BlocInstanceId) => {
    const originalId = this.id;
    if (!id || id === originalId) return;
    this.id = id;
  };

  addEventListenerStateChange = (
    callback: (newState: S, oldState: S) => void,
  ): (() => void) => {
    this.observer.subscribe(callback);
    this.blac.report(BlacEvent.LISTENER_ADDED, this);
    return () => this.handleUnsubscribe(callback);
  };

  dispose() {
    this.isBlacLive = false;
    this.observer.dispose();
    this.blac.report(BlacEvent.BLOC_DISPOSED, this);
  }

  private handleUnsubscribe = (
    callback: (newState: S, oldState: S) => void,
  ): void => {
    this.observer.unsubscribe(callback);
    this.blac.report(BlacEvent.LISTENER_REMOVED, this);
  };
}
