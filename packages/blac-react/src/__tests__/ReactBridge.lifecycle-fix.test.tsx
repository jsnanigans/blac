/**
 * Test suite verifying the ReactBridge lifecycle fix
 * Ensures first state change triggers re-render in both modes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReactBridge } from '../ReactBridge.optimized';
import { Cubit } from '@blac/core';
import { act } from '@testing-library/react';

type CounterState = { count: number; name: string };

class CounterBloc extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, name: 'initial' });
  }

  increment() {
    this.update((current) => ({ ...current, count: current.count + 1 }));
  }

  setName(name: string) {
    this.update((current) => ({ ...current, name }));
  }
}

describe('ReactBridge Lifecycle Fix - First State Change', () => {
  let bloc: CounterBloc;

  beforeEach(() => {
    bloc = new CounterBloc();
  });

  afterEach(() => {
    bloc.dispose();
  });

  describe('Dependencies Mode', () => {
    it('should trigger re-render on first state change when dependency changes', () => {
      const bridge = new ReactBridge(bloc, {
        dependencies: (state) => [state.count],
      });

      const listener = vi.fn();

      // 1. Component mounts - subscribe
      bridge.subscribe(listener);

      // 2. Initial render - getSnapshot captures initial dependencies
      const initialSnapshot = bridge.getSnapshot();
      expect(initialSnapshot.count).toBe(0);

      // 3. First state change - count changes from 0 to 1
      // This SHOULD trigger a re-render because count is in dependencies
      listener.mockClear();
      act(() => {
        bloc.increment();
      });

      // ✓ Should trigger re-render on first change
      expect(listener).toHaveBeenCalledTimes(1);

      // Verify the state actually changed
      const newSnapshot = bridge.getSnapshot();
      expect(newSnapshot.count).toBe(1);

      bridge.dispose();
    });

    it('should NOT trigger re-render on first state change when dependency does NOT change', () => {
      const bridge = new ReactBridge(bloc, {
        dependencies: (state) => [state.count], // Only tracking count
      });

      const listener = vi.fn();

      bridge.subscribe(listener);
      bridge.getSnapshot();

      // Change name (not in dependencies)
      listener.mockClear();
      act(() => {
        bloc.setName('changed');
      });

      // Should NOT trigger because name is not in dependencies
      expect(listener).not.toHaveBeenCalled();

      bridge.dispose();
    });

    it('should trigger on first change with multiple dependencies', () => {
      const bridge = new ReactBridge(bloc, {
        dependencies: (state) => [state.count, state.name],
      });

      const listener = vi.fn();

      bridge.subscribe(listener);
      bridge.getSnapshot();

      // Change count - should trigger
      listener.mockClear();
      act(() => {
        bloc.increment();
      });
      expect(listener).toHaveBeenCalledTimes(1);

      // Change name - should also trigger
      listener.mockClear();
      act(() => {
        bloc.setName('changed');
      });
      expect(listener).toHaveBeenCalledTimes(1);

      bridge.dispose();
    });

    it('should continue working after first change', () => {
      const bridge = new ReactBridge(bloc, {
        dependencies: (state) => [state.count],
      });

      const listener = vi.fn();

      bridge.subscribe(listener);
      bridge.getSnapshot();

      // First change
      act(() => bloc.increment());
      expect(listener).toHaveBeenCalledTimes(1);

      // Second change
      listener.mockClear();
      act(() => bloc.increment());
      expect(listener).toHaveBeenCalledTimes(1);

      // Third change
      listener.mockClear();
      act(() => bloc.increment());
      expect(listener).toHaveBeenCalledTimes(1);

      bridge.dispose();
    });
  });

  describe('Proxy Tracking Mode', () => {
    it('should trigger re-render on first state change (baseline test)', () => {
      const bridge = new ReactBridge(bloc); // No dependencies = proxy mode

      const listener = vi.fn();

      // 1. Component mounts - subscribe
      bridge.subscribe(listener);

      // 2. Initial render - access count to track it
      const initialSnapshot = bridge.getSnapshot();
      expect(initialSnapshot.count).toBe(0);
      bridge.completeTracking();

      // 3. First state change - count changes from 0 to 1
      listener.mockClear();
      act(() => {
        bloc.increment();
      });

      // ✓ Should trigger (this already worked before the fix)
      expect(listener).toHaveBeenCalledTimes(1);

      bridge.dispose();
    });

    it('should NOT trigger on untracked property change', () => {
      const bridge = new ReactBridge(bloc);

      const listener = vi.fn();

      bridge.subscribe(listener);

      // Only access count
      const snapshot = bridge.getSnapshot();
      const _ = snapshot.count;
      bridge.completeTracking();

      // Change name (not tracked)
      listener.mockClear();
      act(() => {
        bloc.setName('changed');
      });

      // Should NOT trigger
      expect(listener).not.toHaveBeenCalled();

      bridge.dispose();
    });
  });

  describe('Consistency Between Modes', () => {
    it('both modes should behave the same for tracked properties', () => {
      // Proxy mode
      const proxyBridge = new ReactBridge(bloc);
      const proxyListener = vi.fn();
      proxyBridge.subscribe(proxyListener);
      const s1 = proxyBridge.getSnapshot();
      const _ = s1.count;
      proxyBridge.completeTracking();

      // Dependencies mode
      const bloc2 = new CounterBloc();
      const depBridge = new ReactBridge(bloc2, {
        dependencies: (state) => [state.count],
      });
      const depListener = vi.fn();
      depBridge.subscribe(depListener);
      depBridge.getSnapshot();

      // First change in both
      act(() => bloc.increment());
      act(() => bloc2.increment());

      // Both should trigger
      expect(proxyListener).toHaveBeenCalledTimes(1);
      expect(depListener).toHaveBeenCalledTimes(1);

      // Second change in both
      proxyListener.mockClear();
      depListener.mockClear();
      act(() => bloc.increment());
      act(() => bloc2.increment());

      // Both should trigger again
      expect(proxyListener).toHaveBeenCalledTimes(1);
      expect(depListener).toHaveBeenCalledTimes(1);

      proxyBridge.dispose();
      depBridge.dispose();
      bloc2.dispose();
    });
  });

  describe('Edge Cases', () => {
    it('should handle getSnapshot called multiple times before state change', () => {
      const bridge = new ReactBridge(bloc, {
        dependencies: (state) => [state.count],
      });

      const listener = vi.fn();
      bridge.subscribe(listener);

      // Call getSnapshot multiple times
      bridge.getSnapshot();
      bridge.getSnapshot();
      bridge.getSnapshot();

      // First change should still trigger
      act(() => bloc.increment());
      expect(listener).toHaveBeenCalledTimes(1);

      bridge.dispose();
    });

    it('should handle state change before getSnapshot (unusual but possible)', () => {
      const bridge = new ReactBridge(bloc, {
        dependencies: (state) => [state.count],
      });

      const listener = vi.fn();
      bridge.subscribe(listener);

      // Change state BEFORE getSnapshot (unusual order)
      act(() => bloc.increment());

      // This might or might not trigger depending on implementation
      // But it shouldn't crash
      const callCount1 = listener.mock.calls.length;

      // Now call getSnapshot
      bridge.getSnapshot();

      // Second change should definitely trigger
      listener.mockClear();
      act(() => bloc.increment());
      expect(listener).toHaveBeenCalledTimes(1);

      bridge.dispose();
    });

    it('should handle remount scenario correctly', () => {
      const bridge = new ReactBridge(bloc, {
        dependencies: (state) => [state.count],
      });

      // First mount
      const listener1 = vi.fn();
      const unsub1 = bridge.subscribe(listener1);
      bridge.getSnapshot();

      act(() => bloc.increment());
      expect(listener1).toHaveBeenCalledTimes(1);

      // Unmount
      unsub1();

      // Remount
      const listener2 = vi.fn();
      bridge.subscribe(listener2);
      bridge.getSnapshot();

      // Should trigger on first change after remount
      act(() => bloc.increment());
      expect(listener2).toHaveBeenCalledTimes(1);

      bridge.dispose();
    });
  });
});
