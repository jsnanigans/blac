/**
 * NextBridge - Ultra-minimal, high-performance bridge for React state synchronization
 *
 * This implementation focuses on absolute performance:
 * - No proxy tracking
 * - No dependency management
 * - Direct subscriptions only
 * - Minimal memory allocation
 * - Uses fastest rerender trigger (useReducer increment)
 */

import type { StateContainer } from '@blac/core';

/**
 * Minimal bridge for maximum performance
 */
export class NextBridge<S> {
  private unsubscribe: (() => void) | null = null;
  private forceUpdate: (() => void) | null = null;

  constructor(
    private readonly container: StateContainer<S, any>
  ) {}

  /**
   * Set the force update function from useReducer
   * This is the fastest way to trigger rerenders in React
   */
  setForceUpdate(forceUpdate: () => void): void {
    this.forceUpdate = forceUpdate;
  }

  /**
   * Get current state - returns raw state directly (no proxy)
   */
  getState(): S {
    return this.container.state;
  }

  /**
   * Subscribe to all state changes - simplest possible subscription
   */
  subscribe(): () => void {
    // Direct subscription with immediate callback
    this.unsubscribe = this.container.subscribe(() => {
      // Directly call forceUpdate - no checks, no comparisons
      // Let React handle the render optimization
      if (this.forceUpdate) {
        this.forceUpdate();
      }
    });

    // Return cleanup function
    return () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
    };
  }

  /**
   * Get the underlying container
   */
  getContainer(): StateContainer<S, any> {
    return this.container;
  }

  /**
   * Minimal cleanup
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.forceUpdate = null;
  }
}