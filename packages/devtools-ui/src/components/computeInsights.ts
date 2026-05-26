/**
 * Insight thresholds — tune here, add a new rule as a new switch case.
 */
export const LARGE_STATE_THRESHOLD_BYTES = 50_000;
export const HIGH_UPDATE_RATE_THRESHOLD = 30; // updates within 10 s

export type Insight =
  | { kind: 'large-state'; sizeBytes: number; threshold: number }
  | { kind: 'high-update-rate'; updatesPer10s: number; threshold: number };

interface InsightInput {
  state: unknown;
  /** Serialised state size in bytes, pre-computed and cached by the caller. */
  stateSizeBytes: number;
  /** Number of state-changed events recorded in the last 10 seconds. */
  updatesIn10s: number;
}

/**
 * Pure function. Returns an array of active insights for an instance.
 * Adding a new rule: add a new `Insight` union member + a new `case` block below.
 */
export function computeInsights(input: InsightInput): Insight[] {
  const insights: Insight[] = [];
  const rules = ['large-state', 'high-update-rate'] as const;

  for (const rule of rules) {
    switch (rule) {
      case 'large-state':
        if (input.stateSizeBytes >= LARGE_STATE_THRESHOLD_BYTES) {
          insights.push({
            kind: 'large-state',
            sizeBytes: input.stateSizeBytes,
            threshold: LARGE_STATE_THRESHOLD_BYTES,
          });
        }
        break;

      case 'high-update-rate':
        if (input.updatesIn10s >= HIGH_UPDATE_RATE_THRESHOLD) {
          insights.push({
            kind: 'high-update-rate',
            updatesPer10s: input.updatesIn10s,
            threshold: HIGH_UPDATE_RATE_THRESHOLD,
          });
        }
        break;
    }
  }

  return insights;
}

/**
 * Measure the byte-length of the serialised state.
 * Uses `JSON.stringify` length (UTF-16 code units) — accurate enough for
 * the 50 KB warning threshold.
 */
export function measureStateBytes(state: unknown): number {
  try {
    return JSON.stringify(state)?.length ?? 0;
  } catch {
    return 0;
  }
}
