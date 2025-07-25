import {
  AdapterOptions,
  Blac,
  BlacAdapter,
  BlocBase,
  BlocConstructor,
  BlocState,
  InferPropsFromGeneric,
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
  const componentRef = useRef<object>({});
  const adapter = useMemo(
    () =>
      new BlacAdapter<B>(
        {
          componentRef: componentRef,
          blocConstructor,
        },
        options,
      ),
    [],
  );

  useEffect(() => {
    adapter.options = options;
  }, [options]);

  const bloc = adapter.blocInstance;

  // Register as consumer and handle lifecycle
  useEffect(() => {
    adapter.mount();
    return adapter.unmount;
  }, [bloc]);

  // Subscribe to state changes using useSyncExternalStore
  const subscribe = useMemo(
    () => (onStoreChange: () => void) =>
      adapter.createSubscription({
        onChange: onStoreChange,
      }),
    [bloc],
  );

  const rawState: BlocState<InstanceType<B>> = useSyncExternalStore(
    subscribe,
    // Get snapshot
    () => bloc.state,
    // Get server snapshot (same as client for now)
    () => bloc.state,
  );

  // Create proxies for fine-grained tracking (if enabled)
  const finalState = useMemo(
    () => adapter.getProxyState(rawState),
    [rawState, options?.selector],
  );

  const finalBloc = useMemo(
    () => adapter.getProxyBlocInstance(),
    [bloc, options?.selector],
  );

  return [finalState, finalBloc];
}

export default useBloc;
