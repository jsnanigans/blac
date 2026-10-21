import type { Cubit } from '@blac/core';
import { callWithRetry, getAsyncConfig, reportError } from './config';
import { invalidate } from './invalidate';
import type { DataOf, SlotKey } from './types';

export interface MutationOptions<I, R, A = unknown> {
  /** Tags to invalidate after success. */
  invalidates?: (input: I, data: R, args: A) => readonly string[];
  /** Message handed to the global `onSuccess`, e.g. for a toast. */
  success?: string;
  /** Runs before the global `onError`; return `false` to suppress it. */
  onError?: (error: unknown) => boolean | void;
}

export function mutation<
  S extends object,
  K extends SlotKey<S> & string,
  I,
  A = void,
>(
  host: Cubit<S, A>,
  key: K,
  fn: (input: I, args: A) => Promise<DataOf<S[K]>>,
  { invalidates, success, onError }: MutationOptions<I, DataOf<S[K]>, A> = {},
): (input: I) => Promise<DataOf<S[K]> | undefined> {
  const ctx = { kind: 'mutation', key, host } as const;
  const set = (next: S[K]) => host.update((s) => ({ ...s, [key]: next }));

  return async (input) => {
    set({ status: 'loading' } as S[K]);
    try {
      const data = await callWithRetry(() => fn(input, host.args as A), ctx);
      set({ status: 'success', data } as S[K]);
      if (invalidates)
        invalidate(
          invalidates(input, data, host.args as A),
          host.$blac.registry,
        );
      if (success) getAsyncConfig().onSuccess?.(success, { ...ctx, data });
      return data;
    } catch (error) {
      set({ status: 'error', error } as S[K]);
      reportError(error, ctx, onError);
      return undefined;
    }
  };
}
