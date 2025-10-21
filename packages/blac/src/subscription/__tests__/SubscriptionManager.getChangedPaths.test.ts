import { describe, it, expect, beforeEach } from 'vitest';
import { Cubit } from '../../Cubit';
import { SubscriptionManager } from '../SubscriptionManager';

/**
 * Test suite for V3 deep path tracking in getChangedPaths
 * Validates recursive comparison and full dot-notation path detection
 */

class TestCubit extends Cubit<any> {
  constructor(initialState: any) {
    super(initialState);
  }
}

describe('SubscriptionManager.getChangedPaths (V3 Deep Tracking)', () => {
  let cubit: TestCubit;
  let manager: SubscriptionManager<any>;

  beforeEach(() => {
    cubit = new TestCubit({});
    // Access the private subscription manager through the bloc
    manager = (cubit as any)._subscriptionManager;
  });

  it('should return full path for nested property change', () => {
    const oldState = { profile: { name: 'Alice', age: 25 } };
    const newState = { profile: { name: 'Bob', age: 25 } };

    const changed = (manager as any).getChangedPaths(oldState, newState);

    // V3: Should return both parent path "profile" AND child path "profile.name"
    // This ensures components tracking "profile" or "profile.name" both get notified
    expect(changed).toContain('profile.name');
    expect(changed).toContain('profile');
    expect(changed.has('profile.age')).toBe(false);
  });

  it('should handle array index changes', () => {
    const oldState = { items: [{ id: 1 }, { id: 2 }] };
    const newState = { items: [{ id: 1 }, { id: 3 }] };

    const changed = (manager as any).getChangedPaths(oldState, newState);

    // Should track the specific array index and property that changed
    expect(changed).toContain('items.1.id');
    expect(changed.has('items.0.id')).toBe(false);
  });

  it('should optimize with reference equality', () => {
    const unchanged = { nested: { deep: { value: 1 } } };
    const oldState = { a: unchanged, b: 'old' };
    const newState = { a: unchanged, b: 'new' };

    const changed = (manager as any).getChangedPaths(oldState, newState);

    // Should NOT include 'a' or any nested paths (reference equal)
    expect(changed).toEqual(new Set(['b']));
    expect(changed.has('a')).toBe(false);
    expect(changed.has('a.nested')).toBe(false);
    expect(changed.has('a.nested.deep')).toBe(false);
    expect(changed.has('a.nested.deep.value')).toBe(false);
  });

  it('should handle deep nesting (5+ levels)', () => {
    const oldState = { l1: { l2: { l3: { l4: { l5: 'old' } } } } };
    const newState = { l1: { l2: { l3: { l4: { l5: 'new' } } } } };

    const changed = (manager as any).getChangedPaths(oldState, newState);

    // V3: Should return ALL parent paths plus the leaf path
    expect(changed).toContain('l1.l2.l3.l4.l5');
    expect(changed).toContain('l1.l2.l3.l4');
    expect(changed).toContain('l1.l2.l3');
    expect(changed).toContain('l1.l2');
    expect(changed).toContain('l1');
  });

  it('should handle null/undefined transitions', () => {
    const oldState = { user: { profile: null } };
    const newState = { user: { profile: { name: 'Alice' } } };

    const changed = (manager as any).getChangedPaths(oldState, newState);

    // V3: Should detect the structural change and report parent path too
    expect(changed).toContain('user.profile');
    expect(changed).toContain('user');
  });

  it('should handle added properties', () => {
    const oldState = { user: { name: 'Alice' } };
    const newState = { user: { name: 'Alice', age: 30 } };

    const changed = (manager as any).getChangedPaths(oldState, newState);

    // Should detect the new property
    expect(changed).toContain('user.age');
    expect(changed.has('user.name')).toBe(false);
  });

  it('should handle removed properties', () => {
    const oldState = { user: { name: 'Alice', age: 30 } };
    const newState = { user: { name: 'Alice' } };

    const changed = (manager as any).getChangedPaths(oldState, newState);

    // Should detect the removed property
    expect(changed).toContain('user.age');
    expect(changed.has('user.name')).toBe(false);
  });

  it('should return empty set for identical states', () => {
    const oldState = { user: { name: 'Alice', profile: { age: 25 } } };
    const newState = oldState; // Same reference

    const changed = (manager as any).getChangedPaths(oldState, newState);

    expect(changed.size).toBe(0);
  });

  it('should return * for primitive state changes', () => {
    const oldState = 42;
    const newState = 43;

    const changed = (manager as any).getChangedPaths(oldState, newState);

    expect(changed).toContain('*');
  });

  it('should handle object to primitive transition', () => {
    const oldState = { value: { nested: 'data' } };
    const newState = { value: 'string' };

    const changed = (manager as any).getChangedPaths(oldState, newState);

    // Should detect the structural change
    expect(changed).toContain('value');
    expect(changed.has('value.nested')).toBe(false);
  });

  it('should handle primitive to object transition', () => {
    const oldState = { value: 'string' };
    const newState = { value: { nested: 'data' } };

    const changed = (manager as any).getChangedPaths(oldState, newState);

    // Should detect the structural change
    expect(changed).toContain('value');
  });

  it('should handle multiple nested changes', () => {
    const oldState = {
      user: { name: 'Alice', profile: { city: 'NYC', country: 'USA' } },
      settings: { theme: 'dark' },
    };
    const newState = {
      user: { name: 'Bob', profile: { city: 'LA', country: 'USA' } },
      settings: { theme: 'dark' },
    };

    const changed = (manager as any).getChangedPaths(oldState, newState);

    // Should detect both changes
    expect(changed).toContain('user.name');
    expect(changed).toContain('user.profile.city');
    // Should NOT include unchanged paths
    expect(changed.has('user.profile.country')).toBe(false);
    expect(changed.has('settings')).toBe(false);
    expect(changed.has('settings.theme')).toBe(false);
  });

  it('should handle array length changes', () => {
    const oldState = { items: [1, 2, 3] };
    const newState = { items: [1, 2, 3, 4] };

    const changed = (manager as any).getChangedPaths(oldState, newState);

    // Should detect the new array element
    expect(changed).toContain('items.3');
    // Should not mark unchanged elements as changed
    expect(changed.has('items.0')).toBe(false);
    expect(changed.has('items.1')).toBe(false);
    expect(changed.has('items.2')).toBe(false);
  });

  it('should handle array with object items', () => {
    const sharedItem = { id: 1, name: 'shared' };
    const oldState = {
      items: [sharedItem, { id: 2, name: 'old' }],
    };
    const newState = {
      items: [sharedItem, { id: 2, name: 'new' }],
    };

    const changed = (manager as any).getChangedPaths(oldState, newState);

    // Should detect the changed property in the second item
    expect(changed).toContain('items.1.name');
    // Should not include the shared item (reference equal)
    expect(changed.has('items.0')).toBe(false);
    expect(changed.has('items.0.id')).toBe(false);
    expect(changed.has('items.0.name')).toBe(false);
    // Should not include unchanged properties
    expect(changed.has('items.1.id')).toBe(false);
  });

  it('should handle empty objects', () => {
    const oldState = { data: {} };
    const newState = { data: {} };

    const changed = (manager as any).getChangedPaths(oldState, newState);

    // Different object references but empty - should detect change at object level
    expect(changed.size).toBe(0);
  });

  it('should handle null to null (no change)', () => {
    const oldState = { value: null };
    const newState = { value: null };

    const changed = (manager as any).getChangedPaths(oldState, newState);

    expect(changed.size).toBe(0);
  });

  it('should handle undefined to undefined (no change)', () => {
    const oldState = { value: undefined };
    const newState = { value: undefined };

    const changed = (manager as any).getChangedPaths(oldState, newState);

    expect(changed.size).toBe(0);
  });
});

