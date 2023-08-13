import { BlocBase } from "./BlocBase";
import { BlacEvent } from "./Blac";

export abstract class Bloc<S, A> extends BlocBase<S> {
  static create: () => BlocBase<any>;

  abstract reducer(action: A, state: S): S;

  emit = (action: A): void => {
    const oldState = this.state;
    const newState = this.reducer(action, this.state);
    this._state = newState;
    this.observer.notify(newState, oldState);

    this.blac.report(BlacEvent.STATE_CHANGED, this, {
      newState,
      oldState
    });
  };
}
