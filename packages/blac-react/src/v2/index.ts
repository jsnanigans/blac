/**
 * v2 React Integration
 *
 * Simple, clean integration between React and v2 StateContainer architecture.
 * Uses React 18's useSyncExternalStore for optimal compatibility.
 */

export { ReactBridge, createReactBridge, type SubscribeCallback, type Unsubscribe } from './ReactBridge';
export { useStateContainer, type UseStateContainerOptions } from './useStateContainer';
export { useBloc, registerBloc, setBlocRegistry, getBlocRegistry, type UseBlocOptions } from './useBloc';
