import { BlacConsumer } from "./BlocConsumer";
import StreamAbstraction from "./StreamAbstraction";
import { BlocOptions, ChangeEvent } from "./types";
import createId from "./createId";

export interface BlocMeta {
  scope: "unknown" | "local" | "global";
}

type ChangeMethod = <T>(change: ChangeEvent<T>, bloc: BlocBase<T>) => void;
type RegisterMethod = <T>(consumer: BlacConsumer, bloc: BlocBase<T>) => void;
type ValueChangeMethod = <T>(value: T, bloc: BlocBase<T>) => void;

export default class BlocBase<T> extends StreamAbstraction<T> {
  public id = createId();
  public createdAt = new Date();
  public meta: BlocMeta = {
    scope: "unknown",
  };
  public changeListeners: ChangeMethod[] = [];
  public registerListeners: RegisterMethod[] = [];
  public valueChangeListeners: ValueChangeMethod[] = [];
  public consumer: BlacConsumer | null = null;

  constructor(initialValue: T, blocOptions: BlocOptions = {}) {
    super(initialValue, blocOptions);
  }

  // listeners
  readonly removeChangeListener = (index: number) => {
    this.changeListeners.splice(index, 1);
  };

  readonly addChangeListener = (method: ChangeMethod) => {
    const index = this.changeListeners.length;
    this.changeListeners.push(method);
    return () => this.removeChangeListener(index);
  };

  readonly removeValueChangeListener = (index: number) => {
    this.valueChangeListeners.splice(index, 1);
  };

  readonly addValueChangeListener = (method: ValueChangeMethod) => {
    const index = this.valueChangeListeners.length;
    this.valueChangeListeners.push(method);
    return () => this.removeValueChangeListener(index);
  };

  readonly removeRegisterListener = (index: number) => {
    this.registerListeners.splice(index, 1);
  };

  readonly addRegisterListener = (method: RegisterMethod) => {
    const index = this.registerListeners.length;
    this.registerListeners.push(method);
    return () => this.removeRegisterListener(index);
  };

  readonly notifyChange = (state: T): void => {
    this.consumer?.notifyChange(this, state);

    this.changeListeners.forEach((fn) =>
      fn(
        {
          currentState: this.state,
          nextState: state,
        },
        this
      )
    );
  };

  readonly notifyValueChange = (): void => {
    this.consumer?.notifyValueChange(this);
    this.valueChangeListeners.forEach((fn) => fn(this.state, this));
  };
}
