import {
  Blac,
  BlocBase,
  BlocConstructor,
  BlocState,
  InferPropsFromGeneric,
  generateUUID,
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
}

/**
 * React hook for integrating with Blac state management
 * 
 * Simplified implementation that:
 * - Creates or gets existing bloc instances
 * - Handles shared vs isolated blocs
 * - Manages subscriptions properly
 * - Supports lifecycle callbacks
 */
function useBloc<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
  options?: BlocHookOptions<InstanceType<B>>,
): HookTypes<B> {
  // Create stable references
  const consumerIdRef = useRef<string>(`react-${generateUUID()}`);
  const componentRef = useRef<object>({});
  const onMountCalledRef = useRef(false);
  
  // Get or create bloc instance
  const bloc = useMemo(() => {
    const blac = Blac.getInstance();
    const base = blocConstructor as unknown as BlocBase<any>;
    
    // For isolated blocs, always create a new instance
    if ((base.constructor as any).isolated || (blocConstructor as any).isolated) {
      const newBloc = new blocConstructor(options?.props) as InstanceType<B>;
      // Generate a unique ID for this isolated instance
      const uniqueId = options?.id || `${blocConstructor.name}_${generateUUID()}`;
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
  const state = useSyncExternalStore(
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
    () => bloc.state
  );
  
  return [state, bloc];
}

export default useBloc;