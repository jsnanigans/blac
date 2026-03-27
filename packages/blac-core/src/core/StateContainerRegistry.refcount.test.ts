import { describe, it, expect, beforeEach, afterEach } from 'vite-plus/test';
import {
  acquire,
  release,
  borrow,
  borrowSafe,
  ensure,
  hasInstance,
  getRefCount,
  clearAll,
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

const resetState = () => clearAll();

describe('StateContainerRegistry ref counting', () => {
  beforeEach(resetState);
  afterEach(resetState);

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
});
