import { describe, it, expect } from 'vitest';
import {
  computeInsights,
  LARGE_STATE_THRESHOLD_BYTES,
  HIGH_UPDATE_RATE_THRESHOLD,
} from './computeInsights';

describe('computeInsights', () => {
  const base = { state: {}, stateSizeBytes: 0, updatesIn10s: 0 };

  it('returns no insights when both values are below thresholds', () => {
    expect(
      computeInsights({
        ...base,
        stateSizeBytes: LARGE_STATE_THRESHOLD_BYTES - 1,
        updatesIn10s: HIGH_UPDATE_RATE_THRESHOLD - 1,
      }),
    ).toEqual([]);
  });

  it('returns large-state insight when state size meets threshold', () => {
    const insights = computeInsights({
      ...base,
      stateSizeBytes: LARGE_STATE_THRESHOLD_BYTES,
      updatesIn10s: 0,
    });
    expect(insights).toHaveLength(1);
    expect(insights[0].kind).toBe('large-state');
    expect((insights[0] as { kind: string; sizeBytes: number }).sizeBytes).toBe(
      LARGE_STATE_THRESHOLD_BYTES,
    );
  });

  it('returns high-update-rate insight when update rate meets threshold', () => {
    const insights = computeInsights({
      ...base,
      stateSizeBytes: 0,
      updatesIn10s: HIGH_UPDATE_RATE_THRESHOLD,
    });
    expect(insights).toHaveLength(1);
    expect(insights[0].kind).toBe('high-update-rate');
    expect(
      (insights[0] as { kind: string; updatesPer10s: number }).updatesPer10s,
    ).toBe(HIGH_UPDATE_RATE_THRESHOLD);
  });

  it('returns both insights when both thresholds are met', () => {
    const insights = computeInsights({
      ...base,
      stateSizeBytes: LARGE_STATE_THRESHOLD_BYTES + 1000,
      updatesIn10s: HIGH_UPDATE_RATE_THRESHOLD + 5,
    });
    expect(insights).toHaveLength(2);
    expect(insights.map((i) => i.kind)).toEqual([
      'large-state',
      'high-update-rate',
    ]);
  });
});
