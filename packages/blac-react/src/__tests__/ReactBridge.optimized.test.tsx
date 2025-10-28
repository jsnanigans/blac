/**
 * Comprehensive functionality test for optimized ReactBridge
 * Ensures all features work correctly after optimization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReactBridge } from '../ReactBridge.optimized';
import { Cubit, BlacLogger } from '@blac/core';
import { act } from '@testing-library/react';

// Test state type
type TestState = {
  count: number;
  nested: {
    value: string;
    items: string[];
  };
  flag: boolean;
};

// Test Bloc implementation
class TestBloc extends Cubit<TestState> {
  constructor() {
    super({
      count: 0,
      nested: {
        value: 'initial',
        items: [],
      },
      flag: false,
    });
  }

  increment() {
    this.update((current) => ({
      ...current,
      count: current.count + 1,
    }));
  }

  updateNested(value: string) {
    this.update((current) => ({
      ...current,
      nested: {
        ...current.nested,
        value,
      },
    }));
  }

  addItem(item: string) {
    this.update((current) => ({
      ...current,
      nested: {
        ...current.nested,
        items: [...current.nested.items, item],
      },
    }));
  }

  toggleFlag() {
    this.update((current) => ({
      ...current,
      flag: !current.flag,
    }));
  }
}

describe('ReactBridge Optimized - Functionality Tests', () => {
  let bloc: TestBloc;
  let bridge: ReactBridge<TestState>;

  beforeEach(() => {
    bloc = new TestBloc();
    bridge = new ReactBridge(bloc);
  });

  afterEach(() => {
    bridge.dispose();
    bloc.dispose();
  });

  describe('Basic Subscription Management', () => {
    it('should handle subscribe and unsubscribe correctly', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      // Subscribe
      const unsub1 = bridge.subscribe(listener1);
      const unsub2 = bridge.subscribe(listener2);

      // Trigger state change
      act(() => {
        bloc.increment();
      });

      // Both listeners should be called
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      // Unsubscribe one
      unsub1();

      // Reset mocks
      listener1.mockClear();
      listener2.mockClear();

      // Trigger another state change
      act(() => {
        bloc.increment();
      });

      // Only listener2 should be called
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);

      // Cleanup
      unsub2();
    });

    it('should handle rapid subscribe/unsubscribe cycles', () => {
      const listeners: Array<vi.Mock> = [];
      const unsubscribes: Array<() => void> = [];

      // Rapid subscription cycles
      for (let i = 0; i < 10; i++) {
        const listener = vi.fn();
        listeners.push(listener);
        unsubscribes.push(bridge.subscribe(listener));
      }

      // Trigger state change
      act(() => {
        bloc.increment();
      });

      // All should be notified
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledTimes(1);
      });

      // Unsubscribe odd indices
      for (let i = 1; i < unsubscribes.length; i += 2) {
        unsubscribes[i]();
      }

      // Reset all mocks
      listeners.forEach(l => l.mockClear());

      // Trigger another change
      act(() => {
        bloc.increment();
      });

      // Only even indices should be called
      listeners.forEach((listener, i) => {
        if (i % 2 === 0) {
          expect(listener).toHaveBeenCalledTimes(1);
        } else {
          expect(listener).not.toHaveBeenCalled();
        }
      });

      // Cleanup remaining
      unsubscribes.forEach((unsub, i) => {
        if (i % 2 === 0) unsub();
      });
    });
  });

  describe('Proxy Tracking Mode', () => {
    it('should track accessed properties correctly', () => {
      const listener = vi.fn();
      bridge.subscribe(listener);

      // First render - access count only
      let snapshot = bridge.getSnapshot();
      expect(snapshot.count).toBe(0);
      bridge.completeTracking();

      // Change count - should trigger re-render
      listener.mockClear();
      act(() => {
        bloc.increment();
      });
      expect(listener).toHaveBeenCalledTimes(1);

      // After re-render from count change, get new snapshot
      snapshot = bridge.getSnapshot();
      expect(snapshot.count).toBe(1);
      bridge.completeTracking();

      // Change nested value - should NOT trigger (not tracked)
      listener.mockClear();
      act(() => {
        bloc.updateNested('changed');
      });
      expect(listener).not.toHaveBeenCalled();

      // Manually trigger re-render (e.g., parent component re-render)
      // and now access nested.value
      // First, we need to manually update the bridge's state
      // In a real app, this would happen via a different subscription
      // For test purposes, let's force a re-render by changing a tracked property
      act(() => {
        bloc.increment(); // This will trigger re-render
      });

      // Now in the re-render, access nested.value
      snapshot = bridge.getSnapshot();
      expect(snapshot.count).toBe(2);
      expect(snapshot.nested.value).toBe('changed'); // Now we see the change
      bridge.completeTracking();

      // Now nested changes should trigger
      listener.mockClear();
      act(() => {
        bloc.updateNested('changed-again');
      });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle nested property access', () => {
      const listener = vi.fn();
      bridge.subscribe(listener);

      // Access deeply nested property
      let snapshot = bridge.getSnapshot();
      expect(snapshot.nested.items.length).toBe(0);
      bridge.completeTracking();

      // Adding item should trigger re-render
      listener.mockClear();
      act(() => {
        bloc.addItem('item1');
      });
      expect(listener).toHaveBeenCalledTimes(1);

      // After re-render, access multiple nested paths
      snapshot = bridge.getSnapshot();
      expect(snapshot.nested.value).toBe('initial');
      expect(snapshot.nested.items.length).toBe(1);
      expect(snapshot.nested.items[0]).toBe('item1');
      bridge.completeTracking();

      // Both nested value and items changes should trigger
      listener.mockClear();
      act(() => {
        bloc.updateNested('updated');
      });
      expect(listener).toHaveBeenCalledTimes(1);

      listener.mockClear();
      act(() => {
        bloc.addItem('item2');
      });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should update tracked paths dynamically', () => {
      const listener = vi.fn();
      bridge.subscribe(listener);

      // Initial render - track count
      let snapshot = bridge.getSnapshot();
      const count1 = snapshot.count;
      bridge.completeTracking();

      expect(bridge.getTrackedPaths().size).toBe(1);
      expect(bridge.getTrackedPaths().has('count')).toBe(true);

      // Second render - track flag instead
      snapshot = bridge.getSnapshot();
      const flag = snapshot.flag;
      bridge.completeTracking();

      expect(bridge.getTrackedPaths().size).toBe(1);
      expect(bridge.getTrackedPaths().has('flag')).toBe(true);
      expect(bridge.getTrackedPaths().has('count')).toBe(false);

      // Now only flag changes should trigger
      listener.mockClear();
      act(() => {
        bloc.increment(); // count change - should NOT trigger
      });
      expect(listener).not.toHaveBeenCalled();

      act(() => {
        bloc.toggleFlag(); // flag change - should trigger
      });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle empty path tracking gracefully', () => {
      const listener = vi.fn();
      bridge.subscribe(listener);

      // Get snapshot but don't access any properties
      const snapshot = bridge.getSnapshot();
      bridge.completeTracking();

      // Should not crash, paths should remain empty or unchanged
      expect(bridge.getTrackedPaths().size).toBe(0);

      // State changes should still trigger (no specific paths tracked)
      act(() => {
        bloc.increment();
      });

      // Since no paths are tracked, it depends on implementation
      // but it shouldn't crash
      expect(() => {
        bridge.getSnapshot();
        bridge.completeTracking();
      }).not.toThrow();
    });
  });

  describe('Dependencies Mode', () => {
    it('should work with dependencies function', () => {
      // Create bridge with dependencies mode
      const depBridge = new ReactBridge(bloc, {
        dependencies: (state) => [state.count, state.flag],
      });

      const listener = vi.fn();
      depBridge.subscribe(listener);

      // Get snapshot - captures initial dependencies
      const snapshot = depBridge.getSnapshot();
      expect(snapshot.count).toBe(0);
      expect(snapshot.flag).toBe(false);

      // First state change SHOULD trigger re-render since count is in dependencies
      listener.mockClear();
      act(() => {
        bloc.increment();
      });
      expect(listener).toHaveBeenCalledTimes(1); // Should notify on first change

      // Subsequent changes should also trigger
      listener.mockClear();
      act(() => {
        bloc.increment();
      });
      expect(listener).toHaveBeenCalledTimes(1); // Should notify on subsequent changes

      // Flag change should trigger (in dependencies)
      listener.mockClear();
      act(() => {
        bloc.toggleFlag();
      });
      expect(listener).toHaveBeenCalledTimes(1);

      // Nested change should NOT trigger (not in dependencies)
      listener.mockClear();
      act(() => {
        bloc.updateNested('changed');
      });
      expect(listener).not.toHaveBeenCalled();

      depBridge.dispose();
    });

    it('should handle dynamic dependency values', () => {
      // Dependencies that return different values based on state
      const depBridge = new ReactBridge(bloc, {
        dependencies: (state) => {
          if (state.flag) {
            return [state.nested.value];
          }
          return [state.count];
        },
      });

      const listener = vi.fn();
      depBridge.subscribe(listener);

      // Get snapshot - captures initial dependencies (count since flag is false)
      depBridge.getSnapshot();

      // First change should trigger (count changes)
      listener.mockClear();
      act(() => {
        bloc.increment();
      });
      expect(listener).toHaveBeenCalledTimes(1);

      // Count changes should continue to trigger
      listener.mockClear();
      act(() => {
        bloc.increment();
      });
      expect(listener).toHaveBeenCalledTimes(1);

      // Nested shouldn't trigger yet
      listener.mockClear();
      act(() => {
        bloc.updateNested('test');
      });
      expect(listener).not.toHaveBeenCalled();

      // Toggle flag - changes dependencies
      listener.mockClear();
      act(() => {
        bloc.toggleFlag();
      });
      expect(listener).toHaveBeenCalledTimes(1);

      // Now nested should trigger, count should not
      listener.mockClear();
      act(() => {
        bloc.updateNested('test2');
      });
      expect(listener).toHaveBeenCalledTimes(1);

      listener.mockClear();
      act(() => {
        bloc.increment();
      });
      expect(listener).not.toHaveBeenCalled();

      depBridge.dispose();
    });
  });

  describe('Lifecycle Methods', () => {
    it('should call mount and unmount callbacks', () => {
      const onMount = vi.fn();
      const onUnmount = vi.fn();

      bridge.onMount(onMount);
      expect(onMount).toHaveBeenCalledWith(bloc);

      bridge.onUnmount(onUnmount);
      expect(onUnmount).toHaveBeenCalledWith(bloc);
    });

    it('should cleanup resources on dispose', () => {
      const listener = vi.fn();
      const unsub = bridge.subscribe(listener);

      // Track some paths
      const snapshot = bridge.getSnapshot();
      const _ = snapshot.count;
      bridge.completeTracking();

      expect(bridge.getTrackedPaths().size).toBeGreaterThan(0);

      // Dispose
      bridge.dispose();

      // Tracked paths should be cleared
      expect(bridge.getTrackedPaths().size).toBe(0);

      // Subscription should be cleaned up
      act(() => {
        bloc.increment();
      });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Server Snapshot', () => {
    it('should return raw state for server snapshot', () => {
      // Subscribe to ensure bridge gets state updates
      const listener = vi.fn();
      bridge.subscribe(listener);

      const serverSnapshot = bridge.getServerSnapshot();

      // Should be the actual state, not a proxy
      expect(serverSnapshot).toEqual({
        count: 0,
        nested: {
          value: 'initial',
          items: [],
        },
        flag: false,
      });

      // Modifications to state should reflect in server snapshot
      act(() => {
        bloc.increment();
      });

      // After the state change and notification
      const newServerSnapshot = bridge.getServerSnapshot();
      expect(newServerSnapshot.count).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple complete tracking calls', () => {
      bridge.subscribe(() => {});

      // Start tracking
      const snapshot = bridge.getSnapshot();
      const _ = snapshot.count;

      // Multiple completeTracking calls
      bridge.completeTracking();
      bridge.completeTracking(); // Should be safe
      bridge.completeTracking(); // Should be safe

      expect(() => {
        bridge.getSnapshot();
        bridge.completeTracking();
      }).not.toThrow();
    });

    it('should handle subscription changes during notification', () => {
      let innerUnsub: (() => void) | null = null;

      const listener1 = vi.fn(() => {
        // Subscribe another listener during notification
        if (!innerUnsub) {
          innerUnsub = bridge.subscribe(() => {});
        }
      });

      bridge.subscribe(listener1);

      // This should not cause issues
      act(() => {
        bloc.increment();
      });

      expect(listener1).toHaveBeenCalled();

      // Cleanup
      if (innerUnsub) innerUnsub();
    });

    it('should handle getSnapshot without subscription', () => {
      // No subscription yet
      const snapshot = bridge.getSnapshot();
      expect(snapshot.count).toBe(0);

      bridge.completeTracking();

      // Should not crash
      expect(bridge.getTrackedPaths()).toBeDefined();
    });
  });

  describe('Performance Characteristics', () => {
    it('should maintain number subscription IDs correctly', () => {
      const listener = vi.fn();

      // Multiple subscription cycles
      for (let i = 0; i < 5; i++) {
        const unsub = bridge.subscribe(listener);

        // Access and track
        const snapshot = bridge.getSnapshot();
        const _ = snapshot.count;
        bridge.completeTracking();

        // Trigger change
        act(() => {
          bloc.increment();
        });

        unsub();
        listener.mockClear();
      }

      // Should still work after multiple cycles
      const finalUnsub = bridge.subscribe(listener);
      act(() => {
        bloc.increment();
      });
      expect(listener).toHaveBeenCalled();
      finalUnsub();
    });

    it('should efficiently handle array-based listeners', () => {
      const listeners: Array<vi.Mock> = [];
      const unsubscribes: Array<() => void> = [];

      // Add many listeners
      for (let i = 0; i < 50; i++) {
        const listener = vi.fn();
        listeners.push(listener);
        unsubscribes.push(bridge.subscribe(listener));
      }

      // Remove from middle
      unsubscribes[25]();

      // Trigger change
      act(() => {
        bloc.increment();
      });

      // All except index 25 should be called
      listeners.forEach((listener, i) => {
        if (i === 25) {
          expect(listener).not.toHaveBeenCalled();
        } else {
          expect(listener).toHaveBeenCalledTimes(1);
        }
      });

      // Cleanup
      unsubscribes.forEach((unsub, i) => {
        if (i !== 25) unsub();
      });
    });
  });
});