import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vite-plus/test';
import { Cubit, getPluginManager, acquire, clearAll } from '@blac/core';
import { enumerateGetters } from './enumerateGetters';
import { DevToolsBrowserPlugin } from '../plugin/DevToolsBrowserPlugin';

// ============ Test Fixtures ============

class SimpleCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

class CubitWithGetters extends Cubit<{ items: string[]; filter: string }> {
  constructor() {
    super({ items: ['a', 'b', 'c'], filter: 'all' });
  }

  get filteredItems(): string[] {
    if (this.state.filter === 'all') return this.state.items;
    return this.state.items.filter((i) => i === this.state.filter);
  }

  get itemCount(): number {
    return this.state.items.length;
  }
}

class CubitWithPrimitiveGetter extends Cubit<{ value: number }> {
  constructor() {
    super({ value: 42 });
  }

  get doubled(): number {
    return this.state.value * 2;
  }

  get label(): string {
    return `Value: ${this.state.value}`;
  }

  get isPositive(): boolean {
    return this.state.value > 0;
  }
}

class DepTargetCubit extends Cubit<{ mode: string }> {
  constructor() {
    super({ mode: 'light' });
  }
}

class CubitWithDependency extends Cubit<{ revenue: number }> {
  private getTarget = this.depend(DepTargetCubit);

  constructor() {
    super({ revenue: 1000 });
  }

  get formatted(): string {
    const target = this.getTarget();
    return `${target.state.mode}: $${this.state.revenue}`;
  }

  get plain(): number {
    return this.state.revenue * 2;
  }
}

class ThrowingGetterCubit extends Cubit<{ x: number }> {
  constructor() {
    super({ x: 1 });
  }

  get safe(): number {
    return this.state.x;
  }

  get broken(): string {
    throw new Error('getter failed');
  }
}

class MultiDepCubit extends Cubit<{ val: number }> {
  private getA = this.depend(DepTargetCubit);
  private getB = this.depend(SimpleCubit);

  constructor() {
    super({ val: 1 });
  }

  get usesA(): string {
    return this.getA().state.mode;
  }

  get usesBoth(): string {
    return `${this.getA().state.mode}-${this.getB().state.count}`;
  }

  get usesNone(): number {
    return this.state.val;
  }
}

// ============ Helpers ============

const resetState = () => {
  clearAll();
  getPluginManager().clear();
};

function defined<T>(val: T | undefined | null): T {
  expect(val).toBeDefined();
  return val as T;
}

function findEvent(
  subscriber: ReturnType<typeof vi.fn>,
  type: string,
  className?: string,
) {
  const match = subscriber.mock.calls.find((args: any[]) => {
    const e = args[0];
    if (e.type !== type) return false;
    if (className && e.data?.className !== className) return false;
    return true;
  });
  return defined(match)[0];
}

// ============ Tests ============

