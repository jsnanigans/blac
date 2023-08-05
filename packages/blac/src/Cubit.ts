import { BlocBase } from "./BlocBase";

export type BlocProps = Record<string | number, any>;

export abstract class Cubit<S, Props extends BlocProps = {}> extends BlocBase<S> {
  static create: () => Cubit<any, any>;
  props: Props = {} as Props;

  constructor(initialState: S) {
    super(initialState);
    this.props = (this.constructor as any)["propsProxy"] as Props;
  }

  emit(state: S) {
    if (state === this.state) {
      return;
    }

    const oldState = this.state;
    const newState = state;
    this._state = state;
    this.observer.notify(newState, oldState);
  }

  setProps = (props: Props) => {
    this.props = props;
  };

  // partial object if this.state is object, otherwise same as state
  patch(state: S extends object ? Partial<S> : S) {
    this.emit({ ...this.state, ...state });
  }
}
