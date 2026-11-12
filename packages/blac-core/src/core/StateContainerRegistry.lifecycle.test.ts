import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vite-plus/test';
import { StateContainer } from './StateContainer';
import {
  StateContainerRegistry,
  globalRegistry,
  type LifecycleEvent,
} from './StateContainerRegistry';
import { acquire, release } from '../registry';
import { INIT_CONFIG } from './symbols';

// ============ Test Implementations ============

class TestCubit extends StateContainer<{ value: number }, { id?: string }> {
  constructor(initialState = 0) {
    super({ value: initialState });
  }

  static key = (a?: { id?: string }) => a?.id ?? 'default';

  increment = () => {
    this.emit({ value: this.state.value + 1 });
  };

  setValue = (value: number) => {
    this.emit({ value });
  };
}

// ============ Test Helpers ============

const resetState = () => {
  globalRegistry.clearAll();
};

const withCreatedListener = () => {
  const listener = vi.fn();
  const unsubscribe = globalRegistry.on('created', listener);
  return { listener, unsubscribe };
};

const withDisposedListener = () => {
  const listener = vi.fn();
  const unsubscribe = globalRegistry.on('disposed', listener);
  return { listener, unsubscribe };
};

// ============ Fixtures ============

const fixture = {
  cubit: (initialState = 0) => new TestCubit(initialState),
};

// ============ Tests ============

