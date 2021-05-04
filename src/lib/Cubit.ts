import BlocBase from "./BlocBase";

export default class Cubit<T> extends BlocBase<T> {
  public emit = (value: T): void => {
    this.notifyChange(value);
    this.next(value);
  };
}
