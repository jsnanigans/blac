export type BlacObserver<S> = (
  newState: S,
  oldState: S
) => void | Promise<void>;

export class BlacObservable<S> {
  private _observers = new Set<BlacObserver<S>>();
  private _hiddenObservers: Set<BlacObserver<S>> | undefined;

  get size() {
    return this._observers.size;
  }

  subscribe(observer: BlacObserver<S>, hidden = false) {
    if (hidden) {
      if (!this._hiddenObservers) {
        this._hiddenObservers = new Set();
      }
      this._hiddenObservers.add(observer);
    } else {
      this._observers.add(observer);
    }

    return () => this.unsubscribe(observer);
  }

  unsubscribe(observer: BlacObserver<S>) {
    this._observers.delete(observer);
    if (this._hiddenObservers) {
      this._hiddenObservers.delete(observer);
    }
  }

  notify(newState: S, oldState: S) {
    this._observers.forEach((observer) => observer(newState, oldState));
    if (this._hiddenObservers) {
      this._hiddenObservers.forEach((observer) => observer(newState, oldState));
    }
  }

  dispose() {
    this._observers.clear();
    if (this._hiddenObservers) {
      this._hiddenObservers.clear();
    }
  }
}
