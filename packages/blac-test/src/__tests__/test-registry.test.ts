import { describe, it, expect, afterEach } from 'vitest';
import {
  ensure,
  acquire,
  hasInstance,
  clearAll,
  getRegistry,
} from '@blac/core';
import {
  createTestRegistry,
  withTestRegistry,
  blacTestSetup,
} from '@blac/test';
import { CounterCubit, AuthCubit, SettingsCubit } from './fixtures';

afterEach(() => {
  clearAll();
});

describe('createTestRegistry', () => {
  it('returns a fresh empty registry', () => {
    const registry = createTestRegistry();
    expect(registry.getStats().totalInstances).toBe(0);
    expect(registry.getStats().registeredTypes).toBe(0);
  });

  it('creates independent registries each time', () => {
    const r1 = createTestRegistry();
    const r2 = createTestRegistry();
    expect(r1).not.toBe(r2);
  });
});

describe('withTestRegistry', () => {
  it('provides an isolated registry for the callback', () => {
    // Create an instance in the global registry
    ensure(CounterCubit);
    expect(hasInstance(CounterCubit)).toBe(true);

    withTestRegistry((registry) => {
      // Inside the test registry: no instances from the outer scope
      expect(hasInstance(CounterCubit)).toBe(false);
      expect(registry.getStats().totalInstances).toBe(0);
    });

    // After: global registry restored, original instance still there
    expect(hasInstance(CounterCubit)).toBe(true);
  });

  it('isolates state mutations between scopes', () => {
    const outerCubit = ensure(CounterCubit);

    withTestRegistry(() => {
      const innerCubit = ensure(CounterCubit);
      innerCubit.increment();
      expect(innerCubit.state.count).toBe(1);
      // Inner cubit is a different instance
      expect(innerCubit).not.toBe(outerCubit);
    });

    // Outer cubit unaffected
    expect(outerCubit.state.count).toBe(0);
  });

  it('restores the previous registry on error', () => {
    const previousRegistry = getRegistry();

    expect(() => {
      withTestRegistry(() => {
        throw new Error('boom');
      });
    }).toThrow('boom');

    expect(getRegistry()).toBe(previousRegistry);
  });

  it('restores the previous registry after async callback', async () => {
    const previousRegistry = getRegistry();

    await withTestRegistry(async () => {
      ensure(CounterCubit);
      await new Promise((r) => setTimeout(r, 5));
      expect(hasInstance(CounterCubit)).toBe(true);
    });

    expect(getRegistry()).toBe(previousRegistry);
  });

  it('restores the previous registry on async rejection', async () => {
    const previousRegistry = getRegistry();

    await expect(
      withTestRegistry(async () => {
        await new Promise((r) => setTimeout(r, 5));
        throw new Error('async boom');
      }),
    ).rejects.toThrow('async boom');

    expect(getRegistry()).toBe(previousRegistry);
  });

  it('can be nested for deeply scoped tests', () => {
    ensure(CounterCubit);

    withTestRegistry(() => {
      ensure(AuthCubit);
      expect(hasInstance(CounterCubit)).toBe(false);
      expect(hasInstance(AuthCubit)).toBe(true);

      withTestRegistry(() => {
        expect(hasInstance(CounterCubit)).toBe(false);
        expect(hasInstance(AuthCubit)).toBe(false);
        ensure(SettingsCubit);
        expect(hasInstance(SettingsCubit)).toBe(true);
      });

      // Inner scope cleaned up
      expect(hasInstance(SettingsCubit)).toBe(false);
      // Middle scope preserved
      expect(hasInstance(AuthCubit)).toBe(true);
    });

    // Outer scope preserved
    expect(hasInstance(CounterCubit)).toBe(true);
    expect(hasInstance(AuthCubit)).toBe(false);
  });
});

describe('blacTestSetup', () => {
  // blacTestSetup installs beforeEach/afterEach hooks that isolate the registry.
  // We demonstrate by running tests that would otherwise leak state.
  blacTestSetup();

  it('starts with an empty registry (test 1)', () => {
    expect(hasInstance(CounterCubit)).toBe(false);
    ensure(CounterCubit);
    ensure(CounterCubit).increment();
    expect(ensure(CounterCubit).state.count).toBe(1);
  });

  it('starts with an empty registry (test 2 — no leakage from test 1)', () => {
    expect(hasInstance(CounterCubit)).toBe(false);
    // If blacTestSetup works, the counter from test 1 doesn't exist here
    const cubit = ensure(CounterCubit);
    expect(cubit.state.count).toBe(0);
  });

  it('isolates acquire/release lifecycle', () => {
    const cubit = acquire(CounterCubit);
    expect(hasInstance(CounterCubit)).toBe(true);
    // Even without explicit release, blacTestSetup cleans up
  });

  it('does not see instances from the previous test', () => {
    expect(hasInstance(CounterCubit)).toBe(false);
  });
});
