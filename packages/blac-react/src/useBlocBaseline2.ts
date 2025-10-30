/**
 * Alternative baseline using useState + useEffect instead of useSyncExternalStore.
 * This represents the "classic" React pattern for subscribing to external state.
 *
 * Comparison:
 * - useBlocBaseline: Modern approach (useSyncExternalStore)
 * - useBlocBaseline2: Classic approach (useState + useEffect)
 */
import { useMemo, useState, useEffect } from 'react';

/**
 * Pure baseline using useState + useEffect pattern.
 * This is how you'd subscribe to external state before useSyncExternalStore existed.
 */
export function useBlocBaseline2<T>(_BlocClass: any): [T, any] {
  // Create bloc instance with subscription mechanism
  const bloc = useMemo(() => {
    const listeners = new Set<() => void>();
    let version = 0;
    let cachedState = { _version: 0 };

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

  // Use useState to hold the state and trigger re-renders
  const [state, setState] = useState(() => bloc.state);

  // Subscribe to changes using useEffect
  useEffect(() => {
    const unsubscribe = bloc.subscribe(() => {
      // When notified, get new state and update local state
      setState(bloc.state);
    });

    return unsubscribe;
  }, [bloc]);

  return [state as T, bloc];
}
