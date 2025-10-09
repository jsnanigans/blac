# Task: Performance Optimization

**Priority:** High
**Category:** Short-term Improvements
**Estimated Effort:** 2-3 weeks
**Dependencies:**
- Recommended: Complete "Refactor BlocBase" first for cleaner optimization targets

## Overview

Optimize critical performance bottlenecks to ensure the library scales efficiently with increasing numbers of consumers and deep state object nesting.

## Problem Statement

The codebase has several performance bottlenecks that degrade performance at scale:

1. **O(n) Consumer Validation** - Iterates through all consumers on every validation
2. **Unbounded Recursive Proxy Creation** - No depth limiting for nested objects
3. **Inefficient Dead Consumer Cleanup** - Cleanup runs on every state change
4. **Missing Caching** - Validation results not cached

These issues cause:
- Performance degradation as consumer count grows
- Memory pressure from deep proxy chains
- Unnecessary CPU cycles on cleanup operations
- Wasted work re-validating unchanged consumers

## Specific Performance Issues

### 1. O(n) Consumer Validation

**Location:** `packages/blac/src/BlocBase.ts:168-191`

```typescript
_validateConsumers = (): void => {
  const deadConsumers: string[] = [];
  for (const [consumerId, weakRef] of this._consumerRefs) {
    if (weakRef.deref() === undefined) {
      deadConsumers.push(consumerId);
    }
  }
  // O(n) iteration on every validation
}
```

**Issue:** Runs on every state change, iterating through all consumers regardless of whether any have been garbage collected.

**Impact:**
- With 100 consumers: 100 iterations per state change
- With 1000 consumers: 1000 iterations per state change
- Scales linearly with consumer count

### 2. Unbounded Recursive Proxy Creation

**Location:** `packages/blac/src/adapter/ProxyFactory.ts`

**Issue:** Creates proxies recursively for nested objects without depth limiting.

```typescript
// Simplified example
function createProxy(obj: any, depth: number = 0): any {
  // No depth check!
  if (typeof obj === 'object') {
    return new Proxy(obj, {
      get(target, prop) {
        const value = target[prop];
        return createProxy(value, depth + 1); // Unbounded recursion
      }
    });
  }
  return obj;
}
```

**Impact:**
- Deep object hierarchies create excessive proxy chains
- Each proxy adds overhead to property access
- Memory pressure from proxy objects
- Potential stack overflow with very deep objects

### 3. Validation Runs on Every State Change

**Issue:** Consumer validation happens synchronously on every state emission.

**Impact:**
- Unnecessary work when no consumers have been GC'd
- Blocks state emission completion
- No batching or throttling

## Goals

1. **Optimize consumer validation** to O(1) or lazy cleanup
2. **Implement proxy depth limiting** to prevent unbounded recursion
3. **Add caching** for validation results and proxy creation
4. **Measure and benchmark** all optimizations
5. **Maintain functionality** while improving performance

## Acceptance Criteria

### Must Have
- [ ] Consumer validation optimized to lazy cleanup (only when needed)
- [ ] Proxy creation limited to configurable max depth (default: 10)
- [ ] Performance benchmarks show significant improvement
- [ ] All existing tests pass
- [ ] No functional regressions

### Should Have
- [ ] Validation results cached when possible
- [ ] Proxy creation cached for identical objects
- [ ] Performance monitoring utilities added
- [ ] Benchmark suite integrated into CI
- [ ] Performance regression tests

### Nice to Have
- [ ] Adaptive depth limiting based on object structure
- [ ] Performance profiling tools for developers
- [ ] Real-time performance metrics in development mode
- [ ] Automatic performance regression detection

## Implementation Strategies

### Optimization 1: Lazy Consumer Cleanup

**Approach:** Only validate consumers when absolutely necessary, not on every state change.

