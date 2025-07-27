import { Blac, GetBlocOptions } from '../Blac';
import { BlocBase } from '../BlocBase';
import { BlocConstructor, BlocState, InferPropsFromGeneric } from '../types';
import { generateUUID } from '../utils/uuid';
import { DependencyTracker, DependencyArray } from './DependencyTracker';
import { ProxyFactory } from './ProxyFactory';

interface BlacAdapterInfo {
  id: string;
  tracker: DependencyTracker;
  lastNotified: number;
  hasRendered: boolean;
}

export interface AdapterOptions<B extends BlocBase<any>> {
  id?: string;
  selector?: (state: BlocState<B>, bloc: B) => any;
  props?: InferPropsFromGeneric<B>;
  onMount?: (bloc: B) => void;
  onUnmount?: (bloc: B) => void;
}

export class BlacAdapter<B extends BlocConstructor<BlocBase<any>>> {
  public readonly id = `consumer-${generateUUID()}`;
  public readonly blocConstructor: B;
  public readonly componentRef: { current: object } = { current: {} };
  public calledOnMount = false;
  public blocInstance: InstanceType<B>;
  private consumers = new WeakMap<object, BlacAdapterInfo>();
  options?: AdapterOptions<InstanceType<B>>;

  constructor(
    instanceProps: { componentRef: { current: object }; blocConstructor: B },
    options?: typeof this.options,
  ) {
    console.log(`🔌 [BlacAdapter] Constructor called - ID: ${this.id}`);
    console.log(
      `[BlacAdapter] Constructor name: ${instanceProps.blocConstructor.name}`,
    );
    console.log(`🔌 [BlacAdapter] Options:`, options);

    this.options = options;
    this.blocConstructor = instanceProps.blocConstructor;
    this.blocInstance = this.updateBlocInstance();
    this.componentRef = instanceProps.componentRef;
    this.registerConsumer(instanceProps.componentRef.current);

    console.log(
      `[BlacAdapter] Constructor complete - Bloc instance ID: ${this.blocInstance._id}`,
    );
  }

  registerConsumer(consumerRef: object): void {
    console.log(`🔌 [BlacAdapter] registerConsumer called - ID: ${this.id}`);
    console.log(`🔌 [BlacAdapter] Has selector: ${!!this.options?.selector}`);

    /*
    if (this.options?.selector) {
      console.log(
        `🔌 [BlacAdapter] Skipping dependency tracking due to selector`,
      );
      return;
    }
    */

    const tracker = new DependencyTracker();
    console.log(
      `[BlacAdapter] Created DependencyTracker for consumer ${this.id}`,
    );

    this.consumers.set(consumerRef, {
      id: this.id,
      tracker,
      lastNotified: Date.now(),
      hasRendered: false,
    });

    console.log(`🔌 [BlacAdapter] Consumer registered successfully`);
  }

  unregisterConsumer = (): void => {
    console.log(`🔌 [BlacAdapter] unregisterConsumer called - ID: ${this.id}`);
    // Since we're using WeakMap, we just need to delete from the WeakMap
    // The componentRef.current should be the key
    if (this.componentRef.current) {
      this.consumers.delete(this.componentRef.current);
      console.log(`🔌 [BlacAdapter] Deleted consumer from WeakMap`);
    } else {
      console.log(`🔌 [BlacAdapter] No component reference found`);
    }
  };

  trackAccess(
    consumerRef: object,
    type: 'state' | 'class',
    path: string,
  ): void {
    console.log(
      `[BlacAdapter] trackAccess called - Type: ${type}, Path: ${path}`,
    );
    const consumerInfo = this.consumers.get(consumerRef);
    if (!consumerInfo) {
      console.log(`🔌 [BlacAdapter] No consumer info found for tracking`);
      return;
    }

    if (type === 'state') {
      consumerInfo.tracker.trackStateAccess(path);
      console.log(`🔌 [BlacAdapter] Tracked state access: ${path}`);
    } else {
      consumerInfo.tracker.trackClassAccess(path);
      console.log(`🔌 [BlacAdapter] Tracked class access: ${path}`);
    }
  }

  getConsumerDependencies(consumerRef: object): DependencyArray | null {
    const consumerInfo = this.consumers.get(consumerRef);
    if (!consumerInfo) {
      console.log(
        `[BlacAdapter] getConsumerDependencies - No consumer info found`,
      );
      return null;
    }

    const deps = consumerInfo.tracker.computeDependencies();
    console.log(
      `[BlacAdapter] getConsumerDependencies - State paths:`,
      deps.statePaths,
    );
    console.log(
      `[BlacAdapter] getConsumerDependencies - Class paths:`,
      deps.classPaths,
    );
    return deps;
  }

  shouldNotifyConsumer(
    consumerRef: object,
    changedPaths: Set<string>,
  ): boolean {
    console.log(
      `[BlacAdapter] shouldNotifyConsumer called - Changed paths:`,
      Array.from(changedPaths),
    );

    const consumerInfo = this.consumers.get(consumerRef);
    if (!consumerInfo) {
      console.log(`🔌 [BlacAdapter] No consumer info - notifying by default`);
      return true; // If consumer not registered yet, notify by default
    }

    const dependencies = consumerInfo.tracker.computeDependencies();
    const allPaths = [...dependencies.statePaths, ...dependencies.classPaths];

    console.log(`🔌 [BlacAdapter] Consumer dependencies:`, allPaths);
    console.log(`🔌 [BlacAdapter] Has rendered: ${consumerInfo.hasRendered}`);

    // First render - always notify to establish baseline
    if (!consumerInfo.hasRendered) {
      console.log(`🔌 [BlacAdapter] First render - will notify`);
      return true;
    }

    // After first render, if no dependencies tracked, don't notify
    if (allPaths.length === 0) {
      console.log(`🔌 [BlacAdapter] No dependencies tracked - will NOT notify`);
      return false;
    }

    const shouldNotify = allPaths.some((path) => changedPaths.has(path));
    console.log(`🔌 [BlacAdapter] Dependency check result: ${shouldNotify}`);
    return shouldNotify;
  }

