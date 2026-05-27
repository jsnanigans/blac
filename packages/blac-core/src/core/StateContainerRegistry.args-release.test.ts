import { describe, it, expect } from 'vitest';
import { blacTestSetup } from '@blac/core/testing';
import {
  acquire,
  ensure,
  release,
  resolveInstanceKey,
  getRegistry,
} from '../registry';
import { Cubit } from './Cubit';

type UserCardState = Record<string, never>;

class UserCard extends Cubit<UserCardState, { userId: string }> {
  constructor() {
    super({});
  }
}

// Reproduces the per-consumer acquire/release the react `useBloc` hook performs:
// resolve the storage key once (args-derived), then use that SAME key for both
// acquire and the unmount release. Before the fix, callers passed the args-less
// key to release, which resolved to 'default', never dropped the ref, and leaked
// every args-keyed instance.
function mountThenUnmount(args: { userId: string }, refId: string) {
  const key = resolveInstanceKey(UserCard, undefined, args);
  const instance = acquire(UserCard, key, refId, args);
  release(UserCard, key, false, refId);
  return instance;
}

describe('StateContainerRegistry args-based release', () => {
  blacTestSetup();

  it('disposes an args-keyed instance after the matching release', () => {
    const instance = mountThenUnmount({ userId: 'a' }, 'useBloc@UserCard-1');
    expect(instance.isDisposed).toBe(true);
  });

  it('does not accumulate orphaned entries as args change', () => {
    for (const userId of ['a', 'b', 'c']) {
      mountThenUnmount({ userId }, `useBloc@UserCard-${userId}`);
    }
    const map = getRegistry().getInstancesMap(UserCard);
    expect(map.size).toBe(0);
  });

  it('ensure keys by args when no explicit key is given', () => {
    const a = ensure(UserCard, undefined, { userId: 'a' });
    const b = ensure(UserCard, undefined, { userId: 'b' });
    expect(a).not.toBe(b);

    // Same args resolve to the same instance.
    const a2 = ensure(UserCard, undefined, { userId: 'a' });
    expect(a).toBe(a2);
  });

  it('resolveInstanceKey folds args into the key (not the default sentinel)', () => {
    const keyA = resolveInstanceKey(UserCard, undefined, { userId: 'a' });
    const keyB = resolveInstanceKey(UserCard, undefined, { userId: 'b' });
    expect(keyA).not.toBe('default');
    expect(keyA).not.toBe(keyB);
    // explicit key always wins over args
    expect(resolveInstanceKey(UserCard, 'explicit', { userId: 'a' })).toBe(
      'explicit',
    );
  });
});
