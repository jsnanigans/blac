import {
  Blac,
  BlocBase,
  BlocConstructor,
  BlocState,
  InferPropsFromGeneric,
  generateUUID,
  ConsumerTracker,
  ProxyFactory,
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
 * Configuration options for the useBloc hook
 */
export interface BlocHookOptions<B extends BlocBase<any>> {
  id?: string;
  selector?: (state: BlocState<B>, bloc: B) => any;
  props?: InferPropsFromGeneric<B>;
  onMount?: (bloc: B) => void;
  onUnmount?: (bloc: B) => void;
  /**
   * Enable proxy-based fine-grained dependency tracking
   * @default false
   */
  enableProxyTracking?: boolean;
}

/**
 * React hook for integrating with Blac state management
 *
 * Features:
 * - Fine-grained dependency tracking (only re-renders when accessed properties change)
 * - Automatic shared/isolated bloc handling
 * - Proper lifecycle management with onMount/onUnmount callbacks
 * - Support for custom selectors
 * - Nested object and array tracking
 */
function useBloc<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
  options?: BlocHookOptions<InstanceType<B>>,
): HookTypes<B> {
  // Create stable references
  const consumerIdRef = useRef<string>(`react-${generateUUID()}`);
  const componentRef = useRef<object>({});
  const onMountCalledRef = useRef(false);
  const consumerTrackerRef = useRef<ConsumerTracker | null>(null);

  // Get or create bloc instance
  const bloc = useMemo(() => {
    const blac = Blac.getInstance();
    const base = blocConstructor as unknown as BlocBase<any>;

    // For isolated blocs, always create a new instance
    if (
      (base.constructor as any).isolated ||
      (blocConstructor as any).isolated
    ) {
      const newBloc = new blocConstructor(options?.props) as InstanceType<B>;
      // Generate a unique ID for this isolated instance
      const uniqueId =
        options?.id || `${blocConstructor.name}_${generateUUID()}`;
      newBloc._updateId(uniqueId);

      // Register the isolated instance
      blac.activateBloc(newBloc);

      return newBloc;
    }

    // For shared blocs, use the existing getBloc logic
    return blac.getBloc(blocConstructor, {
      id: options?.id,
      props: options?.props,
    });
  }, [blocConstructor, options?.id]); // Only recreate if constructor or id changes

  // Initialize consumer tracker for fine-grained dependency tracking
  useEffect(() => {
    if (options?.enableProxyTracking === true && !options?.selector) {
      if (!consumerTrackerRef.current) {
        consumerTrackerRef.current = new ConsumerTracker();
        consumerTrackerRef.current.registerConsumer(
          consumerIdRef.current,
          componentRef.current,
        );
      }
    }

    return () => {
      if (consumerTrackerRef.current) {
        consumerTrackerRef.current.unregisterConsumer(consumerIdRef.current);
      }
    };
  }, [options?.enableProxyTracking, options?.selector]);

  // Register as consumer and handle lifecycle
  useEffect(() => {
    // Register this component as a consumer
    const consumerId = consumerIdRef.current;
    bloc._addConsumer(consumerId, componentRef.current);

    // Call onMount callback if provided
    if (!onMountCalledRef.current) {
      onMountCalledRef.current = true;
      options?.onMount?.(bloc);
    }

    return () => {
      // Unregister as consumer
      bloc._removeConsumer(consumerId);

      // Call onUnmount callback
      options?.onUnmount?.(bloc);
    };
  }, [bloc]); // Only re-run if bloc instance changes

  // Subscribe to state changes using useSyncExternalStore
  const rawState = useSyncExternalStore(
    // Subscribe function
    (onStoreChange) => {
      const unsubscribe = bloc._observer.subscribe({
        id: consumerIdRef.current,
        fn: () => onStoreChange(),
      });
      return unsubscribe;
    },
    // Get snapshot
    () => bloc.state,
    // Get server snapshot (same as client for now)
    () => bloc.state,
  );

  // Create proxies for fine-grained tracking (if enabled)
  const proxyState = useMemo(() => {
    if (
      options?.selector ||
      options?.enableProxyTracking !== true ||
      !consumerTrackerRef.current
    ) {
      return rawState;
    }

    // Reset tracking before each render
    consumerTrackerRef.current.resetConsumerTracking(componentRef.current);

    return ProxyFactory.createStateProxy(
      rawState as any,
      componentRef.current,
      consumerTrackerRef.current,
    );
  }, [rawState, options?.selector, options?.enableProxyTracking]);

  const proxyBloc = useMemo(() => {
    if (
      options?.selector ||
      options?.enableProxyTracking !== true ||
      !consumerTrackerRef.current
    ) {
      return bloc;
    }

    return ProxyFactory.createClassProxy(
      bloc,
      componentRef.current,
      consumerTrackerRef.current,
    );
  }, [bloc, options?.selector, options?.enableProxyTracking]);

  // Apply selector if provided
  const finalState = useMemo(() => {
    if (options?.selector) {
      return options.selector(rawState, bloc);
    }
    return proxyState;
  }, [rawState, bloc, proxyState, options?.selector]);

  return [finalState, proxyBloc];
}

export default useBloc;
