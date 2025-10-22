/**
 * Tests for useStateContainer hook
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { StateContainer } from '../../../../blac/src/v2/core/StateContainer';
import { useStateContainer } from '../useStateContainer';

// Test implementation
class CounterContainer extends StateContainer<number> {
  constructor(initialCount: number = 0) {
    super(initialCount);
  }

  increment = () => {
    this.update(state => state + 1);
  };

  decrement = () => {
    this.update(state => state - 1);
  };

  set = (value: number) => {
    this.update(() => value);
  };
}

class UserContainer extends StateContainer<{ name: string; age: number }> {
  constructor() {
    super({ name: 'Alice', age: 30 });
  }

  setName = (name: string) => {
    this.update(state => ({ ...state, name }));
  };

  setAge = (age: number) => {
    this.update(state => ({ ...state, age }));
  };
}

describe('useStateContainer', () => {
  describe('Basic Subscription', () => {
    it('should return current state', () => {
      const container = new CounterContainer(5);
      const { result } = renderHook(() => useStateContainer(container));

      expect(result.current).toBe(5);
    });

    it('should update when state changes', async () => {
      const container = new CounterContainer(0);
      const { result } = renderHook(() => useStateContainer(container));

      expect(result.current).toBe(0);

      act(() => {
        container.increment();
      });

      await waitFor(() => {
        expect(result.current).toBe(1);
      });
    });

    it('should handle multiple state updates', async () => {
      const container = new CounterContainer(0);
      const { result } = renderHook(() => useStateContainer(container));

      act(() => {
        container.increment();
        container.increment();
        container.increment();
      });

      await waitFor(() => {
        expect(result.current).toBe(3);
      });
    });

    it('should work with complex state', async () => {
      const container = new UserContainer();
      const { result } = renderHook(() => useStateContainer(container));

      expect(result.current).toEqual({ name: 'Alice', age: 30 });

      act(() => {
        container.setName('Bob');
      });

      await waitFor(() => {
        expect(result.current.name).toBe('Bob');
        expect(result.current.age).toBe(30);
      });
    });
  });


  describe('Lifecycle Callbacks', () => {
    it('should call onMount when component mounts', () => {
      const container = new CounterContainer();
      const onMount = vi.fn();

      renderHook(() =>
        useStateContainer(container, {
          onMount,
        })
      );

      expect(onMount).toHaveBeenCalledTimes(1);
      expect(onMount).toHaveBeenCalledWith(container);
    });

    it('should call onUnmount when component unmounts', () => {
      const container = new CounterContainer();
      const onUnmount = vi.fn();

      const { unmount } = renderHook(() =>
        useStateContainer(container, {
          onUnmount,
        })
      );

      expect(onUnmount).not.toHaveBeenCalled();

      unmount();

      expect(onUnmount).toHaveBeenCalledTimes(1);
      expect(onUnmount).toHaveBeenCalledWith(container);
    });

    it('should support initialization in onMount', async () => {
      const container = new CounterContainer(0);

      const { result } = renderHook(() =>
        useStateContainer(container, {
          onMount: (c) => (c as CounterContainer).set(100),
        })
      );

      await waitFor(() => {
        expect(result.current).toBe(100);
      });
    });
  });

  describe('React Strict Mode Compatibility', () => {
    it('should handle strict mode double mounting', () => {
      const container = new CounterContainer();
      const onMount = vi.fn();
      const onUnmount = vi.fn();

      const { unmount, rerender } = renderHook(() =>
        useStateContainer(container, {
          onMount,
          onUnmount,
        })
      );

      // In strict mode, React mounts, unmounts, then remounts
      // Our implementation should handle this gracefully

      rerender();
      unmount();

      // Verify callbacks were called
      expect(onMount).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on unmount', async () => {
      const container = new CounterContainer(0);
      const { result, unmount } = renderHook(() => useStateContainer(container));

      expect(result.current).toBe(0);

      unmount();

      // Change state after unmount
      act(() => {
        container.increment();
      });

      // Component should not update
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(result.current).toBe(0);
    });

    it('should clean up subscriptions properly', async () => {
      const container = new CounterContainer(0);

      const { unmount } = renderHook(() => useStateContainer(container));

      // Check initial subscription count
      const initialCount = container.getConsumerCount();
      expect(initialCount).toBe(1);

      unmount();

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should have no subscriptions
      expect(container.getConsumerCount()).toBe(0);
    });
  });

  describe('Multiple Components', () => {
    it('should share state between multiple components', async () => {
      const container = new CounterContainer(0);

      const { result: result1 } = renderHook(() => useStateContainer(container));
      const { result: result2 } = renderHook(() => useStateContainer(container));

      expect(result1.current).toBe(0);
      expect(result2.current).toBe(0);

      act(() => {
        container.increment();
      });

      await waitFor(() => {
        expect(result1.current).toBe(1);
        expect(result2.current).toBe(1);
      });
    });

    it('should track multiple subscriptions', () => {
      const container = new CounterContainer(0);

      const { unmount: unmount1 } = renderHook(() => useStateContainer(container));
      const { unmount: unmount2 } = renderHook(() => useStateContainer(container));
      const { unmount: unmount3 } = renderHook(() => useStateContainer(container));

      expect(container.getConsumerCount()).toBe(3);

      unmount1();
      expect(container.getConsumerCount()).toBe(2);

      unmount2();
      expect(container.getConsumerCount()).toBe(1);

      unmount3();
      expect(container.getConsumerCount()).toBe(0);
    });
  });
});
