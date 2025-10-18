import {
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

/**
 * Type definition for the return type of the useBloc hook
 */
type HookTypes<B extends BlocConstructor<BlocBase<any>>> = [
  BlocState<InstanceType<B>>,
  InstanceType<B>,
];

/**
 * React hook for integrating with Blac state management
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

export default useBloc;
