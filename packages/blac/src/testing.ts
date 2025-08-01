import { Blac } from './Blac';
import { Bloc } from './Bloc';
import { BlocBase } from './BlocBase';
import { Cubit } from './Cubit';
import { BlocEventConstraint } from './types';

/**
 * Test utilities for Blac state management
 */
export class BlocTest {
  private static originalInstance: Blac;

  /**
   * Sets up a clean test environment
   */
  static setUp(): void {
    this.originalInstance = Blac.instance;
    Blac.resetInstance();
    Blac.enableLog = false; // Disable logging in tests by default
  }

  /**
   * Tears down the test environment and restores original state
   */
  static tearDown(): void {
    Blac.resetInstance();
    // Note: Cannot restore original instance due to singleton pattern
    // Tests should use setUp/tearDown properly to manage state
  }

  /**
   * Creates a test bloc with automatic cleanup
   */
  static createBloc<T extends BlocBase<any>>(
    BlocClass: new (...args: any[]) => T,
    ...args: any[]
  ): T {
    const bloc = new BlocClass(...args);
    Blac.activateBloc(bloc);
    return bloc;
  }

  /**
   * Waits for a bloc to emit a specific state
   */
  static async waitForState<T extends BlocBase<S>, S>(
    bloc: T,
    predicate: (state: S) => boolean,
    timeout = 5000,
  ): Promise<S> {
    return new Promise<S>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new Error(
            `Timeout waiting for state matching predicate after ${timeout}ms`,
          ),
        );
      }, timeout);

      const unsubscribe = bloc.subscribe((newState: S) => {
        if (predicate(newState)) {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(newState);
        }
      });

      // Check current state immediately
      if (predicate(bloc.state)) {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(bloc.state);
      }
    });
  }

  /**
   * Expects a bloc to emit specific states in order
   */
  static async expectStates<T extends BlocBase<S>, S>(
    bloc: T,
    expectedStates: S[],
    timeout = 5000,
  ): Promise<void> {
    const receivedStates: S[] = [];

    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new Error(
            `Timeout waiting for states. Expected: ${JSON.stringify(expectedStates)}, ` +
              `Received: ${JSON.stringify(receivedStates)}`,
          ),
        );
      }, timeout);

      const unsubscribe = bloc.subscribe((newState: S) => {
        receivedStates.push(newState);

        // Check if we have all expected states
        if (receivedStates.length === expectedStates.length) {
          clearTimeout(timeoutId);
          unsubscribe();

          // Verify all states match using deep equality
          for (let i = 0; i < expectedStates.length; i++) {
            const expected = expectedStates[i];
            const received = receivedStates[i];

            // Use JSON comparison for deep equality
            if (JSON.stringify(expected) !== JSON.stringify(received)) {
              reject(
                new Error(
                  `State mismatch at index ${i}. Expected: ${JSON.stringify(expected)}, ` +
                    `Received: ${JSON.stringify(received)}`,
                ),
              );
              return;
            }
          }

          resolve();
        }
      });
    });
  }
}

/**
 * Mock Bloc for testing
 */
export class MockBloc<
  S,
  A extends BlocEventConstraint = BlocEventConstraint,
> extends Bloc<S, A> {
  private mockHandlers = new Map<
    string,
    (event: A, emit: (newState: S) => void) => void | Promise<void>
  >();

  constructor(initialState: S) {
    super(initialState);
  }

  /**
   * Mock an event handler for testing
   */
  mockEventHandler<E extends A>(
    eventConstructor: new (...args: any[]) => E,
    handler: (event: E, emit: (newState: S) => void) => void | Promise<void>,
  ): void {
    // Use the on method to register the mock handler
    this.on(eventConstructor, handler);
  }

  /**
   * Get the number of registered handlers
   */
  getHandlerCount(): number {
    return this.eventHandlers.size;
  }

  /**
   * Check if a handler is registered for an event type
   */
  hasHandler(eventConstructor: new (...args: any[]) => A): boolean {
    return this.eventHandlers.has(eventConstructor);
  }
}

/**
 * Mock Cubit for testing
 */
export class MockCubit<S> extends Cubit<S> {
  private stateHistory: S[] = [];

  constructor(initialState: S) {
    super(initialState);
    this.stateHistory.push(initialState);
  }

  /**
   * Override emit to track state history
   */
  emit(newState: S): void {
    this.stateHistory.push(newState);
    super.emit(newState);
  }

  /**
   * Get the history of all states
   */
  getStateHistory(): S[] {
    return [...this.stateHistory];
  }

  /**
   * Clear state history
   */
  clearStateHistory(): void {
    this.stateHistory = [this.state];
  }
}

/**
 * Memory leak detector for tests
 */
export class MemoryLeakDetector {
  private initialStats: ReturnType<typeof Blac.getMemoryStats>;

  constructor() {
    this.initialStats = Blac.getMemoryStats();
  }

  /**
   * Check for memory leaks and return a report
   */
  checkForLeaks(): {
    hasLeaks: boolean;
    report: string;
    stats: ReturnType<typeof Blac.getMemoryStats>;
  } {
    const currentStats = Blac.getMemoryStats();
    const hasLeaks =
      currentStats.registeredBlocs > this.initialStats.registeredBlocs ||
      currentStats.isolatedBlocs > this.initialStats.isolatedBlocs ||
      currentStats.keepAliveBlocs > this.initialStats.keepAliveBlocs;

    const report = `
Memory Leak Detection Report:
- Initial registered blocs: ${this.initialStats.registeredBlocs}
- Current registered blocs: ${currentStats.registeredBlocs}
- Initial isolated blocs: ${this.initialStats.isolatedBlocs}  
- Current isolated blocs: ${currentStats.isolatedBlocs}
- Initial keep-alive blocs: ${this.initialStats.keepAliveBlocs}
- Current keep-alive blocs: ${currentStats.keepAliveBlocs}
- Potential leaks detected: ${hasLeaks ? 'YES' : 'NO'}
    `.trim();

    return {
      hasLeaks,
      report,
      stats: currentStats,
    };
  }
}
