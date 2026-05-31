import { describe, it, expect, afterEach, vi } from 'vitest';
import { blacTestSetup } from '@blac/core/testing';
import { acquire } from '../registry';
import { configureBlac, resetBlacConfig } from '../config';
import { Cubit } from './Cubit';

class Item extends Cubit<Record<string, never>, { id: string }> {
  constructor() {
    super({});
  }
}

class Counter extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
  bump = () => this.patch({ n: this.state.n + 1 });
}

describe('StateContainerRegistry circuit breaker', () => {
  blacTestSetup();
  afterEach(() => resetBlacConfig());

  it('throws when instances-per-type exceeds the cap', () => {
    configureBlac({ maxInstancesPerType: 3 });

    // 3 distinct args-derived keys are fine.
    for (const id of ['a', 'b', 'c']) {
      acquire(Item, { args: { id }, refId: `r-${id}` });
    }

    // The 4th distinct key trips the breaker.
    expect(() => acquire(Item, { args: { id: 'd' }, refId: 'r-d' })).toThrow(
      /maximum of 3 live instances/,
    );
  });

  it('throws when refs-per-instance exceeds the cap', () => {
    configureBlac({ maxRefsPerInstance: 2 });

    acquire(Item, { args: { id: 'shared' }, refId: 'consumer-1' });
    acquire(Item, { args: { id: 'shared' }, refId: 'consumer-2' });

    // A 3rd distinct consumer ref on the same instance trips the breaker.
    expect(() =>
      acquire(Item, { args: { id: 'shared' }, refId: 'consumer-3' }),
    ).toThrow(/maximum of 2 live references/);
  });

  it('warns once when emit rate exceeds maxEmitsPerSecond', () => {
    configureBlac({ maxEmitsPerSecond: 5 });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const counter = acquire(Counter, { refId: 'r' });

    // 5 is the cap; the 6th emit within the window trips the warning.
    for (let i = 0; i < 20; i++) counter.bump();

    const rateWarnings = warn.mock.calls.filter((c) =>
      String(c[0]).includes('state changes in under a second'),
    );
    expect(rateWarnings).toHaveLength(1); // fires once, not per-emit
    warn.mockRestore();
  });

  it('does not warn on emit rate when disabled (Infinity)', () => {
    configureBlac({ maxEmitsPerSecond: Infinity });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const counter = acquire(Counter, { refId: 'r' });

    for (let i = 0; i < 500; i++) counter.bump();

    const rateWarnings = warn.mock.calls.filter((c) =>
      String(c[0]).includes('state changes in under a second'),
    );
    expect(rateWarnings).toHaveLength(0);
    warn.mockRestore();
  });

  it('is disabled when the cap is non-positive / Infinity', () => {
    configureBlac({ maxInstancesPerType: 0, maxRefsPerInstance: Infinity });

    expect(() => {
      for (let i = 0; i < 50; i++) {
        acquire(Item, { args: { id: 'x' }, refId: `ref-${i}` });
      }
      for (let i = 0; i < 50; i++) {
        acquire(Item, { args: { id: `k${i}` }, refId: 'r' });
      }
    }).not.toThrow();
  });
});
