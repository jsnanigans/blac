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
import { INIT_CONFIG } from './symbols';
import { ALL_PATHS } from '@dirtytalk/structural';

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
    it('direct subscribers still called when no system event handlers exist', async () => {
      const cubit = new TestCubit();
      const listener = vi.fn();
      cubit.channel.subscribe(
        () => ALL_PATHS,
        () => listener(cubit.state),
      );

      for (let i = 1; i <= 100; i++) {
        cubit.patch({ count: i });
      }
      await flushMicrotasks();

      // 100 synchronous patches coalesce into a single channel flush →
      // one listener call with the final state.
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith({ count: 100 });
      expect(cubit.state.count).toBe(100);
    });

    it('system event handlers still called when registered', async () => {
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
      await flushMicrotasks();
      cubit.patch({ count: 2 });
      await flushMicrotasks();

      expect(cubit.changes).toEqual([
        { state: { count: 1 }, previousState: { count: 0 } },
        { state: { count: 2 }, previousState: { count: 1 } },
      ]);
    });
  });

  // ─── Fix 3: Fast boolean flag on registry ────────────────────────────

  // ─── Fix 4: Deferred registry emit via microtask ─────────────────────

  // ─── Fix 2: Cached registry reference ────────────────────────────────

  describe('cached registry reference', () => {
    it('uses current registry for lifecycle events after setRegistry', () => {
      const newRegistry = new StateContainerRegistry();
      setRegistry(newRegistry);

      const createdListener = vi.fn();
      newRegistry.on('created', createdListener);

      const cubit2 = new TestCubit();
      cubit2[INIT_CONFIG]({});
      expect(createdListener).toHaveBeenCalledTimes(1);

      setRegistry(registry); // restore
    });
  });
});
