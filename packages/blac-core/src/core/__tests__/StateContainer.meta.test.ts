import { describe, it, expect, beforeEach, afterEach } from 'vite-plus/test';
import { blacTestSetup } from '@blac/core/testing';
import { StateContainer } from '../StateContainer';
import { INIT_CONFIG } from '../symbols';
import { META_BRAND } from '../meta';

interface CounterState {
  count: number;
}

class CounterBloc extends StateContainer<CounterState> {
  constructor() {
    super({ count: 0 });
  }
  inc() {
    this.emit({ count: this.state.count + 1 });
  }
}

class DepBloc extends StateContainer<{ v: number }> {
  constructor() {
    super({ v: 0 });
  }
}

class ConsumerBloc extends StateContainer<{ v: number }> {
  constructor() {
    super({ v: 0 });
  }
  declareDep() {
    return this.depend(DepBloc);
  }
}

describe('StateContainer $blac meta namespace', () => {
  blacTestSetup();

  describe('identity', () => {
    it('reflects [INIT_CONFIG] values for name/id/debug', () => {
      const bloc = new CounterBloc();
      bloc[INIT_CONFIG]({ name: 'MyCounter', debug: true, instanceId: 'abc' });

      expect(bloc.$blac.name).toBe('MyCounter');
      expect(bloc.$blac.debug).toBe(true);
      expect(bloc.$blac.id).toContain('abc');
      expect(typeof bloc.$blac.createdAt).toBe('number');
    });

    it('defaults name to the constructor name before config', () => {
      const bloc = new CounterBloc();
      expect(bloc.$blac.name).toBe('CounterBloc');
      expect(bloc.$blac.debug).toBe(false);
    });

    it('exposes live values (re-running [INIT_CONFIG] updates meta)', () => {
      const bloc = new CounterBloc();
      bloc[INIT_CONFIG]({ name: 'First' });
      expect(bloc.$blac.name).toBe('First');
      bloc[INIT_CONFIG]({ name: 'Second' });
      expect(bloc.$blac.name).toBe('Second');
    });
  });

  describe('lifecycle', () => {
    it('disposed flips on dispose()', () => {
      const bloc = new CounterBloc();
      expect(bloc.$blac.disposed).toBe(false);
      bloc.dispose();
      expect(bloc.$blac.disposed).toBe(true);
    });

    it('dependencies mirrors depend() bookkeeping', () => {
      const consumer = new ConsumerBloc();
      consumer[INIT_CONFIG]({});
      expect(consumer.$blac.dependencies.size).toBe(0);
      consumer.declareDep();
      expect(consumer.$blac.dependencies.has(DepBloc)).toBe(true);
      expect(consumer.$blac.dependencies.size).toBe(1);
    });
  });

  describe('hydration via $blac.hydration', () => {
    it('runs begin -> apply -> finish', () => {
      const bloc = new CounterBloc();
      expect(bloc.$blac.hydration.status).toBe('idle');

      bloc.$blac.hydration.begin();
      expect(bloc.$blac.hydration.status).toBe('hydrating');

      const applied = bloc.$blac.hydration.apply({ count: 42 });
      expect(applied).toBe(true);
      expect(bloc.state.count).toBe(42);

      bloc.$blac.hydration.finish();
      expect(bloc.$blac.hydration.status).toBe('hydrated');
      expect(bloc.$blac.hydration.isHydrated).toBe(true);
    });

    it('fail() sets error status and rejects wait()', async () => {
      const bloc = new CounterBloc();
      bloc.$blac.hydration.begin();
      const err = new Error('boom');
      bloc.$blac.hydration.fail(err);
      expect(bloc.$blac.hydration.status).toBe('error');
      expect(bloc.$blac.hydration.error).toBe(err);
      await expect(bloc.$blac.hydration.wait()).rejects.toThrow('boom');
    });

    it('wait() resolves after finish()', async () => {
      const bloc = new CounterBloc();
      bloc.$blac.hydration.begin();
      const p = bloc.$blac.hydration.wait();
      bloc.$blac.hydration.finish();
      await expect(p).resolves.toBeUndefined();
    });

    it('changedWhileHydrating reflects emits during hydration', () => {
      const bloc = new CounterBloc();
      bloc.$blac.hydration.begin();
      expect(bloc.$blac.hydration.changedWhileHydrating).toBe(false);
      bloc.inc();
      expect(bloc.$blac.hydration.changedWhileHydrating).toBe(true);
      // apply() is rejected once changedWhileHydrating is set
      expect(bloc.$blac.hydration.apply({ count: 99 })).toBe(false);
    });

    it('parity: legacy methods and $blac.hydration behave identically', async () => {
      const legacy = new CounterBloc();
      const meta = new CounterBloc();

      legacy.beginHydration();
      meta.$blac.hydration.begin();
      expect(legacy.hydrationStatus).toBe(meta.$blac.hydration.status);

      expect(legacy.applyHydratedState({ count: 7 })).toBe(
        meta.$blac.hydration.apply({ count: 7 }),
      );
      expect(legacy.state.count).toBe(meta.state.count);

      legacy.finishHydration();
      meta.$blac.hydration.finish();
      expect(legacy.hydrationStatus).toBe(meta.$blac.hydration.status);

      await expect(legacy.waitForHydration()).resolves.toBeUndefined();
      await expect(meta.$blac.hydration.wait()).resolves.toBeUndefined();
    });
  });

  describe('legacy delegates', () => {
    it('legacy getters return identical values to $blac', () => {
      const bloc = new CounterBloc();
      bloc[INIT_CONFIG]({ name: 'Legacy', debug: true });

      expect(bloc.name).toBe(bloc.$blac.name);
      expect(bloc.instanceId).toBe(bloc.$blac.id);
      expect(bloc.debug).toBe(bloc.$blac.debug);
      expect(bloc.createdAt).toBe(bloc.$blac.createdAt);
      expect(bloc.isDisposed).toBe(bloc.$blac.disposed);
      expect(bloc.hydrationStatus).toBe(bloc.$blac.hydration.status);
    });

    it('legacy dependencies matches $blac.dependencies', () => {
      const consumer = new ConsumerBloc();
      consumer[INIT_CONFIG]({});
      consumer.declareDep();
      // Both return the live `_dependencies` map once one exists.
      expect(consumer.dependencies).toBe(consumer.$blac.dependencies);
      expect(consumer.dependencies.has(DepBloc)).toBe(true);
    });

    it('legacy setters update $blac', () => {
      const bloc = new CounterBloc();
      bloc.name = 'Renamed';
      expect(bloc.$blac.name).toBe('Renamed');
      bloc.debug = true;
      expect(bloc.$blac.debug).toBe(true);
      bloc.instanceId = 'forced-id';
      expect(bloc.$blac.id).toBe('forced-id');
    });

    it('legacy initConfig delegates to [INIT_CONFIG]', () => {
      const bloc = new CounterBloc();
      bloc.initConfig({ name: 'ViaLegacy' });
      expect(bloc.$blac.name).toBe('ViaLegacy');
    });
  });

  describe('meta object', () => {
    it('is frozen', () => {
      const bloc = new CounterBloc();
      expect(Object.isFrozen(bloc.$blac)).toBe(true);
      expect(Object.isFrozen(bloc.$blac.hydration)).toBe(true);
    });

    it('is branded', () => {
      const bloc = new CounterBloc();
      expect(
        (bloc.$blac as unknown as Record<symbol, unknown>)[META_BRAND],
      ).toBe(true);
    });

    it('is identity-stable across reads', () => {
      const bloc = new CounterBloc();
      expect(bloc.$blac).toBe(bloc.$blac);
      expect(bloc.$blac.hydration).toBe(bloc.$blac.hydration);
    });
  });

  describe('clobber guard', () => {
    let prevEnv: string | undefined;
    let warnSpy: ((...args: unknown[]) => void) | undefined;
    const warnings: string[] = [];

    beforeEach(() => {
      prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      warnings.length = 0;
      warnSpy = console.warn;
      console.warn = (...args: unknown[]) => {
        warnings.push(args.map(String).join(' '));
      };
    });

    afterEach(() => {
      process.env.NODE_ENV = prevEnv;
      if (warnSpy) console.warn = warnSpy as typeof console.warn;
    });

    it('warns when a subclass field shadows $blac', () => {
      class Clobber extends StateContainer<CounterState> {
        // Subclass class-field initializes after super(), overwriting the
        // base's own $blac property. Cast through `any` to bypass the
        // readonly + type constraints — this is exactly the foot-gun the
        // clobber guard is meant to catch at runtime.
        $blac = {} as never as CounterBloc['$blac'];
        constructor() {
          super({ count: 0 });
        }
      }
      const bloc = new Clobber();
      bloc[INIT_CONFIG]({});
      expect(warnings.some((w) => w.includes('$blac'))).toBe(true);
    });

    it('does not warn for a well-behaved bloc', () => {
      const bloc = new CounterBloc();
      bloc[INIT_CONFIG]({});
      expect(warnings.some((w) => w.includes('shadows'))).toBe(false);
    });
  });

  describe('proxy safety (buildTrackedProxy pattern)', () => {
    // buildTrackedProxy invokes prototype getters with a Proxy(instance) as
    // the `this`-receiver. ES #private fields would throw here; the meta object
    // and legacy getters close over the real instance / read TS-privates, so
    // they must not throw and must return correct values.
    function getterViaProxy(instance: object, key: string): unknown {
      const proto = Object.getPrototypeOf(instance);
      const receiver = new Proxy(instance, {});
      // Walk the chain to find the getter (legacy members live on the proto).
      let p: object | null = proto;
      while (p && p !== Object.prototype) {
        const desc = Object.getOwnPropertyDescriptor(p, key);
        if (desc?.get) return desc.get.call(receiver);
        p = Object.getPrototypeOf(p);
      }
      // $blac is an own data property, not a getter — read via receiver.
      return (receiver as Record<string, unknown>)[key];
    }

    it('legacy name getter invoked with a proxy receiver does not throw', () => {
      const bloc = new CounterBloc();
      bloc[INIT_CONFIG]({ name: 'Proxied' });
      expect(() => getterViaProxy(bloc, 'name')).not.toThrow();
      expect(getterViaProxy(bloc, 'name')).toBe('Proxied');
    });

    it('$blac read through a proxy receiver returns the live meta', () => {
      const bloc = new CounterBloc();
      bloc[INIT_CONFIG]({ name: 'Proxied' });
      const meta = getterViaProxy(bloc, '$blac') as { name: string };
      expect(meta.name).toBe('Proxied');
    });
  });
});
