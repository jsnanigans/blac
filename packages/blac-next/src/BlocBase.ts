import { Blac, BlacLifecycleEvent } from './Blac';
import BlacEvent from './BlacEvent';
import { BlacObservable } from './BlacObserver';
import BlacAddon from './addons/BlacAddon';

export type BlocInstanceId = string | number | undefined;
type DependencySelector<S> = (newState: S, oldState?: S) => any[];

export abstract class BlocBase<S = any, P = any> {
  static isolated = false;
  static keepAlive = false;
  static isBlacClass = true;
  static addons?: BlacAddon[];
  public _addons?: BlacAddon[];
  public _isolated = false;
  public _isBlacLive = true;
  public _observer: BlacObservable<any>;
  public _blac = Blac.getInstance();
  public _id: BlocInstanceId;
  public _instanceRef?: string;
  public _keepAlive = false;
  public readonly _createdAt = Date.now();
  defaultDependencySelector: DependencySelector<S> | undefined;

  constructor(initialState: S) {
    this._state = initialState;
    this._observer = new BlacObservable(this);
    this._blac.report(BlacLifecycleEvent.BLOC_CREATED, this);
    this._id = this.constructor.name;
    this._isolated = (this.constructor as any).isolated;
    this._addons = (this.constructor as any).addons;
    this._keepAlive = (this.constructor as any).keepAlive;
    this._connectAddons();
  }

  public _state: S;
  public _oldState: S | undefined;
  public props: P | null = null;

  get state(): S {
    return this._state;
  }

  get _name() {
    return this.constructor.name;
  }

  _updateId = (id?: BlocInstanceId) => {
    const originalId = this._id;
    if (!id || id === originalId) return;
    this._id = id;
  };

  _dispose() {
    this._blac.report(BlacLifecycleEvent.BLOC_DISPOSED, this);
    this._observer.dispose();
  }

  _consumers = new Set<string>();
  _addConsumer = (consumerId: string) => {
    this._consumers.add(consumerId);
    this._blac.report(BlacLifecycleEvent.BLOC_CONSUMER_ADDED, this, {
      consumerId,
    });
  };

  _removeConsumer = (consumerId: string) => {
    this._consumers.delete(consumerId);
    this._blac.report(BlacLifecycleEvent.BLOC_CONSUMER_REMOVED, this, {
      consumerId,
    });
  };

  _connectAddons = () => {
    const { _addons: addons } = this;

    if (!addons) return;

    for (const addon of addons) {
      if (addon.onEmit) {
        this._observer.subscribe({
          fn: (newState, oldState) => {
            addon.onEmit?.({
              newState,
              oldState,
              cubit: this,
            });
          },
          passive: true,
          id: addon.name,
        });
      }
      if (addon.onInit) {
        addon.onInit(this);
      }
    }
  };

  _pushState = (newState: S, oldState: S, action?: any): void => {
    this._state = newState;
    this._oldState = oldState;
    this._observer.notify(newState, oldState, action);

    this._blac.report(BlacLifecycleEvent.STATE_CHANGED, this, {
      newState,
      oldState,
    });
  };

  _onEvent(event: BlacEvent<any>): void {
    this._blac.log('Bloc Event', event);
  }
}
