/**
 * Test that each StateContainer subclass has its own instance storage
 *
 * This test verifies that the bug where all subclasses shared the same
 * instances Map has been fixed.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Cubit } from '../Cubit';
import { StateContainer } from '../StateContainer';

// Test blocs
interface CounterState {
  count: number;
}

class CounterBloc extends Cubit<CounterState> {
  constructor(initialCount = 0) {
    super({ count: initialCount });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

interface UserState {
  name: string;
}

class UserBloc extends Cubit<UserState> {
  constructor(name = 'Anonymous') {
    super({ name });
  }

  setName = (name: string) => {
    this.patch({ name });
  };
}

describe('StateContainer Instance Isolation', () => {
  beforeEach(() => {
    StateContainer.clearAllInstances();
  });

  it('should maintain separate instance storage per class', () => {
    // Create instances of both types with the same key
    const counter1 = CounterBloc.resolve('main', [0]);
    const user1 = UserBloc.resolve('main', ['Alice']);

    // Both should exist
    expect(CounterBloc.hasInstance('main')).toBe(true);
    expect(UserBloc.hasInstance('main')).toBe(true);

    // They should be different instances
    expect(counter1).not.toBe(user1);
    expect(counter1).toBeInstanceOf(CounterBloc);
    expect(user1).toBeInstanceOf(UserBloc);
  });

  it('should not have key collisions between different classes', () => {
    // Create multiple instances of each type
    const counter1 = CounterBloc.resolve('shared', [1]);
    const counter2 = CounterBloc.resolve('counter-only', [2]);

    const user1 = UserBloc.resolve('shared', ['Bob']);
    const user2 = UserBloc.resolve('user-only', ['Charlie']);

    // Each class should have its own instances
    expect(CounterBloc.getAll()).toHaveLength(2);
    expect(UserBloc.getAll()).toHaveLength(2);

    // 'shared' key should work for both classes independently
    expect(CounterBloc.get('shared')).toBe(counter1);
    expect(UserBloc.get('shared')).toBe(user1);
    expect(counter1).not.toBe(user1);
  });

  it('should clear only the specific class instances', () => {
    CounterBloc.resolve('main', [0]);
    CounterBloc.resolve('secondary', [10]);
    UserBloc.resolve('main', ['Dave']);
    UserBloc.resolve('secondary', ['Eve']);

    // Clear only CounterBloc instances
    CounterBloc.clear();

    // CounterBloc should be empty
    expect(CounterBloc.getAll()).toHaveLength(0);
    expect(CounterBloc.hasInstance('main')).toBe(false);
    expect(CounterBloc.hasInstance('secondary')).toBe(false);

    // UserBloc should still have its instances
    expect(UserBloc.getAll()).toHaveLength(2);
    expect(UserBloc.hasInstance('main')).toBe(true);
    expect(UserBloc.hasInstance('secondary')).toBe(true);
  });

  it('should track ref counts independently per class', () => {
    // Create instances with same key
    CounterBloc.resolve('main', [0]);
    UserBloc.resolve('main', ['Frank']);

    // Resolve again to increment ref counts
    CounterBloc.resolve('main');
    UserBloc.resolve('main');

    // Each should have its own ref count
    expect(CounterBloc.getRefCount('main')).toBe(2);
    expect(UserBloc.getRefCount('main')).toBe(2);

    // Release one CounterBloc reference
    CounterBloc.release('main');

    // Only CounterBloc count should decrease
    expect(CounterBloc.getRefCount('main')).toBe(1);
    expect(UserBloc.getRefCount('main')).toBe(2);
  });

  it('should allow same keys across different classes without interference', () => {
    // Create many instances of different types with overlapping keys
    const keys = ['a', 'b', 'c', 'main', 'shared'];

    keys.forEach((key, i) => {
      CounterBloc.resolve(key, [i]);
      UserBloc.resolve(key, [`User${i}`]);
    });

    // Each class should have all keys
    expect(CounterBloc.getAll()).toHaveLength(keys.length);
    expect(UserBloc.getAll()).toHaveLength(keys.length);

    // Verify each key returns the correct type
    keys.forEach((key) => {
      expect(CounterBloc.get(key)).toBeInstanceOf(CounterBloc);
      expect(UserBloc.get(key)).toBeInstanceOf(UserBloc);
    });
  });

  it('should handle forEach independently per class', () => {
    CounterBloc.resolve('c1', [1]);
    CounterBloc.resolve('c2', [2]);
    UserBloc.resolve('u1', ['User1']);
    UserBloc.resolve('u2', ['User2']);

    const counterIds: string[] = [];
    const userIds: string[] = [];

    CounterBloc.forEach((instance) => {
      counterIds.push(instance.instanceId);
    });

    UserBloc.forEach((instance) => {
      userIds.push(instance.instanceId);
    });

    // Should iterate only over own instances
    expect(counterIds).toHaveLength(2);
    expect(userIds).toHaveLength(2);

    // IDs should be different (no overlap)
    const allIds = [...counterIds, ...userIds];
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(4);
  });
});
