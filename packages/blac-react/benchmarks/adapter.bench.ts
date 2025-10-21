/**
 * Performance Benchmarks for React Adapter Pattern
 *
 * Measures performance characteristics of:
 * - Adapter lifecycle (create/dispose)
 * - State change notifications
 * - Selector evaluation
 * - Subscription management
 * - Version-based change detection
 */

import { bench, describe } from 'vitest';
import { Cubit, Blac } from '@blac/core';
import { getOrCreateAdapter } from '../src/adapter';
import type { ReactBlocAdapter } from '../src/adapter/ReactBlocAdapter';

/**
 * Simple counter for basic benchmarks
 */
class BenchmarkCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  set = (value: number) => {
    this.emit(value);
  };
}

/**
 * Complex state for selector benchmarks
 */
interface ComplexState {
  items: Array<{ id: number; name: string; value: number }>;
  filter: string;
  metadata: {
    count: number;
    total: number;
    average: number;
  };
}

class ComplexCubit extends Cubit<ComplexState> {
  constructor() {
    super({
      items: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 100,
      })),
      filter: '',
      metadata: {
        count: 100,
        total: 0,
        average: 0,
      },
    });
  }

  updateFilter = (filter: string) => {
    this.emit({ ...this.state, filter });
  };

  addItem = (item: { id: number; name: string; value: number }) => {
    this.emit({
      ...this.state,
      items: [...this.state.items, item],
    });
  };
}

