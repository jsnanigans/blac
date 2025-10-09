# Task: Enhance Testing

**Priority:** Medium
**Category:** Long-term Architecture
**Estimated Effort:** 2-3 weeks
**Dependencies:**
- Recommended: Complete "Security Hardening" first for security test suite
- Recommended: Complete "Performance Optimization" first for performance benchmarks

## Overview

Expand test coverage with integration tests, performance benchmarks, security testing, and edge case coverage to ensure robust, production-ready code.

## Problem Statement

While the codebase has comprehensive unit tests for core functionality, there are gaps in:

1. **Integration tests** - Complex multi-component scenarios not fully tested
2. **Performance benchmarks** - No automated performance regression testing
3. **Security testing** - Plugin system and global access need security tests
4. **Edge cases** - Unusual scenarios and error conditions under-tested
5. **Load testing** - Behavior under high load not verified
6. **Cross-browser testing** - React integration not tested across environments

These gaps create risks:
- Regressions in complex scenarios
- Performance degradation undetected
- Security vulnerabilities undetected
- Production bugs from edge cases
- Scalability issues unknown

## Goals

1. **Add comprehensive integration tests** for complex scenarios
2. **Implement performance benchmarks** with regression detection
3. **Create security test suite** for plugin system and global access
4. **Improve edge case coverage** for error conditions
5. **Add load testing** to verify scalability
6. **Integrate automated testing** in CI/CD pipeline

## Acceptance Criteria

### Must Have
- [ ] Integration test suite covering end-to-end scenarios
- [ ] Performance benchmark suite with baseline metrics
- [ ] Security test suite for plugin system
- [ ] Edge case test coverage >90%
- [ ] All tests run in CI/CD
- [ ] Test coverage reports generated

### Should Have
- [ ] Performance regression detection in CI
- [ ] Load testing for high consumer counts
- [ ] Cross-browser testing for React integration
- [ ] Mutation testing for test quality
- [ ] Visual regression testing for demos

### Nice to Have
- [ ] Fuzzing tests for input validation
- [ ] Property-based testing for complex logic
- [ ] Chaos engineering tests
- [ ] A/B testing framework for performance optimizations

## Test Categories to Add

### 1. Integration Tests

**Scope:** Test multiple components working together

```typescript
// packages/blac/src/__tests__/integration/

describe('Integration: Bloc Lifecycle with Plugins', () => {
  it('should execute plugin hooks throughout lifecycle', async () => {
    const pluginEvents: string[] = [];

    class TestPlugin implements BlacPlugin {
      name = 'TestPlugin';

      onEvent(event: BlacLifecycleEvent) {
        pluginEvents.push(event);
      }
    }

    Blac.addPlugin(new TestPlugin());

    class TestBloc extends Cubit<number> {
      constructor() { super(0); }

      increment = () => { this.emit(this.state + 1); };
    }

    const bloc = new TestBloc();

    expect(pluginEvents).toContain(BlacLifecycleEvent.CREATED);

    bloc.increment();

    expect(pluginEvents).toContain(BlacLifecycleEvent.STATE_CHANGED);

    await bloc.dispose();

    expect(pluginEvents).toContain(BlacLifecycleEvent.DISPOSED);
  });

  it('should handle complex React hook scenarios', async () => {
    // Test multiple hooks, nested blocs, conditional rendering
  });

  it('should properly cleanup when components unmount rapidly', () => {
    // Test rapid mount/unmount cycles
  });
});
```

### 2. Performance Benchmarks

**Scope:** Automated performance testing with regression detection

