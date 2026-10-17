import type { StatResult } from './types';

const medianOfSorted = (sorted: number[]): number => {
  const n = sorted.length;
  return n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
};

const ascending = (a: number, b: number): number => a - b;

export function computeStats(values: number[]): StatResult {
  const n = values.length;
  if (n === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p95: 0,
      stddev: 0,
      samples: 0,
    };
  }
  const sorted = [...values].sort(ascending);
  const mean = sorted.reduce((acc, v) => acc + v, 0) / n;
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  return {
    min: sorted[0],
    max: sorted[n - 1],
    mean,
    median: medianOfSorted(sorted),
    p95: sorted[Math.min(Math.ceil(n * 0.95) - 1, n - 1)],
    stddev: Math.sqrt(variance),
    samples: n,
  };
}

/** Drops samples more than `threshold` scaled MADs from the median. */
export function removeOutliers(values: number[], threshold = 2.5): number[] {
  if (values.length < 4) return values;
  const median = medianOfSorted([...values].sort(ascending));
  const mad =
    medianOfSorted(values.map((v) => Math.abs(v - median)).sort(ascending)) *
    1.4826;
  if (mad === 0) return values;
  return values.filter((v) => Math.abs(v - median) / mad <= threshold);
}

export const summarize = (values: number[]): StatResult =>
  computeStats(removeOutliers(values));

/** Coefficient of variation, in percent. */
export const cv = (s: StatResult): number =>
  s.mean > 0 ? (s.stddev / s.mean) * 100 : 0;

export function formatBytes(bytes: number): string {
  if (Math.abs(bytes) < 1024) return `${bytes.toFixed(0)} B`;
  if (Math.abs(bytes) < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatMs(ms: number): string {
  if (ms < 1)
    return `${(ms * 1000).toFixed(ms < 0.001 ? 2 : ms < 0.01 ? 1 : 0)}µs`;
  if (ms < 100) return `${ms.toFixed(2)}ms`;
  return `${ms.toFixed(0)}ms`;
}
