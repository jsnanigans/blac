/**
 * useBloc - hook for BlaC state management in React with automatic proxy tracking
 *
 * @example
 * ```tsx
 * // Basic usage - automatic tracking of accessed properties
 * function Counter() {
 *   const [state, bloc] = useBloc(CounterBloc);
 *   return (
 *     <div>
 *       <p>Count: {state.count}</p>  // Only re-renders when count changes
 *       <button onClick={bloc.increment}>+</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useMemo, useSyncExternalStore, useEffect, useRef } from 'react';
import {
  type AnyObject,
  type BlocConstructor,
  StateContainer,
  type ExtractState,
  // Import tracking utilities from core
  type TrackerState,
  createTrackerState,
  startTracking,
  createProxy,
  captureTrackedPaths,
  hasChanges,
  hasTrackedData,
  shallowEqual,
} from '@blac/core';
import type { UseBlocOptions, UseBlocReturn, ComponentRef } from './types';

/**
 * StateContainer constructor with required static methods
 */
type StateContainerConstructor<TBloc extends StateContainer<any, any>> =
  BlocConstructor<TBloc> & {
    getOrCreate(instanceKey?: string, ...args: any[]): TBloc;
    release(instanceKey?: string): void;
  };

// ============================================================================
// Hook Support Functions
// ============================================================================

/**
 * Generates instance ID for isolated blocs
 */
function generateInstanceId(
  componentRef: ComponentRef,
  isIsolated: boolean,
  providedId?: string,
): string | undefined {
  if (providedId) return providedId;

  if (isIsolated) {
    if (!componentRef.__blocInstanceId) {
      componentRef.__blocInstanceId = `isolated-${Math.random().toString(36).slice(2, 11)}`;
    }
    return componentRef.__blocInstanceId;
  }

  return undefined;
}

/**
 * Determines tracking mode from options
 */
interface TrackingMode {
  useManualDeps: boolean;
  autoTrackEnabled: boolean;
}

function determineTrackingMode<
  TBloc extends StateContainer<AnyObject, AnyObject>,
>(options?: UseBlocOptions<TBloc>): TrackingMode {
  return {
    useManualDeps: options?.dependencies !== undefined,
    autoTrackEnabled: options?.autoTrack !== false,
  };
}

/**
 * Internal state for subscription and snapshot functions
 */
interface HookState<TBloc extends StateContainer<AnyObject, AnyObject>> {
  tracker: TrackerState<ExtractState<TBloc>> | null;
  manualDepsCache: unknown[] | null;
}

/**
 * Factory: Creates subscribe function for automatic proxy tracking mode
 */
function createAutoTrackSubscribe<
  TBloc extends StateContainer<AnyObject, AnyObject>,
>(
  instance: TBloc,
  hookState: HookState<TBloc>,
): (callback: () => void) => () => void {
  return (callback: () => void) => {
    return instance.subscribe(() => {
      const tracker =
        hookState.tracker ||
        (hookState.tracker = createTrackerState<ExtractState<TBloc>>());
      if (hasChanges(tracker, instance.state)) {
        callback();
      }
    });
  };
}

/**
 * Factory: Creates subscribe function for manual dependencies mode
 */
function createManualDepsSubscribe<
  TBloc extends StateContainer<AnyObject, AnyObject>,
>(
  instance: TBloc,
  hookState: HookState<TBloc>,
  options: UseBlocOptions<TBloc>,
): (callback: () => void) => () => void {
  return (callback: () => void) => {
    return instance.subscribe(() => {
      const newDeps = options.dependencies!(instance.state, instance);
      if (
        !hookState.manualDepsCache ||
        !shallowEqual(hookState.manualDepsCache, newDeps)
      ) {
        hookState.manualDepsCache = newDeps;
        callback();
      }
    });
  };
}

/**
 * Factory: Creates subscribe function for no-tracking mode
 */
function createNoTrackSubscribe<
  TBloc extends StateContainer<AnyObject, AnyObject>,
>(instance: TBloc): (callback: () => void) => () => void {
  return (callback: () => void) => instance.subscribe(callback);
}

/**
 * Factory: Creates getSnapshot function for automatic proxy tracking mode
 */
function createAutoTrackSnapshot<
  TBloc extends StateContainer<AnyObject, AnyObject>,
