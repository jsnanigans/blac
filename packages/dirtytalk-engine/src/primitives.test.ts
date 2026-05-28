import { describe, it, expect, vi } from 'vite-plus/test';
import { Signal } from './primitives';

describe('Signal', () => {
  // Test 1: Construction & read
  it('returns initial value via .value and .peek()', () => {
    const s = new Signal(42);
    expect(s.value).toBe(42);
    expect(s.peek()).toBe(42);
  });

  // Test 2: Write notifies in registration order
  it('notifies subscribers in registration order', () => {
    const s = new Signal(0);
    const order: number[] = [];
    s.subscribe(() => order.push(1));
    s.subscribe(() => order.push(2));
    s.value = 1;
    expect(order).toEqual([1, 2]);
  });

  // Test 3: Equality short-circuit (default Object.is)
  it('does not notify when value is equal under Object.is', () => {
    const s = new Signal(1);
    const cb = vi.fn();
    s.subscribe(cb);
    s.value = 1;
    expect(cb).not.toHaveBeenCalled();

    // NaN equals NaN under Object.is
    const nan = new Signal(NaN);
    const nanCb = vi.fn();
    nan.subscribe(nanCb);
    nan.value = NaN;
    expect(nanCb).not.toHaveBeenCalled();
  });

  // Test 4: Custom equals
  it('uses custom equals function to suppress notification', () => {
    const s = new Signal({ id: 1, label: 'a' }, (a, b) => a.id === b.id);
    const cb = vi.fn();
    s.subscribe(cb);
    s.value = { id: 1, label: 'b' }; // same id, different label
    expect(cb).not.toHaveBeenCalled();
    s.value = { id: 2, label: 'b' }; // different id → notify
    expect(cb).toHaveBeenCalledTimes(1);
  });

  // Test 5: Unsubscribe removes callback
  it('unsubscribed callback does not receive further writes', () => {
    const s = new Signal(0);
    const cb = vi.fn();
    const unsub = s.subscribe(cb);
    unsub();
    s.value = 99;
    expect(cb).not.toHaveBeenCalled();
  });

  // Test 6: Unsubscribe is idempotent
  it('calling unsub twice does not throw or affect other subscribers', () => {
    const s = new Signal(0);
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const unsub = s.subscribe(cb1);
    s.subscribe(cb2);
    expect(() => {
      unsub();
      unsub();
    }).not.toThrow();
    s.value = 1;
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  // Test 7: Subscriber unsubscribes during notify (snapshot semantics)
  it('unsubscribing second subscriber during first callback still runs second this tick', () => {
    const s = new Signal(0);
    const log: string[] = [];
    const callbacks: { second?: () => void } = {};

    s.subscribe(() => {
      log.push('first');
      callbacks.second?.();
    });
    callbacks.second = s.subscribe(() => {
      log.push('second');
    });

    s.value = 1;
    expect(log).toEqual(['first', 'second']); // both ran this tick

    // Next write: second should NOT run
    log.length = 0;
    s.value = 2;
    expect(log).toEqual(['first']);
  });

  // Test 8: Subscriber throws — others still run; error surfaces
  it('continues to invoke remaining subscribers after one throws, then re-throws', () => {
    const s = new Signal(0);
    const secondCb = vi.fn();
    s.subscribe(() => { throw new Error('boom'); });
    s.subscribe(secondCb);

    expect(() => { s.value = 1; }).toThrow('boom');
    expect(secondCb).toHaveBeenCalledTimes(1);
  });

  it('wraps multiple subscriber errors in AggregateError', () => {
    const s = new Signal(0);
    s.subscribe(() => { throw new Error('err1'); });
    s.subscribe(() => { throw new Error('err2'); });

    let caught: unknown;
    try {
      s.value = 1;
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AggregateError);
    expect((caught as AggregateError).errors).toHaveLength(2);
  });

  // Test 9: Re-entrant write triggers fresh notify cycle
  it('re-entrant write causes a fresh notify cycle', () => {
    const s = new Signal(0);
    const seen: number[] = [];

    s.subscribe((v) => {
      seen.push(v);
      if (v === 1) {
        s.value = 2; // re-entrant write
      }
    });

    s.value = 1;
    expect(seen).toEqual([1, 2]);
  });

  // Test 10: peek() does not subscribe (smoke test)
  it('peek() does not register a subscription', () => {
    const s = new Signal('hello');
    // Call peek() and then write; no crash or implicit subscription
    expect(s.peek()).toBe('hello');
    s.value = 'world';
    expect(s.peek()).toBe('world');
    // No assertion needed beyond no error — peek has no subscriber side-effect
  });
});