```typescript
// packages/blac/src/__tests__/benchmarks/

import { performance } from 'perf_hooks';

interface BenchmarkResult {
  name: string;
  mean: number;
  median: number;
  p95: number;
  samples: number;
}

function benchmark(
  name: string,
  fn: () => void,
  samples: number = 100
): BenchmarkResult {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < 10; i++) {
    fn();
  }

  // Measure
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  times.sort((a, b) => a - b);

  return {
    name,
    mean: times.reduce((a, b) => a + b, 0) / times.length,
    median: times[Math.floor(times.length / 2)],
    p95: times[Math.floor(times.length * 0.95)],
    samples
  };
}

describe('Performance Benchmarks', () => {
  it('should emit state updates quickly', () => {
    class TestBloc extends Cubit<number> {
      constructor() { super(0); }
    }

    const bloc = new TestBloc();

    const result = benchmark('state emission', () => {
      bloc.emit(Math.random());
    });

    // Assert performance target
    expect(result.p95).toBeLessThan(1); // <1ms at p95
  });

  it('should handle many consumers efficiently', () => {
    class TestBloc extends Cubit<number> {
      constructor() { super(0); }
    }

    const bloc = new TestBloc();

    // Register 1000 consumers
    for (let i = 0; i < 1000; i++) {
      bloc._registerConsumer(`consumer-${i}`, {});
    }

    const result = benchmark('state emission with 1000 consumers', () => {
      bloc.emit(Math.random());
    });

    // Should scale sub-linearly
    expect(result.p95).toBeLessThan(10); // <10ms at p95
  });

  it('should create proxies efficiently', () => {
    const deepObject = createDeepObject(10);

    const result = benchmark('proxy creation depth 10', () => {
      ProxyFactory.createProxy(deepObject, {});
    });

    expect(result.p95).toBeLessThan(2); // <2ms at p95
  });
});
```

### 3. Security Tests

**Scope:** Test security boundaries and attack resistance

```typescript
// packages/blac/src/__tests__/security/

describe('Security', () => {
  describe('Plugin System', () => {
    it('should isolate plugin errors', () => {
      class MaliciousPlugin implements BlacPlugin {
        name = 'MaliciousPlugin';

        onEvent() {
          throw new Error('Plugin attack!');
        }
      }

      Blac.addPlugin(new MaliciousPlugin());

      class TestBloc extends Cubit<number> {
        constructor() { super(0); }
      }

      // Should not crash
      expect(() => {
        const bloc = new TestBloc();
        bloc.emit(1);
      }).not.toThrow();
    });

    it('should prevent plugin access to private data', () => {
      // Test that plugins can't access private properties
    });

    it('should timeout long-running plugins', async () => {
      // Test plugin timeout mechanism
    }, 10000);
  });

  describe('Global State', () => {
    it('should prevent globalThis pollution', () => {
      const original = (globalThis as any).Blac;

      try {
        // Attempt pollution
        (globalThis as any).Blac = {
          malicious: true,
          log: () => { throw new Error('Hacked!'); }
        };

        class TestBloc extends Cubit<number> {
          constructor() { super(0); }
        }

        // Should not use polluted global
        expect(() => new TestBloc()).not.toThrow();
      } finally {
        (globalThis as any).Blac = original;
      }
    });

    it('should validate global access', () => {
      // Test that all global access is validated
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid constructor params', () => {
      // Test constructor validation
    });

    it('should reject invalid state values', () => {
      class TestBloc extends Cubit<number> {
        constructor() { super(0); }
      }

      const bloc = new TestBloc();

      expect(() => {
        bloc.emit(undefined as any);
      }).toThrow();

      expect(() => {
        bloc.emit(null as any);
      }).toThrow();
    });
  });
});
```

### 4. Edge Case Tests

**Scope:** Test unusual scenarios and error conditions

