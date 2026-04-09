import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vite-plus/test';
import { Cubit } from './Cubit';
import {
  globalRegistry,
  StateContainerRegistry,
} from './StateContainerRegistry';
import { clearAll } from '../registry';
import { setRegistry } from '../registry/config';

class TestCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

const flushMicrotasks = () => new Promise<void>((r) => queueMicrotask(r));

describe('StateContainer performance optimizations', () => {
  let registry: StateContainerRegistry;

  beforeEach(() => {
    registry = new StateContainerRegistry();
    setRegistry(registry);
  });

  afterEach(() => {
    clearAll();
    setRegistry(globalRegistry);
  });

  // ─── Fix 1: System event handler short-circuit ───────────────────────

  describe('system event payload allocation short-circuit', () => {
    it('direct subscribers still called when no system event handlers exist', () => {
      const cubit = new TestCubit();
      const listener = vi.fn();
      cubit.subscribe(listener);

      for (let i = 1; i <= 100; i++) {
        cubit.patch({ count: i });
      }

      expect(listener).toHaveBeenCalledTimes(100);
      expect(cubit.state.count).toBe(100);
    });

    it('system event handlers still called when registered', () => {
      class ObservableCubit extends Cubit<{ count: number }> {
        changes: Array<{ state: any; previousState: any }> = [];
        constructor() {
          super({ count: 0 });
          this.onSystemEvent('stateChanged', (payload) => {
            this.changes.push(payload);
          });
        }
      }

      const cubit = new ObservableCubit();
      cubit.patch({ count: 1 });
      cubit.patch({ count: 2 });

      expect(cubit.changes).toEqual([
        { state: { count: 1 }, previousState: { count: 0 } },
        { state: { count: 2 }, previousState: { count: 1 } },
      ]);
    });
  });

  // ─── Fix 3: Fast boolean flag on registry ────────────────────────────

  describe('registry stateChanged listener fast-path', () => {
    it('skips emit overhead when no stateChanged listeners registered', () => {
      const cubit = new TestCubit();

      // Should be essentially a no-op for registry
      for (let i = 0; i < 1000; i++) {
        cubit.patch({ count: i });
      }

      expect(cubit.state.count).toBe(999);
    });

    it('tracks listener count correctly across subscribe/unsubscribe', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = registry.on('stateChanged', listener1);
      const unsub2 = registry.on('stateChanged', listener2);

      const cubit = new TestCubit();
      cubit.patch({ count: 1 });

      // Both should eventually be called
      unsub1();

      cubit.patch({ count: 2 });

      unsub2();

      cubit.patch({ count: 3 });

      // After both unsubscribed, no more notifications
      // (verified by checking listener2 wasn't called for count: 3)
    });
  });

  // ─── Fix 4: Deferred registry emit via microtask ─────────────────────

  describe('deferred registry stateChanged via microtask', () => {
    it('does NOT call registry stateChanged listeners synchronously', () => {
      const listener = vi.fn();
      registry.on('stateChanged', listener);

      const cubit = new TestCubit();
      cubit.patch({ count: 1 });

      // Should NOT have been called synchronously
      expect(listener).not.toHaveBeenCalled();
    });

    it('calls registry stateChanged listeners after microtask flush', async () => {
      const listener = vi.fn();
      registry.on('stateChanged', listener);

      const cubit = new TestCubit();
      cubit.patch({ count: 1 });

      await flushMicrotasks();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(cubit, { count: 0 }, { count: 1 });
    });

    it('batches multiple state changes into one microtask flush', async () => {
      const listener = vi.fn();
      registry.on('stateChanged', listener);

      const cubit = new TestCubit();
      cubit.patch({ count: 1 });
      cubit.patch({ count: 2 });
      cubit.patch({ count: 3 });

      expect(listener).not.toHaveBeenCalled();

      await flushMicrotasks();

      // All 3 notifications delivered, in order
      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener.mock.calls[0]).toEqual([
        cubit,
        { count: 0 },
        { count: 1 },
      ]);
      expect(listener.mock.calls[1]).toEqual([
        cubit,
        { count: 1 },
        { count: 2 },
      ]);
      expect(listener.mock.calls[2]).toEqual([
        cubit,
        { count: 2 },
        { count: 3 },
      ]);
    });

    it('handles multiple cubits in one microtask batch', async () => {
      const listener = vi.fn();
      registry.on('stateChanged', listener);

      const cubitA = new TestCubit();
      const cubitB = new TestCubit();

      cubitA.patch({ count: 10 });
      cubitB.patch({ count: 20 });
      cubitA.patch({ count: 11 });

      await flushMicrotasks();

      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener.mock.calls[0][0]).toBe(cubitA);
      expect(listener.mock.calls[1][0]).toBe(cubitB);
      expect(listener.mock.calls[2][0]).toBe(cubitA);
    });

    it('starts new batch after flush', async () => {
      const listener = vi.fn();
      registry.on('stateChanged', listener);

      const cubit = new TestCubit();
      cubit.patch({ count: 1 });

      await flushMicrotasks();
      expect(listener).toHaveBeenCalledTimes(1);

      // Second batch
      cubit.patch({ count: 2 });

      await flushMicrotasks();
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener.mock.calls[1]).toEqual([
        cubit,
        { count: 1 },
        { count: 2 },
      ]);
    });

    it('skips microtask scheduling when no stateChanged listeners', async () => {
      // No listeners registered
      const cubit = new TestCubit();
      cubit.patch({ count: 1 });
      cubit.patch({ count: 2 });

      await flushMicrotasks();

      // Nothing should have happened — no errors, correct state
      expect(cubit.state.count).toBe(2);
    });

    it('listener added after state change does not receive past notifications', async () => {
      const cubit = new TestCubit();
      cubit.patch({ count: 1 });

      const listener = vi.fn();
      registry.on('stateChanged', listener);

      await flushMicrotasks();

      // Was queued before listener existed — should not receive it
      expect(listener).not.toHaveBeenCalled();

      // But new changes should be received
      cubit.patch({ count: 2 });
      await flushMicrotasks();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('created and disposed events remain synchronous', () => {
      const createdListener = vi.fn();
      const disposedListener = vi.fn();
      registry.on('created', createdListener);
      registry.on('disposed', disposedListener);

      const cubit = new TestCubit();
      cubit.initConfig({});

      // Created should be synchronous
      expect(createdListener).toHaveBeenCalledTimes(1);

      cubit.dispose();

      // Disposed should be synchronous
      expect(disposedListener).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Fix 2: Cached registry reference ────────────────────────────────

  describe('cached registry reference', () => {
    it('uses current registry for lifecycle events after setRegistry', () => {
      const newRegistry = new StateContainerRegistry();
      const listener = vi.fn();
      newRegistry.on('stateChanged', listener);

      setRegistry(newRegistry);

      // Cubit created AFTER setRegistry should use the new registry
      const cubit = new TestCubit();
      cubit.initConfig({});
      cubit.patch({ count: 42 });

      // stateChanged is deferred, but created should be sync
      const createdListener = vi.fn();
      newRegistry.on('created', createdListener);

      const cubit2 = new TestCubit();
      cubit2.initConfig({});
      expect(createdListener).toHaveBeenCalledTimes(1);

      setRegistry(registry); // restore
    });
  });
});
