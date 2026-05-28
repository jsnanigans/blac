export interface Observable<T> {
  peek(): T;
  subscribe(cb: (value: T) => void): () => void;
}

export class Signal<T> implements Observable<T> {
  constructor(_initial: T, _equals?: (a: T, b: T) => boolean) {
    throw new Error('Signal: not implemented (see plans/dirtytalk-engine/01-signal.md)');
  }
  get value(): T { throw new Error('not implemented'); }
  set value(_next: T) { throw new Error('not implemented'); }
  peek(): T { throw new Error('not implemented'); }
  subscribe(_cb: (value: T) => void): () => void { throw new Error('not implemented'); }
}
