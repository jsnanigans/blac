import { BlocBase } from './BlocBase';
import { BlacEvent } from './Blac';

export abstract class Bloc<S, A> extends BlocBase<S> {
  static create: () => BlocBase<any>;

  /**
   * The reducer is called whenever a new action is emited,
   * @param action: the action from "emit"
   * @param state: the current state
   * @returns: the new state
   */
  abstract reducer(action: A, state: S): S;

  /**
   * Emit a new action, the reducer should digest the action and update the state accordingly
   * @param action: action t obe sent to the reducer
   */
  emit = (action: A): void => {
    const oldState = this.state;
    const newState = this.reducer(action, this.state);
    this._state = newState;
    this.observer.notify(newState, oldState);

    this.blac.report(BlacEvent.STATE_CHANGED, this, {
      newState,
      oldState,
    });
  };
}
