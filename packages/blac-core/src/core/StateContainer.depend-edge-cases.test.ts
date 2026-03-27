import { describe, it, expect } from 'vitest';
import { blacTestSetup } from '@blac/core/testing';
import { Cubit } from './Cubit';
import { acquire, getRefCount, hasInstance } from '../registry';

class DepTarget extends Cubit<{ val: number }> {
  constructor() {
    super({ val: 0 });
  }
}

class DepTargetB extends Cubit<{ val: number }> {
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

  it('depend() returns a getter function, not an instance', () => {
    const owner = new DepOwner();
    expect(typeof owner.getTarget).toBe('function');
  });

  it('calling the getter creates the dependency in registry via ensure', () => {
    const owner = new DepOwner();
    expect(hasInstance(DepTarget)).toBe(false);
    owner.getTarget();
    expect(hasInstance(DepTarget)).toBe(true);
  });

  it('calling getter multiple times returns same instance, refCount unchanged', () => {
    const owner = new DepOwner();
    const first = owner.getTarget();
    const countAfterFirst = getRefCount(DepTarget);
    const second = owner.getTarget();
    expect(second).toBe(first);
    expect(getRefCount(DepTarget)).toBe(countAfterFirst);
  });

  it('depend() with no instanceKey uses default key', () => {
    const owner = new DepOwner();
    const depInstance = owner.getTarget();
    expect(hasInstance(DepTarget, 'default')).toBe(true);
    expect(depInstance).toBe(owner.getTarget());
  });

  it('depend() with specific instanceKey targets correct instance', () => {
    class OwnerWithKey extends Cubit<{ x: number }> {
      getTarget = this.depend(DepTarget, 'myKey');
      constructor() {
        super({ x: 0 });
      }
    }
    const owner = new OwnerWithKey();
    owner.getTarget();
    expect(hasInstance(DepTarget, 'myKey')).toBe(true);
    expect(hasInstance(DepTarget, 'default')).toBe(false);
  });

  it('two depend() calls for different keys both callable', () => {
    class MultiKeyOwner extends Cubit<{ x: number }> {
      getA = this.depend(DepTarget, 'a');
      getB = this.depend(DepTarget, 'b');
      constructor() {
        super({ x: 0 });
      }
    }
    const owner = new MultiKeyOwner();
    const a = owner.getA();
    const b = owner.getB();
    expect(a).not.toBe(b);
    expect(hasInstance(DepTarget, 'a')).toBe(true);
    expect(hasInstance(DepTarget, 'b')).toBe(true);
  });

  it('depend() for already-acquired instance returns that instance without incrementing refCount', () => {
    const existing = acquire(DepTarget);
    const countBefore = getRefCount(DepTarget);
    const owner = new DepOwner();
    const fromGetter = owner.getTarget();
    expect(fromGetter).toBe(existing);
    expect(getRefCount(DepTarget)).toBe(countBefore);
  });
});