>(instance: TBloc, hookState: HookState<TBloc>): () => ExtractState<TBloc> {
  return () => {
    const tracker =
      hookState.tracker ||
      (hookState.tracker = createTrackerState<ExtractState<TBloc>>());

    if (hasTrackedData(tracker)) {
      captureTrackedPaths(tracker, instance.state);
    }

    startTracking(tracker);
    return createProxy(tracker, instance.state);
  };
}

/**
 * Factory: Creates getSnapshot function for manual dependencies mode
 */
function createManualDepsSnapshot<
  TBloc extends StateContainer<AnyObject, AnyObject>,
>(
  instance: TBloc,
  hookState: HookState<TBloc>,
  options: UseBlocOptions<TBloc>,
): () => ExtractState<TBloc> {
  return () => {
    hookState.manualDepsCache = options.dependencies!(instance.state, instance);
    return instance.state;
  };
}

/**
 * Factory: Creates getSnapshot function for no-tracking mode
 */
function createNoTrackSnapshot<
  TBloc extends StateContainer<AnyObject, AnyObject>,
>(instance: TBloc): () => ExtractState<TBloc> {
  return () => instance.state;
}

/**
 * Lifecycle: INITIAL MOUNT
 * 1. useMemo runs once - creates bloc, subscribeFn, getSnapshotFn
 * 2. useSyncExternalStore calls getSnapshotFn (1st time) - lazy creates tracker, starts tracking, returns proxy
 * 3. Component renders - proxy tracks property accesses
 * 4. useSyncExternalStore calls getSnapshotFn (2nd time) - captures tracked paths, starts new tracking, returns proxy
 * 5. useSyncExternalStore calls subscribeFn - sets up state change listener
 *
 * Lifecycle: STATE CHANGE
 * 1. Bloc state changes
 * 2. subscribeFn callback checks hasChanges() - only re-renders if tracked paths changed
 * 3. If re-render: getSnapshotFn captures previous paths, starts tracking, returns proxy
 *
 * Lifecycle: RE-RENDER (parent re-render)
 * 1. useMemo returns cached values (same bloc, subscribeFn, getSnapshotFn)
 * 2. useSyncExternalStore calls getSnapshotFn - captures paths, starts tracking, returns proxy
 */
export function useBloc<TBloc extends StateContainer<AnyObject, AnyObject>>(
  BlocClass: BlocConstructor<TBloc>,
  options?: UseBlocOptions<TBloc>,
): UseBlocReturn<TBloc> {
  // Component reference that persists across React Strict Mode remounts
  const componentRef = useRef<ComponentRef>({});

  const [bloc, subscribe, getSnapshot, instanceKey] = useMemo(() => {
    const isIsolated = (BlocClass as { isolated?: boolean }).isolated === true;
    const Constructor = BlocClass as StateContainerConstructor<TBloc>;

    // Generate instance key
    const instanceId = generateInstanceId(
      componentRef.current,
      isIsolated,
      options?.instanceId,
    );

    // Get or create bloc instance
    const instance = Constructor.getOrCreate(instanceId, options?.staticProps);

    // Determine tracking mode
    const { useManualDeps, autoTrackEnabled } = determineTrackingMode(options);

    // Mutable state shared between subscribe and getSnapshot
    const hookState: HookState<TBloc> = {
      tracker: null,
      manualDepsCache: null,
    };

    // Create subscribe and getSnapshot functions based on tracking mode
    let subscribeFn: (callback: () => void) => () => void;
    let getSnapshotFn: () => ExtractState<TBloc>;

    if (useManualDeps) {
      subscribeFn = createManualDepsSubscribe(instance, hookState, options!);
      getSnapshotFn = createManualDepsSnapshot(instance, hookState, options!);
    } else if (!autoTrackEnabled) {
      subscribeFn = createNoTrackSubscribe(instance);
      getSnapshotFn = createNoTrackSnapshot(instance);
    } else {
      subscribeFn = createAutoTrackSubscribe(instance, hookState);
      getSnapshotFn = createAutoTrackSnapshot(instance, hookState);
    }

    return [instance, subscribeFn, getSnapshotFn, instanceId] as const;
  }, [BlocClass]);

  const state = useSyncExternalStore(subscribe, getSnapshot);

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

      // Release bloc reference
      const Constructor = BlocClass as StateContainerConstructor<TBloc>;
      Constructor.release(instanceKey);
    };
  }, []);

  return [state, bloc, componentRef] as UseBlocReturn<TBloc>;
}

// Re-export types
export type { UseBlocOptions, UseBlocReturn } from './types';
