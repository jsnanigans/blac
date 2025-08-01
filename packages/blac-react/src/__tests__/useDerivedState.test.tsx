import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Cubit, Blac } from '@blac/core';
import useDerivedState, { useCombinedState } from '../useDerivedState';
import useBloc from '../useBloc';

// Test Cubits
interface UserState {
  id: number;
  name: string;
  email: string;
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
      email: 'john@example.com',
      preferences: {
        theme: 'light',
        notifications: true,
      },
    });
  }

  updateName = (name: string) => {
    this.emit({ ...this.state, name });
  };

  updateTheme = (theme: 'light' | 'dark') => {
    this.emit({
      ...this.state,
      preferences: { ...this.state.preferences, theme },
    });
  };

  updateNotifications = (notifications: boolean) => {
    this.emit({
      ...this.state,
      preferences: { ...this.state.preferences, notifications },
    });
  };
}

interface CartState {
  items: Array<{ id: number; name: string; price: number; quantity: number }>;
}

class CartCubit extends Cubit<CartState> {
  constructor() {
    super({ items: [] });
  }

  addItem = (item: CartState['items'][0]) => {
    this.emit({ items: [...this.state.items, item] });
  };

  updateQuantity = (id: number, quantity: number) => {
    this.emit({
      items: this.state.items.map((item) =>
        item.id === id ? { ...item, quantity } : item
      ),
    });
  };

  removeItem = (id: number) => {
    this.emit({
      items: this.state.items.filter((item) => item.id !== id),
    });
  };
}

describe('useDerivedState', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  describe('basic functionality', () => {
    it('should derive state with a selector', () => {
      const { result } = renderHook(() =>
        useDerivedState(UserCubit, (state) => state.name)
      );

      expect(result.current).toBe('John Doe');
    });

    it('should update when selected value changes', async () => {
      const { result } = renderHook(() =>
        useDerivedState(UserCubit, (state) => state.name)
      );

      expect(result.current).toBe('John Doe');

      const { result: userResult } = renderHook(() => {
        const [, cubit] = useBloc(UserCubit);
        return cubit;
      });

      act(() => {
        userResult.current.updateName('Jane Smith');
      });

      await waitFor(() => expect(result.current).toBe('Jane Smith'));
    });

    it('should not update when non-selected values change', async () => {
      let selectorCallCount = 0;
      const { result } = renderHook(() =>
        useDerivedState(UserCubit, (state) => {
          selectorCallCount++;
          return state.preferences.theme;
        })
      );

      expect(result.current).toBe('light');
      const initialCallCount = selectorCallCount;

      const { result: userResult } = renderHook(() => {
        const [, cubit] = useBloc(UserCubit);
        return cubit;
      });

      act(() => {
        userResult.current.updateName('Jane Smith');
      });

      // Wait a bit to ensure no updates happen
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Theme didn't change, so derived state shouldn't update
      expect(result.current).toBe('light');
      // Selector might be called for comparison, but shouldn't trigger re-render
    });
  });

  describe('complex selectors', () => {
    it('should work with computed values', async () => {
      const { result } = renderHook(() =>
        useDerivedState(
          CartCubit,
          (state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
        )
      );

      expect(result.current).toBe(0);

      const { result: cartResult } = renderHook(() => {
        const [, cubit] = useBloc(CartCubit);
        return cubit;
      });

      act(() => {
        cartResult.current.addItem({ id: 1, name: 'Item 1', price: 10, quantity: 2 });
      });

      await waitFor(() => expect(result.current).toBe(20));

      act(() => {
        cartResult.current.addItem({ id: 2, name: 'Item 2', price: 5, quantity: 3 });
      });

      await waitFor(() => expect(result.current).toBe(35));
    });

    it('should work with array transformations', async () => {
      const { result } = renderHook(() =>
        useDerivedState(
          CartCubit,
          (state) => state.items.map((item) => item.name)
        )
      );

      expect(result.current).toEqual([]);

      const { result: cartResult } = renderHook(() => {
        const [, cubit] = useBloc(CartCubit);
        return cubit;
      });

      act(() => {
        cartResult.current.addItem({ id: 1, name: 'Apple', price: 1, quantity: 5 });
        cartResult.current.addItem({ id: 2, name: 'Banana', price: 2, quantity: 3 });
      });

      await waitFor(() => expect(result.current).toEqual(['Apple', 'Banana']));
    });
  });

  describe('memoization', () => {
    it('should memoize expensive computations when enabled', async () => {
      let computationCount = 0;
      const expensiveSelector = (state: CartState) => {
        computationCount++;
        // Simulate expensive computation
        return state.items.reduce((sum, item) => {
          for (let i = 0; i < 1000; i++) {
            sum += item.price * item.quantity;
          }
          return sum / 1000;
        }, 0);
      };

      const { result } = renderHook(() =>
        useDerivedState(CartCubit, expensiveSelector, { memoize: true })
      );

      const initialCount = computationCount;

      const { result: cartResult } = renderHook(() => {
        const [, cubit] = useBloc(CartCubit);
        return cubit;
      });

      // Emit the same state multiple times
      act(() => {
        const currentState = cartResult.current.state;
        cartResult.current.emit(currentState);
        cartResult.current.emit(currentState);
      });

      // With memoization, computation should only happen once per unique state
      expect(computationCount).toBe(initialCount);
    });
  });

  describe('custom equality', () => {
    it('should use custom equality function when provided', async () => {
      const { result, rerender } = renderHook(() =>
        useDerivedState(
          CartCubit,
          (state) => state.items,
          {
            isEqual: (a, b) => a.length === b.length,
          }
        )
      );

      const { result: cartResult } = renderHook(() => {
        const [, cubit] = useBloc(CartCubit);
        return cubit;
      });

      const initialItems = result.current;

      act(() => {
        cartResult.current.addItem({ id: 1, name: 'Item 1', price: 10, quantity: 1 });
      });

      await waitFor(() => expect(result.current).not.toBe(initialItems));
      const afterFirstAdd = result.current;

      // Update quantity - array length stays the same
      act(() => {
        cartResult.current.updateQuantity(1, 5);
      });

      // Wait a bit to ensure state processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should be the same reference due to custom equality
      expect(result.current).toBe(afterFirstAdd);
    });
  });

  describe('cleanup', () => {
    it('should stop listening on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useDerivedState(UserCubit, (state) => state.name)
      );

      expect(result.current).toBe('John Doe');

      unmount();

      const { result: userResult } = renderHook(() => {
        const [, cubit] = useBloc(UserCubit);
        return cubit;
      });

      act(() => {
        userResult.current.updateName('Should not update');
      });

      // Result should still be the old value
      expect(result.current).toBe('John Doe');
    });
  });
});

