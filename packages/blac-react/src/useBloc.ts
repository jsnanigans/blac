/**
 * useBloc - Convenient hook for BlaC state management in React with automatic proxy tracking
 *
 * Modern ergonomics: pass the Bloc constructor, get type-safe state and instance.
 * Automatically tracks which properties you access!
 *
 * This is a facade that delegates to either useBlocConcurrent (default) or useBlocNext
 * based on configuration.
 *
 * @example
 * ```tsx
 * // Basic usage - automatic tracking of accessed properties
 * function Counter() {
 *   const [state, bloc] = useBloc(CounterBloc);
 *   return (
 *     <div>
 *       <p>Count: {state.count}</p>  // Only re-renders when count changes
 *       <button onClick={bloc.increment}>+</button>
 *     </div>
 *   );
 * }
 *
 * // Configure to use Next mode (ultimate performance)
 * function UserProfile({ userId }: { userId: string }) {
 *   const [state, bloc] = useBloc(UserBloc, {
 *     staticProps: { userId },
 *     concurrent: false, // Use Next mode for maximum performance
 *   });
 *   return <div>{state.name}</div>;
 * }
 *
 * // Configure global default mode
 * import { BlocConfig } from '@blac/react';
 * BlocConfig.setDefaultMode('concurrent'); // Default mode
 * ```
 */

import type { StateContainer, AnyObject, BlocConstructor } from '@blac/core';
import { useBlocConcurrent } from './useBlocConcurrent';
import { BlocConfig } from './BlocConfig';
import type { UseBlocOptions, UseBlocReturn } from './types';

/**
 * useBloc Hook - Modern, type-safe BlaC state management with automatic proxy tracking
 *
 * Delegates to useBlocConcurrent by default. Simple mode has been removed.
 *
 * @param BlocClass - The Bloc constructor (uninitiated class)
 * @param options - Optional configuration
 * @returns Tuple of [state, bloc, componentRef]
 */
function useBloc<TBloc extends StateContainer<AnyObject, AnyObject>>(
  BlocClass: BlocConstructor<TBloc>,
  options?: UseBlocOptions<TBloc>,
): UseBlocReturn<TBloc> {
  // Always use concurrent mode (simple mode removed)
  return useBlocConcurrent(BlocClass, options);
}

export default useBloc;
export { useBloc };

// Re-export types and configuration
export type { UseBlocOptions, UseBlocReturn } from './types';
export { BlocConfig } from './BlocConfig';
export type { BlocMode } from './BlocConfig';
