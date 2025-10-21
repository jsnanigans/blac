/**
 * useBloc Hook
 *
 * Modern React hook for BlaC state management using the Adapter Pattern.
 * Provides 100% React 18 compatibility with Strict Mode, Suspense, and concurrent features.
 *
 * This is a re-export of useBlocAdapter as the new default implementation.
 * The old unified tracking implementation has been archived to __archived__/unified-tracking/
 *
 * Key Features:
 * - Clean adapter pattern separates React and BlaC concerns
 * - Stable subscriptions via useSyncExternalStore
 * - Selector support for fine-grained reactivity
 * - Version-based change detection (no deep comparisons)
 * - Proper reference counting for lifecycle management
 * - React Strict Mode compatible by design
 *
 * @module useBloc
 */

import useBlocAdapter from './useBlocAdapter';
export type { UseBlocAdapterOptions as UseBlocOptions } from './useBlocAdapter';

/**
 * useBloc Hook - now powered by the Adapter Pattern
 *
 * @example
 * // Basic usage - full state
 * function Counter() {
 *   const [state, bloc] = useBloc(CounterBloc);
 *   return <div>{state.count}</div>;
 * }
 *
 * @example
 * // With selector for optimized re-renders
 * function Counter() {
 *   const [count, bloc] = useBloc(CounterBloc, {
 *     selector: (state) => state.count,
 *   });
 *   return <div>{count}</div>;
 * }
 *
 * @example
 * // With lifecycle callbacks
 * function DataLoader() {
 *   const [data, bloc] = useBloc(DataBloc, {
 *     onMount: (bloc) => bloc.loadData(),
 *     onUnmount: (bloc) => bloc.cleanup(),
 *   });
 *   return <div>{data}</div>;
 * }
 *
 * @example
 * // With Suspense
 * function AsyncData() {
 *   const [data, bloc] = useBloc(DataBloc, {
 *     suspense: true,
 *     loadAsync: (bloc) => bloc.loadData(),
 *     isLoading: (bloc) => bloc.state.isLoading,
 *     getLoadingPromise: (bloc) => bloc.loadingPromise,
 *   });
 *   return <div>{data.value}</div>;
 * }
 */
const useBloc = useBlocAdapter;

export default useBloc;
