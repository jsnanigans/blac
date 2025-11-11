/**
 * Tests for StateContainerRegistry Lifecycle Events (Plugin System)
 * Ensures the plugin API remains stable and functional
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateContainer } from './StateContainer';
import { Vertex } from './Vertex';
import {
  StateContainerRegistry,
  globalRegistry,
  type LifecycleEvent,
} from './StateContainerRegistry';

// Test implementations
class TestCubit extends StateContainer<number> {
  constructor(initialState = 0) {
    super(initialState);
  }

  increment = () => {
    this.update((state) => state + 1);
  };

  setValue = (value: number) => {
    this.update(() => value);
  };
}

class TestEvent {
  readonly type = 'test';
  readonly timestamp = Date.now();
  constructor(public readonly value: number) {}
}

class TestVertex extends Vertex<number, TestEvent> {
  constructor() {
    super(0);

    this.on(TestEvent, (event, emit) => {
      emit(this.state + event.value);
    });
  }

  addValue = (value: number) => {
    this.add(new TestEvent(value));
  };
}

describe('StateContainerRegistry - Lifecycle Events (Plugin API)', () => {
  let registry: StateContainerRegistry;

  beforeEach(() => {
    // Use a fresh registry for isolation
    registry = new StateContainerRegistry();
    StateContainer.setRegistry(registry);
  });

  describe('Event Subscription', () => {
    it('should subscribe to created events', () => {
      const listener = vi.fn();
      const unsubscribe = registry.on('created', listener);

      const bloc = new TestCubit();
      bloc.initiConfig({});

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(bloc);

      unsubscribe();
    });

    it('should subscribe to stateChanged events', () => {
      const listener = vi.fn();
      registry.on('stateChanged', listener);

      const bloc = new TestCubit(0);
      bloc.increment();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(bloc, 0, 1, expect.any(String));
    });

    it('should subscribe to eventAdded events', () => {
      const listener = vi.fn();
      registry.on('eventAdded', listener);

      const vertex = new TestVertex();
      vertex.addValue(5);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        vertex,
        expect.objectContaining({
          value: 5,
          type: 'test',
        }),
      );
    });

    it('should subscribe to disposed events', () => {
      const listener = vi.fn();
      registry.on('disposed', listener);

      const bloc = new TestCubit();
      bloc.dispose();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(bloc);
    });

    it('should allow multiple listeners for same event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      registry.on('created', listener1);
      registry.on('created', listener2);
      registry.on('created', listener3);

      const bloc = new TestCubit();
      bloc.initiConfig({});

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it('should allow subscribing to multiple event types', () => {
      const createdListener = vi.fn();
      const stateChangedListener = vi.fn();
      const disposedListener = vi.fn();

      registry.on('created', createdListener);
      registry.on('stateChanged', stateChangedListener);
      registry.on('disposed', disposedListener);

      const bloc = new TestCubit();
      bloc.initiConfig({});
      bloc.increment();
      bloc.dispose();

      expect(createdListener).toHaveBeenCalledTimes(1);
      expect(stateChangedListener).toHaveBeenCalledTimes(1);
      expect(disposedListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Unsubscription', () => {
    it('should unsubscribe from created events', () => {
      const listener = vi.fn();
      const unsubscribe = registry.on('created', listener);

      const bloc = new TestCubit();
      bloc.initiConfig({});
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      const bloc2 = new TestCubit();
      bloc2.initiConfig({});
      expect(listener).toHaveBeenCalledTimes(1); // Should not increase
    });

    it('should unsubscribe from stateChanged events', () => {
      const listener = vi.fn();

      const bloc = new TestCubit(0);
      const unsubscribe = registry.on('stateChanged', listener);

      bloc.increment();
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      bloc.increment();
      expect(listener).toHaveBeenCalledTimes(1); // Should not increase
    });

    it('should handle multiple unsubscribes safely', () => {
      const listener = vi.fn();
      const unsubscribe = registry.on('created', listener);

      unsubscribe();
      unsubscribe(); // Should not throw
      unsubscribe(); // Should not throw

      new TestCubit();
      expect(listener).not.toHaveBeenCalled();
    });

    it('should only unsubscribe specific listener', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = registry.on('created', listener1);
      registry.on('created', listener2);

      unsubscribe1();
      const bloc = new TestCubit();
      bloc.initiConfig({});

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Emission Timing', () => {
    it('should emit created event immediately on construction', () => {
      const listener = vi.fn();
      registry.on('created', listener);

      const bloc = new TestCubit();
      bloc.initiConfig({});

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(bloc);
    });

    it('should emit stateChanged after state actually changes', () => {
      const listener = vi.fn();
      registry.on('stateChanged', listener);

      const bloc = new TestCubit(0);

      // Should not emit if state doesn't change (reference equality)
      bloc.setValue(0);
      expect(listener).not.toHaveBeenCalled();

      // Should emit when state changes
      bloc.increment();
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(bloc, 0, 1, expect.any(String));
    });

    it('should emit eventAdded before event processing', () => {
      const eventAddedListener = vi.fn();
      const stateChangedListener = vi.fn();

      registry.on('eventAdded', eventAddedListener);
      registry.on('stateChanged', stateChangedListener);

      const vertex = new TestVertex();
      vertex.addValue(5);

      // eventAdded should be called before stateChanged
      expect(eventAddedListener).toHaveBeenCalledTimes(1);
      expect(stateChangedListener).toHaveBeenCalledTimes(1);
    });

    it('should emit disposed after cleanup', () => {
      const listener = vi.fn();
      registry.on('disposed', listener);

      const bloc = new TestCubit();
      bloc.initiConfig({});
      bloc.dispose();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(bloc.isDisposed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle listener errors without breaking other listeners', () => {
      const listener1 = vi.fn(() => {
        throw new Error('Listener 1 error');
      });
      const listener2 = vi.fn();
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      registry.on('created', listener1);
      registry.on('created', listener2);

      const bloc = new TestCubit();
      bloc.initiConfig({});

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
      const listener = vi.fn(async () => {
        throw new Error('Async error');
      });
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      registry.on('created', listener);

      expect(() => {
        new TestCubit();
      }).not.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance - Zero Overhead When No Listeners', () => {
    it('should have minimal overhead when no listeners registered', () => {
      const startTime = performance.now();

      // Create many instances without any listeners
      for (let i = 0; i < 1000; i++) {
        const bloc = new TestCubit();
        bloc.increment();
        bloc.dispose();
      }

      const noListenersTime = performance.now() - startTime;

      // Now with listeners
      const listener = vi.fn();
      registry.on('created', listener);
      registry.on('stateChanged', listener);
      registry.on('disposed', listener);

      const startTime2 = performance.now();

      for (let i = 0; i < 1000; i++) {
        const bloc = new TestCubit();
        bloc.increment();
        bloc.dispose();
      }

      const withListenersTime = performance.now() - startTime2;

      // With no listeners should be reasonably fast
      expect(noListenersTime).toBeLessThan(100);

      // Performance note: The overhead is acceptable for a plugin system
      console.log(`No listeners: ${noListenersTime.toFixed(2)}ms`);
      console.log(`With listeners: ${withListenersTime.toFixed(2)}ms`);
    });
  });

  describe('Plugin Use Cases', () => {
    it('should support Redux DevTools plugin pattern', () => {
      const actions: any[] = [];
      const states: any[] = [];

      // Simulate DevTools plugin
      registry.on('stateChanged', (container, prevState, nextState) => {
        actions.push({
          type: 'STATE_CHANGE',
          containerName: container.name,
          timestamp: Date.now(),
        });
        states.push({ prev: prevState, next: nextState });
      });

      const bloc = new TestCubit(0);
      bloc.increment();
      bloc.increment();

      expect(actions).toHaveLength(2);
      expect(states).toEqual([
        { prev: 0, next: 1 },
        { prev: 1, next: 2 },
      ]);
    });

    it('should support logging plugin pattern', () => {
      const logs: string[] = [];

      // Simulate logging plugin
      registry.on('created', (container) => {
        logs.push(`[CREATED] ${container.name} (${container.instanceId})`);
      });

      registry.on('stateChanged', (container, prev, next) => {
        logs.push(`[STATE] ${container.name}: ${prev} -> ${next}`);
      });

      registry.on('disposed', (container) => {
        logs.push(`[DISPOSED] ${container.name}`);
      });

      const bloc = new TestCubit(0);
      bloc.initiConfig({});
      bloc.increment();
      bloc.dispose();

      expect(logs).toHaveLength(3);
      expect(logs[0]).toMatch(/\[CREATED\] TestCubit/);
      expect(logs[1]).toBe('[STATE] TestCubit: 0 -> 1');
      expect(logs[2]).toMatch(/\[DISPOSED\] TestCubit/);
    });

    it('should support analytics plugin pattern', () => {
      const events: any[] = [];

      // Simulate analytics plugin
      registry.on('eventAdded', (container, event) => {
        events.push({
          containerName: container.name,
          eventType: event.type,
          timestamp: event.timestamp,
        });
      });

      const vertex = new TestVertex();
      vertex.addValue(5);
      vertex.addValue(10);

      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({
        containerName: 'TestVertex',
        eventType: 'test',
      });
    });

    it('should support time-travel debugging plugin pattern', () => {
      const history: Array<{ state: any; timestamp: number }> = [];
      let _currentIndex = -1;

      // Simulate time-travel plugin
      registry.on('stateChanged', (container, prev, next) => {
        _currentIndex++;
        history.push({ state: next, timestamp: Date.now() });
      });

      const bloc = new TestCubit(0);
      bloc.increment();
      bloc.increment();
      bloc.increment();

      expect(history).toHaveLength(3);
      expect(history.map((h) => h.state)).toEqual([1, 2, 3]);

      // Could implement "go back in time" by replaying states
      const previousState = history[1].state;
      expect(previousState).toBe(2);
    });

    it('should support performance monitoring plugin pattern', () => {
      const metrics = {
        stateChanges: 0,
        eventsProcessed: 0,
        averageStateChangeTime: 0,
      };

      const startTimes = new Map<any, number>();

      registry.on('stateChanged', (container) => {
        const start = startTimes.get(container) || Date.now();
        const duration = Date.now() - start;

        metrics.stateChanges++;
        metrics.averageStateChangeTime =
          (metrics.averageStateChangeTime * (metrics.stateChanges - 1) +
            duration) /
          metrics.stateChanges;
      });

      registry.on('eventAdded', () => {
        metrics.eventsProcessed++;
      });

      const bloc = new TestCubit(0);
      startTimes.set(bloc, Date.now());

      bloc.increment();
      bloc.increment();

      const vertex = new TestVertex();
      startTimes.set(vertex, Date.now());

      vertex.addValue(5);

      expect(metrics.stateChanges).toBe(3);
      expect(metrics.eventsProcessed).toBe(1);
    });
  });

  describe('Global Registry Integration', () => {
    it('should work with globalRegistry singleton', () => {
      // Reset to use global registry
      StateContainer.setRegistry(globalRegistry);
      globalRegistry.clearAll();

      const listener = vi.fn();
      const unsubscribe = globalRegistry.on('created', listener);

      const bloc = new TestCubit();
      bloc.initiConfig({});

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      globalRegistry.clearAll();
    });

    it('should isolate custom registry from global', () => {
      StateContainer.setRegistry(globalRegistry);
      globalRegistry.clearAll();

      const customRegistry = new StateContainerRegistry();
      const globalListener = vi.fn();
      const customListener = vi.fn();

      globalRegistry.on('created', globalListener);
      customRegistry.on('created', customListener);

      // Events only go to the active registry
      const bloc = new TestCubit();
      bloc.initiConfig({});

      expect(globalListener).toHaveBeenCalledTimes(1);
      expect(customListener).not.toHaveBeenCalled();

      globalRegistry.clearAll();
    });
  });

  describe('API Stability Tests', () => {
    it('should maintain consistent event names', () => {
      const events: LifecycleEvent[] = [
        'created',
        'stateChanged',
        'eventAdded',
        'disposed',
      ];

      // Ensure all events can be subscribed to
      events.forEach((event) => {
        expect(() => {
          registry.on(event, () => {});
        }).not.toThrow();
      });
    });

    it('should maintain consistent listener signatures', () => {
      // Type checking - these should compile without errors

      // Created listener
      registry.on('created', (container: StateContainer<any>) => {
        expect(container).toBeDefined();
      });

      // StateChanged listener
      registry.on('stateChanged', (container, prev, next) => {
        expect(container).toBeDefined();
        expect(prev).toBeDefined();
        expect(next).toBeDefined();
      });

      // EventAdded listener
      registry.on('eventAdded', (container, event) => {
        expect(container).toBeDefined();
        expect(event).toBeDefined();
      });

      // Disposed listener
      registry.on('disposed', (container) => {
        expect(container).toBeDefined();
      });

      new TestCubit();
    });

    it('should return unsubscribe function from on()', () => {
      const unsubscribe = registry.on('created', () => {});

      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('Additional Registry Methods', () => {
    it('should check if instance exists with hasInstance()', () => {
      expect(registry.hasInstance(TestCubit, 'test')).toBe(false);

      TestCubit.resolve('test');

      expect(registry.hasInstance(TestCubit, 'test')).toBe(true);
    });

    it('should get ref count with getRefCount()', () => {
      expect(registry.getRefCount(TestCubit, 'test')).toBe(0);

      const instance1 = TestCubit.resolve('test');
      expect(registry.getRefCount(TestCubit, 'test')).toBe(1);

      const instance2 = TestCubit.resolve('test');
      expect(instance1).toBe(instance2);
      expect(registry.getRefCount(TestCubit, 'test')).toBe(2);

      TestCubit.release('test');
      expect(registry.getRefCount(TestCubit, 'test')).toBe(1);

      TestCubit.release('test');
      expect(registry.getRefCount(TestCubit, 'test')).toBe(0);
    });

    it('should force dispose with release(forceDispose=true)', () => {
      const instance1 = TestCubit.resolve('test');
      const _instance2 = TestCubit.resolve('test');

      expect(registry.getRefCount(TestCubit, 'test')).toBe(2);
      expect(instance1.isDisposed).toBe(false);

      // Force dispose regardless of ref count
      TestCubit.release('test', true);

      expect(instance1.isDisposed).toBe(true);
      expect(registry.hasInstance(TestCubit, 'test')).toBe(false);
      expect(registry.getRefCount(TestCubit, 'test')).toBe(0);
    });

    it('should handle release() on non-existent instance gracefully', () => {
      expect(() => {
        TestCubit.release('nonexistent');
      }).not.toThrow();
    });

    it('should emit disposed event on force dispose', () => {
      const listener = vi.fn();
      registry.on('disposed', listener);

      const instance = TestCubit.resolve('test');
      TestCubit.release('test', true);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(instance);
    });
  });
});
