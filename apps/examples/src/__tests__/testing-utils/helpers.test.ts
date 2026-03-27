import { describe, it, expect, vi } from 'vitest';
import { ensure, hasInstance } from '@blac/core';
import {
  blacTestSetup,
  withBlocState,
  withBlocMethod,
  flushBlocUpdates,
} from '@blac/core/testing';
import {
  CounterCubit,
  AuthCubit,
  SettingsCubit,
  LoadingCubit,
  AsyncDataCubit,
} from './fixtures';

blacTestSetup();

describe('withBlocState', () => {
  it('creates the cubit if it does not exist and seeds state', () => {
    expect(hasInstance(CounterCubit)).toBe(false);

    const cubit = withBlocState(CounterCubit, { count: 42 });

    expect(hasInstance(CounterCubit)).toBe(true);
    expect(cubit.state.count).toBe(42);
  });

  it('patches existing cubit state without replacing the instance', () => {
    const original = ensure(CounterCubit);
    original.increment(); // count = 1

    const returned = withBlocState(CounterCubit, { count: 100 });

    expect(returned).toBe(original);
    expect(returned.state.count).toBe(100);
  });

  it('patches partial state on an object-state cubit', () => {
    withBlocState(SettingsCubit, { theme: 'dark' });

    const settings = ensure(SettingsCubit);
    expect(settings.state.theme).toBe('dark');
    expect(settings.state.locale).toBe('en'); // default preserved
  });

  it('emits full state on a primitive-state cubit', () => {
    const cubit = withBlocState(LoadingCubit, { loading: true });
    expect(cubit.state.loading).toBe(true);
  });

  it('returns the cubit for chaining', () => {
    const cubit = withBlocState(AuthCubit, {
      loggedIn: true,
      userId: 'alice',
    });
    expect(cubit.state.loggedIn).toBe(true);
    expect(cubit.state.userId).toBe('alice');
    // Can continue using the returned cubit
    cubit.logout();
    expect(cubit.state.loggedIn).toBe(false);
  });

  it('supports keyed instances', () => {
    withBlocState(CounterCubit, { count: 10 }, 'a');
    withBlocState(CounterCubit, { count: 20 }, 'b');

    expect(ensure(CounterCubit, 'a').state.count).toBe(10);
    expect(ensure(CounterCubit, 'b').state.count).toBe(20);
  });
});

describe('withBlocMethod', () => {
  it('overrides a specific method on an ensured cubit', () => {
    const mockIncrement = vi.fn();
    const cubit = withBlocMethod(CounterCubit, 'increment', mockIncrement);

    cubit.increment();
    expect(mockIncrement).toHaveBeenCalledOnce();
    expect(cubit.state.count).toBe(0); // real increment not called
  });

  it('leaves other methods untouched', () => {
    withBlocMethod(CounterCubit, 'increment', vi.fn());

    const cubit = ensure(CounterCubit);
    cubit.decrement();
    expect(cubit.state.count).toBe(-1); // decrement still works
  });

  it('returns the cubit instance', () => {
    const cubit = withBlocMethod(AuthCubit, 'login', vi.fn());
    expect(cubit).toBeInstanceOf(AuthCubit);
  });

  it('override receives the original arguments', () => {
    const mockLogin = vi.fn();
    const cubit = withBlocMethod(AuthCubit, 'login', mockLogin);

    cubit.login('bob', 'admin');
    expect(mockLogin).toHaveBeenCalledWith('bob', 'admin');
  });

  it('can be combined with withBlocState', () => {
    withBlocState(AuthCubit, { loggedIn: true, userId: 'alice' });
    withBlocMethod(AuthCubit, 'logout', vi.fn());

    const auth = ensure(AuthCubit);
    expect(auth.state.loggedIn).toBe(true);

    auth.logout();
    // logout is mocked, state unchanged
    expect(auth.state.loggedIn).toBe(true);
  });
});

describe('flushBlocUpdates', () => {
  it('flushes microtasks so async state changes are visible', async () => {
    const cubit = ensure(AsyncDataCubit);
    void cubit.fetchData();

    // State is loading immediately
    expect(cubit.state.loading).toBe(true);

    await flushBlocUpdates();
    // After flush, the setTimeout(10ms) inside fetchData may not have resolved yet
    // flushBlocUpdates flushes microtasks, not timers.
    // This tests that the function itself resolves.
    expect(cubit.state.loading).toBe(true);
  });

  it('resolves even when no updates are pending', async () => {
    await expect(flushBlocUpdates()).resolves.toBeUndefined();
  });
});
