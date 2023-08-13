import { BlocBase } from "./BlocBase";
import { Blac } from "./Blac";

export type BlocProps = Record<string | number, any>;

export abstract class Cubit<S, Props extends BlocProps = {}> extends BlocBase<S> {
  static create: () => Cubit<any, any>;
  props: Props = {} as Props;

  constructor(initialState: S) {
    super(initialState);
    this.props = Blac.getInstance().getCustomProps(this.constructor as any);
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
