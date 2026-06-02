import { describe, it, expect } from 'vite-plus/test';
import { blacTestSetup } from '@blac/core/testing';
import { Cubit } from './Cubit';
import { DEP_BRAND } from './StateContainer';
import { borrow, ensure } from '../registry';

class DepBloc extends Cubit<{ amount: number }> {
  constructor() {
    super({ amount: 10 });
  }
}

class OwnerBloc extends Cubit<{ qty: number }> {
  price = this.depend(DepBloc);

  constructor() {
    super({ qty: 2 });
  }

  get total() {
    const [s] = this.price.track();
    return this.state.qty * s.amount;
  }
}

describe('StateContainer depend() → DepHandle', () => {
  blacTestSetup();

  it('handle() returns the same instance as ensure()', () => {
    const owner = new OwnerBloc();
    const viaHandle = owner.price();
    const viaEnsure = ensure(DepBloc);
    expect(viaHandle).toBe(viaEnsure);
  });

  it('handle() returns the same instance as borrow()', () => {
    const owner = new OwnerBloc();
    // ensure the instance exists first
    owner.price();
    const viaBorrow = borrow(DepBloc);
    expect(owner.price()).toBe(viaBorrow);
  });

  it('handle.track() returns [dep.state, depInstance] with === identity', () => {
    const owner = new OwnerBloc();
    const [state, instance] = owner.price.track();
    expect(instance).toBe(owner.price());
    expect(state).toBe(instance.state);
    expect(state.amount).toBe(10);
  });

  it('handle.track() reflects live state after emit', () => {
    const owner = new OwnerBloc();
    const dep = owner.price();
    dep.emit({ amount: 99 });
    const [state] = owner.price.track();
    expect(state.amount).toBe(99);
  });

  it('handle[DEP_BRAND] carries Type, key, and args', () => {
    const owner = new OwnerBloc();
    const brand = owner.price[DEP_BRAND];
    expect(brand.Type).toBe(DepBloc);
    expect(typeof brand.key).toBe('string');
    expect(brand.key.length).toBeGreaterThan(0);
  });

  it('handle[DEP_BRAND] is non-enumerable', () => {
    const owner = new OwnerBloc();
    const keys = Object.keys(owner.price);
    expect(keys).not.toContain(String(DEP_BRAND));
    expect(
      Object.prototype.propertyIsEnumerable.call(owner.price, DEP_BRAND),
    ).toBe(false);
  });

  it('bloc.dependencies records the dep after depend()', () => {
    const owner = new OwnerBloc();
    const deps = owner.dependencies;
    expect(deps.has(DepBloc)).toBe(true);
  });

  it('getter using this.price.track() reads live values without React', () => {
    const owner = new OwnerBloc();
    // total = qty * amount = 2 * 10 = 20
    expect(owner.total).toBe(20);

    // update dep state
    owner.price().emit({ amount: 5 });
    // total = 2 * 5 = 10
    expect(owner.total).toBe(10);

    // update own state
    owner.emit({ qty: 4 });
    // total = 4 * 5 = 20
    expect(owner.total).toBe(20);
  });

  it('handle is callable (back-compat): this.price() still returns instance', () => {
    const owner = new OwnerBloc();
    const instance = owner.price();
    expect(instance).toBeInstanceOf(DepBloc);
    expect(instance.state.amount).toBe(10);
  });

  it('handle with args carries args in DEP_BRAND', () => {
    class ArgDep extends Cubit<{ v: number }, { id: string }> {
      constructor() {
        super({ v: 0 });
      }
      static key = (a?: { id: string }) => a?.id ?? 'default';
    }

    class ArgOwner extends Cubit<{ x: number }> {
      dep = this.depend(ArgDep, { id: 'test' });
      constructor() {
        super({ x: 0 });
      }
    }

    const owner = new ArgOwner();
    const brand = owner.dep[DEP_BRAND];
    expect(brand.Type).toBe(ArgDep);
    expect(brand.args).toEqual({ id: 'test' });
  });
});
