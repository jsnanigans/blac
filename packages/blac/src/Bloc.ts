import { BlocBase } from './BlocBase';

export abstract class Bloc<S, A, P = any> extends BlocBase<S, P> {
  /**
   * The reducer is called whenever a new action is emitted,
   * @param action: the action from "add"
   * @param state: the current state
   * @returns: the new state
   */
  abstract reducer(action: A, state: S): S;

  /**
   * Add a new action, the reducer should digest the action and update the state accordingly
   * @param action: action t obe sent to the reducer
   */
  add = (action: A) => {
    const oldState = this.state;
    const newState = this.reducer(action, this.state);
    this._pushState(newState, oldState, action);
  };
}
