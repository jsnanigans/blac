import { Cubit } from '@blac/core';
import { resource, type ResourceOptions } from './resource';
import { idle, type AsyncState } from './types';

export function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export type Call = {
  signal: AbortSignal;
  d: ReturnType<typeof deferred<number>>;
};

/** Cubit with one resource whose every call is held open until the test settles it. */
export function probe(options: ResourceOptions = {}) {
  return class Probe extends Cubit<{ slot: AsyncState<number> }> {
    static keepAlive = true;
    calls: Call[] = [];
    constructor() {
      super({ slot: idle() });
    }
    r = resource(
      this,
      'slot',
      (signal) => {
        const d = deferred<number>();
        this.calls.push({ signal, d });
        return d.promise;
      },
      options,
    );
  };
}
