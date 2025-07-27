import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsumerTracker } from '../ConsumerTracker';

describe('ConsumerTracker', () => {
  let tracker: ConsumerTracker;
  let consumerRef1: object;
  let consumerRef2: object;

  beforeEach(() => {
    tracker = new ConsumerTracker();
    consumerRef1 = { id: 'consumer-1' };
    consumerRef2 = { id: 'consumer-2' };
  });

  describe('Consumer Registration', () => {
    it('should register new consumers', () => {
      tracker.register(consumerRef1, 'consumer-id-1');

      const info = tracker.getConsumerInfo(consumerRef1);
      expect(info).toBeDefined();
      expect(info?.id).toBe('consumer-id-1');
      expect(info?.hasRendered).toBe(false);
      expect(info?.stateAccesses.size).toBe(0);
      expect(info?.classAccesses.size).toBe(0);
    });

    it('should track registration statistics', () => {
      tracker.register(consumerRef1, 'id-1');
      tracker.register(consumerRef2, 'id-2');

      const stats = tracker.getStats();
      expect(stats.totalRegistrations).toBe(2);
      expect(stats.activeConsumers).toBe(2);
    });

    it('should handle re-registration of same consumer', () => {
      tracker.register(consumerRef1, 'id-1');
      tracker.register(consumerRef1, 'id-1-updated');

      const info = tracker.getConsumerInfo(consumerRef1);
      expect(info?.id).toBe('id-1-updated'); // Should update

      const stats = tracker.getStats();
      expect(stats.totalRegistrations).toBe(2);
      expect(stats.activeConsumers).toBe(1); // Still only one active
    });

    it('should unregister consumers', () => {
      tracker.register(consumerRef1, 'id-1');
      tracker.register(consumerRef2, 'id-2');

      tracker.unregister(consumerRef1);

      expect(tracker.getConsumerInfo(consumerRef1)).toBeUndefined();
      expect(tracker.hasConsumer(consumerRef1)).toBe(false);

      const stats = tracker.getStats();
      expect(stats.activeConsumers).toBe(1);
    });

    it('should handle unregistering non-existent consumer gracefully', () => {
      expect(() => tracker.unregister(consumerRef1)).not.toThrow();

      const stats = tracker.getStats();
      expect(stats.activeConsumers).toBe(0);
    });
  });

  describe('Access Tracking', () => {
    beforeEach(() => {
      tracker.register(consumerRef1, 'id-1');
    });

    it('should track state property access', () => {
      tracker.trackAccess(consumerRef1, 'state', 'name', 'John');
      tracker.trackAccess(consumerRef1, 'state', 'age', 30);

      const deps = tracker.getDependencies(consumerRef1);
      expect(deps?.statePaths).toContain('name');
      expect(deps?.statePaths).toContain('age');
      expect(deps?.statePaths).toHaveLength(2);
    });

    it('should track class property access', () => {
      tracker.trackAccess(consumerRef1, 'class', 'isValid', true);
      tracker.trackAccess(consumerRef1, 'class', 'total', 100);

      const deps = tracker.getDependencies(consumerRef1);
      expect(deps?.classPaths).toContain('isValid');
      expect(deps?.classPaths).toContain('total');
      expect(deps?.classPaths).toHaveLength(2);
    });

    it('should store tracked values with timestamps', () => {
      const now = Date.now();
      tracker.trackAccess(consumerRef1, 'state', 'count', 5);

      const info = tracker.getConsumerInfo(consumerRef1);
      const trackedValue = info?.stateValues.get('count');

      expect(trackedValue?.value).toBe(5);
      expect(trackedValue?.lastAccessTime).toBeGreaterThanOrEqual(now);
    });

    it('should update access statistics', () => {
      const info = tracker.getConsumerInfo(consumerRef1);
      expect(info?.accessCount).toBe(0);
      expect(info?.firstAccessTime).toBe(0);

      tracker.trackAccess(consumerRef1, 'state', 'prop1', 'value1');
      const updatedInfo = tracker.getConsumerInfo(consumerRef1);

      expect(updatedInfo?.accessCount).toBe(1);
      expect(updatedInfo?.firstAccessTime).toBeGreaterThan(0);
      expect(updatedInfo?.lastAccessTime).toBeGreaterThan(0);

      // Track more accesses
      tracker.trackAccess(consumerRef1, 'state', 'prop2', 'value2');
      const finalInfo = tracker.getConsumerInfo(consumerRef1);

      expect(finalInfo?.accessCount).toBe(2);
      expect(finalInfo?.lastAccessTime).toBeGreaterThanOrEqual(
        updatedInfo?.lastAccessTime || 0,
      );
    });

    it('should not track access for unregistered consumers', () => {
      tracker.trackAccess(consumerRef2, 'state', 'test', 'value');

      const deps = tracker.getDependencies(consumerRef2);
      expect(deps).toBeNull();
    });

    it('should handle duplicate path tracking', () => {
      tracker.trackAccess(consumerRef1, 'state', 'name', 'John');
      tracker.trackAccess(consumerRef1, 'state', 'name', 'Jane'); // Same path, different value

      const deps = tracker.getDependencies(consumerRef1);
      expect(deps?.statePaths).toHaveLength(1); // No duplicates

      const info = tracker.getConsumerInfo(consumerRef1);
      const trackedValue = info?.stateValues.get('name');
      expect(trackedValue?.value).toBe('Jane'); // Latest value
    });

    it('should handle undefined values', () => {
      tracker.trackAccess(consumerRef1, 'state', 'optional', undefined);

      const info = tracker.getConsumerInfo(consumerRef1);
      // undefined values are not stored in stateValues map (only tracked in stateAccesses)
      expect(info?.stateAccesses.has('optional')).toBe(true);
      expect(info?.stateValues.has('optional')).toBe(false);
    });
  });

  describe('Dependency Change Detection', () => {
    beforeEach(() => {
      tracker.register(consumerRef1, 'id-1');
    });

    it('should detect value changes', () => {
      // Initial tracking
      tracker.trackAccess(consumerRef1, 'state', 'count', 5);
      tracker.trackAccess(consumerRef1, 'state', 'name', 'John');

      // No changes
      let hasChanged = tracker.hasValuesChanged(
        consumerRef1,
        { count: 5, name: 'John' },
        {},
      );
      expect(hasChanged).toBe(false);

      // Count changed
      hasChanged = tracker.hasValuesChanged(
        consumerRef1,
        { count: 6, name: 'John' },
        {},
      );
      expect(hasChanged).toBe(true);
    });

    it('should detect nested value changes', () => {
      // Track nested access
      tracker.trackAccess(consumerRef1, 'state', 'user.profile.theme', 'light');

      const hasChanged = tracker.hasValuesChanged(
        consumerRef1,
        { user: { profile: { theme: 'dark' } } },
        {},
      );
      expect(hasChanged).toBe(true);
    });

    it('should handle missing nested paths gracefully', () => {
      tracker.trackAccess(consumerRef1, 'state', 'a.b.c', 'value');

      // Path doesn't exist in new state
      const hasChanged = tracker.hasValuesChanged(
        consumerRef1,
        { a: {} }, // Missing b.c
        {},
      );
      expect(hasChanged).toBe(true); // Treated as change
    });

    it('should track class property changes', () => {
      const mockBloc = {
        get isValid() {
          return true;
        },
        get count() {
          return 10;
        },
      };

      tracker.trackAccess(consumerRef1, 'class', 'isValid', true);
      tracker.trackAccess(consumerRef1, 'class', 'count', 10);

      // No changes
      let hasChanged = tracker.hasValuesChanged(consumerRef1, {}, mockBloc);
      expect(hasChanged).toBe(false);

      // Create new bloc with different getter values
      const newMockBloc = {
        get isValid() {
          return false;
        },
        get count() {
          return 10;
        },
      };

      hasChanged = tracker.hasValuesChanged(consumerRef1, {}, newMockBloc);
      expect(hasChanged).toBe(true);
    });

    it('should return true when no values tracked but accesses exist', () => {
      // Track access without values (happens on first render)
      tracker.trackAccess(consumerRef1, 'state', 'prop', undefined);

      const info = tracker.getConsumerInfo(consumerRef1);
      info!.stateValues.clear(); // Simulate no tracked values

      const hasChanged = tracker.hasValuesChanged(
        consumerRef1,
        { prop: 'value' },
        {},
      );
      expect(hasChanged).toBe(true); // Establish baseline
    });

    it('should update tracked values after change detection', () => {
      tracker.trackAccess(consumerRef1, 'state', 'count', 1);

      tracker.hasValuesChanged(consumerRef1, { count: 2 }, {});

      const info = tracker.getConsumerInfo(consumerRef1);
      const trackedValue = info?.stateValues.get('count');
      expect(trackedValue?.value).toBe(2); // Updated
    });
  });

  describe('Consumer Notification Logic', () => {
    beforeEach(() => {
      tracker.register(consumerRef1, 'id-1');
      tracker.setHasRendered(consumerRef1, true);
    });

    it('should notify when tracked paths change', () => {
      tracker.trackAccess(consumerRef1, 'state', 'user.name', 'John');
      tracker.trackAccess(consumerRef1, 'state', 'user.age', 30);

      const changedPaths = new Set(['user.name']);
      expect(tracker.shouldNotifyConsumer(consumerRef1, changedPaths)).toBe(
        true,
      );
    });

    it('should not notify when no tracked paths change', () => {
      tracker.trackAccess(consumerRef1, 'state', 'user.name', 'John');

      const changedPaths = new Set(['user.email', 'settings.theme']);
      expect(tracker.shouldNotifyConsumer(consumerRef1, changedPaths)).toBe(
        false,
      );
    });

    it('should handle nested path matching', () => {
      tracker.trackAccess(consumerRef1, 'state', 'user.profile', undefined);

      // Child path changed
      let changedPaths = new Set(['user.profile.email']);
      expect(tracker.shouldNotifyConsumer(consumerRef1, changedPaths)).toBe(
        true,
      );

      // Parent path changed
      changedPaths = new Set(['user']);
      expect(tracker.shouldNotifyConsumer(consumerRef1, changedPaths)).toBe(
        true,
      );
    });

    it('should handle exact path matching', () => {
      tracker.trackAccess(consumerRef1, 'state', 'user.name', 'John');

      // Sibling path - should not notify
      const changedPaths = new Set(['user.email']);
      expect(tracker.shouldNotifyConsumer(consumerRef1, changedPaths)).toBe(
        false,
      );
    });

    it('should return false for unregistered consumers', () => {
      const changedPaths = new Set(['any.path']);
      expect(tracker.shouldNotifyConsumer(consumerRef2, changedPaths)).toBe(
        false,
      );
    });
  });

  describe('Reset and Cleanup', () => {
    it('should reset tracking for a consumer', () => {
      tracker.register(consumerRef1, 'id-1');

      // Add some tracking
      tracker.trackAccess(consumerRef1, 'state', 'prop1', 'value1');
      tracker.trackAccess(consumerRef1, 'class', 'getter1', 100);

      let info = tracker.getConsumerInfo(consumerRef1);
      expect(info?.stateAccesses.size).toBe(1);
      expect(info?.classAccesses.size).toBe(1);
      expect(info?.accessCount).toBe(2);

      // Reset
      tracker.resetTracking(consumerRef1);

      info = tracker.getConsumerInfo(consumerRef1);
      expect(info?.stateAccesses.size).toBe(0);
      expect(info?.classAccesses.size).toBe(0);
      expect(info?.stateValues.size).toBe(0);
      expect(info?.classValues.size).toBe(0);
      expect(info?.accessCount).toBe(0);
      expect(info?.firstAccessTime).toBe(0);
    });

    it('should handle reset for non-existent consumer', () => {
      expect(() => tracker.resetTracking(consumerRef1)).not.toThrow();
    });
  });

  describe('Metadata Management', () => {
    it('should update last notified timestamp', () => {
      tracker.register(consumerRef1, 'id-1');

      const initialInfo = tracker.getConsumerInfo(consumerRef1);
      const initialTime = initialInfo?.lastNotified || 0;

      // Wait a bit and update
      setTimeout(() => {
        tracker.updateLastNotified(consumerRef1);

        const updatedInfo = tracker.getConsumerInfo(consumerRef1);
        expect(updatedInfo?.lastNotified).toBeGreaterThan(initialTime);
      }, 10);
    });

    it('should set hasRendered flag', () => {
      tracker.register(consumerRef1, 'id-1');

      let info = tracker.getConsumerInfo(consumerRef1);
      expect(info?.hasRendered).toBe(false);

      tracker.setHasRendered(consumerRef1, true);

      info = tracker.getConsumerInfo(consumerRef1);
      expect(info?.hasRendered).toBe(true);
    });

    it('should handle metadata updates for non-existent consumer', () => {
      expect(() => {
        tracker.updateLastNotified(consumerRef1);
        tracker.setHasRendered(consumerRef1, true);
      }).not.toThrow();
    });
  });

  describe('Utility Methods', () => {
    it('should correctly parse nested paths', () => {
      tracker.register(consumerRef1, 'id-1');
      tracker.trackAccess(consumerRef1, 'state', 'a.b.c.d', 'deep');

      const state = {
        a: {
          b: {
            c: {
              d: 'deep',
            },
          },
        },
      };

      const hasChanged = tracker.hasValuesChanged(consumerRef1, state, {});
      expect(hasChanged).toBe(false);
    });

    it('should handle array indices in paths', () => {
      tracker.register(consumerRef1, 'id-1');
      tracker.trackAccess(consumerRef1, 'state', 'items.0.name', 'First');
      tracker.trackAccess(consumerRef1, 'state', 'items.1.name', 'Second');

      const state = {
        items: [{ name: 'First' }, { name: 'Second' }],
      };

      const hasChanged = tracker.hasValuesChanged(consumerRef1, state, {});
      expect(hasChanged).toBe(false);
    });

    it('should handle null/undefined in path traversal', () => {
      tracker.register(consumerRef1, 'id-1');

      // First establish baseline - mark as rendered so change detection works
      const info = tracker.getConsumerInfo(consumerRef1);
      info!.hasRendered = true;

      // Track a nested path with a value
      tracker.trackAccess(
        consumerRef1,
        'state',
        'maybe.nested.value',
        'exists',
      );

      // Null in path - getValueAtPath returns undefined when encountering null
      let hasChanged = tracker.hasValuesChanged(
        consumerRef1,
        { maybe: null },
        {},
      );
      expect(hasChanged).toBe(true); // 'exists' !== undefined

      // Reset tracked value to test undefined case
      info!.stateValues.clear();
      tracker.trackAccess(
        consumerRef1,
        'state',
        'maybe.nested.value',
        'exists',
      );

      // Undefined in path - getValueAtPath returns undefined
      hasChanged = tracker.hasValuesChanged(
        consumerRef1,
        { maybe: undefined },
        {},
      );
      expect(hasChanged).toBe(true); // 'exists' !== undefined
    });
  });

  describe('Memory Management', () => {
    it('should use WeakMap for automatic garbage collection', () => {
      // Register many consumers
      const consumers: any[] = [];
      for (let i = 0; i < 100; i++) {
        const ref = { id: `consumer-${i}` };
        consumers.push(ref);
        tracker.register(ref, `id-${i}`);
      }

      expect(tracker.getStats().activeConsumers).toBe(100);

      // Clear references
      consumers.length = 0;

      // Consumers should be eligible for GC
      // (Can't test actual GC in unit tests, but WeakMap enables it)
    });
  });

  describe('Edge Cases', () => {
    it('should handle consumers without proper getDependencies', () => {
      const deps = tracker.getDependencies(consumerRef1);
      expect(deps).toBeNull(); // Not registered
    });

    it('should handle error in value access gracefully', () => {
      tracker.register(consumerRef1, 'id-1');
      tracker.trackAccess(consumerRef1, 'state', 'getter', 5);

      // Create object that throws on property access
      const throwingState = {
        get getter() {
          throw new Error('Access error');
        },
      };

      // Should treat as changed when access fails
      const hasChanged = tracker.hasValuesChanged(
        consumerRef1,
        throwingState,
        {},
      );
      expect(hasChanged).toBe(true);
    });
  });

  describe('Dependency Tracking After Access Pattern Changes', () => {
    it('should not detect changes for properties no longer accessed', () => {
      tracker.register(consumerRef1, 'id-1');

      // First render: access both count and name
      tracker.trackAccess(consumerRef1, 'state', 'count', 10);
      tracker.trackAccess(consumerRef1, 'state', 'name', 'Alice');

      // Initial state
      const initialState = { count: 10, name: 'Alice' };

      // Verify no changes with same values
      let hasChanged = tracker.hasValuesChanged(consumerRef1, initialState, {});
      expect(hasChanged).toBe(false);

      // Change name - should detect change since we're still tracking it
      hasChanged = tracker.hasValuesChanged(
        consumerRef1,
        { count: 10, name: 'Bob' },
        {},
      );
      expect(hasChanged).toBe(true);

      tracker.setHasRendered(consumerRef1, true);

      // Simulate next render cycle where only count is accessed
      // Reset tracking to simulate a new render
      tracker.resetTracking(consumerRef1);
      tracker.trackAccess(consumerRef1, 'state', 'count', 10);

      // Now only 'count' is tracked, not 'name'
      const deps = tracker.getDependencies(consumerRef1);
      expect(deps?.statePaths).toEqual(['count']);
      expect(deps?.statePaths).not.toContain('name');

      // Change name - should NOT detect change since we're no longer tracking it
      hasChanged = tracker.hasValuesChanged(
        consumerRef1,
        { count: 10, name: 'Charlie' },
        {},
      );
      expect(hasChanged).toBe(false);

      // But changing count should still be detected
      hasChanged = tracker.hasValuesChanged(
        consumerRef1,
        { count: 11, name: 'Charlie' },
        {},
      );
      expect(hasChanged).toBe(true);
    });
  });
});
