import { Blac, BlacObserver, BlocBase, BlocBaseAbstract, BlocConstructor, BlocHookDependencyArrayFn, BlocState, generateUUID } from '@blac/core';
import { useCallback, useMemo, useRef } from 'react';
import { BlocHookOptions } from './useBloc';

export interface ExternalStore<
  B extends BlocConstructor<BlocBase<any>>
> {
  /**
   * Subscribes to changes in the store and returns an unsubscribe function.
   * @param onStoreChange - Callback function that will be called whenever the store changes
   * @returns A function that can be called to unsubscribe from store changes
   */
  subscribe: (onStoreChange: (state: BlocState<InstanceType<B>>) => void) => () => void;

  /**
   * Gets the current snapshot of the store state.
   * @returns The current state of the store
   */
  getSnapshot: () => BlocState<InstanceType<B>> | undefined;

  /**
   * Gets the server snapshot of the store state.
   * This is optional and defaults to the same value as getSnapshot.
   * @returns The server state of the store
   */
  getServerSnapshot?: () => BlocState<InstanceType<B>> | undefined;
}

export interface ExternalBlacStore<
  B extends BlocConstructor<BlocBase<any>>
> {
  usedKeys: React.RefObject<Set<string>>;
  usedClassPropKeys: React.RefObject<Set<string>>;
  externalStore: ExternalStore<B>;
  instance: React.RefObject<InstanceType<B>>;
  rid: string;
  hasProxyTracking: React.RefObject<boolean>;
}

/**
 * Creates an external store that wraps a Bloc instance, providing a React-compatible interface
 * for subscribing to and accessing bloc state.
 */
const useExternalBlocStore = <
  B extends BlocConstructor<BlocBase<any>>
