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
  private consumerRefs = new Map<string, WeakRef<object>>();
  options?: AdapterOptions<InstanceType<B>>;

  constructor(
    instanceProps: { componentRef: { current: object }; blocConstructor: B },
    options?: typeof this.options,
  ) {
    this.options = options;
    this.blocConstructor = instanceProps.blocConstructor;
    this.blocInstance = this.updateBlocInstance();
    this.componentRef = instanceProps.componentRef;
    this.registerConsumer(instanceProps.componentRef.current);
  }

  registerConsumer(consumerRef: object): void {
    if (this.options?.selector) {
      return;
    }
    const tracker = new DependencyTracker();

    this.consumers.set(consumerRef, {
      id: this.id,
      tracker,
      lastNotified: Date.now(),
      hasRendered: false,
    });

    this.consumerRefs.set(this.id, new WeakRef(consumerRef));
  }

  unregisterConsumer = (): void => {
    const weakRef = this.consumerRefs.get(this.id);
    if (weakRef) {
      const consumerRef = weakRef.deref();
      if (consumerRef) {
        this.consumers.delete(consumerRef);
      }
      this.consumerRefs.delete(this.id);
    }
  };

  trackAccess(
    consumerRef: object,
    type: 'state' | 'class',
    path: string,
  ): void {
    const consumerInfo = this.consumers.get(consumerRef);
    if (!consumerInfo) return;

    if (type === 'state') {
      consumerInfo.tracker.trackStateAccess(path);
    } else {
      consumerInfo.tracker.trackClassAccess(path);
    }
  }

  getConsumerDependencies(consumerRef: object): DependencyArray | null {
    const consumerInfo = this.consumers.get(consumerRef);
    if (!consumerInfo) return null;

    return consumerInfo.tracker.computeDependencies();
  }

  shouldNotifyConsumer(
    consumerRef: object,
    changedPaths: Set<string>,
  ): boolean {
    const consumerInfo = this.consumers.get(consumerRef);
    if (!consumerInfo) return true; // If consumer not registered yet, notify by default

    const dependencies = consumerInfo.tracker.computeDependencies();
    const allPaths = [...dependencies.statePaths, ...dependencies.classPaths];

    // First render - always notify to establish baseline
    if (!consumerInfo.hasRendered) {
      return true;
    }

    // After first render, if no dependencies tracked, don't notify
    if (allPaths.length === 0) {
      return false;
    }

    return allPaths.some((path) => changedPaths.has(path));
  }

  updateLastNotified(consumerRef: object): void {
    const consumerInfo = this.consumers.get(consumerRef);
    if (consumerInfo) {
      consumerInfo.lastNotified = Date.now();
      consumerInfo.hasRendered = true;
    }
  }

  getActiveConsumers(): Array<{ id: string; ref: object }> {
    const active: Array<{ id: string; ref: object }> = [];

    for (const [id, weakRef] of this.consumerRefs.entries()) {
      const ref = weakRef.deref();
      if (ref) {
        active.push({ id, ref });
      } else {
        this.consumerRefs.delete(id);
      }
    }

    return active;
  }

  resetConsumerTracking(): void {
    const consumerInfo = this.consumers.get(this.componentRef.current);
    if (consumerInfo) {
      consumerInfo.tracker.reset();
    }
  }

  cleanup(): void {
    const idsToRemove: string[] = [];

    for (const [id, weakRef] of this.consumerRefs.entries()) {
      if (!weakRef.deref()) {
        idsToRemove.push(id);
      }
    }

    idsToRemove.forEach((id) => this.consumerRefs.delete(id));
  }

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
    return this.blocInstance._observer.subscribe({
      id: this.id,
      fn: () => options.onChange(),
    });
  };

  mount = (): void => {
    this.blocInstance._addConsumer(this.id, this.consumerRefs);

    // Call onMount callback if provided
    if (!this.calledOnMount) {
      this.calledOnMount = true;
      this.options?.onMount?.(this.blocInstance);
    }
  };

  unmount = (): void => {
    this.unregisterConsumer();

    // Unregister as consumer
    this.blocInstance._removeConsumer(this.id);

    // Call onUnmount callback
    this.options?.onUnmount?.(this.blocInstance);
  };

  getProxyState = (
    state: BlocState<InstanceType<B>>,
  ): BlocState<InstanceType<B>> => {
    if (this.options?.selector) {
      return state;
    }

    // Reset tracking before each render
    this.resetConsumerTracking();

    return this.createStateProxy({
      target: state,
      consumerRef: this.componentRef.current,
    });
  };

  getProxyBlocInstance = (): InstanceType<B> => {
    if (this.options?.selector) {
      return this.blocInstance;
    }

    return this.createClassProxy({
      target: this.blocInstance,
      consumerRef: this.componentRef.current,
    });
  };
}
