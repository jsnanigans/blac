/**
 * Test utilities and fixtures for v2 testing
 */

import { Version, version } from '../types/branded';

/**
 * Create a test state object
 */
export function createTestState<T extends Record<string, any>>(
  overrides?: Partial<T>
): T {
  return {
    count: 0,
    name: 'test',
    nested: {
      value: 42,
      flag: false,
    },
    ...overrides,
  } as T;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 1000,
  interval = 10
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Create a mock subscription notify function
 */
export function createMockNotify() {
  const calls: any[] = [];
  const fn = vi.fn((state: any) => {
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
 * Memory usage tracker for tests
 */
export class MemoryTracker {
  private baseline: number = 0;

  start(): void {
    if (global.gc) {
      global.gc();
    }
    this.baseline = process.memoryUsage().heapUsed;
  }

  getUsage(): number {
    if (global.gc) {
      global.gc();
    }
    return process.memoryUsage().heapUsed - this.baseline;
  }

  getMB(): number {
    return Math.round(this.getUsage() / 1024 / 1024 * 100) / 100;
  }
}

/**
 * Performance timer for benchmarking
 */
export class PerfTimer {
  private start: number = 0;
  private marks: Map<string, number> = new Map();

  begin(): void {
    this.start = performance.now();
  }

  mark(label: string): void {
    this.marks.set(label, performance.now());
  }

  end(): number {
    return performance.now() - this.start;
  }

  getMark(label: string): number | undefined {
    const mark = this.marks.get(label);
    return mark ? mark - this.start : undefined;
  }

  getAllMarks(): Record<string, number> {
    const result: Record<string, number> = {};
    this.marks.forEach((time, label) => {
      result[label] = time - this.start;
    });
    return result;
  }
}

/**
 * Create a sequence of versions for testing
 */
export function* versionSequence(start = 0): Generator<Version, never, unknown> {
  let current = start;
  while (true) {
    yield version(current++);
  }
}

/**
 * Test fixture for state containers
 */
export class TestFixture<S> {
  states: S[] = [];
  versions: Version[] = [];
  notifications = 0;

  recordState(state: S, v: Version): void {
    this.states.push(state);
    this.versions.push(v);
    this.notifications++;
  }

  reset(): void {
    this.states = [];
    this.versions = [];
    this.notifications = 0;
  }

  get lastState(): S | undefined {
    return this.states[this.states.length - 1];
  }

  get lastVersion(): Version | undefined {
    return this.versions[this.versions.length - 1];
  }
}