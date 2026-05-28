import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test';
import {
  SyncScheduler,
  ManualScheduler,
  MicrotaskScheduler,
  RAFScheduler,
} from './scheduler';

// ---------------------------------------------------------------------------
// SyncScheduler
// ---------------------------------------------------------------------------

describe('SyncScheduler', () => {
  it('invokes flush synchronously before request returns', () => {
    const s = new SyncScheduler();
    const order: string[] = [];
    s.request(() => order.push('flush'));
    order.push('after');
    expect(order).toEqual(['flush', 'after']);
  });

  it('calls flush on every request (no dedupe — each request is its own window)', () => {
    const s = new SyncScheduler();
    const fn = vi.fn();
    s.request(fn);
    s.request(fn);
    s.request(fn);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// ManualScheduler
// ---------------------------------------------------------------------------

describe('ManualScheduler', () => {
  it('request does not invoke flush', () => {
    const s = new ManualScheduler();
    const fn = vi.fn();
    s.request(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  it('pump() with no pending request is a no-op', () => {
    const s = new ManualScheduler();
    // Should not throw
    s.pump();
  });

  it('pump() after request invokes flush once', () => {
    const s = new ManualScheduler();
    const fn = vi.fn();
    s.request(fn);
    s.pump();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('request → request → pump: flush runs once (idempotent within window)', () => {
    const s = new ManualScheduler();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    s.request(fn1);
    s.request(fn2);
    s.pump();
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('pump → pump: second pump runs nothing', () => {
    const s = new ManualScheduler();
    const fn = vi.fn();
    s.request(fn);
    s.pump();
    s.pump();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('re-entrant request from inside flush does not cascade synchronously', () => {
    const s = new ManualScheduler();
    const inner = vi.fn();
    let innerCalled = false;

    const outer = vi.fn(() => {
      // Re-entrant request during pump
      s.request(inner);
      innerCalled = true;
    });

    s.request(outer);
    s.pump(); // drives outer flush
    expect(outer).toHaveBeenCalledTimes(1);
    expect(innerCalled).toBe(true);
    // inner must NOT have been called yet
    expect(inner).not.toHaveBeenCalled();

    // A second pump should drive the inner flush
    s.pump();
    expect(inner).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// MicrotaskScheduler
// ---------------------------------------------------------------------------

describe('MicrotaskScheduler', () => {
  afterEach(() => vi.useRealTimers());

  it('request schedules but does not invoke flush synchronously', () => {
    const s = new MicrotaskScheduler();
    const fn = vi.fn();
    s.request(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  it('await Promise.resolve() triggers flush once', async () => {
    const s = new MicrotaskScheduler();
    const fn = vi.fn();
    s.request(fn);
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('two requests in the same tick coalesce to one flush', async () => {
    const s = new MicrotaskScheduler();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    s.request(fn1);
    s.request(fn2);
    await Promise.resolve();
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('latest flush wins', async () => {
    const s = new MicrotaskScheduler();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    s.request(cb1);
    s.request(cb2);
    await Promise.resolve();
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('request inside flush schedules another microtask; runs after next await', async () => {
    const s = new MicrotaskScheduler();
    const inner = vi.fn();
    const outer = vi.fn(() => {
      s.request(inner);
    });

    s.request(outer);
    await Promise.resolve(); // drain outer
    expect(outer).toHaveBeenCalledTimes(1);
    expect(inner).not.toHaveBeenCalled();

    await Promise.resolve(); // drain inner
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it('cancel() after request prevents flush from running', async () => {
    const s = new MicrotaskScheduler();
    const fn = vi.fn();
    s.request(fn);
    s.cancel();
    await Promise.resolve();
    expect(fn).not.toHaveBeenCalled();
  });

  it('after cancel, a new request works as fresh', async () => {
    const s = new MicrotaskScheduler();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    s.request(fn1);
    s.cancel();
    s.request(fn2);
    await Promise.resolve();
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// RAFScheduler (Node fallback: setTimeout 16 ms)
// ---------------------------------------------------------------------------

describe('RAFScheduler (Node setTimeout fallback)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('request schedules; advancing 20 ms invokes flush once', () => {
    const s = new RAFScheduler();
    const fn = vi.fn();
    s.request(fn);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('two requests coalesce to one flush per timer tick', () => {
    const s = new RAFScheduler();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    s.request(fn1);
    s.request(fn2);
    vi.advanceTimersByTime(20);
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('cancel() clears the timer; advancing time runs nothing', () => {
    const s = new RAFScheduler();
    const fn = vi.fn();
    s.request(fn);
    s.cancel();
    vi.advanceTimersByTime(20);
    expect(fn).not.toHaveBeenCalled();
  });

  it('re-entrant request inside flush schedules a new tick', () => {
    const s = new RAFScheduler();
    const inner = vi.fn();
    const outer = vi.fn(() => {
      s.request(inner);
    });

    s.request(outer);
    vi.advanceTimersByTime(20); // first tick: outer runs
    expect(outer).toHaveBeenCalledTimes(1);
    expect(inner).not.toHaveBeenCalled();

    vi.advanceTimersByTime(20); // second tick: inner runs
    expect(inner).toHaveBeenCalledTimes(1);
  });
});
