import BlocBase from "./BlocBase";
import { BlocOptions } from "./types";

export default class Bloc<E, T> extends BlocBase<T> {
  onTransition:
    | null
    | ((change: { currentState: T; event: E; nextState: T }) => void) = null;
  protected mapEventToState: null | ((event: E) => T) = null;

  constructor(initialState: T, options?: BlocOptions) {
    super(initialState, options);
  }

  public add = (event: E): void => {
    if (this.mapEventToState) {
      const newState = this.mapEventToState(event);
      this.notifyChange(newState);
      this.notifyTransition(newState, event);
      this.next(newState);
      this.notifyValueChange();
    } else {
      console.error(
        `"mapEventToState" not implemented for "${this.constructor.name}"`
      );
    }
  };

  protected notifyTransition = (state: T, event: E): void => {
    this._consumer?.notifyTransition(this, state, event);
    this.onTransition?.({
      currentState: this.state,
      event,
      nextState: state,
    })
  };
}
