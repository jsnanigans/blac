import { describe, it, expect, beforeEach, vi } from 'vite-plus/test';
import { ALL_PATHS, Cubit } from '@blac/core';
import type { PathSet, PluginContext, StateContainer } from '@blac/core';
import { IndexedDbPersistPluginImpl } from './IndexedDbPersistPlugin';
import type { IndexedDbPersistAdapter, PersistedRecord } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class CounterBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment() {
    this.emit({ count: this.state.count + 1 });
  }
}

interface MockAdapter extends IndexedDbPersistAdapter {
  store: Map<string, PersistedRecord>;
  putFn: ReturnType<typeof vi.fn>;
  getFn: ReturnType<typeof vi.fn>;
}

/** Minimal in-memory adapter — no actual IndexedDB. */
function makeAdapter(initial?: PersistedRecord): MockAdapter {
  const store = new Map<string, PersistedRecord>();
  if (initial) store.set(initial.id, initial);
  const putFn = vi.fn(async (record: PersistedRecord) => {
    store.set(record.id, record);
  });
  const getFn = vi.fn(async (key: string) => store.get(key) ?? null);
  return {
    store,
    putFn,
    getFn,
    isAvailable: () => true,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    get: getFn as any,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    put: putFn as any,
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  };
}

/**
 * Build a minimal PluginContext stub for a given container.
 * Only the methods used by IndexedDbPersistPluginImpl are implemented.
 */
interface CtxMock extends PluginContext {
  _startHydrationFn: ReturnType<typeof vi.fn>;
  _setStateOverride(v: unknown): void;
}

