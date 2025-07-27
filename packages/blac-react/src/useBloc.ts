import {
  AdapterOptions,
  BlacAdapter,
  BlocBase,
  BlocConstructor,
  BlocState,
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
  options?: AdapterOptions<InstanceType<B>>,
): HookTypes<B> {
  // Create a unique identifier for this hook instance
  const renderCount = useRef(0);
  renderCount.current++;

  const componentRef = useRef<object>({});

  // Track adapter creation
  const adapter = useMemo(() => {
    const newAdapter = new BlacAdapter<B>(
      {
        componentRef: componentRef,
        blocConstructor,
      },
      options,
    );
    return newAdapter;
  }, []);

  // Track options changes
  const optionsChangeCount = useRef(0);
  useEffect(() => {
    optionsChangeCount.current++;
    adapter.options = options;
  }, [options]);

  // Register as consumer and handle lifecycle
  const mountEffectCount = useRef(0);
  useEffect(() => {
    mountEffectCount.current++;
    adapter.mount();

    return () => {
      adapter.unmount();
    };
  }, [adapter.blocInstance]);

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
  }, [adapter.blocInstance]);

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
  }, [adapter.blocInstance]);

  // Mark consumer as rendered after each render
  useEffect(() => {
    adapter.updateLastNotified(componentRef.current);
  });

  // Log final hook return
  return [finalState, finalBloc];
}

export default useBloc;
