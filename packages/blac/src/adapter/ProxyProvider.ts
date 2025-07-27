import { ProxyFactory } from './ProxyFactory';
import { BlocBase } from '../BlocBase';
import { BlocState } from '../types';

interface ProxyContext {
  consumerRef: object;
  consumerTracker: {
    trackAccess: (
      consumerRef: object,
      type: 'state' | 'class',
      path: string,
    ) => void;
  };
}

/**
 * ProxyProvider manages the creation and provision of proxies for state and bloc instances.
 * It delegates the actual proxy creation to ProxyFactory while providing a cleaner interface.
 */
export class ProxyProvider {
  private proxyCreationCount = 0;
  private stateProxyCount = 0;
  private classProxyCount = 0;
  private createdAt = Date.now();

  constructor(private context: ProxyContext) {}

  createStateProxy<T extends object>(target: T): T {
    this.proxyCreationCount++;
    this.stateProxyCount++;

    const proxy = ProxyFactory.createStateProxy({
      target,
      consumerRef: this.context.consumerRef,
      consumerTracker: this.context.consumerTracker as any,
    });

    return proxy;
  }

  createClassProxy<T extends object>(target: T): T {
    this.proxyCreationCount++;
    this.classProxyCount++;

    const proxy = ProxyFactory.createClassProxy({
      target,
      consumerRef: this.context.consumerRef,
      consumerTracker: this.context.consumerTracker as any,
    });

    return proxy;
  }

  getProxyState<B extends BlocBase<any>>(state: BlocState<B>): BlocState<B> {
    const proxy = this.createStateProxy(state);
    return proxy;
  }

  getProxyBlocInstance<B extends BlocBase<any>>(blocInstance: B): B {
    const proxy = this.createClassProxy(blocInstance);
    return proxy;
  }

  getStats() {
    const lifetime = Date.now() - this.createdAt;
    return {
      totalProxiesCreated: this.proxyCreationCount,
      stateProxies: this.stateProxyCount,
      classProxies: this.classProxyCount,
      lifetime: `${lifetime}ms`,
      proxiesPerSecond:
        lifetime > 0
          ? (this.proxyCreationCount / (lifetime / 1000)).toFixed(2)
          : 'N/A',
    };
  }
}
