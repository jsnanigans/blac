import { Blac, BlacObserver, BlocBase, BlocBaseAbstract, BlocConstructor, BlocHookDependencyArrayFn, BlocState } from '@blac/core';
import { useCallback, useMemo, useRef } from 'react';
import { BlocHookOptions } from './useBloc';

export interface ExternalStore<
  B extends BlocConstructor<BlocBase<any>>
> {
  /**
   * Subscribes to changes in the store and returns an unsubscribe function.
   * @param onStoreChange - Callback function that will be called whenever the store changes
   * @returns A function that can be called to unsubscribe from store changes
   */
  subscribe: (onStoreChange: (state: BlocState<InstanceType<B>>) => void) => () => void;

  /**
   * Gets the current snapshot of the store state.
   * @returns The current state of the store
   */
  getSnapshot: () => BlocState<InstanceType<B>>;

  /**
   * Gets the server snapshot of the store state.
   * This is optional and defaults to the same value as getSnapshot.
   * @returns The server state of the store
   */
  getServerSnapshot?: () => BlocState<InstanceType<B>>;
}

export interface ExternalBlacStore<
  B extends BlocConstructor<BlocBase<any>>
> {
  usedKeys: React.RefObject<Set<string>>;
  usedClassPropKeys: React.RefObject<Set<string>>;
  externalStore: ExternalStore<B>;
  instance: React.RefObject<InstanceType<B>>;
  rid: string;
}

/**
 * Creates an external store that wraps a Bloc instance, providing a React-compatible interface
 * for subscribing to and accessing bloc state.
 */
const useExternalBlocStore = <
  B extends BlocConstructor<BlocBase<any>>
>(
  bloc: B,
  options: BlocHookOptions<InstanceType<B>> | undefined,
): ExternalBlacStore<B> => {
  const { id: blocId, props, selector } = options ?? {};

  const rid = useMemo(() => {
    return crypto.randomUUID();
  }, []);

  const base = bloc as unknown as BlocBaseAbstract;

  const isIsolated = base.isolated;
  const effectiveBlocId = isIsolated ? rid : blocId;

  const usedKeys = useRef<Set<string>>(new Set());
  const usedClassPropKeys = useRef<Set<string>>(new Set());

  const getBloc = useCallback(() => {
    return Blac.getBloc(bloc, {
      id: effectiveBlocId,
      props,
      instanceRef: rid
    });
  }, [bloc, props]);

  const blocInstance = useRef<InstanceType<B>>(getBloc());


  const dependencyArray: BlocHookDependencyArrayFn<BlocState<InstanceType<B>>> =
    useMemo(
      () =>
        (newState): ReturnType<BlocHookDependencyArrayFn<BlocState<InstanceType<B>>>> => {
          const instance = blocInstance.current;

          if (!instance) {
            return [];
          }

          // Use custom dependency selector if provided
          if (selector) {
            return selector(newState);
          }

          // Fall back to bloc's default dependency selector if available
          if (instance.defaultDependencySelector) {
            return instance.defaultDependencySelector(newState);
          }

          // For primitive states, use default selector
          if (typeof newState !== 'object') {
            // Default behavior for primitive states: re-render if the state itself changes.
            return [[newState]];
          }

          // For object states, track which properties were actually used
          const usedStateValues: string[] = [];
          for (const key of usedKeys.current) {
            if (key in newState) {
              usedStateValues.push(newState[key as keyof typeof newState]);
            }
          }

          // Track used class properties for dependency tracking, this enables rerenders when class getters change
          const usedClassValues: unknown[] = [];
          for (const key of usedClassPropKeys.current) {
            if (key in instance) {
              try {
                const value = instance[key as keyof InstanceType<B>];
                switch (typeof value) {
                  case 'function':
                    continue;
                  default:
                    usedClassValues.push(value);
                    continue;
                }
              } catch (error) {
                Blac.instance.log('useBloc Error', error);
              }
            }
          }

          return [usedStateValues, usedClassValues];
        },
      [],
    );

  const state: ExternalStore<B> = useMemo(() => {
    return {
      subscribe: (listener: (state: BlocState<InstanceType<B>>) => void) => {
        const observer: BlacObserver<BlocState<InstanceType<B>>> = {
          fn: () => {
            try {
              usedKeys.current = new Set();
              usedClassPropKeys.current = new Set();

              listener(blocInstance.current.state);
            } catch (e) {
              // Log any errors that occur during the listener callback
              // This ensures errors in listeners don't break the entire application
              Blac.error(
                'useExternalBlocStore listener error',
                e,
                blocInstance,
                dependencyArray,
              );
            }
          },
          // Pass the dependency array to control when the subscription is updated
          dependencyArray,
          // Use the provided id to identify this subscription
          id: rid,
        }

        Blac.activateBloc(blocInstance.current);

        // Subscribe to the bloc's observer with the provided listener function
        // This will trigger the callback whenever the bloc's state changes
        const unSub = blocInstance.current._observer.subscribe(observer);

        // Return an unsubscribe function that can be called to clean up the subscription
        return () => {
          unSub();
        };
      },
      // Return an immutable snapshot of the current bloc state
      getSnapshot: (): BlocState<InstanceType<B>> => blocInstance.current.state,
      // Server snapshot mirrors the client snapshot in this implementation
      getServerSnapshot: (): BlocState<InstanceType<B>> => blocInstance.current.state,
    }
  }, []);

  return {
    usedKeys,
    usedClassPropKeys,
    externalStore: state,
    instance: blocInstance,
    rid,
  };
};

export default useExternalBlocStore;
