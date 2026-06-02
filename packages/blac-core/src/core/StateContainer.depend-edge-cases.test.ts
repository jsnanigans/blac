import { describe, it, expect } from 'vite-plus/test';
import { blacTestSetup } from '@blac/core/testing';
import { Cubit } from './Cubit';
import { acquire, getRefCount, hasInstance } from '../registry';

class DepTarget extends Cubit<{ val: number }, { id?: string }> {
  constructor() {
    super({ val: 0 });
  }

  static key = (a?: { id?: string }) => a?.id ?? 'default';
}

class _DepTargetB extends Cubit<{ val: number }> {
  constructor() {
    super({ val: 0 });
  }
}

class DepOwner extends Cubit<{ x: number }> {
  getTarget = this.depend(DepTarget);
  constructor() {
    super({ x: 0 });
  }
}

describe('StateContainer depend() edge cases', () => {
  blacTestSetup();

  it('depend() returns a handle with track/untracked, not an instance', () => {
    const owner = new DepOwner();
    expect(typeof owner.getTarget).toBe('object');
    expect(typeof owner.getTarget.track).toBe('function');
    expect(typeof owner.getTarget.untracked).toBe('function');
    expect(owner.getTarget).not.toBeInstanceOf(DepTarget);
  });

  it('calling untracked() creates the dependency in registry via ensure', () => {
    const owner = new DepOwner();
    expect(hasInstance(DepTarget)).toBe(false);
    owner.getTarget.untracked();
    expect(hasInstance(DepTarget)).toBe(true);
  });

  it('calling getter multiple times returns same instance, refCount unchanged', () => {
    const owner = new DepOwner();
    const first = owner.getTarget.untracked();
    const countAfterFirst = getRefCount(DepTarget);
    const second = owner.getTarget.untracked();
    expect(second).toBe(first);
    expect(getRefCount(DepTarget)).toBe(countAfterFirst);
  });

  it('depend() with no args uses default key', () => {
    const owner = new DepOwner();
    const depInstance = owner.getTarget.untracked();
    expect(hasInstance(DepTarget)).toBe(true);
    expect(depInstance).toBe(owner.getTarget.untracked());
  });

  it('depend() with specific args targets correct instance', () => {
    class OwnerWithKey extends Cubit<{ x: number }> {
      getTarget = this.depend(DepTarget, { id: 'myKey' });
      constructor() {
        super({ x: 0 });
      }
    }
    const owner = new OwnerWithKey();
    owner.getTarget.untracked();
    expect(hasInstance(DepTarget, { args: { id: 'myKey' } })).toBe(true);
    expect(hasInstance(DepTarget)).toBe(false);
  });

  it('two depend() calls for different args both callable', () => {
    class MultiKeyOwner extends Cubit<{ x: number }> {
      getA = this.depend(DepTarget, { id: 'a' });
      getB = this.depend(DepTarget, { id: 'b' });
      constructor() {
        super({ x: 0 });
      }
    }
    const owner = new MultiKeyOwner();
    const a = owner.getA.untracked();
    const b = owner.getB.untracked();
    expect(a).not.toBe(b);
    expect(hasInstance(DepTarget, { args: { id: 'a' } })).toBe(true);
    expect(hasInstance(DepTarget, { args: { id: 'b' } })).toBe(true);
  });

  it('depend() for already-acquired instance returns that instance without incrementing refCount', () => {
    const existing = acquire(DepTarget);
    const countBefore = getRefCount(DepTarget);
    const owner = new DepOwner();
    const fromGetter = owner.getTarget.untracked();
    expect(fromGetter).toBe(existing);
    expect(getRefCount(DepTarget)).toBe(countBefore);
  });
});