```typescript
// packages/blac/src/core/ConsumerTracker.ts (from refactored architecture)
export class ConsumerTracker {
  private consumerRefs: Map<string, WeakRef<any>>;
  private needsValidation: boolean = false;
  private lastValidation: number = 0;
  private validationThrottleMs: number = 1000; // Configurable

  registerConsumer(id: string, consumer: any): void {
    this.consumerRefs.set(id, new WeakRef(consumer));
    this.needsValidation = true;
  }

  hasConsumers(): boolean {
    // Only validate if needed AND throttle time has passed
    const now = Date.now();
    if (this.needsValidation && now - this.lastValidation > this.validationThrottleMs) {
      this.validateConsumers();
    }

    return this.consumerRefs.size > 0;
  }

  private validateConsumers(): void {
    const deadConsumers: string[] = [];

    for (const [id, weakRef] of this.consumerRefs) {
      if (weakRef.deref() === undefined) {
        deadConsumers.push(id);
      }
    }

    for (const id of deadConsumers) {
      this.consumerRefs.delete(id);
    }

    this.needsValidation = false;
    this.lastValidation = Date.now();
  }

  // Force validation when really needed (e.g., before disposal)
  forceValidation(): void {
    this.validateConsumers();
  }
}
```

**Benefits:**
- Validation only runs when needed
- Throttling prevents excessive validation
- O(1) for hasConsumers() in common case
- Forced validation available when required

**Trade-offs:**
- Dead consumers linger slightly longer
- More complex logic
- Need to tune throttle timing

### Optimization 2: Proxy Depth Limiting

**Approach:** Limit proxy creation depth with configurable maximum.

```typescript
// packages/blac/src/adapter/ProxyFactory.ts
export interface ProxyOptions {
  maxDepth?: number;
  currentDepth?: number;
  trackAccess?: boolean;
}

export class ProxyFactory {
  private static readonly DEFAULT_MAX_DEPTH = 10;

  static createProxy<T extends object>(
    target: T,
    handler: ProxyHandler<T>,
    options: ProxyOptions = {}
  ): T {
    const {
      maxDepth = this.DEFAULT_MAX_DEPTH,
      currentDepth = 0,
      trackAccess = true
    } = options;

    // Stop creating proxies at max depth
    if (currentDepth >= maxDepth) {
      if (Blac.config.enableLog) {
        console.warn(
          `[BlaC] Max proxy depth (${maxDepth}) reached. ` +
          `Property access tracking disabled for deeper objects.`
        );
      }
      return target; // Return raw object
    }

    return new Proxy(target, {
      get(innerTarget, prop, receiver) {
        const value = Reflect.get(innerTarget, prop, receiver);

        // Track access if enabled
        if (trackAccess) {
          handler.get?.(innerTarget, prop, receiver);
        }

        // Recursively create proxy for nested objects
        if (value !== null && typeof value === 'object') {
          return ProxyFactory.createProxy(value, handler, {
            maxDepth,
            currentDepth: currentDepth + 1,
            trackAccess
          });
        }

        return value;
      },

      // ... other proxy handlers
    });
  }
}
```

**Benefits:**
- Prevents unbounded recursion
- Configurable per use case
- Warning when depth exceeded
- Clear performance characteristics

**Trade-offs:**
- Deep objects lose dependency tracking
- Need to choose appropriate default
- May need tuning per application

### Optimization 3: Proxy Caching

**Approach:** Cache proxies for objects that haven't changed.

```typescript
export class ProxyCache {
  private cache: WeakMap<object, any>;
  private maxCacheSize: number;

  constructor(maxCacheSize: number = 1000) {
    this.cache = new WeakMap();
    this.maxCacheSize = maxCacheSize;
  }

  get<T extends object>(
    target: T,
    factory: () => T
  ): T {
    const cached = this.cache.get(target);
    if (cached !== undefined) {
      return cached;
    }

    const proxy = factory();
    this.cache.set(target, proxy);
    return proxy;
  }

  clear(): void {
    this.cache = new WeakMap();
  }
}

// Usage
const proxyCache = new ProxyCache();

function createDependencyProxy<T extends object>(target: T): T {
  return proxyCache.get(target, () => {
    return ProxyFactory.createProxy(target, handler, options);
  });
}
```

