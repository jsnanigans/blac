import { BlocConsumer } from "./BlocConsumer";
import StreamAbstraction from "./StreamAbstraction";
import { BlocOptions } from "./types";

export default class BlocBase<T> extends StreamAbstraction<T> {
  _localProviderRef = "";
  onRegister: null | ((consumer: BlocConsumer) => void) = null;
  onChange: null | ((change: { currentState: T; nextState: T }) => void) = null;

  constructor(initialValue: T, blocOptions: BlocOptions = {}) {
    super(initialValue, blocOptions);
  }

  protected _consumer: BlocConsumer | null = null;

  set consumer(consumer: BlocConsumer) {
    this._consumer = consumer;
  }

  protected notifyChange = (state: T): void => {
    this._consumer?.notifyChange(this, state);
  };
}