```typescript
// packages/blac/src/__tests__/edge-cases/

describe('Edge Cases', () => {
  describe('Rapid Operations', () => {
    it('should handle rapid state updates', async () => {
      class TestBloc extends Cubit<number> {
        constructor() { super(0); }
      }

      const bloc = new TestBloc();
      const updates: number[] = [];

      bloc.stream.subscribe(state => updates.push(state));

      // Emit 1000 updates rapidly
      for (let i = 0; i < 1000; i++) {
        bloc.emit(i);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(updates.length).toBe(1000);
      expect(updates[999]).toBe(999);
    });

    it('should handle rapid disposal requests', async () => {
      class TestBloc extends Cubit<number> {
        constructor() { super(0); }
      }

      const bloc = new TestBloc();

      // Multiple disposal requests
      const promises = [
        bloc.dispose(),
        bloc.dispose(),
        bloc.dispose()
      ];

      await Promise.all(promises);

      expect(bloc.isDisposed).toBe(true);
    });
  });

  describe('Memory Limits', () => {
    it('should handle very large state objects', () => {
      const largeState = new Array(10000).fill(0).map((_, i) => ({
        id: i,
        data: 'x'.repeat(1000)
      }));

      class TestBloc extends Cubit<typeof largeState> {
        constructor() { super(largeState); }
      }

      const bloc = new TestBloc();

      expect(bloc.state.length).toBe(10000);
    });

    it('should cleanup dead consumers efficiently', () => {
      class TestBloc extends Cubit<number> {
        constructor() { super(0); }
      }

      const bloc = new TestBloc();

      // Create and release many consumers
      for (let i = 0; i < 10000; i++) {
        let consumer = {};
        bloc._registerConsumer(`consumer-${i}`, consumer);
        consumer = null as any; // Release for GC
      }

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      // Validate should cleanup
      bloc._validateConsumers();

      expect(bloc._consumerRefs.size).toBeLessThan(100);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent state updates', async () => {
      class TestBloc extends Cubit<number> {
        constructor() { super(0); }

        incrementAsync = async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          this.emit(this.state + 1);
        };
      }

      const bloc = new TestBloc();

      // Start 10 concurrent increments
      await Promise.all([
        bloc.incrementAsync(),
        bloc.incrementAsync(),
        bloc.incrementAsync(),
        bloc.incrementAsync(),
        bloc.incrementAsync(),
        bloc.incrementAsync(),
        bloc.incrementAsync(),
        bloc.incrementAsync(),
        bloc.incrementAsync(),
        bloc.incrementAsync()
      ]);

      // All increments should complete
      expect(bloc.state).toBe(10);
    });
  });

  describe('Circular References', () => {
    it('should handle circular state references', () => {
      interface CircularState {
        value: number;
        self?: CircularState;
      }

      class TestBloc extends Cubit<CircularState> {
        constructor() {
          super({ value: 0 });
        }
      }

      const bloc = new TestBloc();
      const state: CircularState = { value: 1 };
      state.self = state;

      // Should handle circular reference
      expect(() => bloc.emit(state)).not.toThrow();
    });
  });
});
```

### 5. Load Tests

**Scope:** Test behavior under high load

```typescript
// packages/blac/src/__tests__/load/

describe('Load Tests', () => {
  it('should handle 10000 blocs simultaneously', () => {
    const blocs: Cubit<number>[] = [];

    for (let i = 0; i < 10000; i++) {
      class TestBloc extends Cubit<number> {
        constructor() { super(i); }
      }
      blocs.push(new TestBloc());
    }

    // All should be active
    expect(blocs.every(b => !b.isDisposed)).toBe(true);

    // Update all
    blocs.forEach((b, i) => b.emit(i + 1));

    // Verify all updated
    expect(blocs.every((b, i) => b.state === i + 1)).toBe(true);
  });

  it('should handle high-frequency updates', async () => {
    class TestBloc extends Cubit<number> {
      constructor() { super(0); }
    }

    const bloc = new TestBloc();
    let updateCount = 0;

    bloc.stream.subscribe(() => updateCount++);

    // 10000 updates in rapid succession
    const start = performance.now();

    for (let i = 0; i < 10000; i++) {
      bloc.emit(i);
    }

    const end = performance.now();
    const duration = end - start;

    // Should complete in reasonable time
    expect(duration).toBeLessThan(1000); // <1 second

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(updateCount).toBe(10000);
  });
});
```

## Implementation Steps

### Phase 1: Infrastructure Setup (Days 1-3)

1. **Set up test infrastructure**
   ```bash
   mkdir -p packages/blac/src/__tests__/{integration,benchmarks,security,edge-cases,load}
   ```

2. **Configure benchmark tooling**
   ```typescript
   // Add to package.json
   {
     "scripts": {
       "test:integration": "vitest run --config vitest.integration.config.ts",
       "test:benchmark": "vitest run --config vitest.benchmark.config.ts",
       "test:security": "vitest run --config vitest.security.config.ts",
       "test:all": "vitest run && pnpm test:integration && pnpm test:benchmark"
     }
   }
   ```

