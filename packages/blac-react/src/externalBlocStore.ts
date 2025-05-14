/* eslint-disable @typescript-eslint/no-explicit-any */
import { BlocBase, BlocConstructor, BlocHookDependencyArrayFn, BlocState } from '../../blac/src';

/**
 * Interface defining an external store that can be used to subscribe to and access bloc state.
 * This interface follows the React external store pattern for state management.
 * 
 * @template B - The type of the Bloc instance
 * @template S - The type of the Bloc state
 */
export interface ExternalStore<
  B extends InstanceType<BlocConstructor<any>>
> {
  /**
   * Subscribes to changes in the store and returns an unsubscribe function.
   * @param onStoreChange - Callback function that will be called whenever the store changes
   * @returns A function that can be called to unsubscribe from store changes
   */
  subscribe: (onStoreChange: (state: BlocState<B>) => void) => () => void;

  /**
   * Gets the current snapshot of the store state.
   * @returns The current state of the store
   */
  getSnapshot: () => BlocState<B>;

  /**
   * Gets the server snapshot of the store state.
   * This is optional and defaults to the same value as getSnapshot.
   * @returns The server state of the store
   */
  getServerSnapshot?: () => BlocState<B>;
}

/**
 * Creates an external store that wraps a Bloc instance, providing a React-compatible interface
 * for subscribing to and accessing bloc state.
 * 
 * @template B - The type of the Bloc instance
 * @template S - The type of the Bloc state
 * @param bloc - The Bloc instance to wrap
 * @param dependencyArray - Function that returns an array of dependencies for the subscription
 * @param rid - Unique identifier for the subscription
 * @returns An ExternalStore instance that provides methods to subscribe to and access bloc state
 */
const externalBlocStore = <
  B extends InstanceType<BlocConstructor<any>>
>(
  resolvedBloc: B,
  dependencyArray: BlocHookDependencyArrayFn<BlocState<B>>,
  rid: string,
): ExternalStore<B> => {
  // TODO: Revisit this type assertion. Ideally, 'resolvedBloc' should conform to a type
  // that guarantees '_observer' and 'state' properties without needing 'as unknown as ...'.
  // This might require adjustments in the core @blac/core types.
  const asBlocBase = resolvedBloc as unknown as BlocBase<BlocState<B>>;
  return {
    subscribe: (listener: (state: BlocState<B>) => void) => {
      // Subscribe to the bloc's observer with the provided listener function
      // This will trigger the callback whenever the bloc's state changes
      const unSub = asBlocBase._observer.subscribe({
        fn: () => {
          try {
            listener(asBlocBase.state);
          } catch (e) {
            // Log any errors that occur during the listener callback
            // This ensures errors in listeners don't break the entire application
            console.error({
              e,
              resolvedBloc,
              dependencyArray,
            });
          }
        },
        // Pass the dependency array to control when the subscription is updated
        dependencyArray,
        // Use the provided id to identify this subscription
        id: rid,
      });

      // Return an unsubscribe function that can be called to clean up the subscription
      return () => {
        unSub();
      };
    },
    // Return an immutable snapshot of the current bloc state
    getSnapshot: (): BlocState<B> => asBlocBase.state,
    // Server snapshot mirrors the client snapshot in this implementation
    getServerSnapshot: (): BlocState<B> => asBlocBase.state,
  };
};

export default externalBlocStore;
