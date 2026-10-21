import { Cubit, onActivated } from '@blac/core';

export type AsyncState<T> =
  | { status: 'idle'; data?: undefined; error?: undefined }
  | { status: 'loading'; data?: T; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: T; error: unknown };

export const idle = <T>(): AsyncState<T> => ({ status: 'idle' });

type DataOf<A> = A extends AsyncState<infer T> ? T : never;
type SlotKey<S> = {
  [K in keyof S]: S[K] extends AsyncState<any> ? K : never;
}[keyof S];

export interface ResourceOptions {
  auto?: boolean;
  staleTime?: number;
}

export interface Resource {
  load(): Promise<void>;
  reload(): Promise<void>;
}

export function resource<S extends object, K extends SlotKey<S>>(
  host: Cubit<S, any>,
  key: K,
  fn: (signal: AbortSignal) => Promise<DataOf<S[K]>>,
  { auto = false, staleTime = 0 }: ResourceOptions = {},
): Resource {
  let lifetime: AbortSignal | undefined;
  let inflight: { controller: AbortController; promise: Promise<void> } | null =
    null;
  let loadedAt = 0;

  const slot = () => host.state[key] as AsyncState<DataOf<S[K]>>;
  const set = (next: AsyncState<DataOf<S[K]>>) =>
    host.update((s) => ({ ...s, [key]: next }));

  const run = (): Promise<void> => {
    inflight?.controller.abort(new DOMException('Superseded', 'AbortError'));
    const controller = new AbortController();
    const signal = lifetime
      ? AbortSignal.any([lifetime, controller.signal])
      : controller.signal;
    set({ status: 'loading', data: slot().data });
    const promise = fn(signal)
      .then(
        (data) => {
          if (signal.aborted) return;
          loadedAt = Date.now();
          set({ status: 'success', data });
        },
        (error) => {
          if (signal.aborted) return;
          set({ status: 'error', error, data: slot().data });
        },
      )
      .finally(() => {
        if (inflight?.controller === controller) inflight = null;
      });
    inflight = { controller, promise };
    return promise;
  };

  const load = () => {
    if (inflight) return inflight.promise;
    const fresh =
      slot().status === 'success' && Date.now() - loadedAt < staleTime;
    return fresh ? Promise.resolve() : run();
  };

  onActivated(host, (signal) => {
    lifetime = signal;
    signal.addEventListener('abort', () => (inflight = null), { once: true });
    if (auto) void load();
  });

  return { load, reload: run };
}

export function mutation<S extends object, K extends SlotKey<S>, I>(
  host: Cubit<S, any>,
  key: K,
  fn: (input: I) => Promise<DataOf<S[K]>>,
): (input: I) => Promise<DataOf<S[K]> | undefined> {
  const set = (next: AsyncState<DataOf<S[K]>>) =>
    host.update((s) => ({ ...s, [key]: next }));

  return async (input) => {
    set({ status: 'loading' });
    try {
      const data = await fn(input);
      set({ status: 'success', data });
      return data;
    } catch (error) {
      set({ status: 'error', error });
      return undefined;
    }
  };
}

// The subclass alternative to `resource(this, ...)`: same engine, `this`-bound.
export abstract class AsyncCubit<S extends object, Args = void> extends Cubit<
  S,
  Args
> {
  protected resource<K extends SlotKey<S>>(
    key: K,
    fn: (signal: AbortSignal) => Promise<DataOf<S[K]>>,
    opts?: ResourceOptions,
  ): Resource {
    return resource(this, key, fn, opts);
  }

  protected mutation<K extends SlotKey<S>, I>(
    key: K,
    fn: (input: I) => Promise<DataOf<S[K]>>,
  ) {
    return mutation(this, key, fn);
  }
}
