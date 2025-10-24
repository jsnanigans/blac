/**
 * Debug test to investigate subscription issues with logging enabled
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBloc, clearAllBlocInstances } from '../useBloc';
import { Cubit } from '@blac/core';
import { BlacLogger, LogLevel } from '@blac/core';

// Enable logging
BlacLogger.configure({
  enabled: true,
  level: LogLevel.DEBUG,
  output: (entry) => {
    console.log(
      `[${entry.level}] [${entry.context}] ${entry.message}`,
      entry.data || '',
    );
  },
});

// Test state shape - same as failing test
interface TestState {
  user: {
    name: string;
    age: number;
    profile: {
      bio: string;
      avatar: string;
    };
  };
  settings: {
    theme: string;
    notifications: boolean;
  };
  counters: {
    views: number;
    likes: number;
  };
}

// Test Cubit - same as failing test
class TestCubit extends Cubit<TestState> {
  constructor() {
    super({
      user: {
        name: 'John',
        age: 30,
        profile: {
          bio: 'Developer',
          avatar: 'avatar.jpg',
        },
      },
      settings: {
        theme: 'light',
        notifications: true,
      },
      counters: {
        views: 0,
        likes: 0,
      },
    });
  }

  updateUserName = (name: string) => {
    console.log('[TestCubit] updateUserName called with:', name);
    this.emit({
      ...this.state,
      user: {
        ...this.state.user,
        name,
      },
    });
    console.log('[TestCubit] updateUserName completed');
  };

  updateTheme = (theme: string) => {
    console.log('[TestCubit] updateTheme called with:', theme);
    this.emit({
      ...this.state,
      settings: {
        ...this.state.settings,
        theme,
      },
    });
    console.log('[TestCubit] updateTheme completed');
  };
}

describe('Debug Logging Test', () => {
  beforeEach(() => {
    clearAllBlocInstances();
  });

  it('should log subscription and re-render flow', async () => {
    console.log('=== TEST START ===');
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      console.log(`[Component] Render #${renderCount} START`);
      const [state, bloc] = useBloc(TestCubit);

      // Only access user.name
      const name = state.user.name;
      console.log(`[Component] Accessed name: ${name}`);
      console.log(`[Component] Render #${renderCount} END`);

      return { name, bloc };
    });

    console.log('=== INITIAL RENDER COMPLETE, renderCount:', renderCount);
    expect(renderCount).toBe(1);
    expect(result.current.name).toBe('John');

    // Wait for proxy tracking to complete
    await new Promise((resolve) => setTimeout(resolve, 10));
    console.log('=== AFTER MICROTASKS, renderCount:', renderCount);

    console.log('=== CALLING updateUserName ===');
    act(() => {
      result.current.bloc.updateUserName('Jane');
    });
    console.log('=== AFTER updateUserName act(), renderCount:', renderCount);

    // Wait for re-render
    await waitFor(
      () => {
        console.log('=== WAITFOR CHECK, renderCount:', renderCount);
        expect(renderCount).toBe(2);
      },
      { timeout: 2000 },
    );

    expect(result.current.name).toBe('Jane');
    console.log('=== TEST COMPLETE ===');
  });
});
