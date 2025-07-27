import { describe, it, expect, beforeEach } from 'vitest';
import { Blac } from '../src/Blac';
import { BlocLifecycleState } from '../src/BlocBase';
import { Cubit } from '../src/Cubit';

interface TestState {
  count: number;
}

class TestCubit extends Cubit<TestState> {
  constructor() {
    super({ count: 0 });
  }

  increment() {
    this.emit({ count: this.state.count + 1 });
  }
}

class IsolatedTestCubit extends Cubit<TestState> {
  static isolated = true;
  
  constructor() {
    super({ count: 0 });
  }
}

describe('Atomic State Transitions', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  describe('Race Condition Prevention', () => {
    it('should prevent consumer addition during disposal', async () => {
      const bloc = Blac.getBloc(TestCubit);
      
      // Simulate concurrent operations
      const operations = [
        () => bloc._dispose(),
        () => bloc._addConsumer('consumer1'),
        () => bloc._addConsumer('consumer2'),
        () => bloc._addConsumer('consumer3'),
      ];
      
      // Execute concurrently
      await Promise.all(operations.map(op => 
        Promise.resolve().then(op)
      ));
      
      // Verify: No consumers should be added after disposal
      expect(bloc._consumers.size).toBe(0);
      expect(bloc.isDisposed).toBe(true);
    });

    it('should handle multiple disposal attempts atomically', async () => {
      const bloc = Blac.getBloc(TestCubit);
      let disposalCallCount = 0;
      
      bloc.onDispose = () => { disposalCallCount++; };
      
      // Multiple concurrent disposal attempts
      const disposals = Array.from({ length: 10 }, () =>
        Promise.resolve().then(() => bloc._dispose())
      );
      
      await Promise.all(disposals);
      
      // Should only dispose once
      expect(disposalCallCount).toBe(1);
      expect(bloc.isDisposed).toBe(true);
    });

    it('should prevent disposal scheduling race conditions', async () => {
      const bloc = Blac.getBloc(TestCubit);
      let disposalCallCount = 0;
      
      bloc.onDispose = () => { disposalCallCount++; };
      
      // Add and immediately remove consumers to trigger disposal scheduling
      const operations = Array.from({ length: 20 }, (_, i) => async () => {
        const consumerId = `consumer-${i}`;
        bloc._addConsumer(consumerId);
        await Promise.resolve(); // Allow interleaving
        bloc._removeConsumer(consumerId);
      });
      
      await Promise.all(operations.map(op => op()));
      
      // Wait for any pending disposal
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should only dispose once (if at all)
      expect(disposalCallCount).toBeLessThanOrEqual(1);
    });

    it('should handle consumer addition during disposal scheduling', async () => {
      const bloc = Blac.getBloc(TestCubit);
      
      // Add consumer
      bloc._addConsumer('consumer1');
      expect(bloc._consumers.size).toBe(1);
      
      // Remove consumer to trigger disposal scheduling
      bloc._removeConsumer('consumer1');
      
      // Immediately try to add another consumer (race condition scenario)
      const addResult = bloc._addConsumer('consumer2');
      
      // The outcome depends on timing, but the system should remain consistent
      if (addResult) {
        // Consumer was added successfully
        expect(bloc._consumers.size).toBe(1);
        expect(bloc.isDisposed).toBe(false);
      } else {
        // Consumer addition was rejected (disposal in progress)
        expect(bloc._consumers.size).toBe(0);
        // Bloc may or may not be disposed yet depending on timing
      }
    });
  });

  describe('State Machine Validation', () => {
    it('should handle disposal from both ACTIVE and DISPOSAL_REQUESTED states', () => {
      const bloc1 = Blac.getBloc(TestCubit, { id: 'test1' });
      const bloc2 = Blac.getBloc(TestCubit, { id: 'test2' });
      
      // Dispose directly from ACTIVE state
      const result1 = bloc1._dispose();
      expect(result1).toBe(true);
      expect(bloc1.isDisposed).toBe(true);
      
      // Move bloc2 to DISPOSAL_REQUESTED state first
      const atomicTransition = (bloc2 as any)._atomicStateTransition.bind(bloc2);
      atomicTransition(BlocLifecycleState.ACTIVE, BlocLifecycleState.DISPOSAL_REQUESTED);
      
      // Dispose from DISPOSAL_REQUESTED state
      const result2 = bloc2._dispose();
      expect(result2).toBe(true);
      expect(bloc2.isDisposed).toBe(true);
    });

  });

  describe('Isolated Bloc Atomic Behavior', () => {
    it('should handle atomic disposal for isolated blocs', async () => {
      const bloc = Blac.getBloc(IsolatedTestCubit);
      
      // Concurrent operations on isolated bloc
      const operations = [
        () => bloc._dispose(),
        () => bloc._addConsumer('consumer1'),
        () => bloc._addConsumer('consumer2'),
      ];
      
      await Promise.all(operations.map(op => 
        Promise.resolve().then(op)
      ));
      
      expect(bloc._consumers.size).toBe(0);
      expect(bloc.isDisposed).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from disposal errors', () => {
      const bloc = Blac.getBloc(TestCubit);
      
      // Mock an error in the onDispose hook
      bloc.onDispose = () => {
        throw new Error('Disposal error');
      };
      
      // Disposal should handle the error and reset state
      expect(() => bloc._dispose()).toThrow('Disposal error');
      
      // Bloc should be back in ACTIVE state for recovery
      expect(bloc.isDisposed).toBe(false);
      
      // Should be able to dispose again after fixing the error
      bloc.onDispose = undefined;
      const result = bloc._dispose();
      expect(result).toBe(true);
      expect(bloc.isDisposed).toBe(true);
    });
  });

  describe('High Concurrency Stress Test', () => {
    it('should handle 100 concurrent operations safely', async () => {
      const bloc = Blac.getBloc(TestCubit);
      const operations: (() => void)[] = [];
      
      // Mix of different concurrent operations
      for (let i = 0; i < 100; i++) {
        const operation = i % 4;
        switch (operation) {
          case 0: operations.push(() => bloc._addConsumer(`consumer-${i}`)); break;
          case 1: operations.push(() => bloc._removeConsumer(`consumer-${i}`)); break;
          case 2: operations.push(() => bloc._dispose()); break;
          case 3: operations.push(() => bloc.increment()); break;
        }
      }
      
      // Execute all operations concurrently
      await Promise.all(operations.map(op => 
        Promise.resolve().then(op).catch(() => {}) // Ignore expected failures
      ));
      
      // System should remain in valid state
      expect(['active', 'disposed'].includes((bloc as any)._disposalState)).toBe(true);
      
      // If not disposed, should still be functional
      if (!bloc.isDisposed) {
        const initialCount = bloc.state.count;
        bloc.increment();
        expect(bloc.state.count).toBe(initialCount + 1);
      }
    });
  });
});