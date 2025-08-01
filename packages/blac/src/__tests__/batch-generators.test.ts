import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Cubit } from '../Cubit';

class TestCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment() {
    this.emit(this.state + 1);
  }

  setValue(value: number) {
    this.emit(value);
  }
}

// Helper to collect state changes
async function collectStateChanges<T>(cubit: Cubit<T>, action: () => void): Promise<Array<{ newState: T; oldState: T }>> {
  const changes: Array<{ newState: T; oldState: T }> = [];
  const iterator = cubit.stateChanges();
  
  // Start collecting in background
  const collectPromise = (async () => {
    for await (const change of iterator) {
      changes.push({ newState: change.current, oldState: change.previous });
    }
  })();
  
  // Perform action
  action();
  
  // Wait a bit for changes to be collected
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Stop the generator
  cubit.dispose();
  await collectPromise;
  
  return changes;
}

describe('Batch Processing with Generators', () => {
  let cubit: TestCubit;

  beforeEach(() => {
    cubit = new TestCubit();
  });

  describe('Traditional batch()', () => {
    it('should use generator internally for batch processing', async () => {
      const changes = await collectStateChanges(cubit, () => {
        cubit.batch(() => {
          cubit.increment(); // 0 -> 1
          cubit.increment(); // 1 -> 2
          cubit.increment(); // 2 -> 3
        });
      });

      // Should only notify once with final state
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({ newState: 3, oldState: 0 });
      expect(cubit.state).toBe(3);
    });

    it('should handle nested batch calls', async () => {
      const changes = await collectStateChanges(cubit, () => {
        cubit.batch(() => {
          cubit.increment(); // 0 -> 1

          // Nested batch should execute immediately without batching
          cubit.batch(() => {
            cubit.increment(); // 1 -> 2
            cubit.increment(); // 2 -> 3
          });

          cubit.increment(); // 3 -> 4
        });
      });

      // The nested batch is prevented, so we only get one notification
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({ newState: 4, oldState: 0 });
      expect(cubit.state).toBe(4);
    });

    it('should handle exceptions in batch', () => {
      expect(() => {
        cubit.batch(() => {
          cubit.increment();
          throw new Error('Batch error');
        });
      }).toThrow('Batch error');

      // State should still be updated before error
      expect(cubit.state).toBe(1);
    });

    it('should return result from batch function', () => {
      const result = cubit.batch(() => {
        cubit.increment();
        cubit.increment();
        return 'batch result';
      });

      expect(result).toBe('batch result');
      expect(cubit.state).toBe(2);
    });
  });

  describe('batchStream() generator', () => {
    it('should yield states from batch operations', async () => {
      const batches: number[][] = [];
      
      // Start collecting batches in the background
      const collectPromise = (async () => {
        for await (const batch of cubit.batchStream(10, 20)) {
          batches.push([...batch]);
          if (batches.length >= 2) break;
        }
      })();

      // Emit several states quickly
      cubit.increment(); // 1
      cubit.increment(); // 2
      cubit.setValue(10); // 10
      
      // Wait for batch interval
      await new Promise(resolve => setTimeout(resolve, 30));
      
      // Emit more states
      cubit.increment(); // 11
      cubit.increment(); // 12
      cubit.increment(); // 13
      
      // Wait for collection
      await new Promise(resolve => setTimeout(resolve, 30));
      
      await collectPromise;

      // Should have received two batches
      expect(batches).toHaveLength(2);
      expect(batches[0]).toContain(1);
      expect(batches[0]).toContain(2);
      expect(batches[0]).toContain(10);
      expect(batches[1]).toContain(11);
      expect(batches[1]).toContain(12);
      expect(batches[1]).toContain(13);
      expect(cubit.state).toBe(13);
    });

    it('should handle async operations in batchStream', async () => {
      const batches: number[][] = [];
      
      // Start collecting batches
      const collectPromise = (async () => {
        for await (const batch of cubit.batchStream(10, 20)) {
          batches.push([...batch]);
          if (batches.length >= 1) break;
        }
      })();

      // Emit states with delays
      await new Promise((resolve) => setTimeout(resolve, 10));
      cubit.increment(); // 1
      
      await new Promise((resolve) => setTimeout(resolve, 10));
      cubit.setValue(5); // 5
      
      // Wait for batch to flush
      await new Promise(resolve => setTimeout(resolve, 30));
      
      await collectPromise;

      expect(batches).toHaveLength(1);
      expect(batches[0]).toContain(1);
      expect(batches[0]).toContain(5);
    });

    it('should handle errors in batchStream operations', async () => {
      const batches: number[][] = [];
      const errors: Error[] = [];

      // Start collecting batches
      const collectPromise = (async () => {
        try {
          for await (const batch of cubit.batchStream(10, 20)) {
            batches.push([...batch]);
          }
        } catch (error) {
          errors.push(error as Error);
        }
      })();

      // Emit state then dispose (which should close the stream)
      cubit.increment(); // 1
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Dispose will close the stream
      cubit.dispose();
      
      await collectPromise;

      // Should have collected states before disposal
      expect(batches.length).toBeGreaterThanOrEqual(1);
      expect(cubit.state).toBe(1);
    });

    it('should support early termination of batchStream', async () => {
      const batches: number[][] = [];

      // Start collecting batches
      const collectPromise = (async () => {
        for await (const batch of cubit.batchStream(5, 20)) {
          batches.push([...batch]);
          if (batches.length >= 2) break; // Early termination
        }
      })();

      // Emit many states
      for (let i = 0; i < 10; i++) {
        cubit.setValue(i);
      }
      
      // Wait for batch interval
      await new Promise(resolve => setTimeout(resolve, 30));
      
      // Emit more (these won't be collected due to early termination)
      for (let i = 10; i < 20; i++) {
        cubit.setValue(i);
      }
      
      await collectPromise;

      expect(batches).toHaveLength(2);
      // First batch should have states 0-4
      expect(batches[0]).toHaveLength(5);
      // Second batch should have states 5-9
      expect(batches[1]).toHaveLength(5);
    });
  });

  describe('Performance characteristics', () => {
    it('should batch efficiently for large number of operations', async () => {
      const operationCount = 1000;
      const changes = await collectStateChanges(cubit, () => {
        cubit.batch(() => {
          for (let i = 0; i < operationCount; i++) {
            cubit.increment();
          }
        });
      });

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({ newState: operationCount, oldState: 0 });
      expect(cubit.state).toBe(operationCount);
    });

    it('should handle mixed sync and async patterns', async () => {
      const states: number[] = [];

      // Use stateStream to observe all states
      const collectPromise = (async () => {
        let isFirst = true;
        for await (const state of cubit.stateStream()) {
          if (isFirst) {
            isFirst = false;
            continue; // Skip initial state
          }
          states.push(state);
          if (states.length >= 3) break;
        }
      })();

      // Mix of batched and non-batched operations
      cubit.increment(); // Normal emit: 0 -> 1

      cubit.batch(() => {
        cubit.increment(); // 1 -> 2
        cubit.increment(); // 2 -> 3
      }); // Batched emit: only emits final state 3

      cubit.increment(); // Normal emit: 3 -> 4

      await collectPromise;

      expect(states).toEqual([1, 3, 4]);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty batch', async () => {
      const changes = await collectStateChanges(cubit, () => {
        cubit.batch(() => {
          // Empty batch
        });
      });

      expect(changes).toHaveLength(0);
      expect(cubit.state).toBe(0);
    });

    it('should handle batch with no state changes', async () => {
      const changes = await collectStateChanges(cubit, () => {
        cubit.batch(() => {
          // Try to set same value
          cubit.setValue(0);
          cubit.setValue(0);
        });
      });

      expect(changes).toHaveLength(0);
      expect(cubit.state).toBe(0);
    });

    it('should handle disposal during batch processing', async () => {
      const batches: number[][] = [];

      // Start collecting batches
      const collectPromise = (async () => {
        try {
          for await (const batch of cubit.batchStream(10, 20)) {
            batches.push([...batch]);
          }
        } catch (error) {
          // Expected when disposed
        }
      })();

      // Emit state then dispose during collection
      cubit.increment(); // 1
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Dispose during batch processing
      cubit.dispose();
      
      // Wait for collection to complete
      await collectPromise;

      // Should have processed state before disposal
      expect(cubit.state).toBe(1);
      expect(cubit.isDisposed).toBe(true);
    });
  });
});