>(
  bloc: B,
  options: BlocHookOptions<InstanceType<B>> | undefined,
): ExternalBlacStore<B> => {
  const { id: blocId, props, selector } = options ?? {};

  const rid = useMemo(() => {
    return generateUUID();
  }, []);

  const base = bloc as unknown as BlocBaseAbstract;

  const isIsolated = base.isolated;
  const effectiveBlocId = isIsolated ? rid : blocId;

  const usedKeys = useRef<Set<string>>(new Set());
  const usedClassPropKeys = useRef<Set<string>>(new Set());
  
  // Track whether proxy-based dependency tracking has been initialized
  // This helps distinguish between direct external store usage and useBloc proxy usage
  const hasProxyTracking = useRef<boolean>(false);

  const getBloc = useCallback(() => {
    return Blac.getBloc(bloc, {
      id: effectiveBlocId,
      props,
      instanceRef: rid
    });
  }, [bloc, effectiveBlocId, props, rid]);

  const blocInstance = useRef<InstanceType<B>>(getBloc());

  // Update the instance when dependencies change
  useMemo(() => {
    blocInstance.current = getBloc();
  }, [getBloc]);

  // Track previous state and dependencies for selector
  const previousStateRef = useRef<BlocState<InstanceType<B>> | undefined>(undefined);
  const lastDependenciesRef = useRef<unknown[][] | undefined>(undefined);
  const lastStableSnapshot = useRef<BlocState<InstanceType<B>> | undefined>(undefined);
  
  // Track bloc instance uid to prevent unnecessary store recreation
  const blocUidRef = useRef<string | undefined>(undefined);
  if (blocUidRef.current !== blocInstance.current?.uid) {
    blocUidRef.current = blocInstance.current?.uid;
  }

  const dependencyArray = useMemo(
    () =>
      (newState: BlocState<InstanceType<B>>, oldState?: BlocState<InstanceType<B>>): unknown[][] => {
        const instance = blocInstance.current;

        if (!instance) {
          return [[], []]; // [stateArray, classArray]
        }

        // Use the provided oldState or fall back to our tracked previous state
        const previousState = oldState ?? previousStateRef.current;
        
        let currentDependencies: unknown[][];

        // Use custom dependency selector if provided
        if (selector) {
          const flatDeps = selector(newState, previousState, instance);
          // Wrap flat custom selector result in the two-array structure for consistency
          currentDependencies = [flatDeps, []]; // [customSelectorDeps, classArray]
        }
        // Fall back to bloc's default dependency selector if available
        else if (instance.defaultDependencySelector) {
          const flatDeps = instance.defaultDependencySelector(newState, previousState, instance);
          // Wrap flat default selector result in the two-array structure for consistency
          currentDependencies = [flatDeps, []]; // [defaultSelectorDeps, classArray]
        }
        // For primitive states, use default selector
        else if (typeof newState !== 'object') {
          // Default behavior for primitive states: re-render if the state itself changes.
          currentDependencies = [[newState], []]; // [primitiveStateArray, classArray]
        }
        else {
          // For object states, track which properties were actually used
          const stateDependencies: unknown[] = [];
          const classDependencies: unknown[] = [];
          
          // Add state property values that were accessed
          for (const key of usedKeys.current) {
            if (key in newState) {
              stateDependencies.push(newState[key as keyof typeof newState]);
            }
          }

          // Add class property values that were accessed
          for (const key of usedClassPropKeys.current) {
            if (key in instance) {
              try {
                const value = instance[key as keyof InstanceType<B>];
                if (typeof value !== 'function') {
                  classDependencies.push(value);
                }
              } catch (error) {
                Blac.instance.log('useBloc Error', error);
              }
            }
          }

          // If no properties have been accessed through proxy
          if (usedKeys.current.size === 0 && usedClassPropKeys.current.size === 0) {
            // If proxy tracking has never been initialized, this is direct external store usage
            // In this case, always track the entire state to ensure notifications
            if (!hasProxyTracking.current) {
              stateDependencies.push(newState);
            }
            // If proxy tracking was initialized but no properties accessed, 
            // return empty dependencies to prevent unnecessary re-renders
          }

          currentDependencies = [stateDependencies, classDependencies];
        }

        // Update tracked state
        previousStateRef.current = newState;


        // Return the dependencies for BlacObserver to compare
        return currentDependencies;
        },
      [],
    );

  // Store active subscriptions to reuse observers
  const activeObservers = useRef<Map<Function, { observer: BlacObserver<BlocState<InstanceType<B>>>, unsubscribe: () => void }>>(new Map());

  const state: ExternalStore<B> = useMemo(() => {
    return {
      subscribe: (listener: (state: BlocState<InstanceType<B>>) => void) => {
        
        const currentInstance = blocInstance.current;
        if (!currentInstance) {
          return () => {}; // Return no-op if no instance
        }

        // Check if we already have an observer for this listener
        const existing = activeObservers.current.get(listener);
        if (existing) {
          return existing.unsubscribe;
        }
        const observer: BlacObserver<BlocState<InstanceType<B>>> = {
          fn: () => {
            try {
              
              // Only reset dependency tracking if we're not using a custom selector
              // Custom selectors override proxy-based tracking entirely
              if (!selector && !currentInstance.defaultDependencySelector) {
                usedKeys.current = new Set();
                usedClassPropKeys.current = new Set();
              }

              // Only trigger listener if there are actual subscriptions
              listener(currentInstance.state);
            } catch (e) {
              // Log any errors that occur during the listener callback
              // This ensures errors in listeners don't break the entire application
              console.error({
                e,
                blocInstance: currentInstance,
                dependencyArray,
              });
            }
          },
          // Pass the dependency array to control when the subscription is updated
          dependencyArray,
          // Use the provided id to identify this subscription
          id: rid,
        }

        Blac.activateBloc(currentInstance);

        // Subscribe to the bloc's observer with the provided listener function
        // This will trigger the callback whenever the bloc's state changes
        const unSub = currentInstance._observer.subscribe(observer);

        const unsubscribe = () => {
          activeObservers.current.delete(listener);
          unSub();
        };

        // Store the observer and unsubscribe function
        activeObservers.current.set(listener, { observer, unsubscribe });

        // Return an unsubscribe function that can be called to clean up the subscription
        return unsubscribe;
      },
      // Return an immutable snapshot of the current bloc state
      getSnapshot: (): BlocState<InstanceType<B>> | undefined => {
        const instance = blocInstance.current;
        if (!instance) {
          return {} as BlocState<InstanceType<B>>;
        }

        const currentState = instance.state;
        const currentDependencies = dependencyArray(currentState, previousStateRef.current);
        
        // Check if dependencies have changed using the two-array comparison logic
        const lastDeps = lastDependenciesRef.current;
        let dependenciesChanged = false;
        
        if (!lastDeps) {
          // First time - dependencies changed
          dependenciesChanged = true;
        } else if (lastDeps.length !== currentDependencies.length) {
          // Array structure changed
          dependenciesChanged = true;
        } else {
          // Compare each array (state and class dependencies)
          for (let arrayIndex = 0; arrayIndex < currentDependencies.length; arrayIndex++) {
            const lastArray = lastDeps[arrayIndex] || [];
            const newArray = currentDependencies[arrayIndex] || [];
            
            if (lastArray.length !== newArray.length) {
              dependenciesChanged = true;
              break;
            }
            
            // Compare each dependency value using Object.is
            for (let i = 0; i < newArray.length; i++) {
              if (!Object.is(lastArray[i], newArray[i])) {
                dependenciesChanged = true;
                break;
              }
            }
            
            if (dependenciesChanged) break;
          }
        }
        
        // Update dependency tracking
        lastDependenciesRef.current = currentDependencies;
        
        // If dependencies haven't changed, return the same snapshot reference
        // This prevents React from re-rendering when dependencies are stable
        if (!dependenciesChanged && lastStableSnapshot.current) {
          return lastStableSnapshot.current;
        }
        
        // Dependencies changed - update and return new snapshot
        lastStableSnapshot.current = currentState;
        return currentState;
      },
      // Server snapshot mirrors the client snapshot in this implementation
      getServerSnapshot: (): BlocState<InstanceType<B>> | undefined => {
        const instance = blocInstance.current;
        if (!instance) {
          return {} as BlocState<InstanceType<B>>;
        }
        return instance.state;
      },
    }
  }, []); // Store is stable - individual methods handle instance changes

  return {
    usedKeys,
    usedClassPropKeys,
    externalStore: state,
    instance: blocInstance,
    rid,
    hasProxyTracking,
  };
};

export default useExternalBlocStore;
