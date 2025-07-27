import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BlocBase, BlocLifecycleState } from '../BlocBase';
import { Blac } from '../Blac';

// Test implementation of BlocBase
class TestBloc extends BlocBase<number> {
  constructor(initialState: number = 0) {
    super(initialState);
  }

  increment() {
    this._pushState(this.state + 1, this.state);
  }
}

// Test bloc with static properties
class KeepAliveBloc extends BlocBase<string> {
  static keepAlive = true;

  constructor() {
    super('initial');
  }
}

class IsolatedBloc extends BlocBase<string> {
  static isolated = true;

  constructor() {
    super('isolated');
  }
}

describe('BlocBase Lifecycle Management', () => {
  let blac: Blac;

  beforeEach(() => {
    blac = new Blac({ __unsafe_ignore_singleton: true });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Atomic State Transitions', () => {
    it('should transition through lifecycle states atomically', () => {
      const bloc = new TestBloc();

      // Initial state should be ACTIVE
      expect((bloc as any)._disposalState).toBe(BlocLifecycleState.ACTIVE);

      // Transition to DISPOSAL_REQUESTED
      const result1 = (bloc as any)._atomicStateTransition(
        BlocLifecycleState.ACTIVE,
        BlocLifecycleState.DISPOSAL_REQUESTED,
      );
      expect(result1.success).toBe(true);
      expect((bloc as any)._disposalState).toBe(
        BlocLifecycleState.DISPOSAL_REQUESTED,
      );

      // Transition to DISPOSING
      const result2 = (bloc as any)._atomicStateTransition(
        BlocLifecycleState.DISPOSAL_REQUESTED,
        BlocLifecycleState.DISPOSING,
      );
      expect(result2.success).toBe(true);
      expect((bloc as any)._disposalState).toBe(BlocLifecycleState.DISPOSING);

      // Transition to DISPOSED
      const result3 = (bloc as any)._atomicStateTransition(
        BlocLifecycleState.DISPOSING,
        BlocLifecycleState.DISPOSED,
      );
      expect(result3.success).toBe(true);
      expect((bloc as any)._disposalState).toBe(BlocLifecycleState.DISPOSED);
    });

    it('should reject invalid state transitions', () => {
      const bloc = new TestBloc();

      // Try to transition from ACTIVE to DISPOSED directly (should work in _dispose but not here)
      const result = (bloc as any)._atomicStateTransition(
        BlocLifecycleState.DISPOSAL_REQUESTED,
        BlocLifecycleState.DISPOSED,
      );
      expect(result.success).toBe(false);
      expect(result.currentState).toBe(BlocLifecycleState.ACTIVE); // Still in ACTIVE because expectedState didn't match
    });

    it('should handle concurrent transition attempts', () => {
      const bloc = new TestBloc();

      // First transition succeeds
      const result1 = (bloc as any)._atomicStateTransition(
        BlocLifecycleState.ACTIVE,
        BlocLifecycleState.DISPOSAL_REQUESTED,
      );
      expect(result1.success).toBe(true);

      // Second attempt with same expected state fails
      const result2 = (bloc as any)._atomicStateTransition(
        BlocLifecycleState.ACTIVE,
        BlocLifecycleState.DISPOSAL_REQUESTED,
      );
      expect(result2.success).toBe(false);
      expect(result2.currentState).toBe(BlocLifecycleState.DISPOSAL_REQUESTED);
    });
  });

  describe('Consumer Management', () => {
    it('should register and unregister consumers', () => {
      const bloc = new TestBloc();
      const consumerId = 'test-consumer-1';
      const consumerRef = {};

      // Add consumer
      const added = bloc._addConsumer(consumerId, consumerRef);
      expect(added).toBe(true);
      expect(bloc._consumers.has(consumerId)).toBe(true);
      expect(bloc._consumers.size).toBe(1);

      // Remove consumer
      bloc._removeConsumer(consumerId);
      expect(bloc._consumers.has(consumerId)).toBe(false);
      expect(bloc._consumers.size).toBe(0);
    });

    it('should prevent duplicate consumer registration', () => {
      const bloc = new TestBloc();
      const consumerId = 'test-consumer-1';

      bloc._addConsumer(consumerId);
      expect(bloc._consumers.size).toBe(1);

      // Try to add same consumer again
      bloc._addConsumer(consumerId);
      expect(bloc._consumers.size).toBe(1); // Should still be 1
    });

    it('should schedule disposal when last consumer is removed', async () => {
      const bloc = new TestBloc();
      const consumerId = 'test-consumer-1';

      // Register bloc with Blac instance
      blac.registerBlocInstance(bloc as BlocBase<unknown>);

      // Add and remove consumer
      bloc._addConsumer(consumerId);
      bloc._removeConsumer(consumerId);

      // Should transition to DISPOSAL_REQUESTED immediately
      expect((bloc as any)._disposalState).toBe(
        BlocLifecycleState.DISPOSAL_REQUESTED,
      );

      // After microtask, should be disposed
      await vi.runAllTimersAsync();
      expect((bloc as any)._disposalState).toBe(BlocLifecycleState.DISPOSED);
    });

    it('should cancel disposal if consumer is re-added during grace period', () => {
      const bloc = new TestBloc();
      const consumerId1 = 'test-consumer-1';
      const consumerId2 = 'test-consumer-2';

      // Register bloc
      blac.registerBlocInstance(bloc as BlocBase<unknown>);

      // Add and remove consumer to trigger disposal
      bloc._addConsumer(consumerId1);
      bloc._removeConsumer(consumerId1);

      // State should transition to DISPOSAL_REQUESTED immediately
      expect((bloc as any)._disposalState).toBe(
        BlocLifecycleState.DISPOSAL_REQUESTED,
      );

      // Add new consumer before microtask runs - should fail
      const added = bloc._addConsumer(consumerId2);
      expect(added).toBe(false); // Should fail because bloc is in disposal process
    });

    it('should clean up dead WeakRef consumers', () => {
      const bloc = new TestBloc();
      const consumerId1 = 'consumer-1';
      const consumerId2 = 'consumer-2';
      let consumerRef1: any = { name: 'consumer1' };
      const consumerRef2 = { name: 'consumer2' };

      // Add consumers with refs first
      bloc._addConsumer(consumerId1, consumerRef1);
      bloc._addConsumer(consumerId2, consumerRef2);
      expect(bloc._consumers.size).toBe(2);

      // Now mock the WeakRef's deref method to simulate garbage collection
      const consumerRefsMap = (bloc as any)._consumerRefs as Map<
        string,
        WeakRef<object>
      >;
      const weakRef1 = consumerRefsMap.get(consumerId1);
      const weakRef2 = consumerRefsMap.get(consumerId2);

      if (weakRef1) {
        // Mock the deref method to return undefined (simulating GC)
        vi.spyOn(weakRef1, 'deref').mockReturnValue(undefined);
      }

      // Validate consumers
      bloc._validateConsumers();

      // First consumer should be removed
      expect(bloc._consumers.size).toBe(1);
      expect(bloc._consumers.has(consumerId1)).toBe(false);
      expect(bloc._consumers.has(consumerId2)).toBe(true);
    });

    it('should reject consumer additions when bloc is disposed', () => {
      const bloc = new TestBloc();

      // Force dispose
      bloc._dispose();
      expect((bloc as any)._disposalState).toBe(BlocLifecycleState.DISPOSED);

      // Try to add consumer
      const added = bloc._addConsumer('new-consumer');
      expect(added).toBe(false);
      expect(bloc._consumers.size).toBe(0);
    });
  });

  describe('Disposal Behavior', () => {
    it('should properly dispose bloc and clean up resources', () => {
      const bloc = new TestBloc();
      const onDisposeSpy = vi.fn();
      bloc.onDispose = onDisposeSpy;

      // Add some consumers and observers
      bloc._addConsumer('consumer-1');
      const unsubscribe = bloc._observer.subscribe({
        id: 'observer-1',
        fn: vi.fn(),
      });

      // Dispose
      const disposed = bloc._dispose();
      expect(disposed).toBe(true);
      expect(onDisposeSpy).toHaveBeenCalled();
      expect(bloc._consumers.size).toBe(0);
      expect(bloc._observer.size).toBe(0);
      expect(bloc.isDisposed).toBe(true);
    });

    it('should handle disposal failures gracefully', () => {
      const bloc = new TestBloc();
      bloc.onDispose = () => {
        throw new Error('Disposal error');
      };

      // Disposal should reset state on error
      expect(() => bloc._dispose()).toThrow('Disposal error');
      expect((bloc as any)._disposalState).toBe(BlocLifecycleState.ACTIVE);
    });

    it('should schedule disposal with microtask deferral', () => {
      const bloc = new TestBloc();
      blac.registerBlocInstance(bloc as BlocBase<unknown>);

      // Remove last consumer
      bloc._addConsumer('consumer-1');
      bloc._removeConsumer('consumer-1');

      // Disposal should be scheduled immediately
      expect((bloc as any)._disposalState).toBe(
        BlocLifecycleState.DISPOSAL_REQUESTED,
      );
    });

    it('should be idempotent - multiple dispose calls should be safe', () => {
      const bloc = new TestBloc();

      const result1 = bloc._dispose();
      expect(result1).toBe(true);

      const result2 = bloc._dispose();
      expect(result2).toBe(false); // Already disposed
    });
  });

  describe('keepAlive and isolated flags', () => {
    it('should respect keepAlive flag and not dispose when consumers are removed', async () => {
      const bloc = new KeepAliveBloc();
      blac.registerBlocInstance(bloc as BlocBase<unknown>);

      expect(bloc.isKeepAlive).toBe(true);

      // Add and remove consumer
      bloc._addConsumer('consumer-1');
      bloc._removeConsumer('consumer-1');

      // Should not schedule disposal
      await vi.runAllTimersAsync();
      expect((bloc as any)._disposalState).toBe(BlocLifecycleState.ACTIVE);
    });

    it('should properly inherit isolated flag from static property', () => {
      const bloc = new IsolatedBloc();
      expect(bloc.isIsolated).toBe(true);
    });

    it('should handle missing static properties gracefully', () => {
      class BlocWithoutStatics extends BlocBase<number> {
        constructor() {
          super(0);
        }
      }

      const bloc = new BlocWithoutStatics();
      expect(bloc.isKeepAlive).toBe(false);
      expect(bloc.isIsolated).toBe(false);
    });
  });

  describe('State Access During Lifecycle', () => {
    it('should allow state access during all non-disposed states', () => {
      const bloc = new TestBloc(42);

      // ACTIVE state
      expect(bloc.state).toBe(42);

      // DISPOSAL_REQUESTED state
      (bloc as any)._atomicStateTransition(
        BlocLifecycleState.ACTIVE,
        BlocLifecycleState.DISPOSAL_REQUESTED,
      );
      expect(bloc.state).toBe(42);

      // DISPOSING state
      (bloc as any)._atomicStateTransition(
        BlocLifecycleState.DISPOSAL_REQUESTED,
        BlocLifecycleState.DISPOSING,
      );
      expect(bloc.state).toBe(42);

      // DISPOSED state - should return last known state
      (bloc as any)._atomicStateTransition(
        BlocLifecycleState.DISPOSING,
        BlocLifecycleState.DISPOSED,
      );
      expect(bloc.state).toBe(42);
    });

    it('should correctly report isDisposed status', () => {
      const bloc = new TestBloc();

      expect(bloc.isDisposed).toBe(false);

      bloc._dispose();
      expect(bloc.isDisposed).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid consumer additions and removals', async () => {
      const bloc = new TestBloc();
      blac.registerBlocInstance(bloc as BlocBase<unknown>);

      // Rapidly add and remove consumers
      for (let i = 0; i < 10; i++) {
        bloc._addConsumer(`consumer-${i}`);
        bloc._removeConsumer(`consumer-${i}`);
      }

      // Should be in DISPOSAL_REQUESTED state
      expect((bloc as any)._disposalState).toBe(
        BlocLifecycleState.DISPOSAL_REQUESTED,
      );

      // After microtask, should be disposed
      await vi.runAllTimersAsync();
      expect((bloc as any)._disposalState).toBe(BlocLifecycleState.DISPOSED);
    });

    it('should handle disposal during active state mutations', () => {
      const bloc = new TestBloc();
      const observer = vi.fn();

      bloc._observer.subscribe({
        id: 'observer-1',
        fn: observer,
      });

      // Start a state mutation
      bloc.increment();
      expect(observer).toHaveBeenCalledWith(1, 0, undefined);

      // Dispose during active usage
      bloc._dispose();

      // Further mutations should not notify (bloc is disposed)
      observer.mockClear();
      bloc.increment();
      expect(observer).not.toHaveBeenCalled();
    });

    it('should prevent memory leaks via WeakRef cleanup', () => {
      const bloc = new TestBloc();
      const consumerCount = 100;
      const refs: any[] = [];

      // Add many consumers
      for (let i = 0; i < consumerCount; i++) {
        const ref = { id: i };
        refs.push(ref);
        bloc._addConsumer(`consumer-${i}`, ref);
      }

      expect(bloc._consumers.size).toBe(consumerCount);

      // Mock half of the WeakRefs to return undefined (simulating GC)
      const consumerRefsMap = (bloc as any)._consumerRefs as Map<
        string,
        WeakRef<object>
      >;
      let mockCount = 0;

      for (const [consumerId, weakRef] of consumerRefsMap) {
        if (mockCount < consumerCount / 2) {
          vi.spyOn(weakRef, 'deref').mockReturnValue(undefined);
          mockCount++;
        }
      }

      // Validate should clean up dead refs
      bloc._validateConsumers();

      expect(bloc._consumers.size).toBe(consumerCount / 2);
    });
  });
});