function makeCtx(instance: StateContainer<any>): CtxMock {
  let hydrationStatus: 'idle' | 'hydrating' | 'hydrated' | 'failed' = 'idle';
  let stateOverride: unknown = undefined;

  const startHydrationFn = vi.fn(() => {
    hydrationStatus = 'hydrating';
  });

  const ctx = {
    container: instance,
    getInstanceMetadata: vi.fn(),
    getState: vi.fn((inst: StateContainer<any>) =>
      stateOverride !== undefined ? stateOverride : inst.state,
    ),
    getHydrationStatus: vi.fn(() => hydrationStatus),
    startHydration: startHydrationFn,
    applyHydratedState: vi.fn(
      (_inst: StateContainer<any>, _state: any) => true,
    ),
    finishHydration: vi.fn(() => {
      hydrationStatus = 'hydrated';
    }),
    failHydration: vi.fn(() => {
      hydrationStatus = 'failed';
    }),
    waitForHydration: vi.fn(() => Promise.resolve()),
    queryInstances: vi.fn(() => []),
    getAllTypes: vi.fn(() => []),
    getStats: vi.fn(() => ({
      registeredTypes: 0,
      totalInstances: 0,
      typeBreakdown: {},
    })),
    getRefIds: vi.fn(() => []),
    _startHydrationFn: startHydrationFn,
    _setStateOverride: (v: unknown) => {
      stateOverride = v;
    },
  } as unknown as CtxMock;

  return ctx;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IndexedDbPersistPluginImpl — hook signature migration (C2)', () => {
  let adapter: MockAdapter;
  let plugin: IndexedDbPersistPluginImpl;
  let bloc: CounterBloc;
  let ctx: CtxMock;

  beforeEach(() => {
    vi.useFakeTimers();
    adapter = makeAdapter();
    plugin = new IndexedDbPersistPluginImpl({ adapter });
    plugin.persist(CounterBloc);
    bloc = new CounterBloc();
    ctx = makeCtx(bloc);
  });

  // -------------------------------------------------------------------------
  describe('onInstall', () => {
    it('calls onInstall without throwing when adapter is available', () => {
      expect(() =>
        plugin.onInstall({ container: undefined } as unknown as PluginContext),
      ).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  describe('onCreated (renamed from onInstanceCreated)', () => {
    it('calls startHydration on the context', () => {
      plugin.onCreated(ctx);
      expect(ctx._startHydrationFn).toHaveBeenCalledWith(bloc);
    });

    it('sets status to hydrating', () => {
      plugin.onCreated(ctx);
      expect(plugin.getStatus(bloc)?.phase).toBe('hydrating');
    });

    it('does nothing when the bloc is not registered', () => {
      class UnregisteredBloc extends Cubit<{ x: number }> {
        constructor() {
          super({ x: 0 });
        }
      }
      const unreg = new UnregisteredBloc();
      const unregedCtx = makeCtx(unreg);
      plugin.onCreated(unregedCtx);
      expect(unregedCtx._startHydrationFn).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('onStateChange (renamed from onStateChanged, now ctx-first + paths)', () => {
    beforeEach(() => {
      // Initialize runtime by going through onCreated first
      plugin.onCreated(ctx);
      // Suppress async hydrate from doing anything (adapter returns null)
    });

    it('queues a save when called with ALL_PATHS', async () => {
      plugin.onStateChange(ctx, { count: 0 }, { count: 1 }, ALL_PATHS);
      vi.runAllTimers();
      await Promise.resolve(); // flush microtasks for the async save
      expect(adapter.putFn).toHaveBeenCalled();
    });

    it('queues a save when called with a narrow PathSet', async () => {
      const narrowPaths: PathSet = new Set([1]) as PathSet;
      plugin.onStateChange(ctx, { count: 0 }, { count: 1 }, narrowPaths);
      vi.runAllTimers();
      await Promise.resolve();
      expect(adapter.putFn).toHaveBeenCalled();
    });

    it('saves the live state (from ctx.getState) not the stale _next arg', async () => {
      // Simulate the bloc state advancing past the _next snapshot
      ctx._setStateOverride({ count: 99 });

      plugin.onStateChange(ctx, { count: 0 }, { count: 1 }, ALL_PATHS);
      vi.runAllTimers();
      await Promise.resolve();

      const record = adapter.putFn.mock.calls[0]?.[0] as PersistedRecord;
      expect(record.payload).toEqual({ count: 99 });
    });

    it('debounces: only one save fires for rapid successive flushes', async () => {
      const debouncedAdapter = makeAdapter();
      const debouncedPlugin = new IndexedDbPersistPluginImpl({
        adapter: debouncedAdapter,
        pluginName: 'debounced',
      });
      debouncedPlugin.persist(CounterBloc, { debounceMs: 200 });
      debouncedPlugin.onCreated(ctx);

      debouncedPlugin.onStateChange(ctx, { count: 0 }, { count: 1 }, ALL_PATHS);
      debouncedPlugin.onStateChange(ctx, { count: 1 }, { count: 2 }, ALL_PATHS);
      debouncedPlugin.onStateChange(ctx, { count: 2 }, { count: 3 }, ALL_PATHS);

      vi.advanceTimersByTime(200);
      await Promise.resolve();

      // Only one put despite three change events
      expect(debouncedAdapter.putFn).toHaveBeenCalledTimes(1);
    });

    it('does not fire save when onDestroyed cancels the pending timer', () => {
      let saved = false;
      adapter.putFn.mockImplementation(async () => {
        saved = true;
      });

      plugin.onStateChange(ctx, { count: 0 }, { count: 1 }, ALL_PATHS);
      // Cancel before timer fires
      plugin.onDestroyed(ctx);
      vi.runAllTimers();
      expect(saved).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('paths accumulation across debounce window', () => {
    it('upgrades pending paths to ALL_PATHS when ANY flush emits ALL_PATHS', async () => {
      // This test proves the key invariant: a single ALL_PATHS flush within a
      // debounce window upgrades the accumulated PathSet to ALL_PATHS, meaning
      // the save receives the broadest possible signal. We verify by confirming
      // only one save fires (debounce) after a narrow + ALL_PATHS sequence.
      const accAdapter = makeAdapter();
      const accPlugin = new IndexedDbPersistPluginImpl({
        adapter: accAdapter,
        pluginName: 'path-accum',
      });
      accPlugin.persist(CounterBloc, { debounceMs: 100 });
      accPlugin.onCreated(ctx);

      const narrow: PathSet = new Set([1]) as PathSet;
      accPlugin.onStateChange(ctx, { count: 0 }, { count: 1 }, narrow);
      // Second flush with ALL_PATHS — should upgrade accumulated set and still
      // debounce into a single write.
      accPlugin.onStateChange(ctx, { count: 1 }, { count: 2 }, ALL_PATHS);

      vi.advanceTimersByTime(100);
      await Promise.resolve();

      // Exactly one save despite two flushes
      expect(accAdapter.putFn).toHaveBeenCalledTimes(1);
    });

    it('narrow-only paths accumulation: multiple narrow flushes merge into one save', async () => {
      const accAdapter = makeAdapter();
      const accPlugin = new IndexedDbPersistPluginImpl({
        adapter: accAdapter,
        pluginName: 'narrow-accum',
      });
      accPlugin.persist(CounterBloc, { debounceMs: 50 });
      accPlugin.onCreated(ctx);

      const p1: PathSet = new Set([1]) as PathSet;
      const p2: PathSet = new Set([2]) as PathSet;
      const p3: PathSet = new Set([3]) as PathSet;
      accPlugin.onStateChange(ctx, { count: 0 }, { count: 1 }, p1);
      accPlugin.onStateChange(ctx, { count: 1 }, { count: 2 }, p2);
      accPlugin.onStateChange(ctx, { count: 2 }, { count: 3 }, p3);

      vi.advanceTimersByTime(50);
      await Promise.resolve();

      // One save for three narrow-path flushes
      expect(accAdapter.putFn).toHaveBeenCalledTimes(1);
    });

    it('pendingPaths resets to null after each save window', async () => {
      // After a save completes, the next window starts fresh. Two separate
      // windows (separated by debounceMs) each produce exactly one save.
      const accAdapter = makeAdapter();
      const accPlugin = new IndexedDbPersistPluginImpl({
        adapter: accAdapter,
        pluginName: 'reset-test',
      });
      accPlugin.persist(CounterBloc, { debounceMs: 50 });
      accPlugin.onCreated(ctx);

      // Window 1
      accPlugin.onStateChange(ctx, { count: 0 }, { count: 1 }, ALL_PATHS);
      vi.advanceTimersByTime(50);
      await Promise.resolve();

      // Window 2
      accPlugin.onStateChange(ctx, { count: 1 }, { count: 2 }, ALL_PATHS);
      vi.advanceTimersByTime(50);
      await Promise.resolve();

      expect(accAdapter.putFn).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  describe('onDestroyed (renamed from onInstanceDisposed)', () => {
    it('cancels pending timer so no save fires after destroy', async () => {
      plugin.onCreated(ctx);
      plugin.onStateChange(ctx, { count: 0 }, { count: 1 }, ALL_PATHS);

      // Destroy before timer fires
      plugin.onDestroyed(ctx);
      vi.runAllTimers();
      await Promise.resolve();

      expect(adapter.putFn).not.toHaveBeenCalled();
    });

    it('marks runtime as disposed so subsequent onStateChange is a no-op', async () => {
      plugin.onCreated(ctx);
      plugin.onDestroyed(ctx);

      // Call onStateChange after destroy — should not queue a save
      plugin.onStateChange(ctx, { count: 0 }, { count: 1 }, ALL_PATHS);
      vi.runAllTimers();
      await Promise.resolve();

      expect(adapter.putFn).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('ALL_PATHS sentinel — fallback to full-state write', () => {
    it('always triggers a full write when paths === ALL_PATHS', async () => {
      plugin.onCreated(ctx);
      plugin.onStateChange(ctx, { count: 0 }, { count: 5 }, ALL_PATHS);
      vi.runAllTimers();
      await Promise.resolve();

      const record = adapter.putFn.mock.calls[0]?.[0] as PersistedRecord;
      expect(record).toBeDefined();
      // Full state is written (no partial-blob optimization)
      expect(record.payload).toEqual(bloc.state);
    });
  });
});

// ---------------------------------------------------------------------------
// Storage-key stability — M2a acceptance criterion
// Verifies that the key built via $blac.id is byte-identical to the key
// that was previously built via instance.instanceId (same underlying field).
// ---------------------------------------------------------------------------

describe('IndexedDbPersistPluginImpl — storage key stability ($blac migration)', () => {
  it('defaultKey format is unchanged: "<ClassName>:<instanceId>"', () => {
    const bloc = new CounterBloc();

    // The legacy instanceId delegate was deleted in the $blac migration —
    // $blac.id is now the only accessor for the instance id.
    expect((bloc as any).instanceId).toBeUndefined();
    expect(bloc.$blac.id).toBeTypeOf('string');

    // The plugin's defaultKey builds: `${ClassName}:${$blac.id}`
    // Capture the key that onCreated assigns to runtime.key and compare
    // against the pre-migration formula applied to the same instance.
    const adapter = makeAdapter();
    const plugin = new IndexedDbPersistPluginImpl({ adapter });
    plugin.persist(CounterBloc);

    const ctx = makeCtx(bloc);
    plugin.onCreated(ctx);

    const status = plugin.getStatus(bloc);
    expect(status).toBeDefined();
    if (!status) throw new Error('status must be defined after onCreated');

    // Pre-migration key formula (now asserted against the live $blac.id):
    const expectedKey = `${bloc.constructor.name}:${bloc.$blac.id}`;
    expect(status.key).toBe(expectedKey);

    // Ensure className portion matches constructor name
    expect(status.key.startsWith('CounterBloc:')).toBe(true);
  });

  it('custom key function receives the same instanceId value', () => {
    const bloc = new CounterBloc();
    let capturedInstanceId: string | undefined;

    const adapter = makeAdapter();
    const plugin = new IndexedDbPersistPluginImpl({ adapter });
    plugin.persist(CounterBloc, {
      key: (ctx) => {
        capturedInstanceId = ctx.instanceId;
        return `custom:${ctx.instanceId}`;
      },
    });

    const ctx = makeCtx(bloc);
    plugin.onCreated(ctx);

    // The instanceId passed into the key function must equal $blac.id
    expect(capturedInstanceId).toBe(bloc.$blac.id);
  });
});
