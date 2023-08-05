import { BlocBase } from "./BlocBase";

export abstract class Cubit<S> extends BlocBase<S> {
  static create: () => Cubit<any>;

  emit(state: S) {
    if (state === this.state) {
      return;
    }

    const oldState = this.state;
    const newState = state;
    this._state = state;
    this.observer.notify(newState, oldState);
  }

  // partial object if this.state is object, otherwise same as state
  patch(state: S extends object ? Partial<S> : S) {
    this.emit({ ...this.state, ...state });
  }
}
