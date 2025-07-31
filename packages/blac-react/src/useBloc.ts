import {
  BlacAdapter,
  BlocBase,
  BlocConstructor,
  BlocState,
  generateInstanceIdFromProps,
} from '@blac/core';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

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
    dependencies?: (bloc: InstanceType<B>) => unknown[];
    onMount?: (bloc: InstanceType<B>) => void;
    onUnmount?: (bloc: InstanceType<B>) => void;
  },
): HookTypes<B> {
  // Create a unique identifier for this hook instance
  const renderCount = useRef(0);
  renderCount.current++;

  const componentRef = useRef<object>({});

  // Pass through options
  const normalizedOptions = options;

  // Generate instance id from static props if needed
  const instanceKey = useMemo(() => {
    if (normalizedOptions?.instanceId) {
      return normalizedOptions.instanceId;
    }
    if (normalizedOptions?.staticProps) {
      return generateInstanceIdFromProps(normalizedOptions.staticProps) || null;
    }
    return null;
  }, [normalizedOptions?.instanceId, normalizedOptions?.staticProps]);

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
  }, [blocConstructor, instanceKey]); // Recreate adapter when instance key changes

  // Reset tracking at the start of each render to ensure we only track
  // properties accessed during the current render
  adapter.resetConsumerTracking();

  // Update adapter options when they change (except instanceId/staticProps which recreate the adapter)
  const optionsChangeCount = useRef(0);
  useEffect(() => {
    optionsChangeCount.current++;
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

  // Register as consumer and handle lifecycle
  const mountEffectCount = useRef(0);
  useEffect(() => {
    mountEffectCount.current++;
    adapter.mount();

    return () => {
      adapter.unmount();
    };
  }, [adapter]);

  // Subscribe to state changes using useSyncExternalStore
  const subscribeMemoCount = useRef(0);
  const subscribe = useMemo(() => {
    subscribeMemoCount.current++;
    let subscriptionCount = 0;

    return (onStoreChange: () => void) => {
      subscriptionCount++;
      const unsubscribe = adapter.createSubscription({
        onChange: () => {
          onStoreChange();
        },
      });

      return () => {
        unsubscribe();
      };
    };
  }, [adapter]);

  const snapshotCount = useRef(0);
  const serverSnapshotCount = useRef(0);

  const rawState: BlocState<InstanceType<B>> = useSyncExternalStore(
    subscribe,
    // Get snapshot
    () => {
      snapshotCount.current++;
      const bloc = adapter.blocInstance;
      const state = bloc.state;
      return state;
    },
    // Get server snapshot (same as client for now)
    () => {
      const bloc = adapter.blocInstance;
      serverSnapshotCount.current++;
      const state = bloc.state;
      return state;
    },
  );

  // Create proxies for fine-grained tracking (if enabled)
  const stateMemoCount = useRef(0);
  const finalState = useMemo(() => {
    stateMemoCount.current++;
    const proxyState = adapter.getProxyState(rawState);
    return proxyState;
  }, [rawState]);

  const blocMemoCount = useRef(0);
  const finalBloc = useMemo(() => {
    blocMemoCount.current++;
    const proxyBloc = adapter.getProxyBlocInstance();
    return proxyBloc;
  }, [adapter]);

  // Mark consumer as rendered after each render
  useEffect(() => {
    adapter.updateLastNotified(componentRef.current);
  });

  // Log final hook return
  return [finalState, finalBloc];
}

export default useBloc;
