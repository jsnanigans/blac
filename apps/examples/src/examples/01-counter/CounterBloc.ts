import { Cubit } from '@blac/core';

export interface CounterState {
  count: number;
  incrementCount: number;
  decrementCount: number;
  lastAction: string;
}

/**
 * Simple counter Cubit demonstrating basic Blac patterns.
 *
 * Key features:
 * - Direct state emission with this.emit()
 * - Lifecycle hooks for logging
 * - Multiple properties to demonstrate dependency tracking
 */
export class CounterBloc extends Cubit<CounterState> {
  constructor(initialCount: number = 0) {
    super({
      count: initialCount,
      incrementCount: 0,
      decrementCount: 0,
      lastAction: 'initialized',
    });

    // Lifecycle hook - demonstrate automatic cleanup on disposal
    this.onDispose = () => {
      console.log('[CounterBloc] Disposed - cleaning up resources');
    };
  }

  /**
   * Increment the counter.
   * Arrow function ensures correct 'this' binding in React.
   */
  increment = () => {
    this.patch({
      count: this.state.count + 1,
      incrementCount: this.state.incrementCount + 1,
      lastAction: 'increment',
    });
  };

  /**
   * Decrement the counter
   */
  decrement = () => {
    this.patch({
      count: this.state.count - 1,
      decrementCount: this.state.decrementCount + 1,
      lastAction: 'decrement',
    });
  };

  /**
   * Reset the counter to zero
   */
  reset = () => {
    this.emit({
      count: 0,
      incrementCount: 0,
      decrementCount: 0,
      lastAction: 'reset',
    });
  };

  /**
   * Set the counter to a specific value
   */
  setValue = (value: number) => {
    this.patch({
      count: value,
      lastAction: `set to ${value}`,
    });
  };
}