describe('useCombinedState', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  it('should combine multiple bloc states', () => {
    const { result } = renderHook(() =>
      useCombinedState(
        {
          user: UserCubit,
          cart: CartCubit,
        },
        ({ user, cart }) => ({
          userName: user.name,
          itemCount: cart.items.length,
          theme: user.preferences.theme,
        })
      )
    );

    expect(result.current).toEqual({
      userName: 'John Doe',
      itemCount: 0,
      theme: 'light',
    });
  });

  it('should update when any bloc state changes', async () => {
    const { result } = renderHook(() =>
      useCombinedState(
        {
          user: UserCubit,
          cart: CartCubit,
        },
        ({ user, cart }) => ({
          userName: user.name,
          cartTotal: cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        })
      )
    );

    const { result: userResult } = renderHook(() => {
      const [, cubit] = useBloc(UserCubit);
      return cubit;
    });

    const { result: cartResult } = renderHook(() => {
      const [, cubit] = useBloc(CartCubit);
      return cubit;
    });

    act(() => {
      userResult.current.updateName('Jane Smith');
    });

    await waitFor(() => expect(result.current.userName).toBe('Jane Smith'));

    act(() => {
      cartResult.current.addItem({ id: 1, name: 'Item', price: 10, quantity: 2 });
    });

    await waitFor(() => expect(result.current.cartTotal).toBe(20));
  });

  it('should support custom equality for combined states', async () => {
    const { result } = renderHook(() =>
      useCombinedState(
        {
          user: UserCubit,
          cart: CartCubit,
        },
        ({ user, cart }) => ({
          theme: user.preferences.theme,
          hasItems: cart.items.length > 0,
        }),
        {
          isEqual: (a, b) => a.theme === b.theme && a.hasItems === b.hasItems,
        }
      )
    );

    const initialResult = result.current;

    const { result: userResult } = renderHook(() => {
      const [, cubit] = useBloc(UserCubit);
      return cubit;
    });

    // Change something that doesn't affect our derived state
    act(() => {
      userResult.current.updateName('Different Name');
    });

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should be the same reference
    expect(result.current).toBe(initialResult);
  });
});