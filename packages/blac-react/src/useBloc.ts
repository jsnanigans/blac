import {
  Blac,
  BlacAdapter,
  BlocBase,
  BlocConstructor,
  BlocState,
  generateInstanceIdFromProps,
} from '@blac/core';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useBloc_Unified } from './useBloc_Unified';

/**
 * Type definition for the return type of the useBloc hook
 */
type HookTypes<B extends BlocConstructor<BlocBase<any>>> = [
  BlocState<InstanceType<B>>,
  InstanceType<B>,
];

/**
 * React hook for integrating with Blac state management (Legacy)
 *
 * This is the legacy implementation using BlacAdapter.
 * When useUnifiedTracking feature flag is enabled, this delegates to useBloc_Unified.
 */
function useBloc_Legacy<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
  options?: {
    staticProps?: ConstructorParameters<B>[0];
    instanceId?: string;
    dependencies?: (
      bloc: InstanceType<B>,
    ) => unknown[] | Generator<unknown, void, unknown>;
    onMount?: (bloc: InstanceType<B>) => void;
    onUnmount?: (bloc: InstanceType<B>) => void;
  },
): HookTypes<B> {
  // Persists across React strict mode remounts
  const componentRef = useRef<object & { __blocInstanceId?: string }>({});

  const normalizedOptions = options;

  // Generate instance key from props or instanceId
  const instanceKey = useMemo(() => {
    if (normalizedOptions?.instanceId) {
      return normalizedOptions.instanceId;
    }
    if (normalizedOptions?.staticProps) {
      return generateInstanceIdFromProps(normalizedOptions.staticProps) || null;
    }
    return null;
  }, [normalizedOptions?.instanceId, normalizedOptions?.staticProps]);

  // Generate stable ID for isolated blocs
  const base = blocConstructor as unknown as { isolated?: boolean };
  if (
    base.isolated &&
    !normalizedOptions?.instanceId &&
    !componentRef.current.__blocInstanceId
  ) {
    componentRef.current.__blocInstanceId = `component-${Math.random().toString(36).slice(2, 11)}`;
  }

  // Track adapter creation - recreate when instanceId/staticProps change
  const adapter = useMemo(() => {
    const newAdapter = new BlacAdapter<B>(
      {
        componentRef: componentRef,
        blocConstructor,
      },
      {
        instanceId: normalizedOptions?.instanceId,
        dependencies: normalizedOptions?.dependencies,
        staticProps: normalizedOptions?.staticProps,
        onMount: normalizedOptions?.onMount,
        onUnmount: normalizedOptions?.onUnmount,
      },
    );

    return newAdapter;
  }, [blocConstructor, instanceKey]);

  // Reset tracking for current render
  adapter.resetTracking();

  adapter.notifyRender();

  // Update adapter options on change
  useEffect(() => {
    adapter.options = {
      instanceId: normalizedOptions?.instanceId,
      dependencies: normalizedOptions?.dependencies,
      staticProps: normalizedOptions?.staticProps,
      onMount: normalizedOptions?.onMount,
      onUnmount: normalizedOptions?.onUnmount,
    };
  }, [
    adapter,
    normalizedOptions?.dependencies,
    normalizedOptions?.onMount,
    normalizedOptions?.onUnmount,
  ]);

  // Mount/unmount lifecycle
  useEffect(() => {
    adapter.mount();

    return () => {
      adapter.unmount();
    };
  }, [adapter]);

  // Subscribe to state changes using adapter's useSyncExternalStore integration
  // Note: All functions must be memoized to avoid re-subscriptions on every render
  const subscribe = useMemo(() => adapter.getSubscribe(), [adapter]);

  const rawState: BlocState<InstanceType<B>> = useSyncExternalStore(
    subscribe,
    adapter.getSnapshot,
    adapter.getServerSnapshot,
  );

  const finalState = useMemo(
    () => adapter.getStateProxy(),
    [rawState, adapter],
  );

  const finalBloc = useMemo(() => adapter.getBlocProxy(), [adapter]);

  // Commit tracked dependencies after render
  useEffect(() => {
    adapter.commitTracking();
  });

  return [finalState, finalBloc];
}

/**
 * React hook for integrating with Blac state management
 *
 * This is the main entry point that switches between legacy and unified implementations
 * based on the useUnifiedTracking feature flag.
 *
 * @param blocConstructor - The Bloc class to instantiate
 * @param options - Configuration options
 * @returns Tuple of [state, bloc] with automatic dependency tracking
 *
 * @example
 * ```typescript
 * function Counter() {
 *   const [state, bloc] = useBloc(CounterBloc);
 *   return <div onClick={bloc.increment}>{state.count}</div>;
 * }
 * ```
 */
function useBloc<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
  options?: {
    staticProps?: ConstructorParameters<B>[0];
    instanceId?: string;
    dependencies?: (
      bloc: InstanceType<B>,
    ) => unknown[] | Generator<unknown, void, unknown>;
    onMount?: (bloc: InstanceType<B>) => void;
    onUnmount?: (bloc: InstanceType<B>) => void;
  },
): HookTypes<B> {
  // Use unified tracking system by default (now the standard)
  const useUnified = true

  if (useUnified) {
    // Unified tracking system (default)
    // Note: Generator-style dependencies converted to arrays
    if (options?.dependencies) {
      const legacyDeps = options.dependencies;
      const unifiedOptions = {
        ...options,
        dependencies: (bloc: InstanceType<B>) => {
          const result = legacyDeps(bloc);
          // If it's a generator, consume it to an array
          if (result && typeof result === 'object' && 'next' in result) {
            return Array.from(result as Generator<unknown, void, unknown>);
          }
          return result as unknown[];
        },
      };
      return useBloc_Unified(blocConstructor, unifiedOptions);
    }
    // No dependencies - pass options with proper type
    const unifiedOptions = options ? {
      staticProps: options.staticProps,
      instanceId: options.instanceId,
      onMount: options.onMount,
      onUnmount: options.onUnmount,
    } : undefined;
    return useBloc_Unified(blocConstructor, unifiedOptions);
  } else {
    // Legacy BlacAdapter system (fallback only)
    return useBloc_Legacy(blocConstructor, options);
  }
}

export default useBloc;
