import { Blac, BlacEvent } from './Blac';
import { BlacObservable } from './BlacObserver';
import { BlocProps } from './Cubit';

export type BlocInstanceId = string | number | undefined;

export abstract class BlocBase<S, P extends BlocProps = {}> {
  static isolated = false;
  static keepAlive = false;
  static create: <S extends any>() => BlocBase<S>;
  static isBlacClass = true;
  static _propsOnInit: BlocProps | undefined;
  public isolated = false;
  public isBlacLive = true;
  public observer: BlacObservable<any>;
  public blac = Blac.getInstance();
  public id: BlocInstanceId;
  // public props: P = {} as P;
  public readonly createdAt = Date.now();

  // onConnect(): void;
  // onDisconnect(): void;

  constructor(initialState: S) {
    this.observer = new BlacObservable();
    this._state = initialState;
    this.blac.report(BlacEvent.BLOC_CREATED, this);
    this.id = this.constructor.name;
    this.isolated = (this.constructor as any).isolated;
  }

  private localProps?: P;
  get props(): typeof this.localProps {
    if (this.localProps) {
      return this.localProps;
    }

    const constructorProps = (this.constructor as any)._propsOnInit;
    if (constructorProps) {
      this.localProps = constructorProps;
      return constructorProps;
    }

    return undefined;
  }

  set props(props: P) {
    this.localProps = props;
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
    this.blac.report(BlacEvent.LISTENER_ADDED, this);
    this.observer.subscribe(callback);
    return () => this.handleUnsubscribe(callback);
  };

  dispose() {
    this.blac.report(BlacEvent.BLOC_DISPOSED, this);
    this.isBlacLive = false;
    this.observer.dispose();
    // this.onDisconnect?.();
  }

  private handleUnsubscribe = (
    callback: (newState: S, oldState: S) => void,
  ): void => {
    this.observer.unsubscribe(callback);
    this.blac.report(BlacEvent.LISTENER_REMOVED, this);
  };
}
