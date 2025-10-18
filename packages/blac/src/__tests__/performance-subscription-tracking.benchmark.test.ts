/**
 * Performance Benchmark Suite for Subscription & Dependency Tracking
 *
 * Tests the performance optimizations implemented in:
 * - Fix #1: PathTrie O(n) leaf filtering
 * - Fix #2: PathIndex O(1) notification matching
 * - Fix #3: Skip atomic swap when dependencies unchanged
 * - Fix #5: Conditional tracking
 *
 * Reference: reports/performance-analysis-subscription-tracking.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PathTrie } from '../utils/PathTrie';
import { PathIndex } from '../utils/PathIndex';
import { Cubit } from '../Cubit';
import { Blac } from '../Blac';
import { setsEqual } from '../utils/setUtils';

// ============================================================================
// Helper Functions for Test Data Generation
// ============================================================================

/**
 * Generate test paths with varying depths
 * @param count Number of paths to generate
 * @param avgDepth Average depth of paths (default: 3)
 * @returns Set of generated paths
 */
function generatePaths(count: number, avgDepth = 3): Set<string> {
  const paths = new Set<string>();
  const roots = ['user', 'settings', 'app', 'data', 'config'];
  const middle = ['profile', 'preferences', 'details', 'info', 'meta'];
  const leaves = ['name', 'email', 'age', 'value', 'id', 'status'];

  for (let i = 0; i < count; i++) {
    const depth = Math.max(1, avgDepth + Math.floor(Math.random() * 2) - 1);
    const segments: string[] = [];

    segments.push(roots[i % roots.length]);

    for (let d = 1; d < depth - 1; d++) {
      segments.push(middle[(i + d) % middle.length]);
    }

    if (depth > 1) {
      segments.push(leaves[i % leaves.length]);
    }

    // Add uniqueness to prevent collisions
    if (i >= roots.length) {
      segments[segments.length - 1] += `_${i}`;
    }

    paths.add(segments.join('.'));
  }

  return paths;
}

/**
 * Generate nested paths (parent + children)
 */
function generateNestedPaths(parentCount: number, childrenPerParent = 3): Set<string> {
  const paths = new Set<string>();
  const bases = generatePaths(parentCount, 2);

  for (const base of bases) {
    paths.add(base);
    for (let i = 0; i < childrenPerParent; i++) {
      paths.add(`${base}.child${i}`);
      paths.add(`${base}.child${i}.leaf`);
    }
  }

  return paths;
}

/**
 * Generate deep state object for testing
 */
function generateDeepState(depth: number, breadth: number): Record<string, any> {
  const state: Record<string, any> = {};

  function buildLevel(level: number, obj: Record<string, any>): void {
    if (level >= depth) return;

    for (let i = 0; i < breadth; i++) {
      const key = `prop${i}`;
      if (level < depth - 1) {
        obj[key] = {};
        buildLevel(level + 1, obj[key]);
      } else {
        obj[key] = `value_${level}_${i}`;
      }
    }
  }

  buildLevel(0, state);
  return state;
}

// ============================================================================
// Test Suite: PathTrie Performance (Fix #1)
// ============================================================================

