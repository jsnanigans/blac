import { describe, it, expect } from 'vite-plus/test';
import { blacTestSetup } from '@blac/core/testing';
import {
  acquire,
  release,
  borrow,
  borrowSafe,
  ensure,
  hasInstance,
  getRefCount,
  getRefIds,
} from '../registry';
import { StateContainer } from './StateContainer';

class RefCountBloc extends StateContainer<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
}

class KeepAliveBloc extends StateContainer<{ n: number }> {
  static keepAlive = true;
  constructor() {
    super({ n: 0 });
  }
}

describe('StateContainerRegistry ref counting', () => {
  blacTestSetup();

  it('acquire() creates instance with refCount = 1', () => {
    acquire(RefCountBloc);
    expect(getRefCount(RefCountBloc)).toBe(1);
  });

  it('acquire() twice on same key increments to refCount = 2', () => {
    acquire(RefCountBloc);
    acquire(RefCountBloc);
    expect(getRefCount(RefCountBloc)).toBe(2);
  });

  it('release() from 2 to 1 does not dispose', () => {
    const instance = acquire(RefCountBloc);
    acquire(RefCountBloc);
    release(RefCountBloc);
    expect(getRefCount(RefCountBloc)).toBe(1);
    expect(instance.isDisposed).toBe(false);
  });

  it('release() from 1 to 0 disposes and removes from registry', () => {
    const instance = acquire(RefCountBloc);
    release(RefCountBloc);
    expect(instance.isDisposed).toBe(true);
    expect(hasInstance(RefCountBloc)).toBe(false);
  });

  it('release() on nonexistent key is a no-op', () => {
    expect(() => release(RefCountBloc)).not.toThrow();
  });

  it('keepAlive class: refCount 0 does NOT dispose', () => {
    const instance = acquire(KeepAliveBloc);
    release(KeepAliveBloc);
    expect(getRefCount(KeepAliveBloc)).toBe(0);
    expect(instance.isDisposed).toBe(false);
    expect(hasInstance(KeepAliveBloc)).toBe(true);
  });

  it('borrow() does NOT increment refCount', () => {
    acquire(RefCountBloc);
    borrow(RefCountBloc);
    expect(getRefCount(RefCountBloc)).toBe(1);
  });

  it('borrow() throws when instance does not exist', () => {
    expect(() => borrow(RefCountBloc)).toThrow();
  });

  it('borrowSafe() returns error when instance does not exist', () => {
    const result = borrowSafe(RefCountBloc);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.instance).toBeNull();
  });

  it('borrowSafe() returns instance when it exists', () => {
    const instance = acquire(RefCountBloc);
    const result = borrowSafe(RefCountBloc);
    expect(result.error).toBeNull();
    expect(result.instance).toBe(instance);
  });

  it('ensure() subsequent calls do not increment refCount', () => {
    ensure(RefCountBloc);
    const countAfterFirst = getRefCount(RefCountBloc);
    ensure(RefCountBloc);
    expect(getRefCount(RefCountBloc)).toBe(countAfterFirst);
  });

  it('ensure() on pre-existing instance does NOT increment refCount', () => {
    const instance = acquire(RefCountBloc);
    const countAfterAcquire = getRefCount(RefCountBloc);
    const result = ensure(RefCountBloc);
    expect(getRefCount(RefCountBloc)).toBe(countAfterAcquire);
    expect(result).toBe(instance);
  });

  it('release(Type, key, true) force-disposes at refCount 2', () => {
    const instance = acquire(RefCountBloc);
    acquire(RefCountBloc);
    expect(getRefCount(RefCountBloc)).toBe(2);
    release(RefCountBloc, 'default', true);
    expect(instance.isDisposed).toBe(true);
    expect(hasInstance(RefCountBloc)).toBe(false);
  });

  it('instance disposed directly — next acquire() returns fresh instance', () => {
    const first = acquire(RefCountBloc);
    first.dispose();
    const second = acquire(RefCountBloc);
    expect(second).not.toBe(first);
    expect(second.isDisposed).toBe(false);
  });

  it('acquire() with custom instanceKey tracks separately from default', () => {
    const defaultInstance = acquire(RefCountBloc);
    const customInstance = acquire(RefCountBloc, 'custom');
    expect(defaultInstance).not.toBe(customInstance);
    expect(getRefCount(RefCountBloc, 'default')).toBe(1);
    expect(getRefCount(RefCountBloc, 'custom')).toBe(1);
  });

  it('acquire() with explicit refId tracks the named ref', () => {
    acquire(RefCountBloc, undefined, 'component-A');
    acquire(RefCountBloc, undefined, 'component-B');
    expect(getRefCount(RefCountBloc)).toBe(2);
    const ids = getRefIds(RefCountBloc);
    expect(ids.has('component-A')).toBe(true);
    expect(ids.has('component-B')).toBe(true);
  });

  it('release() with refId removes only that ref', () => {
    acquire(RefCountBloc, undefined, 'ref-A');
    acquire(RefCountBloc, undefined, 'ref-B');
    release(RefCountBloc, undefined, false, 'ref-A');
    expect(getRefCount(RefCountBloc)).toBe(1);
    const ids = getRefIds(RefCountBloc);
    expect(ids.has('ref-A')).toBe(false);
    expect(ids.has('ref-B')).toBe(true);
  });

  it('double-release with same refId is a no-op (idempotent)', () => {
    const instance = acquire(RefCountBloc, undefined, 'ref-A');
    acquire(RefCountBloc, undefined, 'ref-B');
    release(RefCountBloc, undefined, false, 'ref-A');
    release(RefCountBloc, undefined, false, 'ref-A');
    expect(getRefCount(RefCountBloc)).toBe(1);
    expect(instance.isDisposed).toBe(false);
  });

  it('getRefIds() returns empty set when no instance exists', () => {
    const ids = getRefIds(RefCountBloc);
    expect(ids.size).toBe(0);
  });

  it('getRefIds() reflects acquire and release of named refs', () => {
    acquire(RefCountBloc, undefined, 'x');
    acquire(RefCountBloc, undefined, 'y');
    acquire(RefCountBloc, undefined, 'z');
    expect(getRefIds(RefCountBloc).size).toBe(3);
    release(RefCountBloc, undefined, false, 'y');
    const ids = getRefIds(RefCountBloc);
    expect(ids.size).toBe(2);
    expect(ids.has('x')).toBe(true);
    expect(ids.has('z')).toBe(true);
  });
});
