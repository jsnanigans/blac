import { describe, it, expect, vi } from 'vitest';
import { ensure, hasInstance, acquire, release } from '@blac/core';
import {
  blacTestSetup,
  withTestRegistry,
  registerOverride,
  createCubitStub,
  withBlocState,
  withBlocMethod,
} from '@blac/core/testing';
import {
  CounterCubit,
  AuthCubit,
  SettingsCubit,
  DashboardCubit,
  NotificationCubit,
  TodoCubit,
} from './fixtures';

blacTestSetup();

describe('integration: dependency graph testing', () => {
  it('tests DashboardCubit with all dependencies overridden', () => {
    // Arrange: set up the dependency graph
    registerOverride(
      AuthCubit,
      createCubitStub(AuthCubit, {
        state: { loggedIn: true, userId: 'integration-user', role: 'admin' },
      }),
    );
    registerOverride(
      SettingsCubit,
      createCubitStub(SettingsCubit, {
        state: { theme: 'dark', locale: 'de', notifications: false },
      }),
    );

    // Act
    const dashboard = ensure(DashboardCubit);
    dashboard.loadDashboard();

    // Assert
    expect(dashboard.state.loaded).toBe(true);
    expect(dashboard.state.greeting).toBe('Hello integration-user (de)');
  });

  it('tests NotificationCubit with authenticated user', () => {
    registerOverride(
      AuthCubit,
      createCubitStub(AuthCubit, {
        state: { loggedIn: true, userId: 'notif-user', role: 'user' },
      }),
    );

    const notifs = ensure(NotificationCubit);
    notifs.loadNotifications();

    expect(notifs.state.messages).toEqual(['Welcome back, notif-user!']);
    expect(notifs.state.unreadCount).toBe(1);
  });

  it('tests NotificationCubit with unauthenticated user', () => {
    // AuthCubit defaults to logged out — no override needed
    const notifs = ensure(NotificationCubit);
    notifs.loadNotifications();

    expect(notifs.state.messages).toEqual([]);
    expect(notifs.state.unreadCount).toBe(0);
  });
});

describe('integration: mixed helpers workflow', () => {
  it('combines withBlocState and withBlocMethod for focused testing', () => {
    // Seed auth state
    withBlocState(AuthCubit, { loggedIn: true, userId: 'workflow-user' });

    // Override a method to track calls
    const loadSpy = vi.fn();
    withBlocMethod(NotificationCubit, 'loadNotifications', loadSpy);

    // The cubit exists with mocked method
    const notifs = ensure(NotificationCubit);
    notifs.loadNotifications();
    expect(loadSpy).toHaveBeenCalledOnce();
  });

  it('uses withTestRegistry for a one-off isolated assertion', () => {
    // Set up some state in the test's main registry
    withBlocState(CounterCubit, { count: 50 });

    // Temporarily test something in complete isolation
    withTestRegistry(() => {
      const fresh = ensure(CounterCubit);
      expect(fresh.state.count).toBe(0);
      fresh.addAmount(999);
      expect(fresh.state.count).toBe(999);
    });

    // Original state is untouched
    expect(ensure(CounterCubit).state.count).toBe(50);
  });
});

describe('integration: subscription and lifecycle', () => {
  it('stubs respond to subscribe/emit like real cubits', () => {
    const stub = createCubitStub(CounterCubit, { state: { count: 10 } });
    registerOverride(CounterCubit, stub);

    const listener = vi.fn();
    const cubit = ensure(CounterCubit);
    cubit.subscribe(listener);

    cubit.increment();

    expect(listener).toHaveBeenCalledOnce();
    expect(cubit.state.count).toBe(11);
  });

  it('stubs with mocked methods still support subscription for other mutations', () => {
    const stub = createCubitStub(CounterCubit, {
      state: { count: 0 },
      methods: { increment: vi.fn() },
    });
    registerOverride(CounterCubit, stub);

    const listener = vi.fn();
    const cubit = ensure(CounterCubit);
    cubit.subscribe(listener);

    // Mocked method — no state change, no notification
    cubit.increment();
    expect(listener).not.toHaveBeenCalled();

    // Real method — state changes, listener notified
    cubit.decrement();
    expect(listener).toHaveBeenCalledOnce();
    expect(cubit.state.count).toBe(-1);
  });
});

describe('integration: ref counting with overrides', () => {
  it('overridden instances work with acquire/release', () => {
    const stub = createCubitStub(CounterCubit, { state: { count: 7 } });
    registerOverride(CounterCubit, stub);

    // acquire should return the overridden instance
    const acquired = acquire(CounterCubit);
    expect(acquired).toBe(stub);
    expect(acquired.state.count).toBe(7);

    // release should work without errors
    release(CounterCubit);
  });
});

describe('integration: complex todo workflow', () => {
  it('tests todo operations with pre-seeded state', () => {
    withBlocState(TodoCubit, {
      todos: [{ id: 'existing-1', text: 'Existing task', done: false }],
      filter: 'all',
    });

    const todo = ensure(TodoCubit);
    expect(todo.state.todos).toHaveLength(1);
    expect(todo.activeTodos).toHaveLength(1);
    expect(todo.completedTodos).toHaveLength(0);

    // Add a new todo
    todo.addTodo('New task');
    expect(todo.state.todos).toHaveLength(2);

    // Toggle the existing task
    todo.toggleTodo('existing-1');
    expect(todo.completedTodos).toHaveLength(1);
    expect(todo.activeTodos).toHaveLength(1);

    // Change filter
    todo.setFilter('completed');
    expect(todo.state.filter).toBe('completed');
  });
});
