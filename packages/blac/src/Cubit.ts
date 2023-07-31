import { BlocBase } from "./BlocBase";

export interface CubitOptions {
  
}

export abstract class Cubit<S> extends BlocBase<S> {
  emit(state: S) {
    if (state === this.state) {
      return;
    }

    const oldState = this.state;
    const newState = state;
    this._state = state;
    this.observer.notify(newState, oldState);
  }

  //   static "create" function, to initialize the bloc when needed
  static create: () => Cubit<any>;
}
