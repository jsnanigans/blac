import {
  Blac,
  BlocBase,
  BlocConstructor,
  BlocState,
  InferPropsFromGeneric,
  generateUUID,
} from '@blac/core';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { ReactAdapter } from './ReactAdapter';

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

  // Create adapter instance
  const adapter = useMemo(() => {
    return new ReactAdapter(bloc, {
      consumerId: consumerIdRef.current,
      consumerRef: componentRef.current,
      hooks: {
        onMount: options?.onMount,
        onUnmount: options?.onUnmount,
      },
      enableProxyTracking: options?.enableProxyTracking,
      selector: options?.selector,
    });
  }, [bloc]);
  
  // Handle cleanup
  useEffect(() => {
    return () => {
      adapter.cleanup();
    };
  }, [adapter]);

  // Use adapter with useSyncExternalStore
  const state = useSyncExternalStore(
    adapter.subscribe,
    adapter.getSnapshot,
    adapter.getServerSnapshot,
  );

  // Get proxied bloc instance from adapter
  const blocProxy = useMemo(() => {
    return adapter.getBlocProxy();
  }, [adapter]);

  return [state, blocProxy];
}

export default useBloc;
