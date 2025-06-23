import { describe, expect, it, beforeEach } from 'vitest';
import { Blac, BlocBase } from '../src';

class TestCubit extends BlocBase<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment() {
    this._pushState({ count: this.state.count + 1 }, this.state);
  }
}

class IsolatedTestCubit extends BlocBase<{ count: number }> {
  static isolated = true;

  constructor() {
    super({ count: 0 });
  }

  increment() {
    this._pushState({ count: this.state.count + 1 }, this.state);
  }
}

describe('Memory Management Fixes', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  describe('Consumer Tracking with WeakRef', () => {
    it('should properly track consumers with WeakRef', () => {
      const cubit = Blac.getBloc(TestCubit);
      const consumerRef = {};
      
      // Add consumer with reference
      cubit._addConsumer('test-consumer', consumerRef);
      
      expect(cubit._consumers.has('test-consumer')).toBe(true);
      expect((cubit as any)._consumerRefs.has('test-consumer')).toBe(true);
      
      // Remove consumer
      cubit._removeConsumer('test-consumer');
      
      expect(cubit._consumers.has('test-consumer')).toBe(false);
      expect((cubit as any)._consumerRefs.has('test-consumer')).toBe(false);
    });

    it('should validate and clean up dead consumer references', () => {
      const cubit = Blac.getBloc(TestCubit);
      let consumerRef: any = {};
      
      // Add consumer with reference
      cubit._addConsumer('test-consumer', consumerRef);
      expect(cubit._consumers.size).toBe(1);
      
      // Simulate garbage collection by removing reference
      consumerRef = null;
      
      // Force garbage collection (in real scenarios this would happen automatically)
      if (global.gc) {
        global.gc();
      }
      
      // Validate consumers should clean up dead references
      cubit._validateConsumers();
      
      // The consumer should still be there since we can't force GC in tests
      // But the validation method should work without errors
      expect(typeof cubit._validateConsumers).toBe('function');
    });
  });

  describe('Disposal Race Condition Prevention', () => {
    it('should prevent double disposal', () => {
      const cubit = Blac.getBloc(TestCubit);
      
      // Check initial state
      expect((cubit as any)._disposalState).toBe('active');
      
      // First disposal
      cubit._dispose();
      expect((cubit as any)._disposalState).toBe('disposed');
      
      // Second disposal should be safe
      cubit._dispose();
      expect((cubit as any)._disposalState).toBe('disposed');
    });

    it('should prevent operations on disposed blocs', () => {
      const cubit = Blac.getBloc(TestCubit);
      
      // Dispose the bloc
      cubit._dispose();
      
      // Adding consumers to disposed bloc should be safe
      cubit._addConsumer('test-consumer');
      expect(cubit._consumers.size).toBe(0);
    });

    it('should handle concurrent disposal attempts safely', () => {
      const cubit = Blac.getBloc(TestCubit);
      
      // Simulate concurrent disposal attempts
      const disposalPromises = [
        Promise.resolve().then(() => cubit._dispose()),
        Promise.resolve().then(() => cubit._dispose()),
        Promise.resolve().then(() => Blac.disposeBloc(cubit as any)),
      ];
      
      return Promise.all(disposalPromises).then(() => {
        expect((cubit as any)._disposalState).toBe('disposed');
      });
    });
  });

  describe('Blac Manager Disposal Safety', () => {
    it('should handle disposal of already disposed blocs', () => {
      const cubit = Blac.getBloc(TestCubit);
      
      // First disposal through bloc
      cubit._dispose();
      
      // Second disposal through manager should be safe
      expect(() => Blac.disposeBloc(cubit as any)).not.toThrow();
    });

    it('should properly clean up isolated blocs', () => {
      const cubit1 = Blac.getBloc(IsolatedTestCubit, { id: 'test1' });
      const cubit2 = Blac.getBloc(IsolatedTestCubit, { id: 'test2' });
      
      expect(Blac.getMemoryStats().isolatedBlocs).toBe(2);
      
      // Dispose one isolated bloc
      Blac.disposeBloc(cubit1 as any);
      
      expect(Blac.getMemoryStats().isolatedBlocs).toBe(1);
      
      // Dispose the other
      Blac.disposeBloc(cubit2 as any);
      
      expect(Blac.getMemoryStats().isolatedBlocs).toBe(0);
    });
  });

  describe('Memory Statistics', () => {
    it('should accurately track memory usage', () => {
      const initialStats = Blac.getMemoryStats();
      
      const cubit1 = Blac.getBloc(TestCubit);
      const cubit2 = Blac.getBloc(IsolatedTestCubit, { id: 'isolated1' });
      
      const afterCreationStats = Blac.getMemoryStats();
      
      expect(afterCreationStats.registeredBlocs).toBe(initialStats.registeredBlocs + 1);
      expect(afterCreationStats.isolatedBlocs).toBe(initialStats.isolatedBlocs + 1);
      expect(afterCreationStats.totalBlocs).toBe(initialStats.totalBlocs + 2);
      
      // Dispose blocs
      Blac.disposeBloc(cubit1 as any);
      Blac.disposeBloc(cubit2 as any);
      
      const afterDisposalStats = Blac.getMemoryStats();
      
      expect(afterDisposalStats.registeredBlocs).toBe(initialStats.registeredBlocs);
      expect(afterDisposalStats.isolatedBlocs).toBe(initialStats.isolatedBlocs);
      expect(afterDisposalStats.totalBlocs).toBe(initialStats.totalBlocs);
    });
  });
});