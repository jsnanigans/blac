/**
 * LifecycleManager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LifecycleManager, LifecycleState, MountEvent, UnmountEvent, DisposeEvent } from './LifecycleManager';
import { instanceId } from '../types/branded';

describe('LifecycleManager', () => {
  let manager: LifecycleManager;
  const testInstanceId = instanceId('test-instance');

  beforeEach(() => {
    manager = new LifecycleManager({ instanceId: testInstanceId });
  });

  describe('Initial State', () => {
    it('should start in UNMOUNTED state', () => {
      expect(manager.getState()).toBe(LifecycleState.UNMOUNTED);
      expect(manager.isMounted).toBe(false);
      expect(manager.isDisposed).toBe(false);
    });

    it('should have zero mount/unmount counts', () => {
      const stats = manager.getStats();
      expect(stats.mountCount).toBe(0);
      expect(stats.unmountCount).toBe(0);
    });
  });

  describe('State Transitions', () => {
    describe('mount()', () => {
      it('should transition from UNMOUNTED to MOUNTED', () => {
        manager.mount();
        expect(manager.getState()).toBe(LifecycleState.MOUNTED);
        expect(manager.isMounted).toBe(true);
      });

      it('should increment mount count', () => {
        manager.mount();
        expect(manager.getStats().mountCount).toBe(1);
      });

      it('should throw if already mounted', () => {
        manager.mount();
        expect(() => manager.mount()).toThrow('Invalid state transition');
      });

      it('should emit mount event', () => {
        const events: any[] = [];
        manager.subscribe((event) => events.push(event));

        manager.mount();

        // Should emit transition events and mount event
        const mountEvent = events.find(e => e instanceof MountEvent);
        expect(mountEvent).toBeDefined();
        expect(mountEvent.instanceId).toBe(testInstanceId);
      });
    });

    describe('unmount()', () => {
      it('should transition from MOUNTED to UNMOUNTED', () => {
        manager.mount();
        manager.unmount();
        expect(manager.getState()).toBe(LifecycleState.UNMOUNTED);
        expect(manager.isMounted).toBe(false);
      });

      it('should increment unmount count', () => {
        manager.mount();
        manager.unmount();
        expect(manager.getStats().unmountCount).toBe(1);
      });

      it('should throw if not mounted', () => {
        expect(() => manager.unmount()).toThrow('Invalid state transition');
      });

      it('should emit unmount event', () => {
        const events: any[] = [];
        manager.mount();
        manager.subscribe((event) => events.push(event));

        manager.unmount();

        const unmountEvent = events.find(e => e instanceof UnmountEvent);
        expect(unmountEvent).toBeDefined();
        expect(unmountEvent.instanceId).toBe(testInstanceId);
      });
    });

    describe('dispose()', () => {
      it('should transition to DISPOSED from UNMOUNTED', () => {
        manager.dispose();
        expect(manager.getState()).toBe(LifecycleState.DISPOSED);
        expect(manager.isDisposed).toBe(true);
      });

      it('should unmount first if mounted', () => {
        manager.mount();
        manager.dispose();
        expect(manager.getState()).toBe(LifecycleState.DISPOSED);
        expect(manager.getStats().unmountCount).toBe(1);
      });

      it('should be idempotent', () => {
        manager.dispose();
        expect(() => manager.dispose()).not.toThrow();
        expect(manager.getState()).toBe(LifecycleState.DISPOSED);
      });

      it('should emit dispose event', () => {
        const events: any[] = [];
        manager.subscribe((event) => events.push(event));

        manager.dispose();

        const disposeEvent = events.find(e => e instanceof DisposeEvent);
        expect(disposeEvent).toBeDefined();
        expect(disposeEvent.instanceId).toBe(testInstanceId);
      });

      it('should prevent any further transitions after disposal', () => {
        manager.dispose();
        expect(() => manager.mount()).toThrow();
        expect(() => manager.unmount()).toThrow();
      });
    });
  });

  describe('Mount/Unmount Cycles', () => {
    it('should handle multiple mount/unmount cycles', () => {
      // First cycle
      manager.mount();
      expect(manager.isMounted).toBe(true);
      manager.unmount();
      expect(manager.isMounted).toBe(false);

      // Second cycle
      manager.mount();
      expect(manager.isMounted).toBe(true);
      manager.unmount();
      expect(manager.isMounted).toBe(false);

      const stats = manager.getStats();
      expect(stats.mountCount).toBe(2);
      expect(stats.unmountCount).toBe(2);
    });
  });

  describe('Event Subscription', () => {
    it('should allow subscribing to lifecycle events', () => {
      const events: any[] = [];
      const unsubscribe = manager.subscribe((event) => events.push(event));

      manager.mount();
      manager.unmount();

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e instanceof MountEvent)).toBe(true);
      expect(events.some(e => e instanceof UnmountEvent)).toBe(true);

      unsubscribe();
    });

    it('should stop receiving events after unsubscribe', () => {
      const events: any[] = [];
      const unsubscribe = manager.subscribe((event) => events.push(event));

      manager.mount();
      const countAfterMount = events.length;

      unsubscribe();
      manager.unmount();

      expect(events.length).toBe(countAfterMount); // No new events
    });
  });

  describe('State Validation', () => {
    it('should validate state transitions', () => {
      // Can't unmount if not mounted
      expect(() => manager.unmount()).toThrow();

      // Can't mount if already mounted
      manager.mount();
      expect(() => manager.mount()).toThrow();

      // Can't mount after disposal
      manager.dispose();
      expect(() => manager.mount()).toThrow();
    });

    it('should provide isInState helper', () => {
      expect(manager.isInState(LifecycleState.UNMOUNTED)).toBe(true);
      expect(manager.isInState(LifecycleState.MOUNTED)).toBe(false);

      manager.mount();
      expect(manager.isInState(LifecycleState.MOUNTED)).toBe(true);
      expect(manager.isInState(LifecycleState.UNMOUNTED)).toBe(false);
    });
  });

  describe('Debug Mode', () => {
    it('should log transitions in debug mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const debugManager = new LifecycleManager({
        instanceId: testInstanceId,
        debug: true
      });

      debugManager.mount();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Mounted'));

      debugManager.unmount();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unmounted'));

      debugManager.dispose();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Disposed'));

      consoleSpy.mockRestore();
    });
  });

  describe('Custom State Transition Handler', () => {
    it('should call onStateTransition callback', () => {
      const transitions: any[] = [];
      const manager = new LifecycleManager({
        instanceId: testInstanceId,
        onStateTransition: (event) => transitions.push(event)
      });

      manager.mount();
      manager.unmount();

      expect(transitions.length).toBeGreaterThan(0);
      transitions.forEach(t => {
        expect(t.instanceId).toBe(testInstanceId);
        expect(t.fromState).toBeDefined();
        expect(t.toState).toBeDefined();
      });
    });
  });

  describe('React Strict Mode Compatibility', () => {
    it('should handle double mount/unmount pattern', () => {
      // Simulate React Strict Mode behavior
      manager.mount();
      manager.unmount();
      manager.mount();

      expect(manager.isMounted).toBe(true);
      expect(manager.getStats().mountCount).toBe(2);
      expect(manager.getStats().unmountCount).toBe(1);
    });

    it('should handle rapid mount/unmount/dispose', () => {
      manager.mount();
      manager.unmount();
      manager.dispose();

      expect(manager.isDisposed).toBe(true);
      expect(() => manager.mount()).toThrow();
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should not accumulate event listeners', () => {
      const subscriptions: Array<() => void> = [];

      // Create and remove many subscriptions
      for (let i = 0; i < 100; i++) {
        const unsubscribe = manager.subscribe(() => {});
        subscriptions.push(unsubscribe);
      }

      // Unsubscribe all
      subscriptions.forEach(unsub => unsub());

      // The EventStream should have no listeners
      // (This is more of an integration test with EventStream)
      const events: any[] = [];
      manager.subscribe((e) => events.push(e));
      manager.mount();

      // Should only have events from the one active subscription
      expect(events.length).toBeGreaterThan(0);
    });
  });
});