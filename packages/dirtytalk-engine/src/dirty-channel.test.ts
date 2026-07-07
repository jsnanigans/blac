import { describe, it, expect, vi } from 'vite-plus/test';
import { DirtyChannel } from './dirty-channel';
import type { Space } from './space';

// ---------------------------------------------------------------------------
// Hermetic test doubles — do NOT import from './scheduler' or './primitives'
// ---------------------------------------------------------------------------

const NumberBitsetSpace: Space<number> = {
  empty: () => 0,
  isEmpty: (r) => r === 0,
  union: (a, b) => a | b,
  intersects: (i, d) => (i & d) !== 0,
};

class TestScheduler {
  private pending: (() => void) | null = null;
  request(flush: () => void) {
    this.pending = flush;
  }
  cancel() {
    this.pending = null;
  }
  pump() {
    const f = this.pending;
    this.pending = null;
    f?.();
  }
  get isPending() {
    return this.pending != null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function make() {
  const sched = new TestScheduler();
  const ch = new DirtyChannel(NumberBitsetSpace, sched);
  return { sched, ch };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DirtyChannel — construction & basic marking', () => {
  it('1. construction does not call scheduler.request', () => {
    const { sched } = make();
    expect(sched.isPending).toBe(false);
  });

  it('2. mark triggers one schedule', () => {
    const { sched, ch } = make();
    ch.mark(0b001);
    expect(sched.isPending).toBe(true);
  });

  it('3. repeated marks before flush coalesce into one schedule', () => {
    const sched = new TestScheduler();
    const requestSpy = vi.spyOn(sched, 'request');
    const ch = new DirtyChannel(NumberBitsetSpace, sched);
    ch.mark(0b001);
    ch.mark(0b010);
    ch.mark(0b100);
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });
});

describe('DirtyChannel — flush behaviour', () => {
  it('4. flush calls subscribers with the union of marks', () => {
    const { sched, ch } = make();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    ch.subscribe(() => 0b001, cb1);
    ch.subscribe(() => 0b010, cb2);
    ch.mark(0b001);
    ch.mark(0b010);
    sched.pump();
    expect(cb1).toHaveBeenCalledWith(0b011);
    expect(cb2).toHaveBeenCalledWith(0b011);
  });

  it('5. subscriber whose interest does not intersect is NOT called', () => {
    const { sched, ch } = make();
    const cb = vi.fn();
    ch.subscribe(() => 0b100, cb); // interest bit 2; dirty will be bits 0+1
    ch.mark(0b001);
    ch.mark(0b010);
    sched.pump();
    expect(cb).not.toHaveBeenCalled();
  });

  it('6. empty dirty → no subscribers run', () => {
    const { sched, ch } = make();
    const cb = vi.fn();
    ch.subscribe(() => 0b111, cb);
    // no mark
    sched.pump(); // nothing was scheduled, pump is a no-op
    expect(cb).not.toHaveBeenCalled();
  });

  it('7. registration order is preserved', () => {
    const { sched, ch } = make();
    const order: number[] = [];
    ch.subscribe(
      () => 0b001,
      () => order.push(1),
    );
    ch.subscribe(
      () => 0b001,
      () => order.push(2),
    );
    ch.subscribe(
      () => 0b001,
      () => order.push(3),
    );
    ch.mark(0b001);
    sched.pump();
    expect(order).toEqual([1, 2, 3]);
  });

  it('8. accumulated resets after flush — second pump with no new mark fires no callbacks', () => {
    const { sched, ch } = make();
    const cb = vi.fn();
    ch.subscribe(() => 0b001, cb);
    ch.mark(0b001);
    sched.pump(); // first flush
    expect(cb).toHaveBeenCalledTimes(1);
    sched.pump(); // nothing pending
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe('DirtyChannel — lazy interest thunk', () => {
  it('9. interest is not evaluated until pump', () => {
    const { sched, ch } = make();
    const interest = vi.fn(() => 0b001);
    ch.subscribe(interest, vi.fn());
    ch.mark(0b001);
    expect(interest).not.toHaveBeenCalled();
    sched.pump();
    expect(interest).toHaveBeenCalledTimes(1);
  });

  it('10. interest is re-evaluated on each flush', () => {
    const { sched, ch } = make();
    let interestRegion = 0b001;
    const interest = vi.fn(() => interestRegion);
    const cb = vi.fn();
    ch.subscribe(interest, cb);

    ch.mark(0b001);
    sched.pump();
    expect(interest).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(1);

    // Change interest so it no longer intersects
    interestRegion = 0b100;
    ch.mark(0b001);
    sched.pump();
    expect(interest).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenCalledTimes(1); // not called again
  });
});

describe('DirtyChannel — subscribe / unsubscribe', () => {
  it('11. unsubscribe before flush prevents cb from running', () => {
    const { sched, ch } = make();
    const cb = vi.fn();
    const unsub = ch.subscribe(() => 0b001, cb);
    unsub();
    ch.mark(0b001);
    sched.pump();
    expect(cb).not.toHaveBeenCalled();
  });

  it('12. unsubscribe is idempotent and does not affect other subscribers', () => {
    const { sched, ch } = make();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const unsub = ch.subscribe(() => 0b001, cb1);
    ch.subscribe(() => 0b001, cb2);
    expect(() => {
      unsub();
      unsub();
    }).not.toThrow();
    ch.mark(0b001);
    sched.pump();
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('13. unsubscribing a later subscriber during flush prevents it from running', () => {
    const { sched, ch } = make();
    const called: number[] = [];
    // Use a wrapper object so the reference can be captured by the first
    // callback without a let/reassignment (satisfies prefer-const).
    const ref = { unsub: () => {} };
    ch.subscribe(
      () => 0b001,
      () => {
        called.push(1);
        ref.unsub(); // unsubscribe #3 before it runs
      },
    );
    ch.subscribe(
      () => 0b001,
      () => {
        called.push(2);
      },
    );
    ref.unsub = ch.subscribe(
      () => 0b001,
      () => {
        called.push(3);
      },
    );
    ch.mark(0b001);
    sched.pump();
    expect(called).toEqual([1, 2]);
  });

  it('14. subscriber added during flush does not run in the current flush', () => {
    const { sched, ch } = make();
    const lateCallback = vi.fn();
    ch.subscribe(
      () => 0b001,
      () => {
        // Subscribe a new subscriber mid-flush
        ch.subscribe(() => 0b001, lateCallback);
      },
    );
    ch.mark(0b001);
    sched.pump(); // flush #1 — lateCallback should NOT run
    expect(lateCallback).not.toHaveBeenCalled();

    // A subsequent mark + pump should run the new subscriber
    ch.mark(0b001);
    sched.pump();
    expect(lateCallback).toHaveBeenCalledTimes(1);
  });
});

describe('DirtyChannel — re-entrancy', () => {
  it('15. mark during flush defers to next flush', () => {
    const { sched, ch } = make();
    const secondFlushCb = vi.fn();
    ch.subscribe(
      () => 0b001,
      () => {
        ch.mark(0b100); // re-entrant mark
      },
    );
    ch.subscribe(() => 0b100, secondFlushCb);
    ch.mark(0b001);
    sched.pump(); // flush #1 — re-entrant mark should schedule flush #2
    expect(secondFlushCb).not.toHaveBeenCalled();
    expect(sched.isPending).toBe(true);
    sched.pump(); // flush #2 — now secondFlushCb runs with dirty = 0b100
    expect(secondFlushCb).toHaveBeenCalledWith(0b100);
  });

  it('16. re-entrant mark with no further external mark fires on next pump', () => {
    const { sched, ch } = make();
    const cb = vi.fn();
    // Subscriber A marks bit 0b010 re-entrantly (different from its own interest 0b001)
    // so flush #2 only notifies cb (interested in 0b010), not subscriber A again.
    ch.subscribe(
      () => 0b001,
      () => {
        ch.mark(0b010); // re-entrant mark of a different bit
      },
    );
    ch.subscribe(() => 0b010, cb);
    ch.mark(0b001);
    sched.pump(); // flush #1 — triggers re-entrant mark which defers
    expect(sched.isPending).toBe(true);
    sched.pump(); // flush #2 — fires cb with dirty=0b010
    expect(cb).toHaveBeenCalledWith(0b010);
    expect(sched.isPending).toBe(false);
  });

  it('17. re-entrant mark in a throwing subscriber still defers correctly', () => {
    const { sched, ch } = make();
    const afterCb = vi.fn();
    ch.subscribe(
      () => 0b001,
      () => {
        ch.mark(0b100); // re-entrant
        throw new Error('subscriber boom');
      },
    );
    ch.subscribe(() => 0b100, afterCb);
    ch.mark(0b001);
    expect(() => sched.pump()).toThrow('subscriber boom');
    // The channel must still have scheduled a follow-up flush for the re-entrant mark
    expect(sched.isPending).toBe(true);
    sched.pump();
    expect(afterCb).toHaveBeenCalledWith(0b100);
  });
});

describe('DirtyChannel — errors', () => {
  it('18. one subscriber throws — error re-thrown after all subscribers run', () => {
    const { sched, ch } = make();
    const afterCb = vi.fn();
    ch.subscribe(
      () => 0b001,
      () => {
        throw new Error('first boom');
      },
    );
    ch.subscribe(() => 0b001, afterCb); // must still be called
    ch.mark(0b001);
    expect(() => sched.pump()).toThrow('first boom');
    expect(afterCb).toHaveBeenCalledTimes(1);
  });

  it('19. two subscribers throw — AggregateError with both inner errors', () => {
    const { sched, ch } = make();
    const err1 = new Error('boom1');
    const err2 = new Error('boom2');
    ch.subscribe(
      () => 0b001,
      () => {
        throw err1;
      },
    );
    ch.subscribe(
      () => 0b001,
      () => {
        throw err2;
      },
    );
    ch.mark(0b001);
    let thrown: unknown;
    try {
      sched.pump();
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(AggregateError);
    const agg = thrown as AggregateError;
    expect(agg.message).toBe('DirtyChannel: subscriber errors during flush');
    expect(agg.errors).toContain(err1);
    expect(agg.errors).toContain(err2);
  });

  it('20. interest thunk throws — cb not called; error contributes to aggregate', () => {
    const { sched, ch } = make();
    const thunkError = new Error('bad thunk');
    const goodCb = vi.fn();
    const badCb = vi.fn();
    ch.subscribe(() => {
      throw thunkError;
    }, badCb);
    ch.subscribe(() => 0b001, goodCb); // should still run
    ch.mark(0b001);
    let thrown: unknown;
    try {
      sched.pump();
    } catch (e) {
      thrown = e;
    }
    expect(badCb).not.toHaveBeenCalled();
    expect(goodCb).toHaveBeenCalledTimes(1);
    // Single error: re-thrown directly (not AggregateError)
    expect(thrown).toBe(thunkError);
  });
});

describe('DirtyChannel — onError option', () => {
  it('22. onError routes callback errors and flush does not throw', () => {
    const sched = new TestScheduler();
    const onError = vi.fn();
    const ch = new DirtyChannel(NumberBitsetSpace, sched, { onError });
    const err = new Error('cb boom');
    const afterCb = vi.fn();
    ch.subscribe(
      () => 0b001,
      () => {
        throw err;
      },
    );
    ch.subscribe(() => 0b001, afterCb);
    ch.mark(0b001);
    expect(() => sched.pump()).not.toThrow();
    expect(onError).toHaveBeenCalledWith(err);
    expect(afterCb).toHaveBeenCalledTimes(1);
  });

  it('23. onError routes interest thunk errors and flush does not throw', () => {
    const sched = new TestScheduler();
    const onError = vi.fn();
    const ch = new DirtyChannel(NumberBitsetSpace, sched, { onError });
    const err = new Error('thunk boom');
    const goodCb = vi.fn();
    ch.subscribe(() => {
      throw err;
    }, vi.fn());
    ch.subscribe(() => 0b001, goodCb);
    ch.mark(0b001);
    expect(() => sched.pump()).not.toThrow();
    expect(onError).toHaveBeenCalledWith(err);
    expect(goodCb).toHaveBeenCalledTimes(1);
  });

  it('24. without onError, flush still rethrows (unchanged behavior)', () => {
    const { sched, ch } = make();
    ch.subscribe(
      () => 0b001,
      () => {
        throw new Error('still throws');
      },
    );
    ch.mark(0b001);
    expect(() => sched.pump()).toThrow('still throws');
  });
});

describe('DirtyChannel — sanity', () => {
  it('21. isEmpty fast-path: no subscribers consulted when dirty is empty', () => {
    const { sched, ch } = make();
    const interest = vi.fn(() => 0b001);
    ch.subscribe(interest, vi.fn());
    // Pump without any mark — nothing is pending, pump is a no-op
    sched.pump();
    expect(interest).not.toHaveBeenCalled();
  });
});

describe('DirtyChannel — dispose', () => {
  it('25. dispose after a pending mark calls scheduler.cancel once', () => {
    const sched = new TestScheduler();
    const cancelSpy = vi.spyOn(sched, 'cancel');
    const ch = new DirtyChannel(NumberBitsetSpace, sched);
    ch.mark(0b001);
    ch.dispose();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('26. dispose with nothing pending does not call cancel', () => {
    const sched = new TestScheduler();
    const cancelSpy = vi.spyOn(sched, 'cancel');
    const ch = new DirtyChannel(NumberBitsetSpace, sched);
    ch.dispose();
    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it('27. after dispose, mark() is a no-op and subscribe() never fires', () => {
    const sched = new TestScheduler();
    const requestSpy = vi.spyOn(sched, 'request');
    const ch = new DirtyChannel(NumberBitsetSpace, sched);
    ch.dispose();
    requestSpy.mockClear();

    ch.mark(0b001);
    expect(requestSpy).not.toHaveBeenCalled();
    expect(sched.isPending).toBe(false);

    const cb = vi.fn();
    ch.subscribe(() => 0b001, cb);
    ch.mark(0b001);
    sched.pump();
    expect(cb).not.toHaveBeenCalled();
  });

  it('28. dispose called twice is safe and does not double-invoke cancel', () => {
    const sched = new TestScheduler();
    const cancelSpy = vi.spyOn(sched, 'cancel');
    const ch = new DirtyChannel(NumberBitsetSpace, sched);
    ch.mark(0b001);
    expect(() => {
      ch.dispose();
      ch.dispose();
    }).not.toThrow();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });
});
