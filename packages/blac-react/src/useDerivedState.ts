import { BlocBase, BlocConstructor, BlocStreams } from '@blac/core';
import { useEffect, useState, useMemo, useRef } from 'react';
import useBloc from './useBloc';

/**
 * Options for useDerivedState hook
 */
interface UseDerivedStateOptions {
  // Whether to use memoization for expensive selectors
  memoize?: boolean;
  // Custom equality function for derived values
  isEqual?: (a: any, b: any) => boolean;
}

/**
 * Hook for deriving state from a Bloc using a selector function
 * Only re-renders when the derived value changes
 * 
 * @example
 * ```typescript
 * // Simple derived state
 * const userName = useDerivedState(
 *   UserBloc,
 *   (state) => state.name
 * );
 * 
 * // Complex computation with memoization
 * const statistics = useDerivedState(
 *   DataBloc,
 *   (state) => calculateStatistics(state.data),
 *   { memoize: true }
 * );
 * 
 * // Custom equality
 * const items = useDerivedState(
 *   ItemsBloc,
 *   (state) => state.items.filter(item => item.active),
 *   { isEqual: (a, b) => a.length === b.length }
 * );
 * ```
 */
function useDerivedState<
  B extends BlocConstructor<BlocBase<any>>,
  D
>(
  blocConstructor: B,
  selector: (state: InstanceType<B>['state']) => D,
  options?: UseDerivedStateOptions,
): D {
  const [, bloc] = useBloc(blocConstructor);
  
  // Memoize selector if requested
  const memoizedSelector = useMemo(
    () => {
      if (!options?.memoize) return selector;
      
      let lastInput: InstanceType<B>['state'] | undefined;
      let lastOutput: D;
      
      return (state: InstanceType<B>['state']) => {
        if (state === lastInput) {
          return lastOutput;
        }
        lastInput = state;
        lastOutput = selector(state);
        return lastOutput;
      };
    },
    [selector, options?.memoize]
  );
  
  // Initialize with current derived value
  const [derivedState, setDerivedState] = useState<D>(
    () => memoizedSelector(bloc.state)
  );
  
  // Track if component is mounted
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    
    const abortController = new AbortController();
    
    (async () => {
      try {
        for await (const derived of BlocStreams.deriveState(bloc, memoizedSelector)) {
          if (abortController.signal.aborted) break;
          
          // Only update if component is still mounted
          if (isMountedRef.current) {
            setDerivedState((prev) => {
              // Use custom equality if provided
              if (options?.isEqual && options.isEqual(prev, derived)) {
                return prev;
              }
              return derived;
            });
          }
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Derived state stream error:', error);
        }
      }
    })();
    
    return () => {
      isMountedRef.current = false;
      abortController.abort();
    };
  }, [bloc, memoizedSelector, options?.isEqual]);
  
  return derivedState;
}

/**
 * Hook for combining multiple bloc states into a single derived value
 * 
 * @example
 * ```typescript
 * const combined = useCombinedState({
 *   user: UserBloc,
 *   settings: SettingsBloc,
 *   data: DataBloc
 * }, ({ user, settings, data }) => ({
 *   userName: user.name,
 *   theme: settings.theme,
 *   itemCount: data.items.length
 * }));
 * ```
 */
export function useCombinedState<
  T extends Record<string, BlocConstructor<BlocBase<any>>>,
  D
>(
  blocs: T,
  selector: (states: {
    [K in keyof T]: InstanceType<T[K]>['state']
  }) => D,
  options?: UseDerivedStateOptions,
): D {
  // Get all bloc instances
  const blocInstances = {} as Record<keyof T, BlocBase<any>>;
  
  for (const key in blocs) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [, bloc] = useBloc(blocs[key]);
    blocInstances[key] = bloc;
  }
  
  // Initialize with current combined state
  const getCurrentStates = () => {
    const states = {} as any;
    for (const key in blocInstances) {
      states[key] = blocInstances[key].state;
    }
    return states;
  };
  
  const [derivedState, setDerivedState] = useState<D>(
    () => selector(getCurrentStates())
  );
  
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    const abortController = new AbortController();
    
    (async () => {
      try {
        for await (const combinedState of BlocStreams.combineStates(blocInstances)) {
          if (abortController.signal.aborted) break;
          
          const derived = selector(combinedState as any);
          
          if (isMountedRef.current) {
            setDerivedState((prev) => {
              if (options?.isEqual && options.isEqual(prev, derived)) {
                return prev;
              }
              return derived;
            });
          }
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Combined state stream error:', error);
        }
      }
    })();
    
    return () => {
      isMountedRef.current = false;
      abortController.abort();
    };
  }, [selector, options?.isEqual]);
  
  return derivedState;
}

export default useDerivedState;