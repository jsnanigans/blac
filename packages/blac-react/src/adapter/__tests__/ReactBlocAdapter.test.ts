/**
 * Tests for ReactBlocAdapter
 *
 * Comprehensive test suite covering:
 * - Basic subscription lifecycle
 * - Version-based change detection
 * - Selector functionality
 * - Reference counting
 * - Memory cleanup
 * - React Strict Mode compatibility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cubit } from '@blac/core';
import { ReactBlocAdapter } from '../ReactBlocAdapter';

class CounterCubitWithoutDepTracking extends Cubit<number> {
  constructor() {
    super(0);
    this.config = { proxyDependencyTracking: false };
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };

  reset = () => {
    this.emit(0);
  };
}

/**
 * Test Cubit with complex state
 */
interface UserState {
  id: number;
  name: string;
  age: number;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({
      id: 1,
      name: 'John Doe',
      age: 30,
      preferences: {
        theme: 'light',
        notifications: true,
      },
    });
  }

  updateName = (name: string) => {
    this.emit({ ...this.state, name });
  };

  updateAge = (age: number) => {
    this.emit({ ...this.state, age });
  };

  toggleTheme = () => {
    this.emit({
      ...this.state,
      preferences: {
        ...this.state.preferences,
        theme: this.state.preferences.theme === 'light' ? 'dark' : 'light',
      },
    });
  };

  toggleNotifications = () => {
    this.emit({
      ...this.state,
      preferences: {
        ...this.state.preferences,
        notifications: !this.state.preferences.notifications,
      },
    });
  };
}

