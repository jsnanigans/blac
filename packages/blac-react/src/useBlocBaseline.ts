/**
 * ABSOLUTE BARE BONES baseline using ONLY React primitives.
 * This establishes the true performance floor - React's useSyncExternalStore
 * with the simplest possible subscription pattern.
 *
 * No Blac code, no state management, no optimization - pure React + one Proxy.
 */
import { useMemo, useSyncExternalStore } from 'react';

/**
 * Pure baseline: React's useSyncExternalStore + minimal Proxy + Set subscription.
 * This is the absolute minimum to make React's subscription mechanism work.
 */
export function useBlocBaseline<T>(_BlocClass: any): [T, any] {
  // Single proxy object with subscription - absolute minimum
  const bloc = useMemo(() => {
    const listeners = new Set<() => void>();
    const trigger = () => listeners.forEach(cb => cb());
    const state = {}; // Single state object (same reference always)

    return new Proxy({}, {
      get(_, prop) {
        if (prop === 'state') return state; // Always return same object
        if (prop === 'subscribe') {
          return (cb: () => void) => {
            listeners.add(cb);
            return () => listeners.delete(cb);
          };
        }
        return trigger; // Everything else triggers re-render
      }
    });
  }, []);

  // React's useSyncExternalStore - the only React hook we need
  const state = useSyncExternalStore(
    (cb) => bloc.subscribe(cb),
    () => bloc.state
  );

  return [state as T, bloc];
}
