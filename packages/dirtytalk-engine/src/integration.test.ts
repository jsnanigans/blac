import { describe, it, expect, vi } from 'vite-plus/test';
import { DirtyChannel, SyncScheduler } from './index';
import type { Space } from './index';

// ---------------------------------------------------------------------------
// Shared test double — bitset Space (mirrors dirty-channel.test.ts)
// ---------------------------------------------------------------------------

const NumberBitsetSpace: Space<number> = {
  empty: () => 0,
  isEmpty: (r) => r === 0,
  union: (a, b) => a | b,
  intersects: (i, d) => (i & d) !== 0,
};

// ---------------------------------------------------------------------------
// Test — DirtyChannel + SyncScheduler: selective fan-out
// ---------------------------------------------------------------------------

describe('DirtyChannel + SyncScheduler — selective fan-out', () => {
  it('routes marks only to interested subscribers', () => {
    const ch = new DirtyChannel(NumberBitsetSpace, new SyncScheduler());
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    ch.subscribe(() => 0b001, cb1);
    ch.subscribe(() => 0b010, cb2);

    // mark bit 0 — only cb1 should fire
    ch.mark(0b001);
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb1).toHaveBeenCalledWith(0b001);
    expect(cb2).not.toHaveBeenCalled();

    // mark bit 1 — only cb2 should fire
    ch.mark(0b010);
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledWith(0b010);
    expect(cb1).toHaveBeenCalledTimes(1); // unchanged

    // mark both bits — both fire
    ch.mark(0b011);
    expect(cb1).toHaveBeenCalledTimes(2);
    expect(cb2).toHaveBeenCalledTimes(2);
  });
});
