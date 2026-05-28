export interface Observable<T> {
  peek(): T;
  subscribe(cb: (value: T) => void): () => void;
}

export class Signal<T> implements Observable<T> {
  private _value: T;
  private readonly _equals: (a: T, b: T) => boolean;
  private readonly _subscribers: Set<(value: T) => void> = new Set();

  constructor(initial: T, equals?: (a: T, b: T) => boolean) {
    this._value = initial;
    this._equals = equals ?? Object.is;
  }

  get value(): T {
    return this._value;
  }

  set value(next: T) {
    if (this._equals(this._value, next)) return;
    this._value = next;
    const snapshot = Array.from(this._subscribers);
    const errors: unknown[] = [];
    for (const cb of snapshot) {
      try {
        cb(next);
      } catch (err) {
        errors.push(err);
      }
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1)
      throw new AggregateError(errors, 'Signal: multiple subscriber errors');
  }

  peek(): T {
    return this._value;
  }

  subscribe(cb: (value: T) => void): () => void {
    this._subscribers.add(cb);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this._subscribers.delete(cb);
    };
  }
}
