import { describe, it, expect } from 'vite-plus/test';
import { StateContainerRegistry } from './StateContainerRegistry';
import { Cubit } from './Cubit';

class Speculative extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
}

class KeptAlive extends Speculative {
  static keepAlive = true;
}

const create = (registry: StateContainerRegistry, Type: typeof Speculative) =>
  registry.acquire(Type, 'k', {
    countRef: false,
    sweepIfUnowned: true,
  });

describe('zero-ref sweep', () => {
  it('disposes a create that never took a ref', async () => {
    const registry = new StateContainerRegistry();
    const bloc = create(registry, Speculative);

    await Promise.resolve();

    expect(bloc.$blac.disposed).toBe(true);
    expect(registry.getInstancesMap(Speculative).size).toBe(0);
  });

  // SSR shape: a render pass creates the instance but there is no commit to
  // claim ownership, so nothing would ever release it.
  it('leaves no instance behind for a render that never commits', async () => {
    const registry = new StateContainerRegistry();
    create(registry, Speculative);

    await Promise.resolve();

    expect(registry.getAll(Speculative)).toEqual([]);
    expect(registry.getInstancesMap(Speculative).size).toBe(0);
  });

  it('spares an instance that gained a ref, and any keepAlive', async () => {
    const registry = new StateContainerRegistry();
    const owned = create(registry, Speculative);
    registry.acquire(Speculative, 'k', { refId: 'r' });
    const kept = create(registry, KeptAlive);

    await Promise.resolve();

    expect(owned.$blac.disposed).toBe(false);
    expect(kept.$blac.disposed).toBe(false);
  });
});
