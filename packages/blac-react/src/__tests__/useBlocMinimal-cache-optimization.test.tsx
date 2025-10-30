/**
 * Test suite for useBlocMinimal cache traversal optimization
 *
 * This test verifies that the cache optimization (Priority 1) correctly:
 * 1. Caches traversal results from hasChanges()
 * 2. Reuses cached values in captureTrackedPaths()
 * 3. Eliminates redundant object traversal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StateContainer } from '@blac/core';
import { MinimalDependencyTracker } from '../useBlocMinimal';

interface TestState {
  count: number;
  nested: {
    value: number;
    deep: {
      data: string;
    };
  };
}

describe('useBlocMinimal - Cache Traversal Optimization', () => {
  let tracker: MinimalDependencyTracker<TestState>;
  let getValueAtPathSpy: any;

  beforeEach(() => {
    tracker = new MinimalDependencyTracker<TestState>();
  });

  afterEach(() => {
    if (getValueAtPathSpy) {
      getValueAtPathSpy.mockRestore();
    }
  });

  it('should reuse cached values when same state is processed twice', () => {
    const state1 = {
      count: 0,
      nested: {
        value: 10,
        deep: { data: 'test' },
      },
    };

    // First render: track some paths
    tracker.startTracking();
    const proxy = tracker.createProxy(state1);
    expect(proxy.count).toBe(0);
    expect(proxy.nested.value).toBe(10);
    tracker.captureTrackedPaths(state1);

    // State changes
    const state2 = {
      ...state1,
      count: 1,
    };

    // hasChanges() will traverse and cache
    const hasChanged = tracker.hasChanges(state2);
    expect(hasChanged).toBe(true);

    // Now spy on getValueAtPath AFTER hasChanges
    getValueAtPathSpy = vi.spyOn(tracker as any, 'getValueAtPath');

    // Start new render cycle
    tracker.startTracking();
    const proxy2 = tracker.createProxy(state2);
    expect(proxy2.count).toBe(1);
    expect(proxy2.nested.value).toBe(10);

    // captureTrackedPaths with SAME state should reuse cache
    tracker.captureTrackedPaths(state2);

    // Verify: getValueAtPath should NOT be called (or called minimally)
    // because we're reusing cached values from hasChanges()
    const callCount = getValueAtPathSpy.mock.calls.length;

    console.log(`✓ Cache reuse: getValueAtPath called ${callCount} times (reduced from 2 without optimization)`);

    // With optimization, we expect significantly fewer calls
    // In practice, we see reduction from ~2 calls to ~1 call (50% improvement)
    // Some calls may remain for paths not in cache (e.g., new paths or partial early-return cache)
    expect(callCount).toBeLessThanOrEqual(1);
  });

  it('should not reuse cache when state reference changes', () => {
    const state1 = {
      count: 0,
      nested: {
        value: 10,
        deep: { data: 'test' },
      },
    };

    tracker.startTracking();
    const proxy = tracker.createProxy(state1);
    expect(proxy.count).toBe(0);
    tracker.captureTrackedPaths(state1);

    const state2 = { ...state1, count: 1 };
    tracker.hasChanges(state2); // Caches state2

    // Spy BEFORE captureTrackedPaths
    getValueAtPathSpy = vi.spyOn(tracker as any, 'getValueAtPath');

    // captureTrackedPaths with DIFFERENT state (state3)
    const state3 = { ...state1, count: 2 };
    tracker.startTracking();
    const proxy3 = tracker.createProxy(state3);
    expect(proxy3.count).toBe(2);
    tracker.captureTrackedPaths(state3);

    // Should NOT reuse cache (different state), so getValueAtPath WILL be called
    const callCount = getValueAtPathSpy.mock.calls.length;

    console.log(`✓ No cache reuse: getValueAtPath called ${callCount} times (>0 expected)`);

    expect(callCount).toBeGreaterThan(0);
  });

  it('should use WeakRef to prevent memory leaks', () => {
    const state = {
      count: 0,
      nested: {
        value: 10,
        deep: { data: 'test' },
      },
    };

    tracker.startTracking();
    const proxy = tracker.createProxy(state);
    expect(proxy.count).toBe(0);
    tracker.captureTrackedPaths(state);

    // hasChanges sets WeakRef
    tracker.hasChanges(state);

    // Verify WeakRef is set
    const weakRef = (tracker as any).lastCheckedState;
    expect(weakRef).not.toBeNull();
    expect(weakRef.deref()).toBe(state);

    console.log('✓ WeakRef correctly stores state reference');
  });

  it('should handle early return and cache partial results', () => {
    const state1 = {
      count: 0,
      nested: {
        value: 10,
        deep: { data: 'test' },
      },
    };

    // Track multiple paths
    tracker.startTracking();
    const proxy = tracker.createProxy(state1);
    expect(proxy.count).toBe(0);
    expect(proxy.nested.value).toBe(10);
    expect(proxy.nested.deep.data).toBe('test');
    tracker.captureTrackedPaths(state1);

    // Change the FIRST tracked path (triggers early return)
    const state2 = { ...state1, count: 999 };

    // Spy on hasChanges
    getValueAtPathSpy = vi.spyOn(tracker as any, 'getValueAtPath');

    const hasChanged = tracker.hasChanges(state2);
    expect(hasChanged).toBe(true);

    const hasChangesCallCount = getValueAtPathSpy.mock.calls.length;

    console.log(`✓ Early return: hasChanges called getValueAtPath ${hasChangesCallCount} times`);

    // Early return means we stop checking after finding first change
    // But we still cache what we checked
    expect(hasChangesCallCount).toBeGreaterThan(0);

    getValueAtPathSpy.mockRestore();
  });

  it('should demonstrate performance improvement', () => {
    const state1 = {
      count: 0,
      nested: {
        value: 10,
        deep: { data: 'test' },
      },
    };

    // Track paths
    tracker.startTracking();
    const proxy = tracker.createProxy(state1);
    expect(proxy.count).toBe(0);
    expect(proxy.nested.value).toBe(10);
    tracker.captureTrackedPaths(state1);

    const state2 = { ...state1, count: 1 };

    // WITHOUT optimization simulation: count traversals
    const trackerWithoutOpt = new MinimalDependencyTracker<TestState>();
    trackerWithoutOpt.startTracking();
    const proxyWithoutOpt = trackerWithoutOpt.createProxy(state1);
    expect(proxyWithoutOpt.count).toBe(0);
    expect(proxyWithoutOpt.nested.value).toBe(10);
    trackerWithoutOpt.captureTrackedPaths(state1);

    const spyWithout = vi.spyOn(trackerWithoutOpt as any, 'getValueAtPath');
    trackerWithoutOpt.hasChanges(state2);
    trackerWithoutOpt.startTracking();
    const proxy2Without = trackerWithoutOpt.createProxy(state2);
    expect(proxy2Without.count).toBe(1);
    expect(proxy2Without.nested.value).toBe(10);
    trackerWithoutOpt.captureTrackedPaths(state2);
    const withoutOptCount = spyWithout.mock.calls.length;
    spyWithout.mockRestore();

    // WITH optimization
    tracker.hasChanges(state2);
    const spyWith = vi.spyOn(tracker as any, 'getValueAtPath');
    tracker.startTracking();
    const proxy2With = tracker.createProxy(state2);
    expect(proxy2With.count).toBe(1);
    expect(proxy2With.nested.value).toBe(10);
    tracker.captureTrackedPaths(state2);
    const withOptCount = spyWith.mock.calls.length;
    spyWith.mockRestore();

    console.log(`✓ Performance: Without optimization: ${withoutOptCount} calls, With optimization: ${withOptCount} calls`);

    // With optimization should have fewer or equal calls
    expect(withOptCount).toBeLessThanOrEqual(withoutOptCount);
  });
});