**Benefits:**
- Avoids recreating proxies for same objects
- WeakMap allows garbage collection
- Significant performance gain for stable objects

**Trade-offs:**
- Memory overhead for cache
- Need to invalidate on object mutation
- Complexity in cache management

### Optimization 4: Batched Consumer Validation

**Approach:** Batch validation requests using microtasks.

```typescript
export class BatchedConsumerTracker extends ConsumerTracker {
  private validationScheduled: boolean = false;

  scheduleValidation(): void {
    if (this.validationScheduled) {
      return;
    }

    this.validationScheduled = true;

    // Use microtask queue for batching
    queueMicrotask(() => {
      this.validateConsumers();
      this.validationScheduled = false;
    });
  }

  registerConsumer(id: string, consumer: any): void {
    super.registerConsumer(id, consumer);
    this.scheduleValidation(); // Schedule instead of immediate
  }
}
```

**Benefits:**
- Multiple registrations batched together
- Uses native microtask queue
- Minimal latency impact

## Implementation Steps

### Phase 1: Benchmarking & Profiling (Week 1, Days 1-3)

1. **Create benchmark suite**
   ```typescript
   // packages/blac/src/__tests__/benchmarks/
   describe('Performance Benchmarks', () => {
     benchmark('consumer validation with 100 consumers', () => {
       // Test current implementation
     });

     benchmark('consumer validation with 1000 consumers', () => {
       // Test current implementation
     });

     benchmark('proxy creation depth 5', () => {
       // Test current implementation
     });

     benchmark('proxy creation depth 20', () => {
       // Test current implementation
     });
   });
   ```

2. **Profile current implementation**
   - Use Chrome DevTools profiler
   - Identify hotspots
   - Measure baseline metrics

3. **Document baseline performance**
   - Consumer validation time at various scales
   - Proxy creation overhead
   - Memory usage patterns

### Phase 2: Implement Optimizations (Week 1-2, Days 4-10)

1. **Implement lazy consumer cleanup**
   - Add throttling mechanism
   - Add forced validation option
   - Test with various throttle settings

2. **Implement proxy depth limiting**
   - Add depth tracking to ProxyFactory
   - Make depth configurable
   - Add warnings at depth limit

3. **Implement proxy caching**
   - Create ProxyCache class
   - Integrate with ProxyFactory
   - Add cache invalidation strategy

4. **Implement batched validation**
   - Create BatchedConsumerTracker
   - Use microtask queue
   - Test batching behavior

### Phase 3: Testing & Validation (Week 2-3, Days 11-15)

1. **Unit tests for each optimization**
   - Test lazy cleanup
   - Test depth limiting
   - Test caching
   - Test batching

2. **Integration tests**
   - Test with real React components
   - Test with complex state objects
   - Test with many consumers

3. **Performance tests**
   - Compare with baseline
   - Verify improvements
   - Check for regressions

### Phase 4: Configuration & Documentation (Week 3, Days 16-18)

1. **Add configuration options**
   ```typescript
   interface BlacConfig {
     // ... existing config
     performance?: {
       maxProxyDepth?: number;
       consumerValidationThrottleMs?: number;
       enableProxyCache?: boolean;
       enableBatchedValidation?: boolean;
     };
   }
   ```

2. **Update documentation**
   - Performance best practices
   - Configuration guide
   - Benchmark results

3. **Add performance monitoring utilities**
   - Development mode performance warnings
   - Performance metrics API
   - Profiling helpers

## Testing Strategy

