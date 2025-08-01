import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { Bloc } from '../Bloc';
import { Cubit } from '../Cubit';

// Test event
class TestEvent {
  constructor(public value: number) {}
}

// Test Bloc
class BenchmarkBloc extends Bloc<number, TestEvent> {
  constructor() {
    super(0);

    this.on(TestEvent, (event, emit) => {
      emit(this.state + event.value);
    });
  }
}

// Test Cubit
class BenchmarkCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment() {
    this.emit(this.state + 1);
  }
}

describe('Performance Benchmarks', () => {
  const results: string[] = [];

  afterAll(() => {
    console.log('\n=== Performance Benchmark Results ===');
    results.forEach((r) => console.log(r));
    console.log('===================================\n');
  });

  describe('Event Processing Performance', () => {
    it('should handle high-frequency events efficiently', async () => {
      const bloc = new BenchmarkBloc();
      const eventCount = 10000;

      const startTime = performance.now();

      // Add many events rapidly
      const promises: Promise<void>[] = [];
      for (let i = 0; i < eventCount; i++) {
        promises.push(bloc.add(new TestEvent(1)));
      }

      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(bloc.state).toBe(eventCount);

      // Performance expectations
      const eventsPerSecond = (eventCount / duration) * 1000;
      results.push(
        `Event Processing: ${eventCount} events in ${duration.toFixed(2)}ms (${eventsPerSecond.toFixed(0)} events/sec)`,
      );

      // Should process at least 5000 events per second
      expect(eventsPerSecond).toBeGreaterThan(5000);
    });

    it('should have minimal memory overhead for event queue', async () => {
      const bloc = new BenchmarkBloc();
      const eventCount = 1000;

      // Measure memory before
      if (typeof global !== 'undefined' && (global as any).gc)
        (global as any).gc();
      const memBefore = process.memoryUsage().heapUsed;

      // Queue many events without processing
      const promises: Promise<void>[] = [];
      for (let i = 0; i < eventCount; i++) {
        // Don't await to let them queue up
        promises.push(bloc.add(new TestEvent(1)));
      }

      // Measure memory with queued events
      const memDuring = process.memoryUsage().heapUsed;

      // Process all events
      await Promise.all(promises);

      // Measure memory after
      if (typeof global !== 'undefined' && (global as any).gc)
        (global as any).gc();
      const memAfter = process.memoryUsage().heapUsed;

      const memoryIncrease = memDuring - memBefore;
      const memoryPerEvent = memoryIncrease / eventCount;

      results.push(
        `Event Queue Memory: ${memoryPerEvent.toFixed(0)} bytes/event, Total: ${(memoryIncrease / 1024).toFixed(2)} KB`,
      );

      // Should use less than 1KB per event
      expect(memoryPerEvent).toBeLessThan(1024);
    });
  });

  describe('State Update Performance', () => {
    it('should handle rapid state updates efficiently', async () => {
      const cubit = new BenchmarkCubit();
      const updateCount = 100000;

      const startTime = performance.now();

      for (let i = 0; i < updateCount; i++) {
        cubit.increment();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(cubit.state).toBe(updateCount);

      const updatesPerSecond = (updateCount / duration) * 1000;
      results.push(
        `State Updates: ${updateCount} updates in ${duration.toFixed(2)}ms (${updatesPerSecond.toFixed(0)} updates/sec)`,
      );

      // Should handle at least 100k updates per second
      expect(updatesPerSecond).toBeGreaterThan(100000);
    });
  });

  describe('Generator Stream Performance', () => {
    it('should stream states efficiently', async () => {
      const cubit = new BenchmarkCubit();
      const stateCount = 10000;
      const states: number[] = [];

      const startTime = performance.now();

      // Start consuming states
      const consumePromise = (async () => {
        for await (const state of cubit.stateStream()) {
          states.push(state);
          if (states.length > stateCount) break;
        }
      })();

      // Give consumer time to set up
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Generate states rapidly
      for (let i = 0; i < stateCount; i++) {
        cubit.increment();
      }

      await consumePromise;

      const endTime = performance.now();
      const duration = endTime - startTime;

      const statesPerSecond = (stateCount / duration) * 1000;
      results.push(
        `Generator Streaming: ${stateCount} states in ${duration.toFixed(2)}ms (${statesPerSecond.toFixed(0)} states/sec)`,
      );

      expect(states).toHaveLength(stateCount + 1); // +1 for initial state
      expect(statesPerSecond).toBeGreaterThan(50000);
    });

    it('should handle multiple concurrent generators efficiently', async () => {
      const cubit = new BenchmarkCubit();
      const generatorCount = 100;
      const statesPerGenerator = 100;
      const allStates: number[][] = [];

      const startTime = performance.now();

      // Create multiple concurrent generators
      const promises = Array.from({ length: generatorCount }, async (_, i) => {
        const states: number[] = [];
        let count = 0;
        
        for await (const state of cubit.stateStream()) {
          states.push(state);
          count++;
          if (count >= statesPerGenerator) break;
        }
        
        allStates.push(states);
      });

      // Give generators time to set up
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Emit states
      for (let i = 0; i < statesPerGenerator; i++) {
        cubit.increment();
      }

      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      const totalOperations = generatorCount * statesPerGenerator;
      const opsPerSecond = (totalOperations / duration) * 1000;
      
      results.push(
        `Concurrent Generators: ${generatorCount} generators × ${statesPerGenerator} states in ${duration.toFixed(2)}ms (${opsPerSecond.toFixed(0)} ops/sec)`,
      );

      expect(allStates).toHaveLength(generatorCount);
      expect(allStates.every(states => states.length === statesPerGenerator)).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with many generator iterations', async () => {
      const cubit = new BenchmarkCubit();
      const iterationCount = 1000;

      // Measure initial memory
      if (typeof global !== 'undefined' && (global as any).gc) (global as any).gc();
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and dispose many generators
      for (let i = 0; i < iterationCount; i++) {
        const iterator = cubit.stateStream()[Symbol.asyncIterator]();
        await iterator.next(); // Get initial state
        await iterator.return?.(); // Explicit cleanup
      }

      // Force garbage collection
      if (typeof global !== 'undefined' && (global as any).gc) (global as any).gc();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryPerIteration = memoryIncrease / iterationCount;

      results.push(
        `Generator Cleanup: ${iterationCount} generators, ${(memoryIncrease / 1024).toFixed(2)} KB total, ${memoryPerIteration.toFixed(0)} bytes/generator`,
      );

      // Should not leak significant memory per generator
      expect(memoryPerIteration).toBeLessThan(1024); // Less than 1KB per generator
    });

    it('should handle generator abandonment gracefully', async () => {
      const cubit = new BenchmarkCubit();
      const abandonCount = 100;

      const startTime = performance.now();

      // Create many generators and abandon them
      for (let i = 0; i < abandonCount; i++) {
        const iterator = cubit.stateStream()[Symbol.asyncIterator]();
        await iterator.next(); // Get initial state
        // Abandon without cleanup
      }

      // Should still function normally
      const states: number[] = [];
      for await (const state of cubit.stateStream()) {
        states.push(state);
        if (states.length === 3) break;
      }

      cubit.increment();
      cubit.increment();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const endTime = performance.now();
      const duration = endTime - startTime;

      results.push(
        `Generator Abandonment: ${abandonCount} abandoned generators, still functional in ${duration.toFixed(2)}ms`,
      );

      expect(cubit.state).toBe(2);
      expect(states).toEqual([0, 1, 2]);
    });
  });

  describe('Batch Processing Performance', () => {
    it('should batch operations efficiently', async () => {
      const cubit = new BenchmarkCubit();
      const operationCount = 50000;
      const states: number[] = [];

      // Set up state collection
      const collectPromise = (async () => {
        for await (const state of cubit.stateStream()) {
          states.push(state);
          if (states.length >= 3) break; // Initial + 2 batch results
        }
      })();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const startTime = performance.now();

      // First batch
      cubit.batch(() => {
        for (let i = 0; i < operationCount; i++) {
          cubit.increment();
        }
      });

      // Second batch
      cubit.batch(() => {
        for (let i = 0; i < operationCount; i++) {
          cubit.increment();
        }
      });

      await collectPromise;

      const endTime = performance.now();
      const duration = endTime - startTime;

      const totalOps = operationCount * 2;
      const opsPerSecond = (totalOps / duration) * 1000;

      results.push(
        `Batch Processing: ${totalOps} operations in ${duration.toFixed(2)}ms (${opsPerSecond.toFixed(0)} ops/sec)`,
      );

      expect(states).toEqual([0, operationCount, operationCount * 2]);
      expect(opsPerSecond).toBeGreaterThan(500000); // Should be very fast due to batching
    });
  });

  describe('Cross-cutting Performance', () => {
    it('should maintain performance with event handlers and generators', async () => {
      const bloc = new BenchmarkBloc();
      const eventCount = 5000;
      const states: number[] = [];
      const events: TestEvent[] = [];

      const startTime = performance.now();

      // Start collecting both states and events
      const statePromise = (async () => {
        for await (const state of bloc.stateStream()) {
          states.push(state);
          if (states.length > eventCount) break;
        }
      })();

      const eventPromise = (async () => {
        for await (const event of bloc.events()) {
          events.push(event);
          if (events.length >= eventCount) break;
        }
      })();

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Generate events
      const eventPromises: Promise<void>[] = [];
      for (let i = 0; i < eventCount; i++) {
        eventPromises.push(bloc.add(new TestEvent(1)));
      }

      await Promise.all([statePromise, eventPromise, ...eventPromises]);

      const endTime = performance.now();
      const duration = endTime - startTime;

      const totalOperations = eventCount * 2; // Events + state changes
      const opsPerSecond = (totalOperations / duration) * 1000;

      results.push(
        `Integrated Performance: ${eventCount} events with dual generators in ${duration.toFixed(2)}ms (${opsPerSecond.toFixed(0)} ops/sec)`,
      );

      expect(states).toHaveLength(eventCount + 1); // +1 for initial
      expect(events).toHaveLength(eventCount);
      expect(opsPerSecond).toBeGreaterThan(10000);
    });
  });
});