describe('SubscriptionManager.shouldNotifyForPaths (V3 Deep Path Matching)', () => {
  let cubit: TestCubit;
  let manager: SubscriptionManager<any>;

  beforeEach(() => {
    cubit = new TestCubit({});
    manager = (cubit as any)._subscriptionManager;
  });

  it('should correctly match deep path dependencies', () => {
    // Create a subscription and manually set its dependencies
    const result = manager.subscribe({
      type: 'consumer',
      notify: () => {},
    });

    const subscription = manager.getSubscription(result.id);
    if (!subscription) throw new Error('Subscription not found');

    // Manually set deep path dependency
    subscription.dependencies = new Set(['profile.address.city']);

    // Test 1: Exact match should notify
    const changedPaths1 = new Set(['profile.address.city']);
    expect(manager.shouldNotifyForPaths(result.id, changedPaths1)).toBe(true);

    // Test 2: Different nested path should NOT notify
    const changedPaths2 = new Set(['profile.address.country']);
    expect(manager.shouldNotifyForPaths(result.id, changedPaths2)).toBe(false);

    // Test 3: Parent path change SHOULD notify
    // V3: If parent changes, children are affected
    const changedPaths3 = new Set(['profile']);
    expect(manager.shouldNotifyForPaths(result.id, changedPaths3)).toBe(true);

    // Test 4: Unrelated path should NOT notify
    const changedPaths4 = new Set(['settings.theme']);
    expect(manager.shouldNotifyForPaths(result.id, changedPaths4)).toBe(false);

    result.unsubscribe();
  });

  it('should handle multiple deep dependencies', () => {
    const result = manager.subscribe({
      type: 'consumer',
      notify: () => {},
    });

    const subscription = manager.getSubscription(result.id);
    if (!subscription) throw new Error('Subscription not found');

    // Track multiple deep paths
    subscription.dependencies = new Set([
      'user.profile.name',
      'user.settings.theme',
      'data.items.0.value',
    ]);

    // Should notify if ANY dependency matches
    expect(
      manager.shouldNotifyForPaths(result.id, new Set(['user.profile.name'])),
    ).toBe(true);
    expect(
      manager.shouldNotifyForPaths(result.id, new Set(['user.settings.theme'])),
    ).toBe(true);
    expect(
      manager.shouldNotifyForPaths(result.id, new Set(['data.items.0.value'])),
    ).toBe(true);

    // Should NOT notify for unrelated changes
    expect(
      manager.shouldNotifyForPaths(result.id, new Set(['user.profile.age'])),
    ).toBe(false);

    result.unsubscribe();
  });

  it('should handle * wildcard for full state changes', () => {
    const result = manager.subscribe({
      type: 'consumer',
      notify: () => {},
    });

    const subscription = manager.getSubscription(result.id);
    if (!subscription) throw new Error('Subscription not found');

    subscription.dependencies = new Set(['profile.address.city']);

    // Wildcard should always notify
    const changedPaths = new Set(['*']);
    expect(manager.shouldNotifyForPaths(result.id, changedPaths)).toBe(true);

    result.unsubscribe();
  });

  it('should integrate getChangedPaths with shouldNotifyForPaths', () => {
    const result = manager.subscribe({
      type: 'consumer',
      notify: () => {},
    });

    const subscription = manager.getSubscription(result.id);
    if (!subscription) throw new Error('Subscription not found');

    // Simulate tracking nested property access
    subscription.dependencies = new Set(['user.profile.city']);

    // Scenario: Only the city changed
    const oldState = {
      user: { profile: { city: 'NYC', country: 'USA' }, age: 30 },
    };
    const newState = {
      user: { profile: { city: 'LA', country: 'USA' }, age: 30 },
    };

    const changedPaths = (manager as any).getChangedPaths(oldState, newState);

    // getChangedPaths should return 'user.profile.city'
    expect(changedPaths).toContain('user.profile.city');

    // shouldNotifyForPaths should return true (dependency matches)
    expect(manager.shouldNotifyForPaths(result.id, changedPaths)).toBe(true);

    // Scenario 2: Only unrelated property changed
    const newState2 = {
      user: { profile: { city: 'NYC', country: 'USA' }, age: 31 },
    };

    const changedPaths2 = (manager as any).getChangedPaths(oldState, newState2);

    // getChangedPaths should return 'user.age', not 'user.profile.city'
    expect(changedPaths2).toContain('user.age');
    expect(changedPaths2.has('user.profile.city')).toBe(false);

    // shouldNotifyForPaths should return false (no matching dependency)
    expect(manager.shouldNotifyForPaths(result.id, changedPaths2)).toBe(false);

    result.unsubscribe();
  });
});
