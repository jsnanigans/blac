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
 *
 * IMPORTANT: This version actually triggers re-renders by returning NEW state
 * objects after each method call, making it a fair comparison with real implementations.
 */
export function useBlocBaseline<T>(_BlocClass: any): [T, any] {
  // Single proxy object with subscription - absolute minimum
  const bloc = useMemo(() => {
    const listeners = new Set<() => void>();
    let version = 0; // Track state changes
    let cachedState = { _version: 0 }; // Cache state object

    return new Proxy({}, {
      get(_, prop) {
        if (prop === 'state') {
          // Return cached state, create new only when version changes
          if (cachedState._version !== version) {
            cachedState = { _version: version };
          }
          return cachedState;
        }
        if (prop === 'subscribe') {
          return (cb: () => void) => {
            listeners.add(cb);
            return () => listeners.delete(cb);
          };
        }
        // Any method call increments version and triggers listeners
        return () => {
          version++;
          listeners.forEach(cb => cb());
        };
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