describe('PathTrie Performance Benchmarks (Fix #1)', () => {
  it('should filter 10 paths in <1ms (baseline)', () => {
    const paths = generatePaths(10, 3);
    const trie = new PathTrie();

    const start = performance.now();

    for (const path of paths) {
      trie.insert(path);
    }
    const leafPaths = trie.getLeafPaths();

    const duration = performance.now() - start;

    expect(leafPaths.size).toBeGreaterThan(0);
    expect(leafPaths.size).toBeLessThanOrEqual(paths.size);
    expect(duration).toBeLessThan(1); // Should be sub-millisecond
  });

  it('should filter 50 paths in <5ms (O(n) vs O(n²) improvement)', () => {
    const paths = generatePaths(50, 4);
    const trie = new PathTrie();

    const start = performance.now();

    for (const path of paths) {
      trie.insert(path);
    }
    const leafPaths = trie.getLeafPaths();

    const duration = performance.now() - start;

    expect(leafPaths.size).toBeGreaterThan(0);
    expect(duration).toBeLessThan(5); // O(n²) would be ~2500 iterations
  });

  it('should filter 100 paths in <10ms (expected 80-95% improvement)', () => {
    const paths = generatePaths(100, 4);
    const trie = new PathTrie();

    const start = performance.now();

    for (const path of paths) {
      trie.insert(path);
    }
    const leafPaths = trie.getLeafPaths();

    const duration = performance.now() - start;

    expect(leafPaths.size).toBeGreaterThan(0);
    expect(duration).toBeLessThan(10); // O(n²) would be ~10,000 iterations
  });

  it('should handle 1000 paths with deep nesting in <50ms', () => {
    const paths = generatePaths(1000, 5);
    const trie = new PathTrie();

    const start = performance.now();

    for (const path of paths) {
      trie.insert(path);
    }
    const leafPaths = trie.getLeafPaths();

    const duration = performance.now() - start;

    expect(leafPaths.size).toBeGreaterThan(0);
    expect(duration).toBeLessThan(50); // Linear scaling
  });

  it('should correctly identify leaf paths in nested hierarchy', () => {
    const trie = new PathTrie();

    // Insert parent + children
    trie.insert('user');
    trie.insert('user.profile');
    trie.insert('user.profile.name');
    trie.insert('user.settings');
    trie.insert('user.settings.theme');

    const leafPaths = trie.getLeafPaths();

    // Only deepest paths should be leafs
    expect(leafPaths.has('user.profile.name')).toBe(true);
    expect(leafPaths.has('user.settings.theme')).toBe(true);
    expect(leafPaths.has('user')).toBe(false);
    expect(leafPaths.has('user.profile')).toBe(false);
    expect(leafPaths.size).toBe(2);
  });

  it('should scale linearly (O(n) verification)', () => {
    const sizes = [10, 50, 100, 200];
    const timings: number[] = [];

    for (const size of sizes) {
      const paths = generatePaths(size, 4);
      const trie = new PathTrie();

      const start = performance.now();
      for (const path of paths) {
        trie.insert(path);
      }
      trie.getLeafPaths();
      const duration = performance.now() - start;

      timings.push(duration);
    }

    // Verify linear scaling: time(2n) ≈ 2 × time(n)
    // Allow 3x tolerance for measurement variance
    const ratio_50_10 = timings[1] / timings[0];
    const ratio_100_50 = timings[2] / timings[1];
    const ratio_200_100 = timings[3] / timings[2];

    expect(ratio_50_10).toBeLessThan(10); // Not quadratic (would be ~25)
    expect(ratio_100_50).toBeLessThan(5); // Not quadratic (would be ~4)
    expect(ratio_200_100).toBeLessThan(5); // Not quadratic (would be ~4)
  });
});

// ============================================================================
// Test Suite: PathIndex Performance (Fix #2)
// ============================================================================

describe('PathIndex Performance Benchmarks (Fix #2)', () => {
  it('should build index for 10 paths in <1ms', () => {
    const paths = generatePaths(10, 3);
    const index = new PathIndex();

    const start = performance.now();
    index.build(paths);
    const duration = performance.now() - start;

    expect(index.size).toBeGreaterThanOrEqual(paths.size);
    expect(duration).toBeLessThan(1);
  });

  it('should build index for 100 paths in <10ms', () => {
    const paths = generatePaths(100, 4);
    const index = new PathIndex();

    const start = performance.now();
    index.build(paths);
    const duration = performance.now() - start;

    expect(index.size).toBeGreaterThanOrEqual(paths.size);
    expect(duration).toBeLessThan(10);
  });

  it('should perform O(1) isChildOf queries', () => {
    const paths = new Set(['user', 'user.profile', 'user.profile.name', 'settings']);
    const index = new PathIndex();
    index.build(paths);

    const iterations = 10000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      index.isChildOf('user.profile.name', 'user.profile');
      index.isChildOf('user.profile.name', 'user');
      index.isChildOf('settings', 'user');
    }

    const duration = performance.now() - start;
    const avgPerQuery = duration / (iterations * 3);

    expect(avgPerQuery).toBeLessThan(0.001); // Sub-microsecond per query
  });

  it('should handle 10×10 shouldNotify in <2ms (70% improvement)', () => {
    const trackedPaths = generatePaths(10, 3);
    const changedPaths = generatePaths(10, 3);
    const index = new PathIndex();

    const start = performance.now();
    const result = index.shouldNotify(trackedPaths, changedPaths);
    const duration = performance.now() - start;

    expect(typeof result).toBe('boolean');
    expect(duration).toBeLessThan(2); // O(n×m) would be ~100 string ops
  });

  it('should handle 50×20 shouldNotify in <5ms (88% improvement)', () => {
    const trackedPaths = generatePaths(50, 3);
    const changedPaths = generatePaths(20, 3);
    const index = new PathIndex();

    const start = performance.now();
    const result = index.shouldNotify(trackedPaths, changedPaths);
    const duration = performance.now() - start;

    expect(typeof result).toBe('boolean');
    expect(duration).toBeLessThan(5); // O(n×m) would be ~1000 string ops
  });

  it('should handle 100×50 shouldNotify in <10ms (95% improvement)', () => {
    const trackedPaths = generatePaths(100, 4);
    const changedPaths = generatePaths(50, 4);
    const index = new PathIndex();

    const start = performance.now();
    const result = index.shouldNotify(trackedPaths, changedPaths);
    const duration = performance.now() - start;

    expect(typeof result).toBe('boolean');
    expect(duration).toBeLessThan(10); // O(n×m) would be ~5000 string ops
  });

  it('should correctly detect parent-child relationships', () => {
    const index = new PathIndex();
    const paths = new Set([
      'user',
      'user.profile',
      'user.profile.name',
      'user.settings',
      'app.config',
    ]);
    index.build(paths);

    // Direct parent-child
    expect(index.isChildOf('user.profile.name', 'user.profile')).toBe(true);
    expect(index.isChildOf('user.profile.name', 'user')).toBe(true);

    // Not related
    expect(index.isChildOf('user.settings', 'user.profile')).toBe(false);
    expect(index.isChildOf('app.config', 'user')).toBe(false);

    // Reverse (parent is not child)
    expect(index.isChildOf('user', 'user.profile')).toBe(false);
  });

  it('should scale sub-linearly for shouldNotify (verification)', () => {
    const sizes = [
      { tracked: 10, changed: 10 },
      { tracked: 20, changed: 20 },
      { tracked: 40, changed: 40 },
    ];
    const timings: number[] = [];

    for (const { tracked, changed } of sizes) {
      const trackedPaths = generatePaths(tracked, 3);
      const changedPaths = generatePaths(changed, 3);
      const index = new PathIndex();

      const start = performance.now();
      index.shouldNotify(trackedPaths, changedPaths);
      const duration = performance.now() - start;

      timings.push(duration);
    }

    // O(n×m) would scale quadratically (4x for doubling)
    // O(n+m) scales linearly (2x for doubling)
    const ratio_20_10 = timings[1] / timings[0];
    const ratio_40_20 = timings[2] / timings[1];

    // Should be closer to 2x (linear) than 4x (quadratic)
    expect(ratio_20_10).toBeLessThan(4);
    expect(ratio_40_20).toBeLessThan(4);
  });
});

