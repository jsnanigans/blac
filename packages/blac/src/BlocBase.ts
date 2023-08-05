import { Blac } from "./Blac";
import { BlacObservable } from "./BlacObserver";

export enum BlacEvent {
  BLOC_DISPOSED = "BLOC_DISPOSED",
  LISTENER_REMOVED = "LISTENER_REMOVED",
  LISTENER_ADDED = "LISTENER_ADDED",
}

export abstract class BlocBase<S> {
  static allowMultipleInstances = false;
  static keepAlive = false;
  static create: <S>() => BlocBase<S>;
  static isBlacClass = true;
  public isBlacLive = true;
  public observer: BlacObservable<S>;
  public blac = new Blac();

  constructor(initialState: S) {
    this.observer = new BlacObservable();
    this._state = initialState;
  }

  public _state: S;

  get state(): S {
    return this._state;
  }

  get name() {
    return this.constructor.name;
  }

  onStateChange = (
    callback: (newState: S, oldState: S) => void
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

  private handleUnsubscribe = (callback: (newState: S, oldState: S) => void): void => {
    this.observer.unsubscribe(callback);
    this.blac.report(BlacEvent.LISTENER_REMOVED, this);
  };
}

