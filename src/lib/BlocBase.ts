import { BlocConsumer } from "./BlocConsumer";
import StreamAbstraction from "./StreamAbstraction";
import { BlocOptions, ChangeEvent } from "./types";

export default class BlocBase<T> extends StreamAbstraction<T> {
  _localProviderRef = "";
  onRegister: null | ((consumer: BlocConsumer) => void) = null;
  onChange: null | ((change: ChangeEvent<T>) => void) = null;
  onValueChange: null | ((value: T) => void) = null;

  constructor(initialValue: T, blocOptions: BlocOptions = {}) {
    super(initialValue, blocOptions);
  }

  protected _consumer: BlocConsumer | null = null;

  set consumer(consumer: BlocConsumer) {
    this._consumer = consumer;
  }

  protected notifyChange = (state: T): void => {
    this._consumer?.notifyChange(this, state);

    this.onChange?.({
      currentState: this.state,
      nextState: state,
    });
  };

  protected notifyValueChange = (): void => {
    this._consumer?.notifyValueChange(this);
    this.onValueChange?.(this.state);
  };
}
