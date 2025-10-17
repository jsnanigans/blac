import { describe, it, expect, beforeEach } from 'vitest';
import { Cubit, Blac } from '../../index';
import { createStateProxy, ProxyFactory } from '../../adapter/ProxyFactory';

describe('Proxy Behavior', () => {
  beforeEach(() => {
    Blac.resetInstance();
    Blac.setConfig({ proxyDependencyTracking: true });
    ProxyFactory.resetStats();
  });

  describe('Top-level tracking - no nested proxies', () => {
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

    it('should NOT create nested proxies (V2 improvement)', () => {
      const cubit = new NestedStateCubit();
      const consumerTracker = {
        trackAccess: () => {},
      };
      const consumerRef = {};

      ProxyFactory.resetStats();

      // Create root proxy
      const proxy = createStateProxy(cubit.state, consumerRef, consumerTracker);

      // Access nested properties
      const value = proxy.level1.level2.level3.value;

      // Get stats
      const stats = ProxyFactory.getStats();

      // V2: Should only create ONE proxy (root level)
      expect(stats.totalProxiesCreated).toBe(1);
      expect(stats.stateProxiesCreated).toBe(1);
      expect(value).toBe(0);
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
