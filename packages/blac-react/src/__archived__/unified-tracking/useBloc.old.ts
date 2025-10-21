/**
 * useBloc Hook
 *
 * React hook for integrating with Blac state management using the Unified Dependency Tracking system.
 *
 * Key improvements over legacy adapter-based approach:
 * - No async commit phase (synchronous tracking)
 * - Single cache layer (no split between adapter and subscription manager)
 * - Unified dependency handling (state, computed, custom)
 * - React Strict Mode compatible by design
 *
 * @module useBloc
 */

import {
  Blac,
  BlocBase,
  BlocConstructor,
  BlocState,
  generateInstanceIdFromProps,
  UnifiedDependencyTracker,
  createUnifiedTrackingProxy,
  createStateTrackingProxy,
} from '@blac/core';
import type { CustomDependency } from '@blac/core';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  useTransition,
} from 'react';

/**
 * Type definition for the return type of the useBloc hook
 */
type HookTypes<B extends BlocConstructor<BlocBase<any>>> = [
  BlocState<InstanceType<B>>,
  InstanceType<B>,
];

/**
 * Options for async bloc loading with Suspense
 */
interface AsyncLoadOptions<B extends BlocBase<any>> {
  /** Enable Suspense integration */
  suspense?: boolean;
  /** Async initialization function */
  loadAsync?: (bloc: B) => Promise<void>;
  /** Check if bloc is currently loading */
  isLoading?: (bloc: B) => boolean;
  /** Get the loading promise for Suspense */
  getLoadingPromise?: (bloc: B) => Promise<void> | null;
}

/**
 * Generate a stable subscription ID for a component instance
 */
function generateSubscriptionId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Generate a stable render context ID
 */
function generateRenderContextId(subscriptionId: string, mode: 'sync' | 'concurrent'): string {
  return mode === 'concurrent'
    ? `${subscriptionId}-concurrent-${Date.now()}`
    : `${subscriptionId}-sync`;
}

/**
 * Hook to detect concurrent rendering context
 */
function useConcurrentContext() {
  // Check if we're in a transition
  const [isPending] = useTransition();

  return {
    isTransition: isPending,
    renderMode: (isPending ? 'concurrent' : 'sync') as 'concurrent' | 'sync',
  };
}

/**
 * useBloc Hook
 *
 * React hook for integrating with Blac state management using the unified tracking system.
 *
 * @param blocConstructor - The Bloc class to instantiate
 * @param options - Configuration options including Suspense support
 * @returns Tuple of [state, bloc] with automatic dependency tracking
 *
 * @example
 * ```typescript
 * function Counter() {
 *   const [state, bloc] = useBloc(CounterBloc);
 *   // Accessing state.count automatically tracks it
 *   return <div>{state.count}</div>;
 * }
 * ```
 */
