import type { Cubit } from '@blac/core';
import { getAsyncConfig, reportError } from './config';
import { invalidate } from './invalidate';
import { writes, type Resource } from './resource';
import type { AsyncState, DataOf, SlotKey } from './types';

export interface MutationOptions<I, R, A = unknown, T = unknown> {
  /** Tags to invalidate after success. */
  invalidates?: (input: I, data: R, args: A) => readonly string[];
  /** Message handed to the global `onSuccess`, e.g. for a toast. */
  success?: string;
  /** Runs before the global `onError`; return `false` to suppress it. */
  onError?: (error: unknown) => boolean | void;
  /** Writes `apply` to `target` before the call; a failure rolls it back unless a newer write landed. */
  optimistic?: {
    target: Resource<T>;
    apply: (data: T | undefined, input: I) => T;
  };
}

export function mutation<
  S extends object,
  K extends SlotKey<S> & string,
  I,
  A = void,
  T = unknown,
>(
  host: Cubit<S, A>,
  key: K,
  fn: (input: I, args: A) => Promise<DataOf<S[K]>>,
  {
    invalidates,
    success,
    onError,
    optimistic,
  }: MutationOptions<I, DataOf<S[K]>, A, T> = {},
): (input: I) => Promise<AsyncState<DataOf<S[K]>>> {
  type R = DataOf<S[K]>;
  const ctx = { kind: 'mutation', key, host } as const;
  const set = (next: AsyncState<R>) => {
    host.update((s) => ({ ...s, [key]: next }));
    return next;
  };

  return async (input) => {
    const rollback =
      optimistic &&
      writes.get(optimistic.target)?.((data) => optimistic.apply(data, input));
    set({ status: 'loading' });
    try {
      const data = await fn(input, host.args as A);
      const result = set({ status: 'success', data });
      if (invalidates)
        invalidate(
          invalidates(input, data, host.args as A),
          host.$blac.registry,
        );
      if (success) getAsyncConfig().onSuccess?.(success, { ...ctx, data });
      return result;
    } catch (error) {
      const result = set({ status: 'error', error });
      rollback?.();
      reportError(error, ctx, onError);
      return result;
    }
  };
}
