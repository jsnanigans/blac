/**
 * Unified useBloc Hook
 *
 * This is the new implementation using the Unified Dependency Tracking system.
 * It replaces the BlacAdapter with direct tracker integration.
 *
 * Key improvements:
 * - No async commit phase (synchronous tracking)
 * - Single cache layer (no split between adapter and subscription manager)
 * - Unified dependency handling (state, computed, custom)
 * - React Strict Mode compatible by design
 *
 * @module useBloc_Unified
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
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

/**
 * Type definition for the return type of the useBloc hook
 */
type HookTypes<B extends BlocConstructor<BlocBase<any>>> = [
  BlocState<InstanceType<B>>,
  InstanceType<B>,
];

/**
 * Generate a stable subscription ID for a component instance
 */
function generateSubscriptionId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Unified useBloc Hook
 *
 * React hook for integrating with Blac state management using the unified tracking system.
 *
 * @param blocConstructor - The Bloc class to instantiate
 * @param options - Configuration options
 * @returns Tuple of [state, bloc] with automatic dependency tracking
 *
 * @example
 * ```typescript
 * function Counter() {
 *   const [state, bloc] = useBloc_Unified(CounterBloc);
 *   // Accessing state.count automatically tracks it
 *   return <div>{state.count}</div>;
 * }
 * ```
 */
export function useBloc_Unified<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
  options?: {
    staticProps?: ConstructorParameters<B>[0];
    instanceId?: string;
    dependencies?: (bloc: InstanceType<B>) => unknown[];
    onMount?: (bloc: InstanceType<B>) => void;
    onUnmount?: (bloc: InstanceType<B>) => void;
  },
): HookTypes<B> {
  // Component reference that persists across React Strict Mode remounts
  const componentRef = useRef<object & { __blocInstanceId?: string }>({});

  // Generate stable subscription ID
  const subscriptionIdRef = useRef<string | null>(null);
  if (!subscriptionIdRef.current) {
    subscriptionIdRef.current = generateSubscriptionId('unified-sub');
  }
  const subscriptionId = subscriptionIdRef.current;

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

  // Get tracker instance
  const tracker = UnifiedDependencyTracker.getInstance();

  // Force update function for useSyncExternalStore
  const [, forceUpdate] = useState({});
  const notifyRef = useRef(() => {
    forceUpdate({});
  });

  // Create a stable wrapper function that delegates to the current notifyRef.
  // This ensures that the subscription always calls the correct callback,
  // even if state changes before useSyncExternalStore provides the final listener.
  // The wrapper is stable (created with useCallback), so React won't think
  // the subscribe function changed when we update notifyRef.current later.
  const notifyWrapper = useCallback(() => {
    notifyRef.current();
  }, []);

  // Eagerly create subscription to avoid timing issues
  // The subscription must exist BEFORE tracking proxies are accessed
  const subscriptionCreatedRef = useRef(false);
  if (!subscriptionCreatedRef.current) {
    // Pass the stable wrapper function instead of the callback directly.
    // This allows the wrapper to delegate to whatever notifyRef.current is at call time.
    tracker.createSubscription(subscriptionId, bloc.uid, notifyWrapper);
    subscriptionCreatedRef.current = true;

    // Handle custom dependencies if provided
    if (options?.dependencies) {
      const depsResult = options.dependencies(bloc);
      const dependency: CustomDependency = {
        type: 'custom',
        key: 'manual-deps',
        selector: options.dependencies as (bloc: BlocBase<any>) => any,
      };
      tracker.track(subscriptionId, dependency);
    }
  }

  // Subscribe function for useSyncExternalStore
  const subscribe = useMemo(() => {
    return (onStoreChange: () => void) => {
      // Update the notify callback reference. The notifyWrapper function
      // will delegate to this ref at call time, so no need to update the
      // subscription's notify property directly.
      notifyRef.current = onStoreChange;

      // Cleanup function - remove subscription
      return () => {
        tracker.removeSubscription(subscriptionId);
        subscriptionCreatedRef.current = false;
      };
    };
  }, [subscriptionId, bloc.uid]);

  // Snapshot function - returns current state
  const getSnapshot = useMemo(() => {
    return () => bloc.state;
  }, [bloc]);

  // Server snapshot (SSR) - returns initial state
  const getServerSnapshot = useMemo(() => {
    return () => bloc.state;
  }, [bloc]);

  // Subscribe to state changes using useSyncExternalStore
  const rawState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // For primitive state, we need to register a dependency on the entire state
  // because we can't track property access on primitives with a proxy
  useMemo(() => {
    if (!options?.dependencies && rawState != null && typeof rawState !== 'object') {
      // Register a dependency on the entire primitive state.
      // CRITICAL: Use bloc.state directly, not captured rawState from closure.
      // If we captured rawState, the selector would return stale values when state changes.
      const dependency: CustomDependency = {
        type: 'custom',
        key: 'primitive-state',
        selector: (bloc: BlocBase<any>) => bloc.state,
      };
      tracker.track(subscriptionId, dependency);
    }
  }, [subscriptionId, options?.dependencies]);

  // Create tracking proxy for bloc (getters only)
  // Only getters are tracked, state inside getters uses raw unproxied state
  const trackedBloc = useMemo(() => {
    // Only create tracking proxy if not using custom dependencies
    if (options?.dependencies) {
      // Custom dependencies - return raw bloc
      return bloc;
    }

    // Automatic tracking - wrap bloc to track getters only
    return createUnifiedTrackingProxy(bloc, subscriptionId);
  }, [bloc, subscriptionId, options?.dependencies]);

  // Create tracking proxy for state
  // This tracks direct state accesses by the component
  const trackedState = useMemo(() => {
    // Only create tracking proxy if not using custom dependencies
    if (options?.dependencies) {
      // Custom dependencies - return raw state
      return rawState;
    }

    // Automatic tracking - wrap state to track property accesses
    // But only if state is an object (not a primitive like number, string, etc)
    // Primitives cannot be proxied, so we return them as-is
    if (rawState != null && typeof rawState === 'object') {
      return createStateTrackingProxy(rawState, subscriptionId);
    }

    // For primitive state, return as-is (can't track primitive property access)
    return rawState;
  }, [rawState, subscriptionId, options?.dependencies]);

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