function useBloc<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
  options?: {
    staticProps?: ConstructorParameters<B>[0];
    instanceId?: string;
    dependencies?: (bloc: InstanceType<B>) => unknown[];
    onMount?: (bloc: InstanceType<B>) => void;
    onUnmount?: (bloc: InstanceType<B>) => void;
  } & AsyncLoadOptions<InstanceType<B>>,
): HookTypes<B> {
  // Component reference that persists across React Strict Mode remounts
  const componentRef = useRef<object & { __blocInstanceId?: string }>({});

  // Generate stable subscription ID (once per component instance)
  const subscriptionIdRef = useRef<string | null>(null);
  if (!subscriptionIdRef.current) {
    subscriptionIdRef.current = generateSubscriptionId('unified-sub');
  }
  const subscriptionId = subscriptionIdRef.current;

  // Detect concurrent rendering context
  const concurrentContext = useConcurrentContext();

  // Generate stable render context that only changes for concurrent features
  const renderContextRef = useRef<string>(generateRenderContextId(subscriptionId, 'sync'));
  if (concurrentContext.renderMode === 'concurrent') {
    // New context for each concurrent render
    renderContextRef.current = generateRenderContextId(subscriptionId, 'concurrent');
  } else if (!renderContextRef.current) {
    // Stable context for sync renders (created once)
    renderContextRef.current = generateRenderContextId(subscriptionId, 'sync');
  }
  const renderContext = renderContextRef.current;

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
  const base = blocConstructor as unknown as { isolated?: boolean };
  if (
    base.isolated &&
    !options?.instanceId &&
    !componentRef.current.__blocInstanceId
  ) {
    componentRef.current.__blocInstanceId = `component-${Math.random().toString(36).slice(2, 11)}`;
  }

  const finalInstanceId = instanceKey || componentRef.current.__blocInstanceId;

  // Get or create bloc instance from Blac registry
  const bloc = useMemo(() => {
    const instance = Blac.getBloc(blocConstructor, {
      constructorParams: options?.staticProps ? [options.staticProps] : undefined,
      instanceRef: finalInstanceId,
    });
    return instance as InstanceType<B>;
  }, [blocConstructor, finalInstanceId, options?.staticProps]);

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

    // Start loading if needed
    if (options.loadAsync && !options.isLoading?.(bloc)) {
      const loadPromise = options.loadAsync(bloc);
      if (loadPromise instanceof Promise) {
        // Throw to trigger Suspense
        throw loadPromise;
      }
    }
  }

  // Get tracker instance
  const tracker = UnifiedDependencyTracker.getInstance();

  // Track whether we've created the subscription skeleton
  const subscriptionCreatedRef = useRef(false);

  // Phase 1: Create subscription skeleton (once, in first render)
  // This ensures subscription exists when we start tracking
  // Check both the ref AND if subscription actually exists (for Strict Mode)
  const subscriptionExists = tracker.getSubscription(subscriptionId);
  if (!subscriptionExists) {
    // Create with empty notify callback initially
    console.log(`[useBloc] Creating subscription ${subscriptionId} for bloc ${bloc.uid} (${bloc._name})`);
    Blac.log(`[useBloc] Creating subscription ${subscriptionId} for bloc ${bloc.uid} (${bloc._name})`);
    tracker.createSubscription(subscriptionId, bloc.uid, () => {});
    subscriptionCreatedRef.current = true;

    // Handle custom dependencies if provided
    if (options?.dependencies) {
      const dependency: CustomDependency = {
        type: 'custom',
        key: 'manual-deps',
        selector: options.dependencies as (bloc: BlocBase<any>) => any,
      };
      tracker.track(subscriptionId, dependency, renderContext);
    }
  }

  // Phase 2: Subscribe function for useSyncExternalStore
  // This properly integrates with React's subscription model
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // Ensure subscription exists (might have been removed by Strict Mode)
      const subscription = tracker.getSubscription(subscriptionId);
      if (!subscription) {
        // Re-create subscription if it was removed (Strict Mode case)
        console.log(`[useBloc] Re-creating subscription ${subscriptionId} in subscribe callback`);
        tracker.createSubscription(subscriptionId, bloc.uid, onStoreChange);
        subscriptionCreatedRef.current = true;

        // Re-track custom dependencies if needed
        if (options?.dependencies) {
          const dependency: CustomDependency = {
            type: 'custom',
            key: 'manual-deps',
            selector: options.dependencies as (bloc: BlocBase<any>) => any,
          };
          tracker.track(subscriptionId, dependency, renderContext);
        }

        // Need to re-track dependencies for re-created subscription
        // Force a re-render to capture dependencies
        onStoreChange();
      } else {
        // Update the subscription with the real notify callback
        tracker.updateNotifyCallback(subscriptionId, onStoreChange);
      }

      // Cleanup function - reset to empty callback
      return () => {
        // Don't remove subscription here - just reset the callback
        // The subscription will be removed in the useEffect cleanup
        const sub = tracker.getSubscription(subscriptionId);
        if (sub) {
          tracker.updateNotifyCallback(subscriptionId, () => {});
        }
      };
    },
    [subscriptionId, tracker, bloc.uid, options?.dependencies, renderContext]
  );

  // Update subscription if bloc instance changes (Strict Mode with isolated blocs)
  useEffect(() => {
    const subscription = tracker.getSubscription(subscriptionId);
    if (subscription && subscription.blocId !== bloc.uid) {
      // Bloc instance changed (happens in Strict Mode with isolated blocs)
      Blac.log(`[useBloc] Bloc instance changed for ${subscriptionId}, updating from ${subscription.blocId} to ${bloc.uid}`);
      tracker.updateSubscriptionBlocId(subscriptionId, bloc.uid);
    }
  }, [bloc.uid, subscriptionId, tracker]);

  // Phase 3: Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      // Clean up subscription
      console.log(`[useBloc] Removing subscription ${subscriptionId}`);
      tracker.removeSubscription(subscriptionId);
      subscriptionCreatedRef.current = false;
      // Reset to sync context for potential remount
      renderContextRef.current = generateRenderContextId(subscriptionId, 'sync');

      // Handle isolated bloc cleanup
      const base = blocConstructor as unknown as { isolated?: boolean };
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
  }, [subscriptionId, tracker, blocConstructor, finalInstanceId]);

  // Snapshot functions
  const getSnapshot = useCallback(() => bloc.state, [bloc]);
  const getServerSnapshot = useCallback(() => bloc.state, [bloc]);

  // Subscribe to state changes using useSyncExternalStore
  const rawState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Start and commit render tracking
  // Use useLayoutEffect for synchronous tracking to handle transitions
  // Start tracking before render
  if (!options?.dependencies && subscriptionExists) {
    tracker.startRenderTracking(subscriptionId, renderContext);
    Blac.log(`[useBloc] Started tracking for ${subscriptionId}, context: ${renderContext}`);
  }

  // Commit tracking after render completes
  useLayoutEffect(() => {
    if (!options?.dependencies && tracker.getSubscription(subscriptionId)) {
      // Commit the tracked dependencies immediately
      tracker.commitRenderTracking(subscriptionId, renderContext);
      const sub = tracker.getSubscription(subscriptionId);
      Blac.log(`[useBloc] Committed tracking for ${subscriptionId}, deps: ${sub?.dependencies.length || 0}`);
    }
  });

  // For primitive state, register a dependency on the entire state
  useMemo(() => {
    if (!options?.dependencies && rawState != null && typeof rawState !== 'object') {
      const dependency: CustomDependency = {
        type: 'custom',
        key: 'primitive-state',
        selector: (bloc: BlocBase<any>) => bloc.state,
      };
      tracker.track(subscriptionId, dependency, renderContext);
    }
  }, [subscriptionId, options?.dependencies, renderContext, tracker, rawState]);

  // Create tracking proxy for bloc (getters only)
  // Only getters are tracked, state inside getters uses raw unproxied state
  const trackedBloc = useMemo(() => {
    if (options?.dependencies) {
      return bloc;
    }
    // Pass stable render context for tracking
    return createUnifiedTrackingProxy(bloc, subscriptionId, renderContext);
  }, [bloc, subscriptionId, options?.dependencies, renderContext]);

  // Create tracking proxy for state
  // This tracks direct state accesses by the component
  const trackedState = useMemo(() => {
    if (options?.dependencies) {
      return rawState;
    }
    if (rawState != null && typeof rawState === 'object') {
      // Pass stable render context for tracking
      return createStateTrackingProxy(rawState, subscriptionId, '', renderContext);
    }
    return rawState;
  }, [rawState, subscriptionId, options?.dependencies, renderContext]);

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
    };
  }, [bloc.uid, options?.onMount, options?.onUnmount]);

  // Return state proxy and bloc proxy
  // State proxy tracks direct state accesses
  // Bloc proxy tracks getter accesses (getters use raw state internally)
  return [trackedState, trackedBloc];
}

export default useBloc;