3. **Set up performance tracking**
   - Baseline metrics file
   - Performance regression thresholds
   - CI integration

### Phase 2: Write Integration Tests (Days 3-7)

1. **Core integration tests**
   - Bloc lifecycle with plugins
   - React hooks complex scenarios
   - Multi-bloc coordination

2. **React integration tests**
   - Multiple components sharing bloc
   - Rapid mount/unmount
   - Conditional rendering

3. **Plugin integration tests**
   - Multiple plugins interacting
   - Plugin error propagation
   - Plugin performance impact

### Phase 3: Write Performance Benchmarks (Days 7-11)

1. **Create benchmark suite**
   - State emission benchmarks
   - Consumer scaling benchmarks
   - Proxy creation benchmarks

2. **Baseline measurements**
   - Run benchmarks
   - Document baseline
   - Set regression thresholds

3. **CI integration**
   - Automated benchmark runs
   - Regression detection
   - Performance reports

### Phase 4: Write Security Tests (Days 11-14)

1. **Plugin security tests**
   - Error isolation
   - Permission enforcement
   - Timeout mechanism

2. **Global state security tests**
   - Pollution prevention
   - Validation enforcement
   - Type safety

3. **Input validation tests**
   - Constructor validation
   - State validation
   - Event validation

### Phase 5: Write Edge Case Tests (Days 14-18)

1. **Rapid operation tests**
   - Rapid state updates
   - Rapid disposal
   - Concurrent operations

2. **Memory tests**
   - Large state objects
   - Consumer cleanup
   - Memory leaks

3. **Boundary tests**
   - Empty states
   - Null/undefined handling
   - Circular references

### Phase 6: CI/CD Integration (Days 18-21)

1. **Add to CI pipeline**
   ```yaml
   # .github/workflows/test.yml
   - name: Run integration tests
     run: pnpm test:integration

   - name: Run benchmarks
     run: pnpm test:benchmark

   - name: Run security tests
     run: pnpm test:security

   - name: Upload coverage
     uses: codecov/codecov-action@v3
   ```

2. **Configure coverage reporting**
   - Generate coverage reports
   - Upload to Codecov
   - Set coverage thresholds

3. **Add status checks**
   - Required CI checks
   - Coverage thresholds
   - Performance regression checks

## Testing Tools & Libraries

### Recommended Additions

1. **tsd** - TypeScript type testing
2. **@vitest/ui** - Visual test interface
3. **@testing-library/react** - React testing utilities
4. **jsdom / happy-dom** - DOM environment
5. **benchmark.js** - Precise benchmarking
6. **fast-check** - Property-based testing

### Configuration

```typescript
// vitest.benchmark.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/__tests__/benchmarks/**/*.test.ts'],
    benchmark: {
      include: ['**/__tests__/benchmarks/**/*.bench.ts']
    },
    reporters: ['default', 'json'],
    outputFile: './benchmark-results.json'
  }
});
```

## Success Metrics

- Integration test coverage: 50+ scenarios
- Performance benchmarks: 20+ metrics
- Security tests: 30+ attack scenarios
- Edge case coverage: 90%+
- All tests run in <5 minutes
- Performance regression detected automatically
- Coverage reports generated and tracked

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Slow test execution | Medium | Parallel execution, optimize slow tests |
| Flaky tests | High | Identify and fix root causes, retry on failure |
| False positive performance regressions | Medium | Statistical analysis, multiple runs |
| CI/CD overhead | Low | Cache dependencies, parallel jobs |

## Follow-up Tasks

- Add visual regression testing for playground
- Implement mutation testing
- Add fuzzing tests for security
- Create performance dashboard
- Add cross-browser testing matrix

## References

- Review Report: `review.md:173-177` (Enhance Testing recommendation)
- Vitest Documentation: https://vitest.dev/
- Testing Library: https://testing-library.com/
- Benchmark.js: https://benchmarkjs.com/