### Performance Benchmarks
```typescript
import { performance } from 'perf_hooks';

describe('Performance Optimizations', () => {
  describe('Consumer Validation', () => {
    it('should scale sub-linearly with consumer count', () => {
      const results = [];

      for (const count of [10, 100, 1000]) {
        const bloc = new TestBloc();

        // Register consumers
        for (let i = 0; i < count; i++) {
          bloc._registerConsumer(`consumer_${i}`, {});
        }

        // Measure validation time
        const start = performance.now();
        bloc._validateConsumers();
        const end = performance.now();

        results.push({ count, time: end - start });
      }

      // Verify sub-linear scaling
      const ratio10_100 = results[1].time / results[0].time;
      const ratio100_1000 = results[2].time / results[1].time;

      // With lazy validation, should see diminishing time increase
      expect(ratio100_1000).toBeLessThan(ratio10_100);
    });
  });

  describe('Proxy Creation', () => {
    it('should limit proxy depth', () => {
      const deepObject = createDeepObject(20); // 20 levels deep

      const proxy = ProxyFactory.createProxy(deepObject, {}, {
        maxDepth: 10
      });

      // Verify proxy depth is limited
      let current = proxy;
      let depth = 0;

      while (current.child) {
        depth++;
        current = current.child;

        if (depth === 10) {
          // Should be raw object beyond depth 10
          expect(current).not.toBeInstanceOf(Proxy);
          break;
        }
      }
    });

    it('should cache proxies for same objects', () => {
      const obj = { value: 1 };

      const proxy1 = createCachedProxy(obj);
      const proxy2 = createCachedProxy(obj);

      expect(proxy1).toBe(proxy2); // Same proxy instance
    });
  });
});
```

### Load Tests
- Test with 10,000+ consumers
- Test with deeply nested state (30+ levels)
- Test rapid state updates (1000+ per second)

### Memory Tests
- Monitor memory usage over time
- Check for memory leaks
- Verify WeakRef cleanup

## Performance Targets

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Consumer validation (100 consumers) | ~2ms | <0.5ms | 4x |
| Consumer validation (1000 consumers) | ~20ms | <2ms | 10x |
| Proxy creation (depth 5) | ~0.5ms | <0.3ms | 1.7x |
| Proxy creation (depth 20) | ~5ms | <1ms (with limit) | 5x |
| Memory usage (1000 consumers) | Baseline | <110% baseline | - |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lazy cleanup causes memory growth | Medium | Implement forced validation, tune throttle timing |
| Depth limiting breaks deep object tracking | Medium | Make configurable, document limitations |
| Caching causes stale proxies | High | Careful cache invalidation, comprehensive tests |
| Optimization complexity introduces bugs | High | Extensive testing, gradual rollout |

## Configuration Guide

### Recommended Settings

**Development:**
```typescript
Blac.setConfig({
  performance: {
    maxProxyDepth: 15, // More tracking in dev
    consumerValidationThrottleMs: 500,
    enableProxyCache: true,
    enableBatchedValidation: true
  },
  enableLog: true
});
```

**Production:**
```typescript
Blac.setConfig({
  performance: {
    maxProxyDepth: 10, // Conservative limit
    consumerValidationThrottleMs: 1000,
    enableProxyCache: true,
    enableBatchedValidation: true
  },
  enableLog: false // Disable logging overhead
});
```

**High-Performance:**
```typescript
Blac.setConfig({
  performance: {
    maxProxyDepth: 5, // Minimal tracking
    consumerValidationThrottleMs: 2000,
    enableProxyCache: true,
    enableBatchedValidation: true
  },
  proxyDependencyTracking: false // Disable if not needed
});
```

## Success Metrics

- Consumer validation time reduced by 4-10x
- Proxy creation time reduced by 2-5x
- Memory usage stays within 10% of baseline
- All existing tests pass
- No functional regressions
- Performance benchmarks in CI
- Documentation complete

## Follow-up Tasks

- Adaptive depth limiting based on performance metrics
- Automatic performance regression detection in CI
- Performance monitoring dashboard
- Advanced profiling tools for developers
- Consider virtual scrolling patterns for large consumer lists

## References

- Review Report: `review.md:44-67` (Performance Bottlenecks section)
- Review Report: `review.md:156-160` (Performance Optimization recommendation)
- JavaScript Performance: https://developer.mozilla.org/en-US/docs/Web/Performance
- Proxy Performance: https://thecodebarbarian.com/thoughts-on-es6-proxies-performance
