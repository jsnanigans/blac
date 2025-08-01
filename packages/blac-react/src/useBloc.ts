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
 * React hook for integrating with Blac state management - v3 generator-based
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
  const componentRef = useRef<object>({});

  // Generate instance key from options
  const instanceKey = useMemo(() => {
    if (options?.instanceId) {
      return options.instanceId;
    }
    if (options?.staticProps) {
      return generateInstanceIdFromProps(options.staticProps) || null;
    }
    return null;
  }, [options?.instanceId, options?.staticProps]);

  // Create adapter (recreate when instance key changes)
  const adapter = useMemo(() => {
    return new BlacAdapter<B>(
      {
        componentRef: componentRef,
        blocConstructor,
      },
      {
        instanceId: options?.instanceId,
        dependencies: options?.dependencies,
        staticProps: options?.staticProps,
        onMount: options?.onMount,
        onUnmount: options?.onUnmount,
      },
    );
  }, [blocConstructor, instanceKey]);

  // Reset tracking at the start of each render
  adapter.resetConsumerTracking();

  // Update adapter options when they change (except instanceId/staticProps which recreate the adapter)
  useEffect(() => {
    adapter.options = {
      instanceId: options?.instanceId,
      dependencies: options?.dependencies,
      staticProps: options?.staticProps,
      onMount: options?.onMount,
      onUnmount: options?.onUnmount,
    };
  }, [
    adapter,
    options?.dependencies,
    options?.onMount,
    options?.onUnmount,
  ]);

  // Mount/unmount lifecycle
  useEffect(() => {
    adapter.mount();
    return () => {
      adapter.unmount();
    };
  }, [adapter]);

  // Subscribe to state changes using generator
  const subscribe = useMemo(() => {
    return (onStoreChange: () => void) => {
      let cancelled = false;
      const abortController = new AbortController();

      (async () => {
        try {
          for await (const newState of adapter.createStateStream()) {
            if (abortController.signal.aborted || cancelled) break;
            onStoreChange();
          }
        } catch (error) {
          if (!cancelled) {
            console.error('State stream error:', error);
          }
        }
      })();

      return () => {
        cancelled = true;
        abortController.abort();
      };
    };
  }, [adapter]);

  // Use React's concurrent mode-safe hook
  const rawState: BlocState<InstanceType<B>> = useSyncExternalStore(
    subscribe,
    () => adapter.blocInstance.state,
    () => adapter.blocInstance.state, // Server snapshot
  );

  // Create proxies for fine-grained tracking
  const finalState = useMemo(() => {
    return adapter.getProxyState(rawState);
  }, [rawState, adapter]);

  const finalBloc = useMemo(() => {
    return adapter.getProxyBlocInstance();
  }, [adapter]);

  // Mark consumer as rendered after each render
  useEffect(() => {
    adapter.updateLastNotified(componentRef.current);
  });

  return [finalState, finalBloc];
}

export default useBloc;