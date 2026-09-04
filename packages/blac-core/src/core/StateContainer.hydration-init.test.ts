import { describe, it, expect, beforeEach, afterEach } from 'vite-plus/test';
import { StateContainer } from './StateContainer';
import { globalRegistry } from './StateContainerRegistry';

// Mirrors the persist plugin: onCreated begins hydration synchronously, the
// stored state arrives later.
class SeedingBloc extends StateContainer<{ n: number }, { seed: number }> {
  constructor() {
    super({ n: 0 });
  }
  init(args?: { seed: number }) {
    if (args) this.emit({ n: args.seed });
  }
}

const reset = () => globalRegistry.clearAll();

describe('hydration vs init() seeding', () => {
  beforeEach(reset);
  afterEach(reset);

  it('keeps persisted state for a bloc that seeds in init()', async () => {
    const unsub = globalRegistry.on('created', (instance) => {
      instance.$blac.hydration.begin();
    });

    const bloc = globalRegistry.acquire(SeedingBloc, 'k', {
      refId: 'r',
      args: { seed: 7 },
    });

    expect(bloc.$blac.hydration.changedWhileHydrating).toBe(false);
    expect(bloc.$blac.hydration.apply({ n: 99 })).toBe(true);
    expect(bloc.state.n).toBe(99);

    unsub();
  });
});