describe('ReactBlocAdapter', () => {
  describe('Basic Functionality', () => {
    it('should create an adapter with initial snapshot', () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      expect(adapter.getSnapshot()).toBe(0);
      expect(adapter.getVersion()).toBe(0);
      expect(adapter.getSubscriberCount()).toBe(0);
    });

    it('should update snapshot when state changes', () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      cubit.increment();
      expect(adapter.getSnapshot()).toBe(1);
      expect(adapter.getVersion()).toBe(1);

      cubit.increment();
      expect(adapter.getSnapshot()).toBe(2);
      expect(adapter.getVersion()).toBe(2);
    });

    it('should dispose cleanly', () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      const notify = vi.fn();
      const unsubscribe = adapter.subscribe(undefined, notify);

      adapter.dispose();

      // After disposal, state changes should not trigger notifications
      cubit.increment();
      expect(notify).not.toHaveBeenCalled();
      expect(adapter.getSubscriberCount()).toBe(0);

      unsubscribe(); // Should not throw
    });
  });

  describe('Subscription Management', () => {
    it('should notify subscribers on state change', () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      const notify = vi.fn();
      adapter.subscribe(undefined, notify);

      cubit.increment();
      expect(notify).toHaveBeenCalledTimes(1);

      cubit.increment();
      expect(notify).toHaveBeenCalledTimes(2);
    });

    it('should track subscriber count correctly', () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      expect(adapter.getSubscriberCount()).toBe(0);

      const unsubscribe1 = adapter.subscribe(undefined, () => {});
      expect(adapter.getSubscriberCount()).toBe(1);

      const unsubscribe2 = adapter.subscribe(undefined, () => {});
      expect(adapter.getSubscriberCount()).toBe(2);

      unsubscribe1();
      expect(adapter.getSubscriberCount()).toBe(1);

      unsubscribe2();
      expect(adapter.getSubscriberCount()).toBe(0);
    });

    it('should not notify after unsubscribe', () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      const notify = vi.fn();
      const unsubscribe = adapter.subscribe(undefined, notify);

      cubit.increment();
      expect(notify).toHaveBeenCalledTimes(1);

      unsubscribe();

      cubit.increment();
      expect(notify).toHaveBeenCalledTimes(1); // Still 1, no new notification
    });

    it('should handle multiple subscribers independently', () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      const notify1 = vi.fn();
      const notify2 = vi.fn();

      const unsubscribe1 = adapter.subscribe(undefined, notify1);
      adapter.subscribe(undefined, notify2);

      cubit.increment();
      expect(notify1).toHaveBeenCalledTimes(1);
      expect(notify2).toHaveBeenCalledTimes(1);

      unsubscribe1();

      cubit.increment();
      expect(notify1).toHaveBeenCalledTimes(1); // Still 1
      expect(notify2).toHaveBeenCalledTimes(2); // Incremented
    });
  });

  describe('Selector Functionality', () => {
    it('should apply selector to snapshot', () => {
      const cubit = new UserCubit();
      const adapter = new ReactBlocAdapter(cubit);

      const nameSelector = (state: UserState) => state.name;
      const name = adapter.getSnapshot(nameSelector);

      expect(name).toBe('John Doe');
    });

    it('should only notify when selector result changes', () => {
      const cubit = new UserCubit();
      const adapter = new ReactBlocAdapter(cubit);

      const notify = vi.fn();
      const nameSelector = (state: UserState) => state.name;

      adapter.subscribe(nameSelector, notify);

      // Change age (name selector should not trigger notification)
      cubit.updateAge(31);
      expect(notify).not.toHaveBeenCalled();

      // Change name (should trigger notification)
      cubit.updateName('Jane Doe');
      expect(notify).toHaveBeenCalledTimes(1);

      // Change age again (still no notification)
      cubit.updateAge(32);
      expect(notify).toHaveBeenCalledTimes(1);
    });

    it('should support complex selectors', () => {
      const cubit = new UserCubit();
      const adapter = new ReactBlocAdapter(cubit);

      const notify = vi.fn();
      const themeSelector = (state: UserState) => state.preferences.theme;

      adapter.subscribe(themeSelector, notify);

      // Toggle theme (should notify)
      cubit.toggleTheme();
      expect(notify).toHaveBeenCalledTimes(1);

      // Toggle notifications (should not notify - different field)
      cubit.toggleNotifications();
      expect(notify).toHaveBeenCalledTimes(1);

      // Toggle theme again (should notify)
      cubit.toggleTheme();
      expect(notify).toHaveBeenCalledTimes(2);
    });

    it('should use custom comparison function', () => {
      const cubit = new UserCubit();
      const adapter = new ReactBlocAdapter(cubit);

      const notify = vi.fn();

      // Selector that returns an object
      const prefsSelector = (state: UserState) => state.preferences;

      // Custom compare that always returns true (objects are "equal")
      const alwaysEqual = () => true;

      adapter.subscribe(prefsSelector, notify, alwaysEqual);

      // Toggle theme (should NOT notify due to custom compare)
      cubit.toggleTheme();
      expect(notify).not.toHaveBeenCalled();
    });
  });

  describe('Version Tracking', () => {
    it('should increment version on state change', () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      expect(adapter.getVersion()).toBe(0);

      cubit.increment();
      expect(adapter.getVersion()).toBe(1);

      cubit.increment();
      expect(adapter.getVersion()).toBe(2);

      cubit.decrement();
      expect(adapter.getVersion()).toBe(3);
    });

    it('should not notify same subscription twice for same version', async () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      const notify = vi.fn();
      adapter.subscribe(undefined, notify);

      cubit.increment();
      expect(notify).toHaveBeenCalledTimes(1);

      // Force another notification cycle without state change
      // This simulates what might happen with multiple rapid subscriptions
      // The adapter should not notify again for the same version
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(notify).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should schedule cleanup when subscriber count reaches zero', async () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      const disposeSpy = vi.spyOn(adapter, 'dispose');

      const unsubscribe = adapter.subscribe(undefined, () => {});
      expect(adapter.getSubscriberCount()).toBe(1);

      unsubscribe();
      expect(adapter.getSubscriberCount()).toBe(0);

      // Wait for microtask queue to flush
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should cancel cleanup if new subscriber added', async () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      const disposeSpy = vi.spyOn(adapter, 'dispose');

      const unsubscribe1 = adapter.subscribe(undefined, () => {});
      unsubscribe1();

      // Add new subscriber before cleanup executes
      const unsubscribe2 = adapter.subscribe(undefined, () => {});
      expect(adapter.getSubscriberCount()).toBe(1);

      // Wait for potential cleanup
      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

      // Should NOT have disposed
      expect(disposeSpy).not.toHaveBeenCalled();

      unsubscribe2();
    });
  });

  describe('React Strict Mode Compatibility', () => {
    it('should handle double subscribe/unsubscribe', () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      const notify = vi.fn();

      // Simulate Strict Mode: mount, unmount, remount
      const unsubscribe1 = adapter.subscribe(undefined, notify);
      unsubscribe1();

      const unsubscribe2 = adapter.subscribe(undefined, notify);
      cubit.increment();

      expect(notify).toHaveBeenCalledTimes(1);

      unsubscribe2();
    });

    it('should maintain correct subscriber count in Strict Mode', () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      // First mount
      const unsub1 = adapter.subscribe(undefined, () => {});
      expect(adapter.getSubscriberCount()).toBe(1);

      // First unmount
      unsub1();
      expect(adapter.getSubscriberCount()).toBe(0);

      // Remount
      const unsub2 = adapter.subscribe(undefined, () => {});
      expect(adapter.getSubscriberCount()).toBe(1);

      // Final unmount
      unsub2();
      expect(adapter.getSubscriberCount()).toBe(0);
    });
  });

  describe('Debug Information', () => {
    it('should provide debug info', () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      const notify = vi.fn();
      adapter.subscribe(undefined, notify);

      const debugInfo = adapter.getDebugInfo();

      expect(debugInfo).toHaveProperty('blocUid', cubit.uid);
      expect(debugInfo).toHaveProperty(
        'blocName',
        'CounterCubitWithoutDepTracking',
      );
      expect(debugInfo).toHaveProperty('version', 0);
      expect(debugInfo).toHaveProperty('subscriberCount', 1);
      expect(debugInfo).toHaveProperty('subscriptions');
      expect(debugInfo.subscriptions).toHaveLength(1);
    });

    it('should update debug info on state changes', () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      adapter.subscribe(undefined, () => {});

      cubit.increment();
      cubit.increment();

      const debugInfo = adapter.getDebugInfo();
      expect(debugInfo.version).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid state changes', () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      const notify = vi.fn();
      adapter.subscribe(undefined, notify);

      // Rapid changes
      for (let i = 0; i < 100; i++) {
        cubit.increment();
      }

      expect(notify).toHaveBeenCalledTimes(100);
      expect(adapter.getSnapshot()).toBe(100);
      expect(adapter.getVersion()).toBe(100);
    });

    it('should handle selector that throws', () => {
      const cubit = new UserCubit();
      const adapter = new ReactBlocAdapter(cubit);

      const badSelector = () => {
        throw new Error('Selector error');
      };

      // Should not throw when creating snapshot
      expect(() => {
        adapter.getSnapshot(badSelector);
      }).toThrow('Selector error');
    });

    it('should handle unsubscribe called multiple times', () => {
      const cubit = new CounterCubitWithoutDepTracking();
      const adapter = new ReactBlocAdapter(cubit);

      const unsubscribe = adapter.subscribe(undefined, () => {});

      expect(adapter.getSubscriberCount()).toBe(1);

      unsubscribe();
      expect(adapter.getSubscriberCount()).toBe(0);

      // Call again - should be safe
      unsubscribe();
      expect(adapter.getSubscriberCount()).toBe(0);
    });
  });
});