describe('StateContainerRegistry - Lifecycle Events (Plugin API)', () => {
  beforeEach(resetState);
  afterEach(resetState);

  describe('Event Subscription', () => {
    it('should subscribe to created events', () => {
      const { listener, unsubscribe } = withCreatedListener();

      const bloc = fixture.cubit();
      bloc[INIT_CONFIG]({});

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(bloc);

      unsubscribe();
    });

    it('should subscribe to disposed events', () => {
      const { listener } = withDisposedListener();

      const bloc = fixture.cubit();
      bloc.dispose();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(bloc);
    });

    it('should allow multiple listeners for same event', () => {
      const { listener: listener1 } = withCreatedListener();
      const { listener: listener2 } = withCreatedListener();
      const { listener: listener3 } = withCreatedListener();

      const bloc = fixture.cubit();
      bloc[INIT_CONFIG]({});

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it('should allow subscribing to multiple event types', async () => {
      const { listener: createdListener } = withCreatedListener();
      const { listener: disposedListener } = withDisposedListener();

      const bloc = fixture.cubit();
      bloc[INIT_CONFIG]({});
      bloc.dispose();

      expect(createdListener).toHaveBeenCalledTimes(1);
      expect(disposedListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Unsubscription', () => {
    it('should unsubscribe from created events', () => {
      const { listener, unsubscribe } = withCreatedListener();

      const bloc = fixture.cubit();
      bloc[INIT_CONFIG]({});
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      const bloc2 = fixture.cubit();
      bloc2[INIT_CONFIG]({});
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple unsubscribes safely', () => {
      const { listener, unsubscribe } = withCreatedListener();

      unsubscribe();
      unsubscribe();
      unsubscribe();

      new TestCubit();
      expect(listener).not.toHaveBeenCalled();
    });

    it('should only unsubscribe specific listener', () => {
      const { listener: listener1, unsubscribe: unsubscribe1 } =
        withCreatedListener();
      const { listener: listener2 } = withCreatedListener();

      unsubscribe1();

      const bloc = fixture.cubit();
      bloc[INIT_CONFIG]({});

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Emission Timing', () => {
    it('should emit created event immediately on construction', () => {
      const { listener } = withCreatedListener();

      const bloc = fixture.cubit();
      bloc[INIT_CONFIG]({});

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(bloc);
    });

    it('should emit disposed after cleanup', () => {
      const { listener } = withDisposedListener();

      const bloc = fixture.cubit();
      bloc[INIT_CONFIG]({});
      bloc.dispose();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(bloc.$blac.disposed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle listener errors without breaking other listeners', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const listener1 = vi.fn(() => {
        throw new Error('Listener 1 error');
      });
      const listener2 = vi.fn();
      globalRegistry.on('created', listener1);
      globalRegistry.on('created', listener2);

      const bloc = fixture.cubit();
      bloc[INIT_CONFIG]({});

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Listener error for 'created'"),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should not throw when emitting with no listeners', () => {
      expect(() => {
        new TestCubit();
      }).not.toThrow();
    });

    it('should handle async errors in listeners', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const listener = vi.fn(async () => {
        throw new Error('Async error');
      });
      globalRegistry.on('created', listener);

      expect(() => {
        new TestCubit();
      }).not.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Plugin Use Cases', () => {
    it('should support logging plugin pattern', async () => {
      const logs: string[] = [];

      globalRegistry.on('created', (container) => {
        logs.push(`[CREATED] ${container.$blac.name} (${container.$blac.id})`);
      });

      globalRegistry.on('disposed', (container) => {
        logs.push(`[DISPOSED] ${container.$blac.name}`);
      });

      const bloc = fixture.cubit(0);
      bloc[INIT_CONFIG]({});
      bloc.dispose();

      expect(logs).toHaveLength(2);
      expect(logs[0]).toMatch(/\[CREATED\] TestCubit/);
      expect(logs[1]).toMatch(/\[DISPOSED\] TestCubit/);
    });
  });

  describe('Global Registry Integration', () => {
    it('should work with globalRegistry singleton', () => {
      const { listener, unsubscribe } = withCreatedListener();

      const bloc = fixture.cubit();
      bloc[INIT_CONFIG]({});

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
    });

    it('should isolate custom registry from global', () => {
      const customRegistry = new StateContainerRegistry();
      const { listener: globalListener } = withCreatedListener();
      const customListener = vi.fn();
      customRegistry.on('created', customListener);

      const bloc = fixture.cubit();
      bloc[INIT_CONFIG]({});

      expect(globalListener).toHaveBeenCalledTimes(1);
      expect(customListener).not.toHaveBeenCalled();
    });
  });

  describe('API Stability Tests', () => {
    it('should maintain consistent event names', () => {
      const events: LifecycleEvent[] = ['created', 'disposed'];

      events.forEach((event) => {
        expect(() => {
          globalRegistry.on(event, () => {});
        }).not.toThrow();
      });
    });

    it('should maintain consistent listener signatures', () => {
      globalRegistry.on('created', (container: StateContainer<any>) => {
        expect(container).toBeDefined();
      });

      globalRegistry.on('disposed', (container) => {
        expect(container).toBeDefined();
      });

      new TestCubit();
    });

    it('should return unsubscribe function from on()', () => {
      const unsubscribe = globalRegistry.on('created', () => {});

      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('Additional Registry Methods', () => {
    it('should check if instance exists with hasInstance()', () => {
      expect(globalRegistry.hasInstance(TestCubit, 'test')).toBe(false);

      acquire(TestCubit, { args: { id: 'test' } });

      expect(globalRegistry.hasInstance(TestCubit, 'test')).toBe(true);
    });

    it('should get ref count with getRefCount()', () => {
      expect(globalRegistry.getRefCount(TestCubit, 'test')).toBe(0);

      const instance1 = acquire(TestCubit, { args: { id: 'test' } });
      expect(globalRegistry.getRefCount(TestCubit, 'test')).toBe(1);

      const instance2 = acquire(TestCubit, { args: { id: 'test' } });
      expect(instance1).toBe(instance2);
      expect(globalRegistry.getRefCount(TestCubit, 'test')).toBe(2);

      release(TestCubit, { args: { id: 'test' } });
      expect(globalRegistry.getRefCount(TestCubit, 'test')).toBe(1);

      release(TestCubit, { args: { id: 'test' } });
      expect(globalRegistry.getRefCount(TestCubit, 'test')).toBe(0);
    });

    it('should force dispose with release(forceDispose=true)', () => {
      const instance1 = acquire(TestCubit, { args: { id: 'test' } });
      const _instance2 = acquire(TestCubit, { args: { id: 'test' } });

      expect(globalRegistry.getRefCount(TestCubit, 'test')).toBe(2);
      expect(instance1.$blac.disposed).toBe(false);

      release(TestCubit, { args: { id: 'test' }, forceDispose: true });

      expect(instance1.$blac.disposed).toBe(true);
      expect(globalRegistry.hasInstance(TestCubit, 'test')).toBe(false);
      expect(globalRegistry.getRefCount(TestCubit, 'test')).toBe(0);
    });

    it('should handle release() on non-existent instance gracefully', () => {
      expect(() => {
        release(TestCubit, { args: { id: 'nonexistent' } });
      }).not.toThrow();
    });

    it('should emit disposed event on force dispose', () => {
      const { listener } = withDisposedListener();

      const instance = acquire(TestCubit, { args: { id: 'test' } });
      release(TestCubit, { args: { id: 'test' }, forceDispose: true });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(instance);
    });

    it('should exclude a directly-disposed instance from getAll()', () => {
      const kept = acquire(TestCubit, { args: { id: 'kept' } });
      const disposed = acquire(TestCubit, { args: { id: 'disposed' } });

      disposed.dispose();

      const all = globalRegistry.getAll(TestCubit);
      expect(all).toContain(kept);
      expect(all).not.toContain(disposed);
    });
  });
});
