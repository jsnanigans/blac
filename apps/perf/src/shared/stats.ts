import type { StatResult } from './types';

export function computeStats(values: number[]): StatResult {
  if (values.length === 0) {
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

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  const p95Index = Math.ceil(n * 0.95) - 1;
  const p95 = sorted[Math.min(p95Index, n - 1)];

  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);

  return {
    min: sorted[0],
    max: sorted[n - 1],
    mean,
    median,
    p95,
    stddev,
    samples: n,
  };
}

export function removeOutliers(
  values: number[],
  sigmaThreshold = 2.5,
): number[] {
  if (values.length < 4) return values;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  const mad =
    [...sorted].map((v) => Math.abs(v - median)).sort((a, b) => a - b)[
      Math.floor(n / 2)
    ] * 1.4826;

  if (mad === 0) return values;

  return values.filter((v) => Math.abs(v - median) / mad <= sigmaThreshold);
}

export function formatMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 100) return `${ms.toFixed(1)}ms`;
  return `${ms.toFixed(0)}ms`;
}
