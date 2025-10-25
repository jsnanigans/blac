/**
 * Debug test for Strict Mode issue
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { StateContainer, Cubit } from '@blac/core';
import { useBloc } from '../useBloc';
import { BlacLogger, LogLevel } from '@blac/core';

// Enable logging
BlacLogger.configure({
  enabled: true,
  level: LogLevel.DEBUG,
});

interface TestState {
  user: {
    name: string;
    email: string;
  };
  settings: {
    theme: string;
  };
}

class TestCubit extends Cubit<TestState> {
  constructor() {
    super({
      user: {
        name: 'John',
        email: 'john@example.com',
      },
      settings: {
        theme: 'light',
      },
    });
  }

  updateUserName = (name: string) => {
    console.log('\n========== updateUserName CALLED ==========');
    console.log('Current state:', this.state);
    this.update((state) => ({
      ...state,
      user: { ...state.user, name },
    }));
    console.log('New state:', this.state);
    console.log('===========================================\n');
  };

  updateTheme = (theme: string) => {
    console.log('\n========== updateTheme CALLED ==========');
    console.log('Current state:', this.state);
    this.update((state) => ({
      ...state,
      settings: { ...state.settings, theme },
    }));
    console.log('New state:', this.state);
    console.log('========================================\n');
  };
}

describe('Strict Mode Debug', () => {
  beforeEach(() => {
    StateContainer.clearAllInstances();
  });

  it('should work correctly in React Strict Mode', async () => {
    let renderCount = 0;

    console.log('\n🔴 ========== RENDERING IN STRICT MODE ==========\n');

    const { result } = renderHook(
      () => {
        renderCount++;
        console.log(`\n========== COMPONENT RENDER #${renderCount} ==========`);
        const [state, bloc] = useBloc(TestCubit);

        console.log('About to access state.user.name...');
        const name = state.user.name;
        console.log(`Accessed name: ${name}`);
        console.log('===================================================\n');

        return { name, bloc };
      },
      {
        wrapper: StrictMode,
      },
    );

    console.log('\n🔴 ========== RENDER COMPLETE ==========\n');

    expect(result.current.name).toBe('John');

    console.log('\n🔵 ========== UPDATING NAME ==========\n');

    act(() => {
      result.current.bloc.updateUserName('StrictModeTest');
    });

    console.log(
      '\n🔵 ========== UPDATE COMPLETE, WAITING FOR RE-RENDER ==========\n',
    );

    await waitFor(() => {
      console.log(`Current name in test: ${result.current.name}`);
      expect(result.current.name).toBe('StrictModeTest');
    });

    console.log('\n✅ ========== TEST PASSED ==========\n');
  });
});
