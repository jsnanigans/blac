/**
 * useBlocAdapter Hook
 *
 * Modern React hook for BlaC state management using the Adapter Pattern.
 * Provides 100% React 18 compatibility with Strict Mode, Suspense, and concurrent features.
 *
 * Key Improvements over legacy implementation:
 * - Clean adapter pattern separates React and BlaC concerns
 * - Stable subscriptions via useSyncExternalStore
 * - Selector support for fine-grained reactivity
 * - Version-based change detection (no deep comparisons)
 * - Proper reference counting for lifecycle management
 * - React Strict Mode compatible by design
 *
 * @module useBlocAdapter
 */

import {
  Blac,
  BlocBase,
  BlocConstructor,
  BlocState,
  generateInstanceIdFromProps,
} from '@blac/core';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import { getOrCreateAdapter } from './adapter';
import type { Selector, CompareFn } from './adapter';

/**
 * Options for useBlocAdapter hook
 */
export interface UseBlocAdapterOptions<B extends BlocBase<any>, R = any> {
  /** Static props to pass to Bloc constructor */
  staticProps?: ConstructorParameters<BlocConstructor<B>>[0];

  /** Custom instance ID for shared blocs */
  instanceId?: string;

  /** Selector function for fine-grained subscriptions */
  selector?: Selector<BlocState<B>, R>;

  /** Custom comparison function for selector results */
  compare?: CompareFn<R>;

  /** Enable Suspense integration */
  suspense?: boolean;

  /** Async initialization function for Suspense */
  loadAsync?: (bloc: B) => Promise<void>;

  /** Check if bloc is currently loading */
  isLoading?: (bloc: B) => boolean;

  /** Get the loading promise for Suspense */
  getLoadingPromise?: (bloc: B) => Promise<void> | null;

  /** Callback when component mounts */
  onMount?: (bloc: B) => void;

  /** Callback when component unmounts */
  onUnmount?: (bloc: B) => void;
}

/**
 * Return type for useBlocAdapter without selector
 */
type UseBlocAdapterReturnWithoutSelector<B extends BlocBase<any>> = [
  BlocState<B>,
  B
];

/**
 * Return type for useBlocAdapter with selector
 */
type UseBlocAdapterReturnWithSelector<B extends BlocBase<any>, R> = [R, B];

/**
 * useBlocAdapter Hook
 *
 * React hook for integrating with BlaC state management using the adapter pattern.
 * This is the recommended hook for new code and will eventually replace the legacy useBloc.
 *
 * @param BlocClass - The Bloc class to instantiate
 * @param options - Configuration options including selector and Suspense support
 * @returns Tuple of [state, bloc] or [selectorResult, bloc]
 *
 * @example
 * // Basic usage
 * function Counter() {
 *   const [state, bloc] = useBlocAdapter(CounterBloc);
 *   return <div>{state.count}</div>;
 * }
 *
 * @example
 * // With selector for fine-grained subscriptions
 * function Counter() {
 *   const [count, bloc] = useBlocAdapter(CounterBloc, {
 *     selector: (state) => state.count,
 *   });
 *   return <div>{count}</div>;
 * }
 *
 * @example
 * // With Suspense
 * function AsyncData() {
 *   const [data, bloc] = useBlocAdapter(DataBloc, {
 *     suspense: true,
 *     loadAsync: (bloc) => bloc.loadData(),
 *     isLoading: (bloc) => bloc.state.isLoading,
 *     getLoadingPromise: (bloc) => bloc.loadingPromise,
 *   });
 *   return <div>{data.value}</div>;
 * }
 */
function useBlocAdapter<B extends BlocConstructor<BlocBase<any>>>(
  BlocClass: B,
  options?: UseBlocAdapterOptions<InstanceType<B>>
): UseBlocAdapterReturnWithoutSelector<InstanceType<B>>;

function useBlocAdapter<
  B extends BlocConstructor<BlocBase<any>>,
  R = any
>(
  BlocClass: B,
  options: UseBlocAdapterOptions<InstanceType<B>, R> & {
    selector: Selector<BlocState<InstanceType<B>>, R>;
  }
): UseBlocAdapterReturnWithSelector<InstanceType<B>, R>;

function useBlocAdapter<
  B extends BlocConstructor<BlocBase<any>>,
  R = any
