import { BlocBase } from './BlocBase';
import { Blac, BlacEvent } from './Blac';

export type BlocProps = Record<string | number, any>;

export abstract class Cubit<
  S,
  Props extends BlocProps = {}
  > extends BlocBase<S> {
  static create: <S, P extends BlacProps>() => Cubit<S, P>;
  props: Props = {} as Props;

  constructor(initialState: S) {
    super(initialState);
    const newProps = Blac.getInstance().getCustomProps(this.constructor as any);
    this.props = { ...this.props, ...newProps };
  }

  /**
   * Update the state then will notify all observers
   * @param state: new state
   **/
  emit(state: S): null {
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
    ignoreChangeCheck = false
  ): null {
    if (!ignoreChangeCheck) {
      const patchKeys = Object.keys(statePatch);

      const changes = patchKeys.find((key) => {
        let current = this.state[key];
        let patched = statePatch[key];
        return current !== patched;
      });
    }

    if (changes) {
      this.emit({ ...this.state, ...statePatch });
    }
  }
}
