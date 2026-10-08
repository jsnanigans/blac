import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vite-plus/test';
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
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('disposes a create that never took a ref', () => {
    const registry = new StateContainerRegistry();
    const bloc = create(registry, Speculative);

    vi.runAllTimers();

    expect(bloc.$blac.disposed).toBe(true);
    expect(registry.getInstancesMap(Speculative).size).toBe(0);
  });

  // SSR shape: a render pass creates the instance but there is no commit to
  // claim ownership, so nothing would ever release it.
  it('leaves no instance behind for a render that never commits', () => {
    const registry = new StateContainerRegistry();
    create(registry, Speculative);

    vi.runAllTimers();

    expect(registry.getAll(Speculative)).toEqual([]);
    expect(registry.getInstancesMap(Speculative).size).toBe(0);
  });

  it('spares an instance that gained a ref, and any keepAlive', () => {
    const registry = new StateContainerRegistry();
    const owned = create(registry, Speculative);
    registry.acquire(Speculative, 'k', { refId: 'r' });
    const kept = create(registry, KeptAlive);

    vi.runAllTimers();

    expect(owned.$blac.disposed).toBe(false);
    expect(kept.$blac.disposed).toBe(false);
  });

  it('cancels the sweep when a non-speculative caller reuses the entry', () => {
    const registry = new StateContainerRegistry();
    const bloc = create(registry, Speculative);
    registry.ensure(Speculative, 'k');

    vi.runAllTimers();

    expect(bloc.$blac.disposed).toBe(false);
  });

  it('restarts the delay when a render re-acquires the pending entry', () => {
    const registry = new StateContainerRegistry();
    const bloc = create(registry, Speculative);
    vi.advanceTimersByTime(4000);
    create(registry, Speculative);
    vi.advanceTimersByTime(4000);

    expect(bloc.$blac.disposed).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(bloc.$blac.disposed).toBe(true);
  });
});
