import { describe, it, expect, vi } from 'vite-plus/test';
import { Signal, DirtyChannel, SyncScheduler } from './index';
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
// Test 1 — Signal is a usable observable
// ---------------------------------------------------------------------------

describe('Signal — basic observable behaviour', () => {
  it('notifies subscribers; dedupes equal values under Object.is', () => {
    const s = new Signal(0);
    const spy = vi.fn();
    s.subscribe(spy);

    s.value = 1;
    s.value = 1; // duplicate — must not fire
    s.value = 2;

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0]).toBe(1);
    expect(spy.mock.calls[1][0]).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Test 2 — DirtyChannel + SyncScheduler: selective fan-out
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

// ---------------------------------------------------------------------------
// Test 3 — Signal driving DirtyChannel (realistic composition shape)
// ---------------------------------------------------------------------------

describe('Signal driving DirtyChannel', () => {
  it('propagates each Signal write to channel subscribers via mark', () => {
    const counter = new Signal(0);
    const ch = new DirtyChannel(NumberBitsetSpace, new SyncScheduler());

    // Wire Signal → channel
    counter.subscribe(() => {
      ch.mark(1);
    });

    const observed: number[] = [];
    ch.subscribe(
      () => 1,
      () => {
        observed.push(counter.peek());
      },
    );

    counter.value = 1;
    counter.value = 2;
    counter.value = 3;

    expect(observed).toEqual([1, 2, 3]);
  });
});