  updateLastNotified(consumerRef: object): void {
    const consumerInfo = this.consumers.get(consumerRef);
    if (consumerInfo) {
      consumerInfo.lastNotified = Date.now();
      consumerInfo.hasRendered = true;
      console.log(
        `🔌 [BlacAdapter] Updated last notified - Has rendered: true`,
      );
    } else {
      console.log(
        `🔌 [BlacAdapter] updateLastNotified - No consumer info found`,
      );
    }
  }

  // Removed getActiveConsumers() - WeakMaps cannot be iterated
  // Active consumer tracking is now handled by BlocBase._consumers

  resetConsumerTracking(): void {
    console.log(`🔌 [BlacAdapter] resetConsumerTracking called`);
    const consumerInfo = this.consumers.get(this.componentRef.current);
    if (consumerInfo) {
      consumerInfo.tracker.reset();
      console.log(`🔌 [BlacAdapter] Consumer tracking reset`);
    } else {
      console.log(`🔌 [BlacAdapter] No consumer info found to reset`);
    }
  }

  // Removed cleanup() - WeakMap handles garbage collection automatically

  createStateProxy = <T extends object>(
    props: Omit<
      Parameters<typeof ProxyFactory.createStateProxy>[0],
      'consumerTracker'
    > & { target: T },
  ): T => {
    return ProxyFactory.createStateProxy({
      ...props,
      consumerTracker: this,
    });
  };

  createClassProxy = <T extends object>(
    props: Omit<
      Parameters<typeof ProxyFactory.createClassProxy>[0],
      'consumerTracker'
    > & { target: T },
  ): T => {
    return ProxyFactory.createClassProxy({
      ...props,
      consumerTracker: this,
    });
  };

  updateBlocInstance(): InstanceType<B> {
    console.log(
      `Updating bloc instance for ${this.id} with constructor:`,
      this.blocConstructor,
    );
    this.blocInstance = Blac.instance.getBloc<B>(this.blocConstructor, {
      props: this.options?.props,
      id: this.options?.id,
      instanceRef: this.id,
    });
    return this.blocInstance;
  }

  createSubscription = (options: { onChange: () => void }) => {
    console.log(`🔌 [BlacAdapter] createSubscription called - ID: ${this.id}`);
    const unsubscribe = this.blocInstance._observer.subscribe({
      id: this.id,
      fn: () => {
        console.log(
          `[BlacAdapter] Subscription callback triggered - ID: ${this.id}`,
        );
        options.onChange();
      },
    });
    console.log(`🔌 [BlacAdapter] Subscription created`);
    return unsubscribe;
  };

  mount = (): void => {
    console.log(`🔌 [BlacAdapter] mount called - ID: ${this.id}`);
    console.log(
      `[BlacAdapter] Bloc instance: ${this.blocInstance._name} (${this.blocInstance._id})`,
    );

    this.blocInstance._addConsumer(this.id, this.componentRef.current);
    console.log(`🔌 [BlacAdapter] Added consumer to bloc`);

    // Call onMount callback if provided
    if (!this.calledOnMount) {
      this.calledOnMount = true;
      if (this.options?.onMount) {
        console.log(`🔌 [BlacAdapter] Calling onMount callback`);
        this.options.onMount(this.blocInstance);
      }
    }
  };

  unmount = (): void => {
    console.log(`🔌 [BlacAdapter] unmount called - ID: ${this.id}`);

    this.unregisterConsumer();

    // Unregister as consumer
    this.blocInstance._removeConsumer(this.id);
    console.log(`🔌 [BlacAdapter] Removed consumer from bloc`);

    // Call onUnmount callback
    if (this.options?.onUnmount) {
      console.log(`🔌 [BlacAdapter] Calling onUnmount callback`);
      this.options.onUnmount(this.blocInstance);
    }
  };

  getProxyState = (
    state: BlocState<InstanceType<B>>,
  ): BlocState<InstanceType<B>> => {
    console.log(`🔌 [BlacAdapter] getProxyState called`);
    console.log(`🔌 [BlacAdapter] State:`, state);

    /*
    if (this.options?.selector) {
      console.log(`🔌 [BlacAdapter] Returning raw state due to selector`);
      return state;
    }
    */

    // Reset tracking before each render
    // this.resetConsumerTracking();

    const proxy = this.createStateProxy({
      target: state,
      consumerRef: this.componentRef.current,
    });
    console.log(`🔌 [BlacAdapter] Created state proxy`);
    return proxy;
  };

  getProxyBlocInstance = (): InstanceType<B> => {
    console.log(`🔌 [BlacAdapter] getProxyBlocInstance called`);

    /*
    if (this.options?.selector) {
      console.log(
        `🔌 [BlacAdapter] Returning raw bloc instance due to selector`,
      );
      return this.blocInstance;
    }
    */

    const proxy = this.createClassProxy({
      target: this.blocInstance,
      consumerRef: this.componentRef.current,
    });
    console.log(`🔌 [BlacAdapter] Created bloc instance proxy`);
    return proxy;
  };
}
