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

  constructor(private context: ProxyContext) {
    console.log(`🔌 [ProxyProvider] Initialized`);
    console.log(`🔌 [ProxyProvider] Context:`, {
      hasConsumerRef: !!context.consumerRef,
      hasTracker: !!context.consumerTracker,
    });
  }

  createStateProxy<T extends object>(target: T): T {
    const startTime = performance.now();
    this.proxyCreationCount++;
    this.stateProxyCount++;

    console.log(
      `🔌 [ProxyProvider] 🎭 Creating state proxy #${this.stateProxyCount}`,
    );
    console.log(
      `🔌 [ProxyProvider] Target type: ${target?.constructor?.name || typeof target}`,
    );
    console.log(
      `🔌 [ProxyProvider] Target keys: ${Object.keys(target).length}`,
    );

    const proxy = ProxyFactory.createStateProxy({
      target,
      consumerRef: this.context.consumerRef,
      consumerTracker: this.context.consumerTracker as any,
    });

    const endTime = performance.now();
    console.log(
      `🔌 [ProxyProvider] ✅ State proxy created in ${(endTime - startTime).toFixed(2)}ms`,
    );

    return proxy;
  }

  createClassProxy<T extends object>(target: T): T {
    const startTime = performance.now();
    this.proxyCreationCount++;
    this.classProxyCount++;

    console.log(
      `🔌 [ProxyProvider] 🎭 Creating class proxy #${this.classProxyCount}`,
    );
    console.log(
      `🔌 [ProxyProvider] Target class: ${target?.constructor?.name}`,
    );

    // Log methods and getters
    const proto = Object.getPrototypeOf(target);
    const methods = Object.getOwnPropertyNames(proto).filter(
      (name) => typeof proto[name] === 'function' && name !== 'constructor',
    );
    const getters = Object.getOwnPropertyNames(proto).filter((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(proto, name);
      return descriptor && descriptor.get;
    });

    console.log(`🔌 [ProxyProvider] Class structure:`, {
      methods: methods.length,
      getters: getters.length,
      sampleMethods: methods.slice(0, 3),
      sampleGetters: getters.slice(0, 3),
    });

    const proxy = ProxyFactory.createClassProxy({
      target,
      consumerRef: this.context.consumerRef,
      consumerTracker: this.context.consumerTracker as any,
    });

    const endTime = performance.now();
    console.log(
      `🔌 [ProxyProvider] ✅ Class proxy created in ${(endTime - startTime).toFixed(2)}ms`,
    );

    return proxy;
  }

  getProxyState<B extends BlocBase<any>>(state: BlocState<B>): BlocState<B> {
    const startTime = performance.now();

    console.log(`🔌 [ProxyProvider] 📦 getProxyState called`);
    console.log(`🔌 [ProxyProvider] State preview:`, {
      keys: Object.keys(state),
      isArray: Array.isArray(state),
      size: Array.isArray(state) ? state.length : Object.keys(state).length,
    });

    const proxy = this.createStateProxy(state);

    const endTime = performance.now();
    console.log(
      `🔌 [ProxyProvider] ✅ State proxy ready in ${(endTime - startTime).toFixed(2)}ms`,
    );

    return proxy;
  }

  getProxyBlocInstance<B extends BlocBase<any>>(blocInstance: B): B {
    const startTime = performance.now();

    console.log(`🔌 [ProxyProvider] 🎯 getProxyBlocInstance called`);
    console.log(`🔌 [ProxyProvider] Bloc instance:`, {
      name: blocInstance._name,
      id: blocInstance._id,
      state: blocInstance.state,
    });

    const proxy = this.createClassProxy(blocInstance);

    const endTime = performance.now();
    console.log(
      `🔌 [ProxyProvider] ✅ Bloc proxy ready in ${(endTime - startTime).toFixed(2)}ms`,
    );

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
