export type BlacObserver<S> = (oldState: S, newState: S) => void | Promise<void>;
export class BlacObservable<S> {
  private _observers = new Set<BlacObserver<S>>();

  subscribe(observer: BlacObserver<S>) {
    this._observers.add(observer);
  }

  unsubscribe(observer: BlacObserver<S>) {
    this._observers.delete(observer);
  }

  notify(newState: S, oldState: S) {
    this._observers.forEach(observer => observer(newState, oldState));
  }

  dispose() {
    this._observers.clear();
  }
}
