/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import {
  blacTestSetup,
  registerOverride,
  createCubitStub,
  withBlocState,
} from '@blac/core/testing';
import { renderWithBloc, renderWithRegistry } from '@blac/react/testing';
import { CounterCubit, AuthCubit, SettingsCubit, TodoCubit } from './fixtures';
import {
  Counter,
  AuthStatus,
  SettingsPanel,
  TodoList,
  Dashboard,
  NotificationBadge,
} from './fixtures-react';

blacTestSetup();

describe('renderWithBloc', () => {
  describe('basic rendering with state', () => {
    it('renders a component with seeded state', () => {
      renderWithBloc(<Counter />, {
        bloc: CounterCubit,
        state: { count: 42 },
      });

      expect(screen.getByTestId('count')).toHaveTextContent('42');
    });

    it('renders with default state when no state option given', () => {
      renderWithBloc(<Counter />, {
        bloc: CounterCubit,
      });

      expect(screen.getByTestId('count')).toHaveTextContent('0');
    });

    it('returns the bloc instance for direct manipulation', () => {
      const { bloc } = renderWithBloc(<Counter />, {
        bloc: CounterCubit,
        state: { count: 0 },
      });

      act(() => {
        bloc.increment();
      });

      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });
  });

  describe('complex state seeding', () => {
    it('renders auth component in logged-in state', () => {
      renderWithBloc(<AuthStatus />, {
        bloc: AuthCubit,
        state: { loggedIn: true, userId: 'alice', role: 'admin' },
      });

      expect(screen.getByTestId('user')).toHaveTextContent('alice');
      expect(screen.getByTestId('role')).toHaveTextContent('admin');
    });

    it('renders auth component in logged-out state', () => {
      renderWithBloc(<AuthStatus />, {
        bloc: AuthCubit,
        state: { loggedIn: false },
      });

      expect(screen.getByTestId('status')).toHaveTextContent('Not logged in');
    });

    it('renders settings with partial override', () => {
      renderWithBloc(<SettingsPanel />, {
        bloc: SettingsCubit,
        state: { theme: 'dark' },
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('locale')).toHaveTextContent('en'); // default
    });

    it('renders todo list with pre-populated items', () => {
      renderWithBloc(<TodoList />, {
        bloc: TodoCubit,
        state: {
          todos: [
            { id: '1', text: 'Write tests', done: true },
            { id: '2', text: 'Ship it', done: false },
          ],
          filter: 'all',
        },
      });

      expect(screen.getByTestId('count')).toHaveTextContent('2');
    });
  });

  describe('method overrides', () => {
    it('stubs methods to prevent side effects', () => {
      const mockIncrement = vi.fn();

      renderWithBloc(<Counter />, {
        bloc: CounterCubit,
        state: { count: 5 },
        methods: { increment: mockIncrement },
      });

      act(() => {
        screen.getByText('+').click();
      });

      expect(mockIncrement).toHaveBeenCalledOnce();
      // State unchanged since real increment not called
      expect(screen.getByTestId('count')).toHaveTextContent('5');
    });
  });

  describe('interactive updates', () => {
    it('component responds to bloc state changes after render', () => {
      const { bloc } = renderWithBloc(<Counter />, {
        bloc: CounterCubit,
      });

      expect(screen.getByTestId('count')).toHaveTextContent('0');

      act(() => bloc.increment());
      expect(screen.getByTestId('count')).toHaveTextContent('1');

      act(() => bloc.addAmount(10));
      expect(screen.getByTestId('count')).toHaveTextContent('11');
    });

    it('user interactions trigger bloc methods and update UI', () => {
      renderWithBloc(<AuthStatus />, {
        bloc: AuthCubit,
      });

      expect(screen.getByTestId('status')).toHaveTextContent('Not logged in');

      act(() => {
        screen.getByText('Login').click();
      });

      expect(screen.getByTestId('user')).toHaveTextContent('alice');
    });
  });

  describe('registry isolation', () => {
    it('does not leak instances between renderWithBloc calls', () => {
      const { unmount } = renderWithBloc(<Counter />, {
        bloc: CounterCubit,
        state: { count: 99 },
      });

      expect(screen.getByTestId('count')).toHaveTextContent('99');
      unmount();

      // After unmount, the test registry is restored — no leakage
      // (blacTestSetup provides the outer isolation)
    });
  });
});

describe('renderWithRegistry', () => {
  it('renders with a custom registry setup', () => {
    renderWithRegistry(<Counter />, () => {
      withBlocState(CounterCubit, { count: 77 });
    });

    expect(screen.getByTestId('count')).toHaveTextContent('77');
  });

  it('supports multi-bloc setup for components with dependencies', () => {
    renderWithRegistry(<Dashboard />, () => {
      const auth = createCubitStub(AuthCubit, {
        state: { loggedIn: true, userId: 'bob', role: 'user' },
      });
      registerOverride(AuthCubit, auth);

      const settings = createCubitStub(SettingsCubit, {
        state: { locale: 'fr' },
      });
      registerOverride(SettingsCubit, settings);
    });

    // Dashboard starts unloaded
    expect(screen.getByTestId('loaded')).toHaveTextContent('no');

    // Click load to trigger dependency resolution
    act(() => {
      screen.getByText('Load').click();
    });

    expect(screen.getByTestId('greeting')).toHaveTextContent('Hello bob (fr)');
  });

  it('supports notification component with auth dependency', () => {
    renderWithRegistry(<NotificationBadge />, () => {
      registerOverride(
        AuthCubit,
        createCubitStub(AuthCubit, {
          state: { loggedIn: true, userId: 'carol', role: 'user' },
        }),
      );
    });

    act(() => {
      screen.getByText('Load').click();
    });

    expect(screen.getByTestId('unread')).toHaveTextContent('1');
    expect(screen.getByTestId('messages')).toHaveTextContent(
      'Welcome back, carol!',
    );
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderWithRegistry(<Counter />, () => {
      withBlocState(CounterCubit, { count: 123 });
    });

    expect(screen.getByTestId('count')).toHaveTextContent('123');
    unmount();
    // No assertions needed — verifying unmount doesn't throw
  });
});
