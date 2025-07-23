import { Blac, BlacObserver, BlocBase, BlocBaseAbstract, BlocConstructor, BlocHookDependencyArrayFn, BlocState, BlocLifecycleState, generateUUID } from '@blac/core';
import { useCallback, useMemo, useRef } from 'react';
import { BlocHookOptions } from './useBloc';
import { globalComponentTracker } from './ComponentDependencyTracker';

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
  componentRef: React.RefObject<object>;
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

  // Component reference for global dependency tracker
  const componentRef = useRef<object>({});
  
  // Register component with global tracker
  useMemo(() => {
    globalComponentTracker.registerComponent(rid, componentRef.current);
  }, [rid]);

  const usedKeys = useRef<Set<string>>(new Set());
  const usedClassPropKeys = useRef<Set<string>>(new Set());
  
  // Track whether proxy-based dependency tracking has been initialized
  // This helps distinguish between direct external store usage and useBloc proxy usage
  const hasProxyTracking = useRef<boolean>(false);
  
  // Track whether we've completed the initial render
  const hasCompletedInitialRender = useRef<boolean>(false);

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
  
  // Create stable external store object that survives React Strict Mode
  const stableExternalStore = useRef<ExternalStore<B> | null>(null);

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
          // Use global component tracker for fine-grained dependency tracking
          currentDependencies = globalComponentTracker.getComponentDependencies(
            componentRef.current,
            newState,
            instance
          );
          
          // If no dependencies were tracked yet, this means it's initial render
          // or no proxy access has occurred
          if (currentDependencies[0].length === 0 && currentDependencies[1].length === 0) {
            if (!hasProxyTracking.current) {
              // Direct external store usage - always track entire state
              currentDependencies = [[newState], []];
            } else {
              // With proxy tracking enabled and no dependencies accessed,
              // return empty dependencies to prevent re-renders
              currentDependencies = [[], []];
            }
          }
          
          // Also update legacy refs for backward compatibility
          const stateAccess = globalComponentTracker.getStateAccess(componentRef.current);
          const classAccess = globalComponentTracker.getClassAccess(componentRef.current);
          
          usedKeys.current = stateAccess;
          usedClassPropKeys.current = classAccess;
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

  // Create stable external store once and reuse it
  if (!stableExternalStore.current) {
    stableExternalStore.current = {
      subscribe: (listener: (state: BlocState<InstanceType<B>>) => void) => {
        // Always get the latest instance at subscription time, not creation time
        let currentInstance = blocInstance.current;
        if (!currentInstance) {
          return () => {}; // Return no-op if no instance
        }

        // Handle disposed blocs - check if we should get a fresh instance
        if (currentInstance.isDisposed) {
          // Try to get a fresh instance since the current one is disposed
          const freshInstance = getBloc();
          if (freshInstance && !freshInstance.isDisposed) {
            // Update our reference to the fresh instance
            blocInstance.current = freshInstance;
            currentInstance = freshInstance;
          } else {
            // No fresh instance available, return no-op
            return () => {};
          }
        }

        // Check if we already have an observer for this listener
        const existing = activeObservers.current.get(listener);
        if (existing) {
          return existing.unsubscribe;
        }
        
        const observer: BlacObserver<BlocState<InstanceType<B>>> = {
          fn: () => {
            try {
              // Always get fresh instance at notification time to handle React Strict Mode
              const notificationInstance = blocInstance.current;
              if (!notificationInstance || notificationInstance.isDisposed) {
                return;
              }
              
              // Only reset dependency tracking if we're not using a custom selector
              // Custom selectors override proxy-based tracking entirely
              // NOTE: Commenting out reset logic that was causing premature dependency clearing
              // if (!selector && !notificationInstance.defaultDependencySelector) {
              //   // Reset component-specific tracking instead of global refs
              //   globalComponentTracker.resetComponent(componentRef.current);
              //   
              //   // Also reset legacy refs for backward compatibility
              //   usedKeys.current = new Set();
              //   usedClassPropKeys.current = new Set();
              // }

              // Only trigger listener if there are actual subscriptions
              listener(notificationInstance.state);
            } catch (e) {
              // Log any errors that occur during the listener callback
              // This ensures errors in listeners don't break the entire application
              console.error({
                e,
                blocInstance: blocInstance.current,
                dependencyArray,
              });
            }
          },
          // Pass the dependency array to control when the subscription is updated
          dependencyArray,
          // Use the provided id to identify this subscription
          id: rid,
        }

        // Only activate if the bloc is not disposed
        if (!currentInstance.isDisposed) {
          Blac.activateBloc(currentInstance);
        }

        // Subscribe to the bloc's observer with the provided listener function
        // This will trigger the callback whenever the bloc's state changes
        const unSub = currentInstance._observer.subscribe(observer);

        // Create a stable unsubscribe function
        const unsubscribe = () => {
          activeObservers.current.delete(listener);
          unSub();
        };

        // Store the observer and unsubscribe function
        activeObservers.current.set(listener, { observer, unsubscribe });

        // Return an unsubscribe function that can be called to clean up the subscription
        return unsubscribe;
      },
      
      getSnapshot: (): BlocState<InstanceType<B>> | undefined => {
        const instance = blocInstance.current;
        if (!instance) {
          return undefined;
        }

        // For disposed blocs, return the last stable snapshot to prevent React errors
        if (instance.isDisposed) {
          return lastStableSnapshot.current || instance.state;
        }

        // For blocs in transitional states, allow state access but be cautious
        const disposalState = (instance as any)._disposalState;
        if (disposalState === BlocLifecycleState.DISPOSING) {
          // Only return cached snapshot for actively disposing blocs
          return lastStableSnapshot.current || instance.state;
        }

        const currentState = instance.state;
        const currentDependencies = dependencyArray(currentState, previousStateRef.current);
        
        // Check if dependencies have changed using the two-array comparison logic
        const lastDeps = lastDependenciesRef.current;
        let dependenciesChanged = false;
        
        if (!lastDeps) {
          // First time - check if we have any dependencies
          const hasAnyDeps = currentDependencies.some(arr => arr.length > 0);
          dependenciesChanged = hasAnyDeps;
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
      
      getServerSnapshot: (): BlocState<InstanceType<B>> | undefined => {
        const instance = blocInstance.current;
        if (!instance) {
          return undefined;
        }
        return instance.state;
      },
    };
  }

  return {
    usedKeys,
    usedClassPropKeys,
    externalStore: stableExternalStore.current!,
    instance: blocInstance,
    rid,
    hasProxyTracking,
    componentRef,
  };
};

export default useExternalBlocStore;