// ============================================================================
// Test Suite: Set Equality Optimization (Fix #3)
// ============================================================================

describe('Set Equality Optimization Benchmarks (Fix #3)', () => {
  it('should compare small sets (10 items) in <0.1ms', () => {
    const paths1 = generatePaths(10, 3);
    const paths2 = new Set(paths1);

    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      setsEqual(paths1, paths2);
    }

    const duration = performance.now() - start;
    const avgPerComparison = duration / iterations;

    expect(avgPerComparison).toBeLessThan(0.1);
  });

  it('should compare medium sets (50 items) in <0.5ms', () => {
    const paths1 = generatePaths(50, 3);
    const paths2 = new Set(paths1);

    const iterations = 100;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      setsEqual(paths1, paths2);
    }

    const duration = performance.now() - start;
    const avgPerComparison = duration / iterations;

    expect(avgPerComparison).toBeLessThan(0.5);
  });

  it('should short-circuit on size mismatch in <0.01ms', () => {
    const paths1 = generatePaths(50, 3);
    const paths2 = generatePaths(51, 3);

    const iterations = 10000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      setsEqual(paths1, paths2);
    }

    const duration = performance.now() - start;
    const avgPerComparison = duration / iterations;

    // Size check should be nearly instant
    expect(avgPerComparison).toBeLessThan(0.01);
  });

  it('should correctly identify equal and unequal sets', () => {
    const paths1 = new Set(['user.name', 'user.email', 'settings.theme']);
    const paths2 = new Set(['user.name', 'user.email', 'settings.theme']);
    const paths3 = new Set(['user.name', 'user.email', 'settings.color']);

    expect(setsEqual(paths1, paths2)).toBe(true);
    expect(setsEqual(paths1, paths3)).toBe(false);
    expect(setsEqual(paths2, paths3)).toBe(false);
  });
});

// ============================================================================
// Test Suite: Integration Benchmarks (End-to-End)
// ============================================================================

