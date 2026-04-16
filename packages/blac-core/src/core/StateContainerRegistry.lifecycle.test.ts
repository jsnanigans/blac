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
import { EMIT } from './symbols';

// ============ Test Implementations ============

class TestCubit extends StateContainer<{ value: number }> {
  constructor(initialState = 0) {
    super({ value: initialState });
  }

  increment = () => {
    this[EMIT]({ value: this.state.value + 1 });
  };

  setValue = (value: number) => {
    this[EMIT]({ value });
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

const withStateChangedListener = () => {
  const listener = vi.fn();
  const unsubscribe = globalRegistry.on('stateChanged', listener);
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
      bloc.initConfig({});

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(bloc);

      unsubscribe();
    });

    it('should subscribe to stateChanged events', async () => {
      const { listener } = withStateChangedListener();

      const bloc = fixture.cubit(0);
      bloc.increment();

      await new Promise<void>((r) => queueMicrotask(r));
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(bloc, { value: 0 }, { value: 1 });
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
      bloc.initConfig({});

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it('should allow subscribing to multiple event types', async () => {
      const { listener: createdListener } = withCreatedListener();
      const { listener: stateChangedListener } = withStateChangedListener();
      const { listener: disposedListener } = withDisposedListener();

      const bloc = fixture.cubit();
      bloc.initConfig({});
      bloc.increment();
      bloc.dispose();

      expect(createdListener).toHaveBeenCalledTimes(1);
      expect(disposedListener).toHaveBeenCalledTimes(1);

      await new Promise<void>((r) => queueMicrotask(r));
      expect(stateChangedListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Unsubscription', () => {
    it('should unsubscribe from created events', () => {
      const { listener, unsubscribe } = withCreatedListener();

      const bloc = fixture.cubit();
      bloc.initConfig({});
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      const bloc2 = fixture.cubit();
      bloc2.initConfig({});
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe from stateChanged events', async () => {
      const bloc = fixture.cubit(0);
      const { listener, unsubscribe } = withStateChangedListener();

      bloc.increment();
      await new Promise<void>((r) => queueMicrotask(r));
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      bloc.increment();
      await new Promise<void>((r) => queueMicrotask(r));
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
      bloc.initConfig({});

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Emission Timing', () => {
    it('should emit created event immediately on construction', () => {
      const { listener } = withCreatedListener();

      const bloc = fixture.cubit();
      bloc.initConfig({});

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(bloc);
    });

    it('should emit stateChanged after state actually changes', async () => {
      const { listener } = withStateChangedListener();

      const bloc = fixture.cubit(0);

      bloc.setValue(0);
      await new Promise<void>((r) => queueMicrotask(r));
      expect(listener).toHaveBeenCalledTimes(1);

      bloc.increment();
      await new Promise<void>((r) => queueMicrotask(r));
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenCalledWith(bloc, { value: 0 }, { value: 1 });
    });

    it('should emit disposed after cleanup', () => {
      const { listener } = withDisposedListener();

      const bloc = fixture.cubit();
      bloc.initConfig({});
      bloc.dispose();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(bloc.isDisposed).toBe(true);
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
      bloc.initConfig({});

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
    it('should support Redux DevTools plugin pattern', async () => {
      const actions: any[] = [];
      const states: any[] = [];

      globalRegistry.on('stateChanged', (container, prevState, nextState) => {
        actions.push({
          type: 'STATE_CHANGE',
          containerName: container.name,
          timestamp: Date.now(),
        });
        states.push({ prev: prevState, next: nextState });
      });

      const bloc = fixture.cubit(0);
      bloc.increment();
      bloc.increment();

      await new Promise<void>((r) => queueMicrotask(r));
      expect(actions).toHaveLength(2);
      expect(states).toEqual([
        { prev: { value: 0 }, next: { value: 1 } },
        { prev: { value: 1 }, next: { value: 2 } },
      ]);
    });

    it('should support logging plugin pattern', async () => {
      const logs: string[] = [];

      globalRegistry.on('created', (container) => {
        logs.push(`[CREATED] ${container.name} (${container.instanceId})`);
      });

      globalRegistry.on('stateChanged', (container, prev, next) => {
        logs.push(
          `[STATE] ${container.name}: ${JSON.stringify(prev)} -> ${JSON.stringify(next)}`,
        );
      });

      globalRegistry.on('disposed', (container) => {
        logs.push(`[DISPOSED] ${container.name}`);
      });

      const bloc = fixture.cubit(0);
      bloc.initConfig({});
      bloc.increment();
      bloc.dispose();

      // created and disposed are synchronous; stateChanged is deferred
      expect(logs).toHaveLength(2);
      expect(logs[0]).toMatch(/\[CREATED\] TestCubit/);
      expect(logs[1]).toMatch(/\[DISPOSED\] TestCubit/);

      await new Promise<void>((r) => queueMicrotask(r));
      expect(logs).toHaveLength(3);
      expect(logs[2]).toBe('[STATE] TestCubit: {"value":0} -> {"value":1}');
    });

    it('should support time-travel debugging plugin pattern', async () => {
      const history: Array<{ state: any; timestamp: number }> = [];
      let _currentIndex = -1;

      globalRegistry.on('stateChanged', (container, prev, next) => {
        _currentIndex++;
        history.push({ state: next, timestamp: Date.now() });
      });

      const bloc = fixture.cubit(0);
      bloc.increment();
      bloc.increment();
      bloc.increment();

      await new Promise<void>((r) => queueMicrotask(r));
      expect(history).toHaveLength(3);
      expect(history.map((h) => h.state)).toEqual([
        { value: 1 },
        { value: 2 },
        { value: 3 },
      ]);

      const previousState = history[1].state;
      expect(previousState).toEqual({ value: 2 });
    });

    it('should support performance monitoring plugin pattern', async () => {
      const metrics = { stateChanges: 0, averageStateChangeTime: 0 };
      const startTimes = new Map<any, number>();

      globalRegistry.on('stateChanged', (container) => {
        const start = startTimes.get(container) || Date.now();
        const duration = Date.now() - start;
        metrics.stateChanges++;
        metrics.averageStateChangeTime =
          (metrics.averageStateChangeTime * (metrics.stateChanges - 1) +
            duration) /
          metrics.stateChanges;
      });

      const bloc = fixture.cubit(0);
      startTimes.set(bloc, Date.now());
      bloc.increment();
      bloc.increment();

      await new Promise<void>((r) => queueMicrotask(r));
      expect(metrics.stateChanges).toBe(2);
    });
  });

  describe('Global Registry Integration', () => {
    it('should work with globalRegistry singleton', () => {
      const { listener, unsubscribe } = withCreatedListener();

      const bloc = fixture.cubit();
      bloc.initConfig({});

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
    });

    it('should isolate custom registry from global', () => {
      const customRegistry = new StateContainerRegistry();
      const { listener: globalListener } = withCreatedListener();
      const customListener = vi.fn();
      customRegistry.on('created', customListener);

      const bloc = fixture.cubit();
      bloc.initConfig({});

      expect(globalListener).toHaveBeenCalledTimes(1);
      expect(customListener).not.toHaveBeenCalled();
    });
  });

  describe('API Stability Tests', () => {
    it('should maintain consistent event names', () => {
      const events: LifecycleEvent[] = ['created', 'stateChanged', 'disposed'];

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

      globalRegistry.on('stateChanged', (container, prev, next) => {
        expect(container).toBeDefined();
        expect(prev).toBeDefined();
        expect(next).toBeDefined();
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

      acquire(TestCubit, 'test');

      expect(globalRegistry.hasInstance(TestCubit, 'test')).toBe(true);
    });

    it('should get ref count with getRefCount()', () => {
      expect(globalRegistry.getRefCount(TestCubit, 'test')).toBe(0);

      const instance1 = acquire(TestCubit, 'test');
      expect(globalRegistry.getRefCount(TestCubit, 'test')).toBe(1);

      const instance2 = acquire(TestCubit, 'test');
      expect(instance1).toBe(instance2);
      expect(globalRegistry.getRefCount(TestCubit, 'test')).toBe(2);

      release(TestCubit, 'test');
      expect(globalRegistry.getRefCount(TestCubit, 'test')).toBe(1);

      release(TestCubit, 'test');
      expect(globalRegistry.getRefCount(TestCubit, 'test')).toBe(0);
    });

    it('should force dispose with release(forceDispose=true)', () => {
      const instance1 = acquire(TestCubit, 'test');
      const _instance2 = acquire(TestCubit, 'test');

      expect(globalRegistry.getRefCount(TestCubit, 'test')).toBe(2);
      expect(instance1.isDisposed).toBe(false);

      release(TestCubit, 'test', true);

      expect(instance1.isDisposed).toBe(true);
      expect(globalRegistry.hasInstance(TestCubit, 'test')).toBe(false);
      expect(globalRegistry.getRefCount(TestCubit, 'test')).toBe(0);
    });

    it('should handle release() on non-existent instance gracefully', () => {
      expect(() => {
        release(TestCubit, 'nonexistent');
      }).not.toThrow();
    });

    it('should emit disposed event on force dispose', () => {
      const { listener } = withDisposedListener();

      const instance = acquire(TestCubit, 'test');
      release(TestCubit, 'test', true);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(instance);
    });
  });
});
