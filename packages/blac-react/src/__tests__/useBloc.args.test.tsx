/**
 * Tests for useBloc args option — typed construction/identity data
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vite-plus/test';
import { renderHook } from '@testing-library/react';
import { Cubit, borrow } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

blacTestSetup();

// A bloc that declares Args — init seeds state from args.
class UserCard extends Cubit<{ id: string | null }, { userId: string }> {
  constructor() {
    super({ id: null });
  }

  protected init(a: { userId: string }) {
    this.emit({ id: a.userId });
  }
}

// A void-args bloc (no Args generic) for the forbidden-args type test.
class SimpleCounter extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

describe('useBloc args option', () => {
  it('seeds state from args on mount', () => {
    const { result } = renderHook(() =>
      useBloc(UserCard, { args: { userId: 'alice' } }),
    );
    expect(result.current[0].id).toBe('alice');
  });

  it('different args produce different instances (re-resolves on args change)', () => {
    const { rerender, result } = renderHook(
      ({ u }: { u: string }) => useBloc(UserCard, { args: { userId: u } }),
      { initialProps: { u: 'a' } },
    );

    expect(result.current[0].id).toBe('a');

    rerender({ u: 'b' });

    // After rerender with a different userId, a new instance is resolved
    // and init runs with the new args — state reflects 'b'.
    expect(result.current[0].id).toBe('b');
  });

  it('same args across two consumers share one instance', () => {
    const { result: r1 } = renderHook(() =>
      useBloc(UserCard, { args: { userId: 'shared-user' } }),
    );
    const { result: r2 } = renderHook(() =>
      useBloc(UserCard, { args: { userId: 'shared-user' } }),
    );

    // Both consumers see the same state.
    expect(r1.current[0].id).toBe('shared-user');
    expect(r2.current[0].id).toBe('shared-user');

    // Underlying state objects are equal (same instance).
    expect(r1.current[0]).toEqual(r2.current[0]);

    // Verify via borrow using args.
    const raw = borrow(UserCard, { args: { userId: 'shared-user' } });
    expect(raw).not.toBeNull();
    expect(raw.state.id).toBe('shared-user');
  });

  it('args-only: instance keyed by args reaches init', () => {
    const { result } = renderHook(() =>
      useBloc(UserCard, {
        args: { userId: 'carol' },
      }),
    );
    expect(result.current[0].id).toBe('carol');
  });

  it('disposes the args-keyed instance on unmount (no leak)', () => {
    const args = { userId: 'leaky' };

    const { unmount } = renderHook(() => useBloc(UserCard, { args }));
    // Instance exists while mounted.
    expect(borrow(UserCard, { args })).not.toBeNull();

    unmount();

    // After unmount the ref must be dropped and the instance disposed.
    // Before the fix, release looked up 'default' instead of the args key,
    // so the instance lingered here forever.
    expect(() => borrow(UserCard, { args })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Compile-time type tests (verified by `tsc --noEmit`)
// ---------------------------------------------------------------------------

import type { UseBlocOptions } from '../types';

// For an args-bloc, omitting args is valid (provider may supply them at runtime).
const _missingArgs: UseBlocOptions<typeof UserCard> = {};
void _missingArgs;

// @ts-expect-error — wrong args field type (number is not assignable to string)
const _wrongType: UseBlocOptions<typeof UserCard> = { args: { userId: 42 } };
void _wrongType;

// Void-args bloc: args field is forbidden (type never) — omit it entirely.
const _voidArgsOpts: UseBlocOptions<typeof SimpleCounter> = {};
void _voidArgsOpts;