>(
  BlocClass: B,
  options?: UseBlocAdapterOptions<InstanceType<B>, R>
):
  | UseBlocAdapterReturnWithoutSelector<InstanceType<B>>
  | UseBlocAdapterReturnWithSelector<InstanceType<B>, R> {
  // Component reference that persists across React Strict Mode remounts
  const componentRef = useRef<object & { __blocInstanceId?: string }>({});

  // Stable subscription ID for auto-tracking
  const subscriptionIdRef = useRef<string>(`comp-${Math.random().toString(36).slice(2, 11)}`);

  // Determine instance ID for the bloc
  const instanceKey = useMemo(() => {
    if (options?.instanceId) {
      return options.instanceId;
    }
    if (options?.staticProps) {
      return generateInstanceIdFromProps(options.staticProps) || null;
    }
    return null;
  }, [options?.instanceId, options?.staticProps]);

  // Generate stable ID for isolated blocs
  const base = BlocClass as unknown as { isolated?: boolean };
  if (
    base.isolated &&
    !options?.instanceId &&
    !componentRef.current.__blocInstanceId
  ) {
    componentRef.current.__blocInstanceId = `adapter-${Math.random().toString(36).slice(2, 11)}`;
  }

  const finalInstanceId = instanceKey || componentRef.current.__blocInstanceId;

  // Get or create bloc instance from Blac registry
  const bloc = useMemo(() => {
    const instance = Blac.getBloc(BlocClass, {
      constructorParams: options?.staticProps ? [options.staticProps] : undefined,
      instanceRef: finalInstanceId,
    });
    return instance as InstanceType<B>;
  }, [BlocClass, finalInstanceId, options?.staticProps]);

  // Track if we've initiated async loading (for Suspense)
  const hasInitiatedLoadRef = useRef(false);

  // Handle Suspense integration for async blocs
  if (options?.suspense) {
    // Check if bloc is loading
    if (options.isLoading?.(bloc)) {
      const loadingPromise = options.getLoadingPromise?.(bloc);
      if (loadingPromise) {
        // Throw the promise to trigger Suspense boundary
        throw loadingPromise;
      }
    }

    // Start loading if needed (only once)
    if (options.loadAsync && !options.isLoading?.(bloc) && !hasInitiatedLoadRef.current) {
      hasInitiatedLoadRef.current = true;
      const loadPromise = options.loadAsync(bloc);
      if (loadPromise instanceof Promise) {
        // Throw to trigger Suspense
        throw loadPromise;
      }
    }
  }

  // Get or create adapter for this bloc
  const adapter = useMemo(() => getOrCreateAdapter(bloc), [bloc]);

  // Create stable selector reference
  const selectorRef = useRef(options?.selector);
  selectorRef.current = options?.selector;

  // Create stable compare function reference
  const compareRef = useRef(options?.compare);
  compareRef.current = options?.compare;

  // Subscribe function for useSyncExternalStore
  // This is stable and properly integrates with React's subscription model
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // Subscribe to adapter with current selector and compare function
      const unsubscribe = adapter.subscribe(
        selectorRef.current,
        onStoreChange,
        compareRef.current
      );

      // Return cleanup function
      return unsubscribe;
    },
    [adapter]
  );

  // Snapshot function for useSyncExternalStore
  const getSnapshot = useCallback(() => {
    return adapter.getSnapshot(selectorRef.current, subscriptionIdRef.current);
  }, [adapter]);

  // Server snapshot for SSR
  const getServerSnapshot = useCallback(() => {
    return adapter.getServerSnapshot(selectorRef.current);
  }, [adapter]);

  // Subscribe to state changes using useSyncExternalStore
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Complete dependency tracking after each render (for auto-tracking)
  useEffect(() => {
    if (!options?.selector && adapter.isAutoTrackingEnabled()) {
      adapter.completeDependencyTracking(subscriptionIdRef.current!);
    }
  }, [adapter, options?.selector, state]); // Re-run when state changes to track new dependencies

  // Mount/unmount lifecycle
  useEffect(() => {
    // Call onMount callback if provided
    if (options?.onMount) {
      options.onMount(bloc);
    }

    return () => {
      // Call onUnmount callback if provided
      if (options?.onUnmount) {
        options.onUnmount(bloc);
      }

      // Handle isolated bloc cleanup
      const base = BlocClass as unknown as { isolated?: boolean };
      if (base.isolated && finalInstanceId) {
        const blacInstance = Blac.getInstance();
        const isolatedBloc = blacInstance.isolatedBlocIndex.get(finalInstanceId);

        if (isolatedBloc && isolatedBloc.subscriptionCount === 0) {
          // Schedule disposal to handle any async cleanup
          setTimeout(() => {
            const bloc = blacInstance.isolatedBlocIndex.get(finalInstanceId);
            if (bloc && bloc.subscriptionCount === 0) {
              bloc.dispose();
              blacInstance.isolatedBlocIndex.delete(finalInstanceId);
            }
          }, 0);
        }
      }
    };
  }, [bloc.uid, BlocClass, finalInstanceId, options?.onMount, options?.onUnmount]);

  // Return state and bloc instance
  // Type is determined by overloads
  return [state, bloc] as any;
}

export default useBlocAdapter;
