import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlacObservable } from '../BlacObserver';
import { BlocBase, BlocLifecycleState } from '../BlocBase';
import { Blac } from '../Blac';

// Mock BlocBase for testing
class MockBloc extends BlocBase<number> {
  constructor(initialState = 0) {
    super(initialState);
  }

  updateState(newState: number) {
    this._pushState(newState, this.state);
  }
}

describe('BlacObservable', () => {
  let bloc: MockBloc;
  let observable: BlacObservable<number>;
  let blacInstance: Blac;

  beforeEach(() => {
    blacInstance = new Blac({ __unsafe_ignore_singleton: true });
    Blac.enableLog = false;
    bloc = new MockBloc(0);
    observable = new BlacObservable(bloc);
  });

  describe('Observer Management', () => {
    it('should initialize with no observers', () => {
      expect(observable.size).toBe(0);
      expect(observable.observers.size).toBe(0);
    });

    it('should subscribe observers', () => {
      const observer = {
        id: 'test-1',
        fn: vi.fn(),
      };

      const unsubscribe = observable.subscribe(observer);
      expect(observable.size).toBe(1);
      expect(observable.observers.has(observer)).toBe(true);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe observers', () => {
      const observer = {
        id: 'test-1',
        fn: vi.fn(),
      };

      const unsubscribe = observable.subscribe(observer);
      expect(observable.size).toBe(1);

      unsubscribe();
      expect(observable.size).toBe(0);
      expect(observable.observers.has(observer)).toBe(false);
    });

    it('should handle multiple observers', () => {
      const observer1 = { id: 'test-1', fn: vi.fn() };
      const observer2 = { id: 'test-2', fn: vi.fn() };
      const observer3 = { id: 'test-3', fn: vi.fn() };

      observable.subscribe(observer1);
      observable.subscribe(observer2);
      observable.subscribe(observer3);

      expect(observable.size).toBe(3);

      observable.unsubscribe(observer2);
      expect(observable.size).toBe(2);
      expect(observable.observers.has(observer1)).toBe(true);
      expect(observable.observers.has(observer2)).toBe(false);
      expect(observable.observers.has(observer3)).toBe(true);
    });

    it('should clear all observers', () => {
      const observer1 = { id: 'test-1', fn: vi.fn() };
      const observer2 = { id: 'test-2', fn: vi.fn() };

      observable.subscribe(observer1);
      observable.subscribe(observer2);
      expect(observable.size).toBe(2);

      observable.clear();
      expect(observable.size).toBe(0);
    });
  });

  describe('Notification System', () => {
    it('should notify all observers on state change', () => {
      const observer1 = { id: 'test-1', fn: vi.fn() };
      const observer2 = { id: 'test-2', fn: vi.fn() };

      observable.subscribe(observer1);
      observable.subscribe(observer2);

      observable.notify(1, 0);

      expect(observer1.fn).toHaveBeenCalledWith(1, 0, undefined);
      expect(observer2.fn).toHaveBeenCalledWith(1, 0, undefined);
    });

    it('should pass action to observers', () => {
      const observer = { id: 'test-1', fn: vi.fn() };
      const action = { type: 'INCREMENT' };

      observable.subscribe(observer);
      observable.notify(1, 0, action);

      expect(observer.fn).toHaveBeenCalledWith(1, 0, action);
    });
  });

  describe('Dependency Tracking', () => {
    it('should always notify on first state change (no lastState)', () => {
      const observer: any = {
        id: 'test-1',
        fn: vi.fn(),
        dependencyArray: vi.fn((state: number) => [state]),
      };

      observable.subscribe(observer);
      observable.notify(1, 0);

      expect(observer.dependencyArray).toHaveBeenCalledWith(1, 0, bloc);
      expect(observer.fn).toHaveBeenCalledWith(1, 0, undefined);
      expect(observer.lastState).toEqual([1]);
    });

    it('should only notify when dependencies change', () => {
      const observer: any = {
        id: 'test-1',
        fn: vi.fn(),
        dependencyArray: vi.fn((state: number) => [Math.floor(state / 10)]),
      };

      observable.subscribe(observer);

      // First notification - always triggers
      observable.notify(5, 0);
      expect(observer.fn).toHaveBeenCalledTimes(1);

      // Same dependency value (5 / 10 = 0) - should not trigger
      observable.notify(8, 5);
      expect(observer.fn).toHaveBeenCalledTimes(1);

      // Different dependency value (15 / 10 = 1) - should trigger
      observable.notify(15, 8);
      expect(observer.fn).toHaveBeenCalledTimes(2);
    });

    it('should handle dependency array length changes', () => {
      let depCount = 1;
      const observer: any = {
        id: 'test-1',
        fn: vi.fn(),
        dependencyArray: vi.fn((state: number) => {
          const deps = [];
          for (let i = 0; i < depCount; i++) {
            deps.push(state + i);
          }
          return deps;
        }),
      };

      observable.subscribe(observer);

      // First notification
      observable.notify(1, 0);
      expect(observer.fn).toHaveBeenCalledTimes(1);
      expect(observer.lastState).toEqual([1]);

      // Change dependency array length
      depCount = 2;
      observable.notify(2, 1);
      expect(observer.fn).toHaveBeenCalledTimes(2);
      expect(observer.lastState).toEqual([2, 3]);
    });

    it('should use Object.is for dependency comparison', () => {
      const observer: any = {
        id: 'test-1',
        fn: vi.fn(),
        dependencyArray: vi.fn((state: number) => [state === 0 ? -0 : state]),
      };

      observable.subscribe(observer);

      // First notification with -0
      observable.notify(0, 1);
      expect(observer.fn).toHaveBeenCalledTimes(1);
      expect(observer.lastState).toEqual([-0]);

      // Same value but different zero (Object.is can distinguish +0 and -0)
      observable.notify(1, 0); // This will return 1 from dependencyArray
      expect(observer.fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Lifecycle Integration', () => {
    it('should not subscribe to disposed bloc', () => {
      // Force bloc into disposed state
      (bloc as any)._disposalState = BlocLifecycleState.DISPOSED;

      const observer = { id: 'test-1', fn: vi.fn() };
      const unsubscribe = observable.subscribe(observer);

      expect(observable.size).toBe(0);
      expect(typeof unsubscribe).toBe('function');

      // Unsubscribe should be no-op
      unsubscribe();
    });

    it('should not subscribe to disposing bloc', () => {
      // Force bloc into disposing state
      (bloc as any)._disposalState = BlocLifecycleState.DISPOSING;

      const observer = { id: 'test-1', fn: vi.fn() };
      const unsubscribe = observable.subscribe(observer);

      expect(observable.size).toBe(0);
    });

    it('should cancel disposal when subscribing during DISPOSAL_REQUESTED', () => {
      // Mock the atomic state transition
      const transitionSpy = vi.spyOn(bloc as any, '_atomicStateTransition');

      // Force bloc into disposal requested state
      (bloc as any)._disposalState = BlocLifecycleState.DISPOSAL_REQUESTED;

      const observer = { id: 'test-1', fn: vi.fn() };
      observable.subscribe(observer);

      expect(transitionSpy).toHaveBeenCalledWith(
        BlocLifecycleState.DISPOSAL_REQUESTED,
        BlocLifecycleState.ACTIVE,
      );
      expect(observable.size).toBe(1);
    });

    it('should schedule disposal when last observer is removed', () => {
      // Setup spy
      const scheduleDisposalSpy = vi.spyOn(bloc as any, '_scheduleDisposal');

      // Ensure bloc is in correct state
      bloc._keepAlive = false;
      bloc._consumers.clear();
      (bloc as any)._disposalState = BlocLifecycleState.ACTIVE;

      const observer = { id: 'test-1', fn: vi.fn() };
      const unsubscribe = observable.subscribe(observer);

      // Remove last observer
      unsubscribe();

      expect(scheduleDisposalSpy).toHaveBeenCalled();
    });

    it('should not schedule disposal if bloc has consumers', () => {
      const scheduleDisposalSpy = vi.spyOn(bloc as any, '_scheduleDisposal');

      // Add a consumer
      bloc._consumers.add('consumer-1');

      const observer = { id: 'test-1', fn: vi.fn() };
      const unsubscribe = observable.subscribe(observer);

      // Remove observer but consumer remains
      unsubscribe();

      expect(scheduleDisposalSpy).not.toHaveBeenCalled();
    });

    it('should not schedule disposal if bloc is keepAlive', () => {
      const scheduleDisposalSpy = vi.spyOn(bloc as any, '_scheduleDisposal');

      // Set keepAlive
      bloc._keepAlive = true;
      bloc._consumers.clear();

      const observer = { id: 'test-1', fn: vi.fn() };
      const unsubscribe = observable.subscribe(observer);

      unsubscribe();

      expect(scheduleDisposalSpy).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle observer functions that throw errors', () => {
      const errorSpy = vi.spyOn(Blac, 'error').mockImplementation(() => {});
      const errorObserver = {
        id: 'error-observer',
        fn: vi.fn(() => {
          throw new Error('Observer error');
        }),
      };
      const normalObserver = {
        id: 'normal-observer',
        fn: vi.fn(),
      };

      observable.subscribe(errorObserver);
      observable.subscribe(normalObserver);

      // Should not throw and should still notify other observers
      expect(() => observable.notify(1, 0)).not.toThrow();
      expect(normalObserver.fn).toHaveBeenCalledWith(1, 0, undefined);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Observer error in error-observer'),
        expect.any(Error),
      );
    });

    it('should handle dependency functions that throw errors', () => {
      const errorSpy = vi.spyOn(Blac, 'error').mockImplementation(() => {});
      const observer = {
        id: 'test-1',
        fn: vi.fn(),
        dependencyArray: vi.fn(() => {
          throw new Error('Dependency error');
        }),
      };

      observable.subscribe(observer);

      // Should not throw
      expect(() => observable.notify(1, 0)).not.toThrow();
      expect(observer.fn).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dependency function error in test-1'),
        expect.any(Error),
      );
    });

    it('should handle multiple rapid subscribe/unsubscribe cycles', () => {
      const observer = { id: 'test-1', fn: vi.fn() };

      for (let i = 0; i < 10; i++) {
        const unsubscribe = observable.subscribe(observer);
        expect(observable.size).toBe(1);
        unsubscribe();
        expect(observable.size).toBe(0);
      }
    });
  });
});
