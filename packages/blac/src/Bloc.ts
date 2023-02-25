import { BlocBase } from './BlocBase';

export abstract class Bloc<S, A> extends BlocBase<S> {
  abstract reducer(action: A, state: S): S;

  emit = (action: A): void => {
    const oldState = this.state;
    const newState = this.reducer(action, this.state);
    this._state = newState;
    this.observer.notify(newState, oldState);
  };
}
