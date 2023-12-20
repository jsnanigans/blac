import { BlacEvent } from './Blac';
import { BlocBase } from './BlocBase';
import BlacAddon from './addons/BlacAddon';

export type BlocProps = Record<string | number, any>;

export abstract class Cubit<S, P extends BlocProps = {}> extends BlocBase<
  S,
  P
> {
  static addons?: BlacAddon[];
  static create: () => Cubit<any, any>;
  public addons?: BlacAddon[];

  constructor(initialState: S) {
    super(initialState);
    this.addons = (this.constructor as any).addons;
    this.connectAddons();
  }

  /**
   * Update the state then will notify all observers
   * @param state: new state
   **/
  emit(state: S): void {
    if (state === this.state) {
      return;
    }

    const oldState = this.state;
    const newState = state;
    this._state = state;
    this.observer.notify(newState, oldState);

    this.blac.report(BlacEvent.STATE_CHANGED, this, {
      newState,
      oldState,
    });
  }

  /**
   * Merges current state object with the parameter "state" and emits the new state
   * Warning: only works when the state is an object.
   * @param state: Partial state that should change
   **/
  patch(
    statePatch: S extends object ? Partial<S> : S,
    ignoreChangeCheck = false,
  ): void {
    let changes = false;
    if (!ignoreChangeCheck) {
      for (const key in statePatch) {
        const current = (this.state as any)[key];
        if (statePatch[key] !== current) {
          changes = true;
          break;
        }
      }
    }

    if (changes) {
      this.emit({ ...this.state, ...statePatch });
    }
  }

  connectAddons = () => {
    const { addons } = this;

    if (!addons) return;

    for (const addon of addons) {
      if (addon.onEmit) {
        this.observer.subscribe((newState, oldState) => {
          addon.onEmit?.({
            newState,
            oldState,
            cubit: this,
          });
        });
      }
      if (addon.onInit) {
        addon.onInit(this);
      }
    }
  };
}