describe('enumerateGetters', () => {
  beforeEach(resetState);
  afterEach(resetState);

  describe('collectGetterDescriptors (via enumerateGetters)', () => {
    it('returns undefined for cubits with no user-defined getters', () => {
      const instance = acquire(SimpleCubit);
      const result = enumerateGetters(instance);
      expect(result).toBeUndefined();
    });

    it('finds getters defined on the cubit subclass', () => {
      const instance = acquire(CubitWithGetters);
      const result = defined(enumerateGetters(instance));
      const keys = Object.keys(result);

      expect(keys).toContain('filteredItems');
      expect(keys).toContain('itemCount');
    });

    it('excludes base StateContainer getters (state, dependencies, isDisposed, etc.)', () => {
      const instance = acquire(CubitWithGetters);
      const result = defined(enumerateGetters(instance));
      const keys = Object.keys(result);

      expect(keys).not.toContain('state');
      expect(keys).not.toContain('dependencies');
      expect(keys).not.toContain('isDisposed');
      expect(keys).not.toContain('hydrationStatus');
      expect(keys).not.toContain('isHydrated');
      expect(keys).not.toContain('changedWhileHydrating');
    });
  });

  describe('getter evaluation', () => {
    it('evaluates getters and returns serialized values', () => {
      const instance = acquire(CubitWithGetters);
      const result = defined(enumerateGetters(instance));

      expect(result.filteredItems.value).toEqual(['a', 'b', 'c']);
      expect(result.itemCount.value).toBe(3);
    });

    it('handles primitive return types (number, string, boolean)', () => {
      const instance = acquire(CubitWithPrimitiveGetter);
      const result = defined(enumerateGetters(instance));

      expect(result.doubled.value).toBe(84);
      expect(result.label.value).toBe('Value: 42');
      expect(result.isPositive.value).toBe(true);
    });

    it('reflects updated state in getter values', () => {
      const instance = acquire(CubitWithPrimitiveGetter);

      const before = defined(enumerateGetters(instance));
      expect(before.doubled.value).toBe(84);

      instance.emit({ value: 10 });

      const after = defined(enumerateGetters(instance));
      expect(after.doubled.value).toBe(20);
      expect(after.label.value).toBe('Value: 10');
    });
  });

  describe('error handling', () => {
    it('captures getter errors without breaking other getters', () => {
      const instance = acquire(ThrowingGetterCubit);
      const result = defined(enumerateGetters(instance));

      expect(result.safe.value).toBe(1);
      expect(result.safe.error).toBeUndefined();

      expect(result.broken.error).toBe('getter failed');
      expect(result.broken.value).toBeUndefined();
    });
  });

  describe('per-getter dependency tracking', () => {
    it('tracks which dependencies a getter accesses', () => {
      acquire(DepTargetCubit);
      const instance = acquire(CubitWithDependency);
      const result = defined(enumerateGetters(instance));

      expect(result.formatted.dependsOn).toEqual(['DepTargetCubit']);
      expect(result.plain.dependsOn).toBeUndefined();
    });

    it('tracks multiple dependencies per getter', () => {
      acquire(DepTargetCubit);
      acquire(SimpleCubit);
      const instance = acquire(MultiDepCubit);
      const result = defined(enumerateGetters(instance));

      expect(result.usesA.dependsOn).toEqual(['DepTargetCubit']);
      expect(result.usesBoth.dependsOn).toEqual(
        expect.arrayContaining(['DepTargetCubit', 'SimpleCubit']),
      );
      expect(result.usesBoth.dependsOn).toHaveLength(2);
      expect(result.usesNone.dependsOn).toBeUndefined();
    });
  });

  describe('reentrancy guard', () => {
    it('returns undefined when called reentrantly (no infinite loop)', () => {
      const plugin = new DevToolsBrowserPlugin();
      getPluginManager().install(plugin);

      acquire(DepTargetCubit);
      const instance = acquire(CubitWithDependency);

      instance.emit({ revenue: 2000 });

      const result = defined(enumerateGetters(instance));
      expect(result.formatted.value).toContain('2000');
    });
  });
});

