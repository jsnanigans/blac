import { describe, it, expect, vi } from 'vitest';
import { ensure, hasInstance } from '@blac/core';
import {
  blacTestSetup,
  registerOverride,
  overrideEnsure,
  createCubitStub,
} from '@blac/test';
import {
  CounterCubit,
  AuthCubit,
  DashboardCubit,
  NotificationCubit,
} from './fixtures';

blacTestSetup();

describe('registerOverride', () => {
  it('makes ensure() return the provided instance', () => {
    const fake = new CounterCubit();
    fake.increment();
    fake.increment();

    registerOverride(CounterCubit, fake);

    const resolved = ensure(CounterCubit);
    expect(resolved).toBe(fake);
    expect(resolved.state.count).toBe(2);
  });

  it('replaces an existing instance in the registry', () => {
    // Create default instance first
    const original = ensure(CounterCubit);
    expect(original.state.count).toBe(0);

    // Override with a different instance
    const replacement = new CounterCubit();
    replacement.addAmount(42);
    registerOverride(CounterCubit, replacement);

    expect(ensure(CounterCubit)).toBe(replacement);
    expect(ensure(CounterCubit).state.count).toBe(42);
  });

  it('works with dependency resolution (this.depend)', () => {
    // Pre-register a fake AuthCubit before DashboardCubit resolves it
    const fakeAuth = new AuthCubit();
    fakeAuth.login('test-user', 'admin');
    registerOverride(AuthCubit, fakeAuth);

    // DashboardCubit.getAuth() calls ensure(AuthCubit), which now returns fakeAuth
    const dashboard = ensure(DashboardCubit);
    dashboard.loadDashboard();

    expect(dashboard.state.greeting).toContain('test-user');
    expect(dashboard.state.loaded).toBe(true);
  });

  it('supports keyed instances', () => {
    const instance1 = new CounterCubit();
    instance1.addAmount(10);

    const instance2 = new CounterCubit();
    instance2.addAmount(20);

    registerOverride(CounterCubit, instance1, 'first');
    registerOverride(CounterCubit, instance2, 'second');

    expect(ensure(CounterCubit, 'first').state.count).toBe(10);
    expect(ensure(CounterCubit, 'second').state.count).toBe(20);
  });

  it('works with createCubitStub', () => {
    const stub = createCubitStub(AuthCubit, {
      state: { loggedIn: true, userId: 'stub-user', role: 'admin' },
    });
    registerOverride(AuthCubit, stub);

    const resolved = ensure(AuthCubit);
    expect(resolved.state.loggedIn).toBe(true);
    expect(resolved.state.userId).toBe('stub-user');
    expect(resolved.state.role).toBe('admin');
  });

  it('override with stubbed methods intercepts calls', () => {
    const mockFetch = vi.fn();
    const stub = createCubitStub(NotificationCubit, {
      state: { messages: ['msg1'], unreadCount: 5 },
      methods: { loadNotifications: mockFetch },
    });
    registerOverride(NotificationCubit, stub);

    const resolved = ensure(NotificationCubit);
    resolved.loadNotifications();

    expect(mockFetch).toHaveBeenCalledOnce();
    // State unchanged because loadNotifications is stubbed
    expect(resolved.state.unreadCount).toBe(5);
  });
});

describe('overrideEnsure', () => {
  it('scopes the override to the callback', () => {
    const fake = new CounterCubit();
    fake.addAmount(99);

    const result = overrideEnsure(CounterCubit, fake, () => {
      const resolved = ensure(CounterCubit);
      expect(resolved).toBe(fake);
      return resolved.state.count;
    });

    expect(result).toBe(99);
    // Outside the scope, the override is gone
    expect(hasInstance(CounterCubit)).toBe(false);
  });

  it('does not leak into other tests', () => {
    expect(hasInstance(CounterCubit)).toBe(false);
  });
});