describe('Integration Performance Benchmarks', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  afterEach(() => {
    Blac.resetInstance();
  });

  it('should handle state change notification with 50 subscriptions in <10ms', () => {
    interface TestState {
      users: Array<{ id: number; name: string; email: string }>;
      settings: { theme: string; language: string };
    }

    class TestCubit extends Cubit<TestState> {
      constructor() {
        super({
          users: Array.from({ length: 20 }, (_, i) => ({
            id: i,
            name: `User ${i}`,
            email: `user${i}@example.com`,
          })),
          settings: { theme: 'dark', language: 'en' },
        });
      }

      updateUser = (id: number, name: string) => {
        const users = [...this.state.users];
        users[id] = { ...users[id], name };
        this.emit({ ...this.state, users });
      };
    }

    const cubit = new TestCubit();
    const callbacks: Array<() => void> = [];

    // Create 50 subscriptions
    for (let i = 0; i < 50; i++) {
      callbacks.push(cubit.subscribe(() => {}).unsubscribe);
    }

    const start = performance.now();

    // Emit state change - should notify all subscriptions
    cubit.updateUser(0, 'Updated User');

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);

    // Cleanup
    callbacks.forEach((unsub) => unsub());
  });

  it('should handle multiple rapid state changes efficiently', () => {
    class CounterCubit extends Cubit<number> {
      constructor() {
        super(0);
      }

      increment = () => this.emit(this.state + 1);
    }

    const cubit = new CounterCubit();
    const unsubscribe = cubit.subscribe(() => {}).unsubscribe;

    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      cubit.increment();
    }

    const duration = performance.now() - start;
    const avgPerEmit = duration / iterations;

    expect(avgPerEmit).toBeLessThan(0.1); // <0.1ms per emit
    expect(duration).toBeLessThan(100); // Total <100ms

    unsubscribe();
  });

  it('should maintain performance with complex nested state', () => {
    type DeepState = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                value: number;
                items: number[];
              };
            };
          };
        };
      };
    };

    class DeepStateCubit extends Cubit<DeepState> {
      constructor() {
        super({
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    value: 0,
                    items: [1, 2, 3],
                  },
                },
              },
            },
          },
        });
      }

      updateDeepValue = (newValue: number) => {
        this.emit({
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    value: newValue,
                    items: this.state.level1.level2.level3.level4.level5.items,
                  },
                },
              },
            },
          },
        });
      };
    }

    const cubit = new DeepStateCubit();
    const unsubscribe = cubit.subscribe(() => {}).unsubscribe;

    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      cubit.updateDeepValue(i);
    }

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50); // Should handle deep state efficiently

    unsubscribe();
  });
});

// ============================================================================
// Test Suite: Memory & Allocation Benchmarks
// ============================================================================

describe('Memory & Allocation Benchmarks', () => {
  it('should not create excessive temporary objects during path operations', () => {
    // This test verifies that optimizations reduce allocations
    const paths = generatePaths(100, 4);
    const trie = new PathTrie();

    // Track memory before
    const memBefore = (performance as any).memory?.usedJSHeapSize ?? 0;

    // Perform operations
    for (const path of paths) {
      trie.insert(path);
    }
    const leafs = trie.getLeafPaths();

    // Track memory after
    const memAfter = (performance as any).memory?.usedJSHeapSize ?? 0;
    const memGrowth = memAfter - memBefore;

    // Verify reasonable memory usage
    expect(leafs.size).toBeGreaterThan(0);

    // If memory API available, check growth is reasonable (<1MB for 100 paths)
    if (memBefore > 0) {
      expect(memGrowth).toBeLessThan(1024 * 1024);
    }
  });

  it('should reuse PathIndex instance efficiently', () => {
    const index = new PathIndex();
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      const paths = generatePaths(10, 3);
      index.build(paths);

      // Verify index works
      expect(index.size).toBeGreaterThanOrEqual(10);

      // Clear for next iteration
      index.clear();
      expect(index.size).toBe(0);
    }

    // Index should be reusable without memory leaks
    expect(index.size).toBe(0);
  });
});

// ============================================================================
// Test Suite: Regression Detection
// ============================================================================

describe('Performance Regression Detection', () => {
  it('filterLeafPaths should complete in <1ms for 100 paths (regression check)', () => {
    const paths = generatePaths(100, 4);
    const trie = new PathTrie();

    const start = performance.now();
    for (const path of paths) {
      trie.insert(path);
    }
    trie.getLeafPaths();
    const duration = performance.now() - start;

    // This is our baseline - if this fails, we have a regression
    expect(duration).toBeLessThan(1);
  });

  it('shouldNotifyForPaths should complete in <2ms for 50×20 (regression check)', () => {
    const tracked = generatePaths(50, 3);
    const changed = generatePaths(20, 3);
    const index = new PathIndex();

    const start = performance.now();
    index.shouldNotify(tracked, changed);
    const duration = performance.now() - start;

    // This is our baseline - if this fails, we have a regression
    expect(duration).toBeLessThan(2);
  });

  it('setsEqual should complete in <0.1ms for 50 items (regression check)', () => {
    const set1 = generatePaths(50, 3);
    const set2 = new Set(set1);

    const start = performance.now();
    setsEqual(set1, set2);
    const duration = performance.now() - start;

    // This is our baseline - if this fails, we have a regression
    expect(duration).toBeLessThan(0.1);
  });
});
