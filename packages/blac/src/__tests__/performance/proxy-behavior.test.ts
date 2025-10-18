import { describe, it, expect, beforeEach } from 'vitest';
import { Cubit, Blac } from '../../index';
import { createStateProxy, ProxyFactory } from '../../adapter/ProxyFactory';

describe('Proxy Behavior', () => {
  beforeEach(() => {
    Blac.resetInstance();
    Blac.setConfig({ proxyDependencyTracking: true });
    ProxyFactory.resetStats();
  });

  describe('V3: Deep tracking with nested proxies', () => {
    interface NestedState {
      level1: {
        level2: {
          level3: {
            value: number;
          };
        };
      };
    }

    class NestedStateCubit extends Cubit<NestedState> {
      constructor() {
        super({
          level1: {
            level2: {
              level3: {
                value: 0,
              },
            },
          },
        });
      }
    }

    it('should create nested proxies with effective caching (V3)', () => {
      const cubit = new NestedStateCubit();
      const consumerTracker = {
        trackAccess: () => {},
      };
      const consumerRef = {};

      ProxyFactory.resetStats();

      // Create root proxy
      const proxy = createStateProxy(cubit.state, consumerRef, consumerTracker);

      // First access: creates proxies for each level
      const value1 = proxy.level1.level2.level3.value;
      const stats1 = ProxyFactory.getStats();

      // V3: Should create nested proxies (one for each level accessed)
      expect(stats1.totalProxiesCreated).toBeGreaterThan(1);
      expect(stats1.stateProxiesCreated).toBeGreaterThan(1);
      expect(value1).toBe(0);

      ProxyFactory.resetStats();

      // Second access: uses cached proxies
      const value2 = proxy.level1.level2.level3.value;
      const stats2 = ProxyFactory.getStats();

      // Cache should be effective - no new proxies created
      expect(stats2.cacheHits).toBeGreaterThan(0);
      expect(stats2.totalProxiesCreated).toBe(0);
      expect(value2).toBe(0);
    });
  });

  describe('Memory management', () => {
    interface TestState {
      count: number;
      name: string;
    }

    class TestCubit extends Cubit<TestState> {
      constructor() {
        super({ count: 0, name: 'test' });
      }

      get doubled(): number {
        return this.state.count * 2;
      }

      increment = () => {
        this.patch({ count: this.state.count + 1 });
      };
    }

    it('should clean up getter cache on unsubscribe', () => {
      const cubit = new TestCubit();

      const { unsubscribe } = cubit.subscribe(() => {});

      // Trigger some state changes
      cubit.increment();
      cubit.increment();

      // Unsubscribe should clean up cache
      unsubscribe();

      const stats = (cubit as any)._subscriptionManager?.getStats();
      expect(stats?.activeSubscriptions).toBe(0);
    });
  });
});
