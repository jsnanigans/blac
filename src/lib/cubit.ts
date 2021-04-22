import BlocBase from "./blocBase";

export default class Cubit<T> extends BlocBase<T> {
  protected emit = (value: T): void => {
    this.notifyChange(value);
    this.subject.next(value);
    this.updateCache();
  };
}
