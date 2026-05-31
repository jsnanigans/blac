import { describe, it, expect } from 'vitest';
import { blacTestSetup } from '@blac/core/testing';
import { ensure, resolveInstanceKey, getRegistry } from '../registry';
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
  const registry = getRegistry();
  const key = resolveInstanceKey(UserCard, args);
  const instance = registry.acquire(UserCard, key, {
    canCreate: true,
    countRef: true,
    refId,
    args,
  });
  registry.release(UserCard, key, false, refId);
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

  it('ensure keys by args', () => {
    const a = ensure(UserCard, { args: { userId: 'a' } });
    const b = ensure(UserCard, { args: { userId: 'b' } });
    expect(a).not.toBe(b);

    // Same args resolve to the same instance.
    const a2 = ensure(UserCard, { args: { userId: 'a' } });
    expect(a).toBe(a2);
  });

  it('resolveInstanceKey folds args into the key (not the default sentinel)', () => {
    const keyA = resolveInstanceKey(UserCard, { userId: 'a' });
    const keyB = resolveInstanceKey(UserCard, { userId: 'b' });
    expect(keyA).not.toBe('default');
    expect(keyA).not.toBe(keyB);
    // The internal tier still honours an explicit key.
    expect(
      getRegistry().resolveKey(UserCard, 'explicit', { userId: 'a' }),
    ).toBe('explicit');
  });
});
