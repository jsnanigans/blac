/**
 * ReactBridge - Clean integration between React and v2 StateContainer
 *
 * Responsibilities:
 * - Subscribe React components to StateContainer changes
 * - Manage component lifecycle (mount/unmount)
 * - Provide stable snapshots for useSyncExternalStore
 *
 * Design Philosophy:
 * - Simple, focused responsibility
 * - Use React's built-in hooks (useSyncExternalStore)
 * - No over-engineering
 * - Clear separation from StateContainer lifecycle
 */

import type { StateContainer } from '../../../blac/src/v2/core/StateContainer';

/**
 * Subscription callback type
 */
export type SubscribeCallback = () => void;

/**
 * Unsubscribe function
 */
export type Unsubscribe = () => void;

/**
 * ReactBridge provides a clean interface between React and StateContainer
 *
 * This is intentionally simple - it just wraps StateContainer subscriptions
 * in a way that works well with React's useSyncExternalStore.
 */
export class ReactBridge<TState> {
  constructor(private readonly container: StateContainer<TState>) {}

  /**
   * Subscribe to state changes
   * Compatible with useSyncExternalStore's subscribe signature
   *
   * @param callback - Function to call when state changes
   * @returns Unsubscribe function
   */
  subscribe = (callback: SubscribeCallback): Unsubscribe => {
    return this.container.subscribe(() => {
      callback();
    });
  };

  /**
   * Get current state snapshot
   * Compatible with useSyncExternalStore's getSnapshot signature
   *
   * @returns Current state
   */
  getSnapshot = (): TState => {
    return this.container.state;
  };

  /**
   * Get server snapshot (for SSR)
   * Compatible with useSyncExternalStore's getServerSnapshot signature
   *
   * @returns Initial/server state
   */
  getServerSnapshot = (): TState => {
    return this.container.state;
  };
}

/**
 * Create a ReactBridge for a StateContainer
 *
 * @param container - The StateContainer to bridge
 * @returns ReactBridge instance
 */
export function createReactBridge<TState>(
  container: StateContainer<TState>
): ReactBridge<TState> {
  return new ReactBridge(container);
}

