import { onActivated, type Cubit } from '@blac/core';
import { reportError } from './config';
import { indexTags } from './invalidate';
import type { AsyncState, DataOf, SlotKey } from './types';

export interface ResourceOptions<A = unknown, S = unknown> {
  /** Load on every activation. */
  auto?: boolean;
  /** Milliseconds a successful load stays fresh across `load()` calls. */
  staleTime?: number;
  /** Targets for `invalidate(tag)`; evaluated on activation. */
  tags?: (args: A) => readonly string[];
  /** While `false`, the resource ignores `load`, `reload` and `invalidate`. */
  enabled?: (state: S, args: A) => boolean;
  /** Runs before the global `onError`; return `false` to suppress it. */
  onError?: (error: unknown) => boolean | void;
}

export interface Resource<T = unknown> {
  /** Loads unless a call is in flight or the data is still fresh. */
  load(): Promise<void>;
  /** Aborts any call in flight and loads again. */
  reload(): Promise<void>;
  /** Aborts any call in flight and writes `success` with the updated data; freshness is left alone. */
  set(updater: (data: T | undefined) => T): void;
}

type Write<T> = (updater: (data: T | undefined) => T) => () => void;

/** Writes through a resource and returns a rollback that applies only if nothing newer landed. */
export const writes = new WeakMap<Resource<any>, Write<any>>();

export function resource<
  S extends object,
  K extends SlotKey<S> & string,
  A = void,
>(
  host: Cubit<S, A>,
  key: K,
  fn: (signal: AbortSignal, args: A) => Promise<DataOf<S[K]>>,
  {
    auto = false,
    staleTime = 0,
    tags,
    enabled,
    onError,
  }: ResourceOptions<A, S> = {},
): Resource<DataOf<S[K]>> {
  type T = DataOf<S[K]>;
  const ctx = { kind: 'resource', key, host } as const;
  let lifetime: AbortSignal | undefined;
  let inflight: { controller: AbortController; promise: Promise<void> } | null =
    null;
  let loadedAt = 0;
  let stale = false;
  let settled: AsyncState<T> = { status: 'idle' };

  const slot = () => host.state[key] as AsyncState<T>;
  const set = (next: AsyncState<T>) =>
    host.update((s) => ({ ...s, [key]: next }));

  const run = (): Promise<void> => {
    if (enabled && !enabled(host.state, host.args as A))
      return Promise.resolve();
    inflight?.controller.abort(new DOMException('Superseded', 'AbortError'));
    const controller = new AbortController();
    const signal = lifetime
      ? AbortSignal.any([lifetime, controller.signal])
      : controller.signal;
    stale = false;
    if (slot().status !== 'loading') settled = slot();
    set({ status: 'loading', data: slot().data });
    const promise = fn(signal, host.args as A)
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

  const write: Write<T> = (updater) => {
    const prev = slot();
    inflight?.controller.abort(new DOMException('Superseded', 'AbortError'));
    inflight = null;
    set({ status: 'success', data: updater(prev.data) });
    const written = slot();
    return () => {
      if (slot() !== written) return;
      set(prev.status === 'loading' && !inflight ? settled : prev);
    };
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
    const unindex = tags
      ? indexTags(host.$blac.registry, tags(host.args as A), entry)
      : null;
    signal.addEventListener(
      'abort',
      () => {
        inflight = null;
        if (host.$blac.disposed) return unindex?.();
        // A load cut short by deactivation must not leave the slot loading.
        if (slot().status === 'loading') set(settled);
      },
      { once: true },
    );
    if (auto || stale) void load();
  });

  const handle: Resource<T> = {
    load,
    reload: run,
    set: (updater) => void write(updater),
  };
  writes.set(handle, write);
  return handle;
}