describe('DevToolsBrowserPlugin getter integration', () => {
  beforeEach(resetState);
  afterEach(resetState);

  it('includes getters in instance-created event data', () => {
    const plugin = new DevToolsBrowserPlugin();
    getPluginManager().install(plugin);

    const subscriber = vi.fn();
    plugin.subscribe(subscriber);

    acquire(CubitWithGetters);

    const evt = findEvent(subscriber, 'instance-created');
    expect(evt.data.getters).toBeDefined();
    expect(evt.data.getters.filteredItems).toBeDefined();
    expect(evt.data.getters.itemCount).toBeDefined();
  });

  it('includes getters in instance-updated event data', async () => {
    const plugin = new DevToolsBrowserPlugin();
    getPluginManager().install(plugin);

    const instance = acquire(CubitWithPrimitiveGetter);

    const subscriber = vi.fn();
    plugin.subscribe(subscriber);

    instance.emit({ value: 100 });
    // stateChanged notification is deferred via queueMicrotask
    await Promise.resolve();

    const evt = findEvent(subscriber, 'instance-updated');
    expect(evt.data.getters).toBeDefined();
    expect(evt.data.getters.doubled.value).toBe(200);
    expect(evt.data.getters.label.value).toBe('Value: 100');
  });

  it('does not include getters for cubits without user-defined getters', () => {
    const plugin = new DevToolsBrowserPlugin();
    getPluginManager().install(plugin);

    const subscriber = vi.fn();
    plugin.subscribe(subscriber);

    acquire(SimpleCubit);

    const evt = findEvent(subscriber, 'instance-created');
    expect(evt.data.getters).toBeUndefined();
  });

  it('includes dependency annotations in getter data', () => {
    const plugin = new DevToolsBrowserPlugin();
    getPluginManager().install(plugin);

    acquire(DepTargetCubit);

    const subscriber = vi.fn();
    plugin.subscribe(subscriber);

    acquire(CubitWithDependency);

    const evt = findEvent(
      subscriber,
      'instance-created',
      'CubitWithDependency',
    );
    const getters = evt.data.getters;
    expect(getters.formatted.dependsOn).toEqual(['DepTargetCubit']);
    expect(getters.plain.dependsOn).toBeUndefined();
  });

  it('stores getters in state manager snapshots', async () => {
    const plugin = new DevToolsBrowserPlugin();
    getPluginManager().install(plugin);

    const instance = acquire(CubitWithPrimitiveGetter);
    instance.emit({ value: 50 });
    // stateChanged notification is deferred via queueMicrotask
    await Promise.resolve();

    const fullState = plugin.getFullState();
    const tracked = defined(
      fullState.instances.find(
        (i: any) => i.className === 'CubitWithPrimitiveGetter',
      ),
    );
    expect(tracked.getters).toBeDefined();
    expect(defined(tracked.getters).doubled.value).toBe(100);

    const lastSnapshot = tracked.history[tracked.history.length - 1];
    expect(lastSnapshot.getters).toBeDefined();
    expect(defined(lastSnapshot.getters).doubled.value).toBe(100);
  });
});

describe('reentrancy during dependency creation', () => {
  beforeEach(resetState);
  afterEach(resetState);

  it('still returns getters when dependency is created during getter eval', () => {
    const plugin = new DevToolsBrowserPlugin();
    getPluginManager().install(plugin);

    const instance = acquire(CubitWithDependency);

    const result = defined(enumerateGetters(instance));
    expect(result.formatted).toBeDefined();
    expect(result.plain).toBeDefined();
  });

  it('plugin emits getters even when deps are created during enumeration', () => {
    const plugin = new DevToolsBrowserPlugin();
    getPluginManager().install(plugin);

    const subscriber = vi.fn();
    plugin.subscribe(subscriber);

    acquire(CubitWithDependency);

    const evt = findEvent(
      subscriber,
      'instance-created',
      'CubitWithDependency',
    );
    expect(evt.data.getters).toBeDefined();
    expect(evt.data.getters.formatted).toBeDefined();
  });
});

describe('isDependGetter filtering', () => {
  beforeEach(resetState);
  afterEach(resetState);

  it('does not call user methods that take arguments', () => {
    const instance = acquire(CubitWithGetters);
    const result = enumerateGetters(instance);
    expect(result).toBeDefined();
    expect(instance.state).toEqual({ items: ['a', 'b', 'c'], filter: 'all' });
  });

  it('does not call prototype methods like emit or patch', () => {
    acquire(DepTargetCubit);
    const instance = acquire(CubitWithDependency);
    const originalState = { ...instance.state };

    enumerateGetters(instance);

    expect(instance.state).toEqual(originalState);
  });
});
