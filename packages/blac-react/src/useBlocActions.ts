/**
 * useBlocActions - hook for accessing bloc instance without state subscription
 *
 * @example
 * ```tsx
 * // Use when you only need to call actions, not read state
 * function ActionsOnly() {
 *   const bloc = useBlocActions(CounterBloc);
 *   return (
 *     <div>
 *       <button onClick={bloc.increment}>+</button>
 *       <button onClick={bloc.decrement}>-</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useMemo, useEffect, useRef } from 'react';
import type { AnyObject, BlocConstructor, StateContainer } from '@blac/core';
import type { ComponentRef } from './types';

/**
 * StateContainer constructor with required static methods
 */
type StateContainerConstructor<TBloc extends StateContainer<any>> =
  BlocConstructor<TBloc> & {
    getOrCreate(instanceKey?: string, ...args: any[]): TBloc;
    release(instanceKey?: string): void;
  };

/**
 * Configuration options for the useBlocActions hook
 *
 * @template TBloc - The StateContainer type
 */
export interface UseBlocActionsOptions<
  TBloc extends StateContainer<AnyObject>,
> {
  /**
   * Static props to pass to the Bloc constructor
   * Type should match the constructor's first parameter
   */
  staticProps?: AnyObject;

  /**
   * Custom instance ID for shared blocs
   * - For isolated blocs, each useBlocActions call gets its own instance
   * - For shared blocs, the same instanceId will share the same bloc instance
   */
  instanceId?: string;

  /**
   * Callback invoked when the component mounts
   *
   * @param bloc - The bloc instance
   */
  onMount?: (bloc: TBloc) => void;

  /**
   * Callback invoked when the component unmounts
   *
   * @param bloc - The bloc instance
   */
  onUnmount?: (bloc: TBloc) => void;
}

/**
 * Generates instance ID for isolated blocs
 */
function generateInstanceId(
  componentRef: ComponentRef,
  isIsolated: boolean,
  providedId?: string,
): string | undefined {
  if (providedId) return providedId;

  if (isIsolated) {
    if (!componentRef.__blocInstanceId) {
      componentRef.__blocInstanceId = `isolated-${Math.random().toString(36).slice(2, 11)}`;
    }
    return componentRef.__blocInstanceId;
  }

  return undefined;
}

/**
 * React hook for accessing bloc instance without state subscription.
 * Use this when you only need to call bloc methods/actions without reading state.
 *
 * Benefits over useBloc:
 * - No state subscription overhead
 * - No proxy tracking
 * - Component never re-renders due to bloc state changes
 * - Lighter weight for action-only components
 *
 * @template TBloc - The StateContainer type
 * @param BlocClass - The bloc class constructor
 * @param options - Optional configuration
 * @returns The bloc instance
 */
export function useBlocActions<TBloc extends StateContainer<AnyObject>>(
  BlocClass: BlocConstructor<TBloc>,
  options?: UseBlocActionsOptions<TBloc>,
): TBloc {
  // Component reference that persists across React Strict Mode remounts
  const componentRef = useRef<ComponentRef>({});

  const [bloc, instanceKey] = useMemo(() => {
    const isIsolated = (BlocClass as { isolated?: boolean }).isolated === true;
    const Constructor = BlocClass as StateContainerConstructor<TBloc>;

    // Generate instance key
    const instanceId = generateInstanceId(
      componentRef.current,
      isIsolated,
      options?.instanceId,
    );

    // Get or create bloc instance
    const instance = Constructor.getOrCreate(instanceId, options?.staticProps);

    return [instance, instanceId] as const;
  }, [BlocClass]);

  // Mount/unmount lifecycle
  useEffect(() => {
    // Call onMount callback if provided
    if (options?.onMount) {
      options.onMount(bloc);
    }

    return () => {
      // Call onUnmount callback if provided
      if (options?.onUnmount) {
        options.onUnmount(bloc);
      }

      // Release bloc reference
      const Constructor = BlocClass as StateContainerConstructor<TBloc>;
      Constructor.release(instanceKey);

      // For isolated instances, dispose manually since registry doesn't track them
      const isIsolated =
        (BlocClass as { isolated?: boolean }).isolated === true;
      if (isIsolated && !bloc.isDisposed) {
        bloc.dispose();
      }
    };
  }, []);

  return bloc;
}
