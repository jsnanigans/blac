import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vite-plus/test';
import { acquire, Cubit } from '@blac/core';
import { getPluginManager } from '@blac/core/plugins';
import { flush, withTestRegistry } from '@blac/core/testing';
import { WebStorageAdapter } from './WebStorageAdapter';
import { createWebStoragePersistPlugin } from './IndexedDbPersistPlugin';

class CounterBloc extends Cubit<{ count: number }> {
  static blacName = 'Counter';
  constructor() {
    super({ count: 0 });
  }
  set(count: number) {
    this.emit({ count });
  }
}

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
  };
}

const record = (id: string, count: number) => ({
  id,
  className: 'Counter',
  instanceId: 'default',
  savedAt: 1,
  payload: { count },
});

describe('WebStorageAdapter', () => {
  it('round-trips records under a prefix', () => {
    const storage = fakeStorage();
    const adapter = new WebStorageAdapter({ storage, prefix: 'p:' });

    adapter.put(record('a', 1));

    expect(storage.getItem('p:a')).not.toBeNull();
    expect(adapter.get('a')).toEqual(record('a', 1));
    expect(adapter.get('missing')).toBeNull();
  });

  it('clear removes only prefixed keys', () => {
    const storage = fakeStorage();
    storage.setItem('other', 'x');
    const adapter = new WebStorageAdapter({ storage, prefix: 'p:' });
    adapter.put(record('a', 1));
    adapter.put(record('b', 2));

    adapter.clear();

    expect(storage.length).toBe(1);
    expect(storage.getItem('other')).toBe('x');
  });

  it('reports unavailable without storage', () => {
    expect(new WebStorageAdapter().isAvailable()).toBe(false);
  });
});

describe('web storage persist plugin', () => {
  let storage: Storage;

  beforeEach(() => {
    vi.useFakeTimers();
    storage = fakeStorage();
  });
  afterEach(() => vi.useRealTimers());

  const setup = (debounceMs?: number) => {
    const plugin = createWebStoragePersistPlugin({ storage, prefix: 'p:' });
    plugin.persist(CounterBloc, { key: 'counter', debounceMs });
    const counter = withTestRegistry((registry) => {
      getPluginManager(registry).install(plugin);
      return acquire(CounterBloc);
    });
    return { plugin, counter };
  };

  const stored = () => storage.getItem('p:counter');

  it('hydrates synchronously, before the first state read', () => {
    storage.setItem('p:counter', JSON.stringify(record('counter', 7)));

    const { counter, plugin } = setup();

    expect(counter.state).toEqual({ count: 7 });
    expect(plugin.getStatus(counter)).toMatchObject({
      phase: 'hydrated',
      hydratedFromStorage: true,
    });
  });

  it('keeps initial state when nothing is stored', () => {
    const { counter } = setup();

    expect(counter.state).toEqual({ count: 0 });
  });

  it('writes after the debounce window', async () => {
    const { counter } = setup(100);

    counter.set(3);
    await flush();
    expect(stored()).toBeNull();

    vi.advanceTimersByTime(100);

    expect(JSON.parse(stored() ?? 'null').payload).toEqual({ count: 3 });
  });

  it('flush() writes pending state immediately and only once', async () => {
    const { counter, plugin } = setup(10_000);
    const setItem = vi.spyOn(storage, 'setItem');

    counter.set(5);
    await flush();
    plugin.flush();
    vi.advanceTimersByTime(10_000);

    expect(JSON.parse(stored() ?? 'null').payload).toEqual({ count: 5 });
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it('flushes on pagehide until uninstalled', () => {
    const listeners = new Map<string, () => void>();
    vi.stubGlobal('addEventListener', (type: string, fn: () => void) =>
      listeners.set(type, fn),
    );
    vi.stubGlobal('removeEventListener', (type: string) =>
      listeners.delete(type),
    );
    try {
      const { plugin } = setup();
      const flushSpy = vi.spyOn(plugin, 'flush');

      listeners.get('pagehide')?.();
      expect(flushSpy).toHaveBeenCalledTimes(1);

      plugin.onUninstall?.();
      expect(listeners.has('pagehide')).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('reports a failed write through onError', async () => {
    const onError = vi.fn();
    const plugin = createWebStoragePersistPlugin({ storage });
    plugin.persist(CounterBloc, { key: 'counter', onError });
    const counter = withTestRegistry((registry) => {
      getPluginManager(registry).install(plugin);
      return acquire(CounterBloc);
    });
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    counter.set(1);
    await flush();
    vi.advanceTimersByTime(0);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'quota' }),
      expect.anything(),
    );
  });
});
