/**
 * Test utilities for BlaC
 *
 * This package provides test utilities and fixtures for testing
 * BlaC state containers in your application.
 *
 * @packageDocumentation
 */

import { vi } from 'vitest';

/**
 * Create a test state object with default values.
 * Useful for creating mock state in tests.
 *
 * @param overrides - Partial state to override defaults
 * @returns Test state object
 *
 * @example
 * ```ts
 * const state = createTestState({ count: 5 });
 * // { count: 5, name: 'test', nested: { value: 42, flag: false } }
 * ```
 */
export function createTestState<T extends Record<string, unknown>>(
  overrides?: Partial<T>,
): T {
  return {
    count: 0,
    name: 'test',
    nested: {
      value: 42,
      flag: false,
    },
    ...overrides,
  } as unknown as T;
}

/**
 * Wait for a condition to be true with polling.
 * Useful for async assertions in tests.
 *
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum wait time in milliseconds (default: 1000)
 * @param interval - Polling interval in milliseconds (default: 10)
 * @throws Error if timeout is reached before condition is met
 *
 * @example
 * ```ts
 * await waitFor(() => bloc.state.isReady);
 * ```
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 1000,
  interval = 10,
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Create a mock subscription notify function.
 * Useful for testing state container subscriptions.
 *
 * @returns Object with mock function and tracking utilities
 *
 * @example
 * ```ts
 * const notify = createMockNotify();
 * bloc.subscribe(notify.fn);
 * bloc.emit({ count: 1 });
 * expect(notify.callCount()).toBe(1);
 * expect(notify.lastCall()).toEqual({ count: 1 });
 * ```
 */
export function createMockNotify<T = unknown>() {
  const calls: T[] = [];
  const fn = vi.fn((state: T) => {
    calls.push(state);
  });
  return {
    fn,
    calls,
    callCount: () => calls.length,
    lastCall: () => calls[calls.length - 1],
    reset: () => {
      calls.length = 0;
      fn.mockClear();
    },
  };
}

/**
 * Memory usage tracker for performance tests.
 * Requires Node.js with --expose-gc flag for accurate measurements.
 *
 * @example
 * ```ts
 * const tracker = new MemoryTracker();
 * tracker.start();
 * // ... create objects ...
 * console.log(`Memory used: ${tracker.getMB()} MB`);
 * ```
 */
export class MemoryTracker {
  private baseline: number = 0;

  /**
   * Start tracking memory usage from current heap state.
   * Triggers garbage collection if available.
   */
  start(): void {
    if (global.gc) {
      global.gc();
    }
    this.baseline = process.memoryUsage().heapUsed;
  }

  /**
   * Get memory usage delta in bytes since start.
   * Triggers garbage collection if available.
   */
  getUsage(): number {
    if (global.gc) {
      global.gc();
    }
    return process.memoryUsage().heapUsed - this.baseline;
  }

  /**
   * Get memory usage delta in megabytes since start.
   */
  getMB(): number {
    return Math.round((this.getUsage() / 1024 / 1024) * 100) / 100;
  }
}

/**
 * Performance timer for benchmarking tests.
 *
 * @example
 * ```ts
 * const timer = new PerfTimer();
 * timer.begin();
 * // ... operation ...
 * timer.mark('phase1');
 * // ... more operations ...
 * console.log(`Total: ${timer.end()}ms`);
 * console.log(`Phase 1: ${timer.getMark('phase1')}ms`);
 * ```
 */
export class PerfTimer {
  private start: number = 0;
  private marks: Map<string, number> = new Map();

  /**
   * Start the timer.
   */
  begin(): void {
    this.start = performance.now();
  }

  /**
   * Record a named mark at the current time.
   */
  mark(label: string): void {
    this.marks.set(label, performance.now());
  }

  /**
   * Get total elapsed time in milliseconds since begin().
   */
  end(): number {
    return performance.now() - this.start;
  }

  /**
   * Get elapsed time to a specific mark in milliseconds.
   */
  getMark(label: string): number | undefined {
    const mark = this.marks.get(label);
    return mark ? mark - this.start : undefined;
  }

  /**
   * Get all recorded marks as a record.
   */
  getAllMarks(): Record<string, number> {
    const result: Record<string, number> = {};
    this.marks.forEach((time, label) => {
      result[label] = time - this.start;
    });
    return result;
  }
}
