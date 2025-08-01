import {
  Blac,
  BlocBase,
  BlocConstructor,
  BlocState,
  generateUUID,
} from '@blac/core';
import { useMemo, useRef } from 'react';

interface ExternalStoreOptions<B extends BlocBase<any>> {
  id?: string;
  staticProps?: ConstructorParameters<BlocConstructor<B>>[0];
  selector?: (
    currentState: BlocState<B>,
    previousState: BlocState<B>,
    instance: B,
  ) => any[];
}

interface ExternalStore<T> {
  getSnapshot: () => T | undefined;
  subscribe: (listener: () => void) => () => void;
  getServerSnapshot?: () => T | undefined;
}

interface ExternalBlocStoreResult<B extends BlocBase<any>> {
  externalStore: ExternalStore<BlocState<B>>;
  instance: { current: B | null };
  usedKeys: { current: Set<string> };
  usedClassPropKeys: { current: Set<string> };
  rid: string;
}

/**
 * Hook for using an external bloc store
 * Provides low-level access to bloc instances for use with React's useSyncExternalStore
 */
export default function useExternalBlocStore<
  B extends BlocConstructor<BlocBase<any>>,
>(
  blocConstructor: B,
  options: ExternalStoreOptions<InstanceType<B>> = {},
): ExternalBlocStoreResult<InstanceType<B>> {
  const ridRef = useRef<string>(`external-${generateUUID()}`);
  const usedKeysRef = useRef<Set<string>>(new Set());
  const usedClassPropKeysRef = useRef<Set<string>>(new Set());
  const instanceRef = useRef<InstanceType<B> | null>(null);

  // Get or create bloc instance
  const bloc = useMemo(() => {
    const blac = Blac.getInstance();
    const base = blocConstructor as unknown as BlocBase<any>;

    // For isolated blocs, always create a new instance
    if (
      (base.constructor as any).isolated ||
      (blocConstructor as any).isolated
    ) {
      const newBloc = new blocConstructor(
        options?.staticProps,
      ) as InstanceType<B>;
      const uniqueId =
        options?.id || `${blocConstructor.name}_${generateUUID()}`;
      newBloc._id = uniqueId;
      blac.activateBloc(newBloc);
      return newBloc;
    }

    // For shared blocs, use the existing getBloc logic
    return blac.getBloc(blocConstructor, {
      id: options?.id,
      constructorParams: options?.staticProps,
    });
  }, [blocConstructor, options?.id]);

  // Create external store interface
  const externalStore = useMemo<ExternalStore<BlocState<InstanceType<B>>>>(
    () => ({
      getSnapshot: () => {
        const currentInstance = instanceRef.current;
        return currentInstance ? currentInstance.state : undefined;
      },
      subscribe: (listener: () => void) => {
        const currentInstance = instanceRef.current;
        if (!currentInstance) {
          // Return no-op unsubscribe if no instance
          return () => {};
        }

        // Wrap listener to handle errors gracefully
        const safeListener = (
          newState: BlocState<InstanceType<B>>,
          oldState: BlocState<InstanceType<B>>,
        ) => {
          try {
            // Reset tracking keys on each listener call
            usedKeysRef.current.clear();
            usedClassPropKeysRef.current.clear();

            // Call selector if provided
            if (options.selector && currentInstance) {
              options.selector(newState, oldState, currentInstance);
            }

            // Call listener with state if it expects it
            if (listener.length > 0) {
              (listener as any)(newState);
            } else {
              listener();
            }
          } catch (error) {
            console.error('Listener error in useExternalBlocStore:', error);
            // Don't rethrow to prevent breaking other listeners
          }
        };

        // Store the previous state for the listener
        let previousState = currentInstance.state;

        const unsubscribe = currentInstance.subscribe((state) => {
          const oldState = previousState;
          previousState = state;
          safeListener(state, oldState);
        });
        return unsubscribe;
      },
      getServerSnapshot: () => {
        const currentInstance = instanceRef.current;
        return currentInstance ? currentInstance.state : undefined;
      },
    }),
    [],
  );

  // Update instance ref
  instanceRef.current = bloc;

  return {
    externalStore,
    instance: instanceRef,
    usedKeys: usedKeysRef,
    usedClassPropKeys: usedClassPropKeysRef,
    rid: ridRef.current,
  };
}
