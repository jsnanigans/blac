export type BlacObserver<S> = (
  newState: S,
  oldState: S
) => void | Promise<void>;

export class BlacObservable<S> {
  private _observers = new Set<BlacObserver<S>>();

  get size(): number {
    return this._observers.size;
  }

  subscribe(observer: BlacObserver<S>): () => void {
    this._observers.add(observer);
    return () => this.unsubscribe(observer);
  }

  unsubscribe(observer: BlacObserver<S>) {
    this._observers.delete(observer);
  }

  notify(newState: S, oldState: S) {
    this._observers.forEach((observer) => observer(newState, oldState));
  }

  dispose() {
    this._observers.clear();
  }
}
