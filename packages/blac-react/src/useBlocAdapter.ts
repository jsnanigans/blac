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
  B,
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
  options?: UseBlocAdapterOptions<InstanceType<B>>,
): UseBlocAdapterReturnWithoutSelector<InstanceType<B>>;

function useBlocAdapter<B extends BlocConstructor<BlocBase<any>>, R = any>(
  BlocClass: B,
  options: UseBlocAdapterOptions<InstanceType<B>, R> & {
    selector: Selector<BlocState<InstanceType<B>>, R>;
  },
): UseBlocAdapterReturnWithSelector<InstanceType<B>, R>;

function useBlocAdapter<B extends BlocConstructor<BlocBase<any>>, R = any>(
  BlocClass: B,
  options?: UseBlocAdapterOptions<InstanceType<B>, R>,
):
  | UseBlocAdapterReturnWithoutSelector<InstanceType<B>>
  | UseBlocAdapterReturnWithSelector<InstanceType<B>, R> {
  console.log(`[useBlocAdapter] 🔵 HOOK CALLED for ${BlocClass.name}`, {
    hasOptions: !!options,
    hasSelector: !!options?.selector,
    hasInstanceId: !!options?.instanceId,
    hasStaticProps: !!options?.staticProps,
    suspense: options?.suspense,
  });

  // Component reference that persists across React Strict Mode remounts
  const componentRef = useRef<object & { __blocInstanceId?: string }>({});

  // Stable subscription ID for auto-tracking
  const subscriptionIdRef = useRef<string>(
    `comp-${BlocClass.name}-${Math.random().toString(36).slice(2, 11)}`,
  );

  console.log(
    `[useBlocAdapter] 📌 Subscription ID: ${subscriptionIdRef.current}`,
  );

  // Determine instance ID for the bloc
  const instanceKey = useMemo(() => {
    console.log(`[useBlocAdapter] 🔑 Computing instanceKey...`);
    if (options?.instanceId) {
      console.log(
        `[useBlocAdapter] ✅ Using provided instanceId: ${options.instanceId}`,
      );
      return options.instanceId;
    }
    if (options?.staticProps) {
      const generated =
        generateInstanceIdFromProps(options.staticProps) || null;
      console.log(
        `[useBlocAdapter] ✅ Generated instanceId from props: ${generated}`,
      );
      return generated;
    }
    console.log(
      `[useBlocAdapter] ⚪ No instanceKey (will use isolated or default)`,
    );
    return null;
  }, [options?.instanceId, options?.staticProps]);

  // Generate stable ID for isolated blocs
  const base = BlocClass as unknown as { isolated?: boolean };
  if (
    base.isolated &&
    !options?.instanceId &&
    !componentRef.current.__blocInstanceId
  ) {
    const isolatedId = `adapter-${Math.random().toString(36).slice(2, 11)}`;
    componentRef.current.__blocInstanceId = isolatedId;
    console.log(
      `[useBlocAdapter] 🔒 Generated isolated bloc ID: ${isolatedId}`,
    );
  }

  const finalInstanceId = instanceKey || BlocClass.name;
  console.log(
    `[useBlocAdapter] 🎯 Final instance ID: ${finalInstanceId || '(default shared)'}`,
    {
      isIsolated: base.isolated,
      fromInstanceKey: !!instanceKey,
      fromComponentRef: !!componentRef.current.__blocInstanceId,
    },
  );

  // Get or create bloc instance from Blac registry
  const bloc = useMemo(() => {
    console.log(`[useBlocAdapter] 🏗️  Getting/creating bloc instance...`, {
      BlocClass: BlocClass.name,
      finalInstanceId,
      hasStaticProps: !!options?.staticProps,
    });
    const instance = Blac.getBloc(BlocClass, {
      constructorParams: options?.staticProps
        ? [options.staticProps]
        : undefined,
      instanceRef: finalInstanceId,
    });
    console.log(`[useBlocAdapter] ✅ Got bloc instance:`, {
      uid: instance.uid,
      name: instance._name,
      state: instance.state,
    });
    return instance as InstanceType<B>;
  }, [BlocClass, finalInstanceId, options?.staticProps]);

  // Track if we've initiated async loading (for Suspense)
  const hasInitiatedLoadRef = useRef(false);

  // Handle Suspense integration for async blocs
  if (options?.suspense) {
    console.log(`[useBlocAdapter] ⏳ Suspense mode enabled`);
    // Check if bloc is loading
    if (options.isLoading?.(bloc)) {
      console.log(
        `[useBlocAdapter] 🔄 Bloc is loading, checking for promise...`,
      );
      const loadingPromise = options.getLoadingPromise?.(bloc);
      if (loadingPromise) {
        console.log(
          `[useBlocAdapter] 🚀 Throwing loading promise to trigger Suspense`,
        );
        // Throw the promise to trigger Suspense boundary
        throw loadingPromise;
      }
    }

    // Start loading if needed (only once)
    if (
      options.loadAsync &&
      !options.isLoading?.(bloc) &&
      !hasInitiatedLoadRef.current
    ) {
      console.log(`[useBlocAdapter] 🎬 Starting async load (first time)`);
      hasInitiatedLoadRef.current = true;
      const loadPromise = options.loadAsync(bloc);
      if (loadPromise instanceof Promise) {
        console.log(
          `[useBlocAdapter] 🚀 Throwing load promise to trigger Suspense`,
        );
        // Throw to trigger Suspense
        throw loadPromise;
      }
    }
  }

  // Get or create adapter for this bloc
  const adapter = useMemo(() => {
    console.log(
      `[useBlocAdapter] 🔌 Getting/creating adapter for bloc ${bloc.uid}`,
    );
    const adapter = getOrCreateAdapter(bloc, subscriptionIdRef);
    console.log(`[useBlocAdapter] ✅ Got adapter`, {
      version: adapter.getVersion(),
      autoTrackingEnabled: adapter.isAutoTrackingEnabled(),
    });
    // NOTE: Removed pre-warming call - tracking now starts in getSnapshot (hybrid approach)
    // This allows tracking to work correctly with early getSnapshot calls before subscribe
    return adapter;
  }, [bloc]);

  // Create stable selector reference
  const selectorRef = useRef(options?.selector);
  selectorRef.current = options?.selector;
  if (selectorRef.current) {
    console.log(`[useBlocAdapter] 🎯 Using selector function`);
  }

  // Create stable compare function reference
  const compareRef = useRef(options?.compare);
  compareRef.current = options?.compare;
  if (compareRef.current) {
    console.log(`[useBlocAdapter] ⚖️  Using custom compare function`);
  }

  // Subscribe function for useSyncExternalStore
  // This is stable and properly integrates with React's subscription model
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      console.log(`[useBlocAdapter] 📡 SUBSCRIBE called`, {
        subscriptionId: subscriptionIdRef.current,
        hasSelector: !!selectorRef.current,
        hasCompare: !!compareRef.current,
      });

      // Subscribe to adapter with current selector, compare function, and subscription ID for auto-tracking
      const unsubscribe = adapter.subscribe(
        selectorRef.current,
        onStoreChange,
        compareRef.current,
        subscriptionIdRef.current,
      );

      console.log(
        `[useBlocAdapter] ✅ Subscription established for ${subscriptionIdRef.current}`,
      );

      // Return cleanup function
      return () => {
        console.log(
          `[useBlocAdapter] 🔌 UNSUBSCRIBE called for ${subscriptionIdRef.current}`,
        );

        // Note: Tracking completion happens in the effect after each render
        // Here we just clean up the subscription
        unsubscribe();
      };
    },
    [adapter],
  );

  // Snapshot function for useSyncExternalStore
  const getSnapshot = useCallback(() => {
    const snapshot = adapter.getSnapshot(
      selectorRef.current,
      subscriptionIdRef.current,
    );
    console.log(`[useBlocAdapter] 📸 getSnapshot called`, {
      subscriptionId: subscriptionIdRef.current,
      hasSelector: !!selectorRef.current,
      snapshot: typeof snapshot === 'object' ? '{...}' : snapshot,
    });
    return snapshot;
  }, []);

  // Server snapshot for SSR
  const getServerSnapshot = useCallback(() => {
    const snapshot = adapter.getServerSnapshot(selectorRef.current);
    console.log(`[useBlocAdapter] 🖥️  getServerSnapshot called`, {
      hasSelector: !!selectorRef.current,
      snapshot: typeof snapshot === 'object' ? '{...}' : snapshot,
    });
    return snapshot;
  }, []);

  // Subscribe to state changes using useSyncExternalStore
  console.log(`[useBlocAdapter] 🔗 Calling useSyncExternalStore...`);
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  console.log(`[useBlocAdapter] ✅ Got state from useSyncExternalStore`, {
    state: typeof state === 'object' ? '{...}' : state,
  });

  // Complete dependency tracking after each render
  // This ensures dependencies are captured before the next state change
  useEffect(() => {
    if (!options?.selector && adapter.isAutoTrackingEnabled()) {
      console.log(
        `[useBlocAdapter] 🎯 Completing dependency tracking after render for ${subscriptionIdRef.current}`,
      );
      adapter.completeDependencyTracking(subscriptionIdRef.current);
    }
  }); // No dependencies - runs after EVERY render

  // Mount/unmount lifecycle
  useEffect(() => {
    console.log(`[useBlocAdapter] 🎬 MOUNT effect triggered for ${bloc.uid}`, {
      subscriptionId: subscriptionIdRef.current,
      finalInstanceId,
    });

    // Call onMount callback if provided
    if (options?.onMount) {
      console.log(`[useBlocAdapter] 📞 Calling onMount callback`);
      options.onMount(bloc);
    }

    return () => {
      console.log(
        `[useBlocAdapter] 🛑 UNMOUNT cleanup triggered for ${bloc.uid}`,
        {
          subscriptionId: subscriptionIdRef.current,
          finalInstanceId,
        },
      );

      // Call onUnmount callback if provided
      if (options?.onUnmount) {
        console.log(`[useBlocAdapter] 📞 Calling onUnmount callback`);
        options.onUnmount(bloc);
      }

      // Handle isolated bloc cleanup
      const base = BlocClass as unknown as { isolated?: boolean };
      if (base.isolated && finalInstanceId) {
        const blacInstance = Blac.getInstance();
        const isolatedBloc =
          blacInstance.isolatedBlocIndex.get(finalInstanceId);

        console.log(`[useBlocAdapter] 🔒 Isolated bloc cleanup check`, {
          finalInstanceId,
          found: !!isolatedBloc,
          subscriptionCount: isolatedBloc?.subscriptionCount,
        });

        if (isolatedBloc && isolatedBloc.subscriptionCount === 0) {
          console.log(
            `[useBlocAdapter] ⏰ Scheduling isolated bloc disposal for ${finalInstanceId}`,
          );
          // Schedule disposal to handle any async cleanup
          setTimeout(() => {
            const bloc = blacInstance.isolatedBlocIndex.get(finalInstanceId);
            if (bloc && bloc.subscriptionCount === 0) {
              console.log(
                `[useBlocAdapter] 🗑️  Disposing isolated bloc ${finalInstanceId}`,
              );
              bloc.dispose();
              blacInstance.isolatedBlocIndex.delete(finalInstanceId);
              console.log(
                `[useBlocAdapter] ✅ Isolated bloc disposed and removed from index`,
              );
            } else {
              console.log(
                `[useBlocAdapter] ⏭️  Skipping disposal - subscription count changed`,
                {
                  subscriptionCount: bloc?.subscriptionCount,
                },
              );
            }
          }, 0);
        }
      }
    };
  }, [bloc.uid, finalInstanceId]);

  // Return state and bloc instance
  // Type is determined by overloads
  console.log(`[useBlocAdapter] 🎁 Returning [state, bloc]`, {
    blocUid: bloc.uid,
    blocName: bloc._name,
    hasSelector: !!options?.selector,
    stateType: typeof state,
  });
  return [state, bloc] as any;
}

export default useBlocAdapter;
