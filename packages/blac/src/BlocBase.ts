import { Blac } from "./Blac";
import { BlacObservable } from "./BlacObserver";
import { BlocProps } from "./Cubit";

export enum BlacEvent {
  BLOC_DISPOSED = "BLOC_DISPOSED",
  LISTENER_REMOVED = "LISTENER_REMOVED",
  LISTENER_ADDED = "LISTENER_ADDED",
}

export type BlocInstanceId = string | number | undefined;

export abstract class BlocBase<S> {
  static isolated = false;
  static keepAlive = false;
  static create: <S>() => BlocBase<S>;
  static isBlacClass = true;
  static propsProxy: BlocProps = {} as BlocProps;
  public isBlacLive = true;
  public observer: BlacObservable<any>;
  public blac = Blac.getInstance();
  public id: BlocInstanceId;
  public props: BlocProps = {} as BlocProps;

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

  setProps = (props: any) => {
    this.props = props;
  };

  private handleUnsubscribe = (callback: (newState: S, oldState: S) => void): void => {
    this.observer.unsubscribe(callback);
    this.blac.report(BlacEvent.LISTENER_REMOVED, this);
  };
}

