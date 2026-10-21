import { onActivated, type Cubit } from '@blac/core';
import { callWithRetry, reportError } from './config';
import { indexTags } from './invalidate';
import type { AsyncState, DataOf, SlotKey } from './types';

export interface ResourceOptions {
  /** Load on every activation. */
  auto?: boolean;
  /** Milliseconds a successful load stays fresh across `load()` calls. */
  staleTime?: number;
  /** Targets for `invalidate(tag)`; evaluated on activation, so it may read `args`. */
  tags?: () => readonly string[];
  /** Runs before the global `onError`; return `false` to suppress it. */
  onError?: (error: unknown) => boolean | void;
}

export interface Resource {
  /** Loads unless a call is in flight or the data is still fresh. */
  load(): Promise<void>;
  /** Aborts any call in flight and loads again. */
  reload(): Promise<void>;
}

export function resource<S extends object, K extends SlotKey<S> & string>(
  host: Cubit<S, any>,
  key: K,
  fn: (signal: AbortSignal) => Promise<DataOf<S[K]>>,
  { auto = false, staleTime = 0, tags, onError }: ResourceOptions = {},
): Resource {
  type T = DataOf<S[K]>;
  const ctx = { kind: 'resource', key, host } as const;
  let lifetime: AbortSignal | undefined;
  let inflight: { controller: AbortController; promise: Promise<void> } | null =
    null;
  let loadedAt = 0;
  let stale = false;

  const slot = () => host.state[key] as AsyncState<T>;
  const set = (next: AsyncState<T>) =>
    host.update((s) => ({ ...s, [key]: next }));

  const run = (): Promise<void> => {
    inflight?.controller.abort(new DOMException('Superseded', 'AbortError'));
    const controller = new AbortController();
    const signal = lifetime
      ? AbortSignal.any([lifetime, controller.signal])
      : controller.signal;
    stale = false;
    set({ status: 'loading', data: slot().data });
    const promise = callWithRetry(() => fn(signal), ctx)
      .then(
        (data) => {
          if (signal.aborted) return;
          loadedAt = Date.now();
          set({ status: 'success', data });
        },
        (error) => {
          if (signal.aborted) return;
          set({ status: 'error', error, data: slot().data });
          reportError(error, ctx, onError);
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
      !stale &&
      slot().status === 'success' &&
      Date.now() - loadedAt < staleTime;
    return fresh ? Promise.resolve() : run();
  };

  const active = () => !!lifetime && !lifetime.aborted;

  const entry = {
    invalidate() {
      if (active() && (auto || slot().status !== 'idle')) void run();
      else stale = true;
    },
  };

  onActivated(host, (signal) => {
    lifetime = signal;
    const unindex = tags ? indexTags(host.$blac.registry, tags(), entry) : null;
    signal.addEventListener(
      'abort',
      () => {
        inflight = null;
        if (host.$blac.disposed) return unindex?.();
        // A load cut short by deactivation must not leave the slot loading.
        const { status, data } = slot();
        if (status === 'loading') {
          set(
            data === undefined
              ? { status: 'idle' }
              : { status: 'success', data },
          );
        }
      },
      { once: true },
    );
    if (auto || stale) void load();
  });

  return { load, reload: run };
}
