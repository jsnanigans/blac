# Action Item #005: Improve Memory Leak Tests

**Priority:** 🟡 Medium
**Effort:** 0.5-1 day
**Risk:** Low

---

## Overview

Improve memory leak detection in tests by adding explicit reference tracking and removing unused helpers.

**Current Issues:**
- `_waitForCleanup` helper defined but never used (memory-leaks.test.ts:15)
- Tests rely on manual GC which isn't guaranteed
- No explicit memory leak detection

---

## Improvements

### 1. Remove Unused Code

**File:** `packages/blac/src/__tests__/memory-leaks.test.ts`

- [ ] Remove `_waitForCleanup` function (line 15)
- [ ] Remove unused imports
- [ ] Clean up commented code

### 2. Add Explicit Reference Tracking

```typescript
describe('Memory Leak Detection', () => {
  it('should not retain references after disposal', () => {
    const weakRefs: WeakRef<any>[] = [];

    for (let i = 0; i < 100; i++) {
      const cubit = new TestCubit();
      weakRefs.push(new WeakRef(cubit));
      cubit.dispose();
    }

    // Force GC if available
    if ((global as any).gc) {
      (global as any).gc();
    }

    // Wait for cleanup
    return new Promise((resolve) => {
      setTimeout(() => {
        const liveReferences = weakRefs.filter(ref => ref.deref() !== undefined);
        expect(liveReferences.length).toBeLessThan(10); // Allow some tolerance
        resolve();
      }, 100);
    });
  });

  it('should track active instances', () => {
    const tracker = new InstanceTracker();

    // Create and dispose many instances
    for (let i = 0; i < 100; i++) {
      const cubit = new TestCubit();
      tracker.track(cubit);
      cubit.dispose();
    }

    expect(tracker.activeCount()).toBe(0);
  });
});
```

### 3. Add Instance Tracker Utility

```typescript
// packages/blac/src/__tests__/utils/InstanceTracker.ts

export class InstanceTracker {
  private instances = new Set<WeakRef<any>>();

  track(instance: any): void {
    this.instances.add(new WeakRef(instance));
  }

  activeCount(): number {
    // Clean up dead references
    const alive = Array.from(this.instances).filter(
      ref => ref.deref() !== undefined
    );

    this.instances = new Set(alive);
    return this.instances.size;
  }

  clear(): void {
    this.instances.clear();
  }
}
```

### 4. Add Performance Benchmarks

```typescript
describe('Memory Performance', () => {
  it('should not degrade performance with many instances', () => {
    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const cubit = new TestCubit();
      cubit.increment();
      cubit.dispose();
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000); // < 1ms per instance

    console.log(`${iterations} instances in ${duration.toFixed(2)}ms`);
  });
});
```

---

## Implementation Tasks

### Morning: Cleanup
- [ ] Remove unused `_waitForCleanup` function
- [ ] Remove unused imports
- [ ] Clean up test code

### Afternoon: Improvements
- [ ] Create InstanceTracker utility
- [ ] Add explicit reference tracking tests
- [ ] Add performance benchmarks
- [ ] Document memory management patterns

---

## Success Criteria

- ✅ No unused code
- ✅ Explicit memory leak detection
- ✅ Performance benchmarks added
- ✅ All tests pass
- ✅ Documentation updated

---

**Status:** Ready for Implementation
**Dependencies:** None
**Estimated Time:** 4-6 hours
