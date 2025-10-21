/**
 * Performance metrics tracking utility for browser-based benchmarks
 */

export interface BenchmarkResult {
  name: string;
  duration: number;
  memoryBefore?: number;
  memoryAfter?: number;
  memoryDelta?: number;
  timestamp: number;
  iterations?: number;
  avgDuration?: number;
}

export interface PerformanceSnapshot {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export class PerformanceMetrics {
  private static results: BenchmarkResult[] = [];
  private static marks = new Map<string, number>();

  /**
   * Get current memory usage (Chrome/Edge only)
   */
  static getMemoryUsage(): PerformanceSnapshot | null {
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      return {
        usedJSHeapSize: mem.usedJSHeapSize,
        totalJSHeapSize: mem.totalJSHeapSize,
        jsHeapSizeLimit: mem.jsHeapSizeLimit,
      };
    }
    return null;
  }

  /**
   * Start a performance measurement
   */
  static start(name: string): void {
    // Force garbage collection if available (requires --expose-gc flag)
    if (typeof (globalThis as any).gc === 'function') {
      (globalThis as any).gc();
    }

    this.marks.set(name, performance.now());
  }

  /**
   * End a performance measurement and record results
   */
  static end(name: string, iterations = 1): BenchmarkResult {
    const endTime = performance.now();
    const startTime = this.marks.get(name);

    if (!startTime) {
      throw new Error(`No start mark found for "${name}"`);
    }

    const duration = endTime - startTime;
    const memoryAfter = this.getMemoryUsage();

    const result: BenchmarkResult = {
      name,
      duration,
      timestamp: Date.now(),
      iterations,
      avgDuration: duration / iterations,
    };

    if (memoryAfter) {
      result.memoryAfter = memoryAfter.usedJSHeapSize;
    }

    this.results.push(result);
    this.marks.delete(name);

    return result;
  }

  /**
   * Measure a synchronous function
   */
  static measure<T>(
    name: string,
    fn: () => T,
  ): { result: T; metrics: BenchmarkResult } {
    const memoryBefore = this.getMemoryUsage();

    this.start(name);
    const result = fn();
    const metrics = this.end(name);

    if (memoryBefore) {
      metrics.memoryBefore = memoryBefore.usedJSHeapSize;
      if (metrics.memoryAfter) {
        metrics.memoryDelta = metrics.memoryAfter - metrics.memoryBefore;
      }
    }

    return { result, metrics };
  }

  /**
   * Measure an async function
   */
  static async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
  ): Promise<{ result: T; metrics: BenchmarkResult }> {
    const memoryBefore = this.getMemoryUsage();

    this.start(name);
    const result = await fn();
    const metrics = this.end(name);

    if (memoryBefore) {
      metrics.memoryBefore = memoryBefore.usedJSHeapSize;
      if (metrics.memoryAfter) {
        metrics.memoryDelta = metrics.memoryAfter - metrics.memoryBefore;
      }
    }

    return { result, metrics };
  }

  /**
   * Run a benchmark multiple times and get statistics
   */
  static benchmark(
    name: string,
    fn: () => void,
    iterations = 100,
  ): BenchmarkResult {
    const durations: number[] = [];
    let memoryBefore: PerformanceSnapshot | null = null;
    let memoryAfter: PerformanceSnapshot | null = null;

    // Warm up
    for (let i = 0; i < 3; i++) {
      fn();
    }

    // Actual benchmark
    memoryBefore = this.getMemoryUsage();

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      fn();
      const end = performance.now();
      durations.push(end - start);
    }

    memoryAfter = this.getMemoryUsage();

    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const avgDuration = totalDuration / iterations;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    const result: BenchmarkResult = {
      name,
      duration: totalDuration,
      avgDuration,
      timestamp: Date.now(),
      iterations,
    };

    if (memoryBefore && memoryAfter) {
      result.memoryBefore = memoryBefore.usedJSHeapSize;
      result.memoryAfter = memoryAfter.usedJSHeapSize;
      result.memoryDelta =
        memoryAfter.usedJSHeapSize - memoryBefore.usedJSHeapSize;
    }

    this.results.push(result);

    console.log(`Benchmark: ${name}`);
    console.log(`  Total: ${totalDuration.toFixed(2)}ms`);
    console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`  Min: ${minDuration.toFixed(2)}ms`);
    console.log(`  Max: ${maxDuration.toFixed(2)}ms`);
    if (result.memoryDelta) {
      console.log(`  Memory: ${this.formatBytes(result.memoryDelta)}`);
    }

    return result;
  }

  /**
   * Get all recorded results
   */
  static getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  /**
   * Clear all results
   */
  static clearResults(): void {
    this.results = [];
    this.marks.clear();
  }

  /**
   * Export results as JSON
   */
  static exportResults(): string {
    return JSON.stringify(this.results, null, 2);
  }

  /**
   * Format bytes to human-readable string
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const formatted = (bytes / Math.pow(k, i)).toFixed(2);
    return `${formatted} ${sizes[i]}`;
  }

  /**
   * Format duration to human-readable string
   */
  static formatDuration(ms: number): string {
    if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * Get performance.now() for manual timing
   */
  static now(): number {
    return performance.now();
  }

  /**
   * Wait for the next animation frame
   */
  static nextFrame(): Promise<number> {
    return new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
  }

  /**
   * Wait for idle callback
   */
  static waitForIdle(): Promise<void> {
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(resolve);
      } else {
        setTimeout(resolve, 0);
      }
    });
  }
}
