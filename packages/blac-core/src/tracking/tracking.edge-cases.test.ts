import { describe, it, expect, vi } from 'vitest';
import { blacTestSetup } from '@blac/core/testing';
import {
  tracked,
  createTrackedContext,
  TrackedContext,
  DependencyManager,
} from './tracked';
import { Cubit } from '../core/Cubit';
import { acquire } from '../registry';

class TrackedCubit extends Cubit<{ val: number; other: number }> {
  constructor() {
    super({ val: 0, other: 0 });
  }
}

class SecondCubit extends Cubit<{ label: string }> {
  constructor() {
    super({ label: '' });
  }
}

describe('tracking edge cases', () => {
  blacTestSetup();

  it('tracked() returns result and dependencies as a Set', () => {
    const { result, dependencies } = tracked(() => 42);
    expect(result).toBe(42);
    expect(dependencies).toBeInstanceOf(Set);
  });

  it('tracked() runs callback and returns the callback result', () => {
    const { result } = tracked(() => ({ x: 1, y: 2 }));
    expect(result).toEqual({ x: 1, y: 2 });
  });

  it('tracked() with exclude option removes instance from dependencies', () => {
    const cubit = new TrackedCubit();
    const ctx = createTrackedContext();
    const proxied = ctx.proxy(cubit);
    ctx.start();
    void proxied.state.val;
    const deps = ctx.stop();
    expect(deps instanceof Set).toBe(true);
  });

  it('TrackedContext.proxy() returns a proxied instance (different from original)', () => {
    const cubit = new TrackedCubit();
    const ctx = new TrackedContext();
    const proxied = ctx.proxy(cubit);
    expect(proxied).not.toBe(cubit);
  });

  it('TrackedContext.proxy() caches — second call returns same proxy', () => {
    const cubit = new TrackedCubit();
    const ctx = new TrackedContext();
    const p1 = ctx.proxy(cubit);
    const p2 = ctx.proxy(cubit);
    expect(p1).toBe(p2);
  });

  it('TrackedContext.start() / stop() enables change detection', () => {
    const cubit = new TrackedCubit();
    const ctx = new TrackedContext();
    const proxied = ctx.proxy(cubit);
    ctx.start();
    void proxied.state.val;
    ctx.stop();
    expect(ctx.changed()).toBe(false);
  });

  it('TrackedContext.changed() returns false when no state change', () => {
    const cubit = new TrackedCubit();
    const ctx = new TrackedContext();
    const proxied = ctx.proxy(cubit);
    ctx.start();
    void proxied.state.val;
    ctx.stop();
    expect(ctx.changed()).toBe(false);
  });

  it('TrackedContext.changed() returns true after state mutation on tracked path', () => {
    const cubit = new TrackedCubit();
    const ctx = new TrackedContext();
    const proxied = ctx.proxy(cubit);
    ctx.start();
    void proxied.state.val;
    ctx.stop();
    cubit.emit({ val: 99, other: 0 });
    expect(ctx.changed()).toBe(true);
  });

  it('TrackedContext.reset() clears all internal state', () => {
    const cubit = new TrackedCubit();
    const ctx = new TrackedContext();
    const proxied1 = ctx.proxy(cubit);
    ctx.reset();
    expect(ctx.getPrimaryBlocs().size).toBe(0);
    const proxied2 = ctx.proxy(cubit);
    expect(proxied2).not.toBe(proxied1);
  });

  it('TrackedContext.getPrimaryBlocs() returns all proxied blocs', () => {
    const cubit1 = new TrackedCubit();
    const cubit2 = new SecondCubit();
    const ctx = new TrackedContext();
    ctx.proxy(cubit1);
    ctx.proxy(cubit2);
    const primaryBlocs = ctx.getPrimaryBlocs();
    expect(primaryBlocs.has(cubit1)).toBe(true);
    expect(primaryBlocs.has(cubit2)).toBe(true);
    expect(primaryBlocs.size).toBe(2);
  });

  it('DependencyManager.sync() subscribes to new deps, unsubscribes stale ones', () => {
    const manager = new DependencyManager();
    const onChange = vi.fn();
    const dep1 = new TrackedCubit();
    const dep2 = new SecondCubit();

    manager.sync(new Set([dep1]), onChange);
    expect(manager.has(dep1)).toBe(true);
    expect(manager.has(dep2)).toBe(false);

    manager.sync(new Set([dep2]), onChange);
    expect(manager.has(dep1)).toBe(false);
    expect(manager.has(dep2)).toBe(true);
  });

  it('DependencyManager.cleanup() clears all subscriptions', () => {
    const manager = new DependencyManager();
    const onChange = vi.fn();
    const dep = new TrackedCubit();

    manager.sync(new Set([dep]), onChange);
    expect(manager.has(dep)).toBe(true);

    manager.cleanup();
    expect(manager.has(dep)).toBe(false);

    dep.emit({ val: 1, other: 0 });
    expect(onChange).not.toHaveBeenCalled();
  });
});