describe('Adapter Performance', () => {
  describe('Lifecycle Performance', () => {
    bench('create and dispose 1000 adapters', () => {
      const adapters: ReactBlocAdapter<any>[] = [];

      // Create 1000 adapters
      for (let i = 0; i < 1000; i++) {
        const cubit = new BenchmarkCubit();
        const adapter = getOrCreateAdapter(cubit);
        adapters.push(adapter);
      }

      // Dispose all
      for (const adapter of adapters) {
        adapter.dispose();
      }

      // Clean up blocs
      Blac.resetInstance();
    });

    bench('create adapter with existing bloc (cache hit)', () => {
      const cubit = new BenchmarkCubit();

      // First call creates the adapter
      const adapter1 = getOrCreateAdapter(cubit);

      // Subsequent calls should hit the cache
      for (let i = 0; i < 1000; i++) {
        getOrCreateAdapter(cubit);
      }

      adapter1.dispose();
      Blac.resetInstance();
    });
  });

  describe('State Change Performance', () => {
    bench('1000 rapid state changes', () => {
      const cubit = new BenchmarkCubit();
      const adapter = getOrCreateAdapter(cubit);

      // Subscribe to changes
      const unsubscribe = adapter.subscribe(undefined, () => {
        // No-op listener
      });

      // Emit 1000 state changes
      for (let i = 0; i < 1000; i++) {
        cubit.increment();
      }

      unsubscribe();
      adapter.dispose();
      Blac.resetInstance();
    });

    bench('state changes with multiple subscribers', () => {
      const cubit = new BenchmarkCubit();
      const adapter = getOrCreateAdapter(cubit);

      // Create 100 subscribers
      const unsubscribes = Array.from({ length: 100 }, () =>
        adapter.subscribe(undefined, () => {
          // No-op listener
        })
      );

      // Emit 100 state changes
      for (let i = 0; i < 100; i++) {
        cubit.increment();
      }

      // Cleanup
      unsubscribes.forEach((unsub) => unsub());
      adapter.dispose();
      Blac.resetInstance();
    });
  });

  describe('Selector Performance', () => {
    bench('simple selector evaluation', () => {
      const cubit = new BenchmarkCubit();
      const adapter = getOrCreateAdapter(cubit);

      // Simple selector: just return the state
      const selector = (state: number) => state;

      // Subscribe with selector
      const unsubscribe = adapter.subscribe(selector, () => {
        // No-op listener
      });

      // Trigger 1000 state changes
      for (let i = 0; i < 1000; i++) {
        cubit.increment();
      }

      unsubscribe();
      adapter.dispose();
      Blac.resetInstance();
    });

    bench('complex selector with filtering and mapping', () => {
      const cubit = new ComplexCubit();
      const adapter = getOrCreateAdapter(cubit);

      // Complex selector: filter and map
      const selector = (state: ComplexState) =>
        state.items
          .filter((item) => item.name.includes(state.filter))
          .map((item) => ({ id: item.id, value: item.value }));

      // Subscribe with complex selector
      const unsubscribe = adapter.subscribe(selector, () => {
        // No-op listener
      });

      // Trigger 100 state changes (filters don't match, so selector result unchanged)
      for (let i = 0; i < 100; i++) {
        cubit.updateFilter(''); // No change to result
      }

      unsubscribe();
      adapter.dispose();
      Blac.resetInstance();
    });

    bench('selector with computed values', () => {
      const cubit = new ComplexCubit();
      const adapter = getOrCreateAdapter(cubit);

      // Selector with computations
      const selector = (state: ComplexState) => ({
        count: state.items.length,
        total: state.items.reduce((sum, item) => sum + item.value, 0),
        average:
          state.items.reduce((sum, item) => sum + item.value, 0) /
          state.items.length,
      });

      // Subscribe with computed selector
      const unsubscribe = adapter.subscribe(selector, () => {
        // No-op listener
      });

      // Trigger 100 state changes
      for (let i = 0; i < 100; i++) {
        cubit.updateFilter(`filter-${i}`);
      }

      unsubscribe();
      adapter.dispose();
      Blac.resetInstance();
    });
  });

  describe('Subscription Management', () => {
    bench('subscribe/unsubscribe cycle (1000 times)', () => {
      const cubit = new BenchmarkCubit();
      const adapter = getOrCreateAdapter(cubit);

      // 1000 subscribe/unsubscribe cycles
      for (let i = 0; i < 1000; i++) {
        const unsubscribe = adapter.subscribe(undefined, () => {
          // No-op listener
        });
        unsubscribe();
      }

      adapter.dispose();
      Blac.resetInstance();
    });

    bench('adding 1000 concurrent subscribers', () => {
      const cubit = new BenchmarkCubit();
      const adapter = getOrCreateAdapter(cubit);

      const unsubscribes = [];

      // Add 1000 subscribers
      for (let i = 0; i < 1000; i++) {
        const unsubscribe = adapter.subscribe(undefined, () => {
          // No-op listener
        });
        unsubscribes.push(unsubscribe);
      }

      // Cleanup
      unsubscribes.forEach((unsub) => unsub());
      adapter.dispose();
      Blac.resetInstance();
    });
  });

  describe('Version-Based Change Detection', () => {
    bench('version increment performance (O(1))', () => {
      const cubit = new BenchmarkCubit();
      const adapter = getOrCreateAdapter(cubit);

      // Subscribe to track version changes
      const unsubscribe = adapter.subscribe(undefined, () => {
        // No-op listener
      });

      // Emit 10000 state changes to test version counter
      for (let i = 0; i < 10000; i++) {
        cubit.increment();
      }

      unsubscribe();
      adapter.dispose();
      Blac.resetInstance();
    });

    bench('version-based vs deep comparison (simulate)', () => {
      const cubit = new ComplexCubit();
      const adapter = getOrCreateAdapter(cubit);

      let changeCount = 0;

      // Version-based: just increment a counter (what we do)
      const versionBased = () => {
        changeCount++;
      };

      // Subscribe with our version-based approach
      const unsubscribe = adapter.subscribe(undefined, versionBased);

      // Trigger 1000 state changes
      for (let i = 0; i < 1000; i++) {
        cubit.updateFilter(`filter-${i}`);
      }

      unsubscribe();
      adapter.dispose();
      Blac.resetInstance();
    });
  });

  describe('Memory Characteristics', () => {
    bench('memory: create/dispose 100 adapters repeatedly', () => {
      // Simulate component mount/unmount cycles
      for (let cycle = 0; cycle < 10; cycle++) {
        const adapters = [];

        // Create 100 adapters
        for (let i = 0; i < 100; i++) {
          const cubit = new BenchmarkCubit();
          const adapter = getOrCreateAdapter(cubit);
          adapters.push(adapter);
        }

        // Dispose all
        for (const adapter of adapters) {
          adapter.dispose();
        }

        Blac.resetInstance();
      }
    });
  });

  describe('Scalability', () => {
    bench('100 components with 100 state changes each', () => {
      const adapters = [];
      const unsubscribes = [];

      // Create 100 adapters (simulate 100 components)
      for (let i = 0; i < 100; i++) {
        const cubit = new BenchmarkCubit();
        const adapter = getOrCreateAdapter(cubit);
        adapters.push({ cubit, adapter });

        // Each subscribes
        const unsubscribe = adapter.subscribe(undefined, () => {
          // No-op listener
        });
        unsubscribes.push(unsubscribe);
      }

      // Each emits 100 state changes
      for (const { cubit } of adapters) {
        for (let i = 0; i < 100; i++) {
          cubit.increment();
        }
      }

      // Cleanup
      unsubscribes.forEach((unsub) => unsub());
      adapters.forEach(({ adapter }) => adapter.dispose());
      Blac.resetInstance();
    });

    bench('single bloc with 1000 subscribers', () => {
      const cubit = new BenchmarkCubit();
      const adapter = getOrCreateAdapter(cubit);

      // Create 1000 subscribers
      const unsubscribes = [];
      for (let i = 0; i < 1000; i++) {
        const unsubscribe = adapter.subscribe(undefined, () => {
          // No-op listener
        });
        unsubscribes.push(unsubscribe);
      }

      // Emit 100 state changes (each notifies all 1000 subscribers)
      for (let i = 0; i < 100; i++) {
        cubit.increment();
      }

      // Cleanup
      unsubscribes.forEach((unsub) => unsub());
      adapter.dispose();
      Blac.resetInstance();
    });
  });

  describe('Comparison Benchmarks', () => {
    bench('default equality (Object.is)', () => {
      const cubit = new BenchmarkCubit();
      const adapter = getOrCreateAdapter(cubit);

      // Use default comparison (Object.is)
      const unsubscribe = adapter.subscribe(
        (state) => state,
        () => {
          // No-op listener
        },
        undefined // Default comparison
      );

      // Emit 1000 state changes
      for (let i = 0; i < 1000; i++) {
        cubit.increment();
      }

      unsubscribe();
      adapter.dispose();
      Blac.resetInstance();
    });

    bench('custom equality function', () => {
      const cubit = new BenchmarkCubit();
      const adapter = getOrCreateAdapter(cubit);

      // Custom comparison
      const customCompare = (a: number, b: number) => a === b;

      const unsubscribe = adapter.subscribe(
        (state) => state,
        () => {
          // No-op listener
        },
        customCompare
      );

      // Emit 1000 state changes
      for (let i = 0; i < 1000; i++) {
        cubit.increment();
      }

      unsubscribe();
      adapter.dispose();
      Blac.resetInstance();
    });
  });
});
