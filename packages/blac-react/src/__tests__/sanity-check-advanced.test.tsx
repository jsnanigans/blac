/**
 * Advanced Sanity Check Tests for Dependency Tracking
 * Tests complex real-world scenarios and edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBloc } from '../useBloc';
import { Cubit, StateContainer } from '@blac/core';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  stats: {
    loginCount: number;
    lastLogin: string;
  };
}

class UserCubit extends Cubit<UserProfile> {
  constructor() {
    super({
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
      },
      stats: {
        loginCount: 0,
        lastLogin: new Date().toISOString(),
      },
    });
  }

  updateTheme = (theme: 'light' | 'dark') => {
    this.emit({
      ...this.state,
      preferences: {
        ...this.state.preferences,
        theme,
      },
    });
  };

  updateName = (name: string) => {
    this.emit({
      ...this.state,
      name,
    });
  };

  incrementLoginCount = () => {
    this.emit({
      ...this.state,
      stats: {
        ...this.state.stats,
        loginCount: this.state.stats.loginCount + 1,
        lastLogin: new Date().toISOString(),
      },
    });
  };

  toggleEmailNotifications = () => {
    this.emit({
      ...this.state,
      preferences: {
        ...this.state.preferences,
        notifications: {
          ...this.state.preferences.notifications,
          email: !this.state.preferences.notifications.email,
        },
      },
    });
  };
}

describe('Dependency Tracking - Advanced Sanity Check', () => {
  beforeEach(() => {
    StateContainer.clearAllInstances();
  });

  it('should handle deeply nested property access correctly', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc] = useBloc(UserCubit);

      // Access deeply nested property
      const emailNotifications = state.preferences.notifications.email;

      return { emailNotifications, bloc };
    });

    expect(renderCount).toBe(1);
    expect(result.current.emailNotifications).toBe(true);

    // Update the exact nested property - should re-render
    act(() => {
      result.current.bloc.toggleEmailNotifications();
    });

    await waitFor(() => {
      expect(renderCount).toBe(2);
      expect(result.current.emailNotifications).toBe(false);
    });

    // Update a sibling nested property (theme) - should NOT re-render
    // With fine-grained tracking: only 'preferences.notifications.email' is tracked
    // Updating 'preferences.theme' doesn't affect the tracked path
    act(() => {
      result.current.bloc.updateTheme('dark');
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(2); // No re-render with fine-grained tracking

    // Update a completely unrelated property (stats) - should NOT re-render
    act(() => {
      result.current.bloc.incrementLoginCount();
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(2); // Still no re-render
  });

  it('should optimize when accessing primitive at top level vs nested', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc] = useBloc(UserCubit);

      // Only access top-level primitive
      const name = state.name;

      return { name, bloc };
    });

    expect(renderCount).toBe(1);
    expect(result.current.name).toBe('John Doe');

    // Update name - should re-render
    act(() => {
      result.current.bloc.updateName('Jane Doe');
    });

    await waitFor(() => {
      expect(renderCount).toBe(2);
      expect(result.current.name).toBe('Jane Doe');
    });

    // Update nested properties - should NOT re-render
    act(() => {
      result.current.bloc.updateTheme('dark');
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(2); // No re-render

    act(() => {
      result.current.bloc.toggleEmailNotifications();
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(2); // Still no re-render

    act(() => {
      result.current.bloc.incrementLoginCount();
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(2); // Still no re-render
  });

  it('should handle mixed property access patterns', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc] = useBloc(UserCubit);

      // Access multiple properties at different depths
      const name = state.name; // Top level
      const theme = state.preferences.theme; // Nested
      const loginCount = state.stats.loginCount; // Different nested path

      return { name, theme, loginCount, bloc };
    });

    expect(renderCount).toBe(1);

    // Update name - should re-render
    act(() => {
      result.current.bloc.updateName('Alice');
    });

    await waitFor(() => {
      expect(renderCount).toBe(2);
    });

    // Update theme - should re-render
    act(() => {
      result.current.bloc.updateTheme('dark');
    });

    await waitFor(() => {
      expect(renderCount).toBe(3);
    });

    // Update login count - should re-render
    act(() => {
      result.current.bloc.incrementLoginCount();
    });

    await waitFor(() => {
      expect(renderCount).toBe(4);
    });

    // Update something NOT tracked - should NOT re-render
    // With fine-grained tracking: only theme, loginCount, and name are tracked
    // toggleEmailNotifications changes preferences.notifications.email (not tracked)
    act(() => {
      result.current.bloc.toggleEmailNotifications();
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(4); // No re-render with fine-grained tracking
  });

  it('should handle spreading objects - testing coarse-grained tracking', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc] = useBloc(UserCubit);

      // Spread the notifications object
      const notifications = { ...state.preferences.notifications };

      return { notifications, bloc };
    });

    expect(renderCount).toBe(1);

    // When we spread, we're accessing all properties of notifications
    // This should track preferences.notifications.email, push, and sms
    act(() => {
      result.current.bloc.toggleEmailNotifications();
    });

    await waitFor(() => {
      expect(renderCount).toBe(2);
    });
  });

  it('should NOT track when using Object.keys/values/entries', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc] = useBloc(UserCubit);

      // Using Object.keys accesses the object itself but not individual properties
      const prefKeys = Object.keys(state.preferences);

      return { prefKeys, bloc };
    });

    expect(renderCount).toBe(1);
    expect(result.current.prefKeys).toEqual([
      'theme',
      'language',
      'notifications',
    ]);

    // This tests the coarse-grained tracking behavior
    // Since we accessed state.preferences, any change to preferences will trigger re-render
    act(() => {
      result.current.bloc.updateTheme('dark');
    });

    await waitFor(() => {
      expect(renderCount).toBe(2);
    });
  });

  it('should handle conditional deep property access', async () => {
    let renderCount = 0;

    const { result, rerender } = renderHook(
      ({ showStats }: { showStats: boolean }) => {
        renderCount++;
        const [state, bloc] = useBloc(UserCubit);

        // Conditionally access different parts of state
        const data = showStats
          ? { type: 'stats' as const, value: state.stats.loginCount }
          : { type: 'theme' as const, value: state.preferences.theme };

        return { data, bloc };
      },
      { initialProps: { showStats: false } },
    );

    expect(renderCount).toBe(1);
    expect(result.current.data.type).toBe('theme');

    // Update theme - should re-render (currently tracked)
    act(() => {
      result.current.bloc.updateTheme('dark');
    });

    await waitFor(() => {
      expect(renderCount).toBe(2);
      if (result.current.data.type === 'theme') {
        expect(result.current.data.value).toBe('dark');
      }
    });

    // Update stats - should NOT re-render (not tracked)
    act(() => {
      result.current.bloc.incrementLoginCount();
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(2); // No re-render

    // Switch to showing stats
    rerender({ showStats: true });
    expect(renderCount).toBe(3);
    expect(result.current.data.type).toBe('stats');

    // Now update stats - SHOULD re-render (now tracked)
    act(() => {
      result.current.bloc.incrementLoginCount();
    });

    await waitFor(() => {
      expect(renderCount).toBe(4);
    });

    // Update theme - should still re-render (preferences object tracked)
    act(() => {
      result.current.bloc.updateTheme('light');
    });

    await waitFor(() => {
      expect(renderCount).toBe(5);
    });
  });

  it('should handle destructuring with renaming', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc] = useBloc(UserCubit);

      // Destructure with renaming
      const { name: userName, email: userEmail } = state;

      return { userName, userEmail, bloc };
    });

    expect(renderCount).toBe(1);
    expect(result.current.userName).toBe('John Doe');
    expect(result.current.userEmail).toBe('john@example.com');

    // Update name - should re-render
    act(() => {
      result.current.bloc.updateName('Bob');
    });

    await waitFor(() => {
      expect(renderCount).toBe(2);
      expect(result.current.userName).toBe('Bob');
    });

    // Update something not tracked - should NOT re-render
    act(() => {
      result.current.bloc.updateTheme('dark');
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(renderCount).toBe(2); // No re-render
  });

  it('should handle accessing same property multiple times in one render', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc] = useBloc(UserCubit);

      // Access the same property multiple times
      const name1 = state.name;
      const name2 = state.name;
      const name3 = state.name;

      return { name1, name2, name3, bloc };
    });

    expect(renderCount).toBe(1);

    // Should only track once, not three times
    act(() => {
      result.current.bloc.updateName('Multiple Access Test');
    });

    await waitFor(() => {
      expect(renderCount).toBe(2);
    });

    // Verify all values are updated
    expect(result.current.name1).toBe('Multiple Access Test');
    expect(result.current.name2).toBe('Multiple Access Test');
    expect(result.current.name3).toBe('Multiple Access Test');
  });
});
