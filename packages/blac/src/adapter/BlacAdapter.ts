import { Blac, GetBlocOptions } from '../Blac';
import { BlocBase } from '../BlocBase';
import { BlocConstructor, BlocState, InferPropsFromGeneric } from '../types';
import { generateUUID } from '../utils/uuid';
import { DependencyArray } from './DependencyTracker';
import { ConsumerRegistry } from './ConsumerRegistry';
import { DependencyOrchestrator } from './DependencyOrchestrator';
import { NotificationManager } from './NotificationManager';
import { ProxyProvider } from './ProxyProvider';
import { LifecycleManager } from './LifecycleManager';

export interface AdapterOptions<B extends BlocBase<any>> {
  id?: string;
  selector?: (state: BlocState<B>, bloc: B) => any;
  props?: InferPropsFromGeneric<B>;
  onMount?: (bloc: B) => void;
  onUnmount?: (bloc: B) => void;
}

/**
 * BlacAdapter orchestrates the various responsibilities of managing a Bloc instance
 * and its connection to React components. It delegates specific tasks to focused classes.
 */
export class BlacAdapter<B extends BlocConstructor<BlocBase<any>>> {
  public readonly id = `consumer-${generateUUID()}`;
  public readonly blocConstructor: B;
  public readonly componentRef: { current: object } = { current: {} };
  public blocInstance: InstanceType<B>;

  // Delegated responsibilities
  private consumerRegistry: ConsumerRegistry;
  private dependencyOrchestrator: DependencyOrchestrator;
  private notificationManager: NotificationManager;
  private proxyProvider: ProxyProvider;
  private lifecycleManager: LifecycleManager<InstanceType<B>>;

  options?: AdapterOptions<InstanceType<B>>;

  constructor(
    instanceProps: { componentRef: { current: object }; blocConstructor: B },
    options?: typeof this.options,
  ) {
    const startTime = performance.now();
    console.log(`🔌 [BlacAdapter] Constructor called - ID: ${this.id}`);
    console.log(
      `🔌 [BlacAdapter] Constructor name: ${instanceProps.blocConstructor.name}`,
    );
    console.log(`🔌 [BlacAdapter] Options:`, {
      hasSelector: !!options?.selector,
      hasProps: !!options?.props,
      hasOnMount: !!options?.onMount,
      hasOnUnmount: !!options?.onUnmount,
      id: options?.id,
    });

    this.options = options;
    this.blocConstructor = instanceProps.blocConstructor;
    this.componentRef = instanceProps.componentRef;

    // Initialize delegated responsibilities
    this.consumerRegistry = new ConsumerRegistry();
    this.dependencyOrchestrator = new DependencyOrchestrator(
      this.consumerRegistry,
    );
    this.notificationManager = new NotificationManager(this.consumerRegistry);
    this.proxyProvider = new ProxyProvider({
      consumerRef: this.componentRef.current,
      consumerTracker: this,
    });
    this.lifecycleManager = new LifecycleManager(this.id, {
      onMount: options?.onMount,
      onUnmount: options?.onUnmount,
    });

    // Initialize bloc instance and register consumer
    this.blocInstance = this.updateBlocInstance();
    this.registerConsumer(instanceProps.componentRef.current);

    const endTime = performance.now();
    console.log(
      `🔌 [BlacAdapter] Constructor complete - Bloc instance ID: ${this.blocInstance._id}`,
    );
    console.log(
      `🔌 [BlacAdapter] ⏱️ Constructor execution time: ${(endTime - startTime).toFixed(2)}ms`,
    );
  }

  registerConsumer(consumerRef: object): void {
    console.log(`🔌 [BlacAdapter] registerConsumer called - ID: ${this.id}`);
    this.consumerRegistry.register(consumerRef, this.id);
  }

  unregisterConsumer = (): void => {
    console.log(`🔌 [BlacAdapter] unregisterConsumer called - ID: ${this.id}`);
    this.consumerRegistry.unregister(this.componentRef.current);
  };

  trackAccess(
    consumerRef: object,
    type: 'state' | 'class',
    path: string,
  ): void {
    console.log(
      `🔌 [BlacAdapter] trackAccess - Type: ${type}, Path: ${path}, Consumer ID: ${this.id}`,
    );
    this.dependencyOrchestrator.trackAccess(consumerRef, type, path);
  }

  getConsumerDependencies(consumerRef: object): DependencyArray | null {
    return this.dependencyOrchestrator.getConsumerDependencies(consumerRef);
  }

  shouldNotifyConsumer(
    consumerRef: object,
    changedPaths: Set<string>,
  ): boolean {
    return this.notificationManager.shouldNotifyConsumer(
      consumerRef,
      changedPaths,
    );
  }

  updateLastNotified(consumerRef: object): void {
    this.notificationManager.updateLastNotified(consumerRef);
  }

  resetConsumerTracking(): void {
    this.dependencyOrchestrator.resetConsumerTracking(
      this.componentRef.current,
    );
  }

  // These proxy creation methods are kept for backward compatibility
  // but now delegate to ProxyProvider
  createStateProxy = <T extends object>(props: { target: T }): T => {
    return this.proxyProvider.createStateProxy(props.target);
  };

  createClassProxy = <T extends object>(props: { target: T }): T => {
    return this.proxyProvider.createClassProxy(props.target);
  };

  updateBlocInstance(): InstanceType<B> {
    const startTime = performance.now();
    console.log(
      `🔌 [BlacAdapter] Updating bloc instance for ${this.id} with constructor: ${this.blocConstructor.name}`,
    );
    console.log(`🔌 [BlacAdapter] GetBloc options:`, {
      props: this.options?.props,
      id: this.options?.id,
      instanceRef: this.id,
    });

    const previousInstance = this.blocInstance;
    this.blocInstance = Blac.instance.getBloc<B>(this.blocConstructor, {
      props: this.options?.props,
      id: this.options?.id,
      instanceRef: this.id,
    });

    const endTime = performance.now();
    console.log(
      `🔌 [BlacAdapter] Bloc instance updated - Previous: ${previousInstance?._id || 'none'}, New: ${this.blocInstance._id}`,
    );
    console.log(
      `🔌 [BlacAdapter] ⏱️ UpdateBlocInstance execution time: ${(endTime - startTime).toFixed(2)}ms`,
    );
    return this.blocInstance;
  }

  createSubscription = (options: { onChange: () => void }) => {
    const startTime = performance.now();
    console.log(`🔌 [BlacAdapter] createSubscription called - ID: ${this.id}`);
    console.log(
      `🔌 [BlacAdapter] Current observer count: ${this.blocInstance._observer['_observers']?.length || 0}`,
    );

    const unsubscribe = this.blocInstance._observer.subscribe({
      id: this.id,
      fn: () => {
        const callbackStart = performance.now();
        console.log(
          `🔌 [BlacAdapter] 📢 Subscription callback triggered - ID: ${this.id}`,
        );
        options.onChange();
        const callbackEnd = performance.now();
        console.log(
          `🔌 [BlacAdapter] ⏱️ Callback execution time: ${(callbackEnd - callbackStart).toFixed(2)}ms`,
        );
      },
    });

    const endTime = performance.now();
    console.log(`🔌 [BlacAdapter] Subscription created successfully`);
    console.log(
      `🔌 [BlacAdapter] ⏱️ CreateSubscription execution time: ${(endTime - startTime).toFixed(2)}ms`,
    );
    return unsubscribe;
  };

  mount = (): void => {
    const startTime = performance.now();
    console.log(`🔌 [BlacAdapter] 🏔️ mount called - ID: ${this.id}`);
    console.log(
      `🔌 [BlacAdapter] Mount state - Has onMount: ${!!this.options?.onMount}, Already mounted: ${this.calledOnMount}`,
    );

    this.lifecycleManager.mount(this.blocInstance, this.componentRef.current);

    const endTime = performance.now();
    console.log(
      `🔌 [BlacAdapter] ⏱️ Mount execution time: ${(endTime - startTime).toFixed(2)}ms`,
    );
  };

  unmount = (): void => {
    const startTime = performance.now();
    console.log(`🔌 [BlacAdapter] 🏚️ unmount called - ID: ${this.id}`);
    console.log(
      `🔌 [BlacAdapter] Unmount state - Has onUnmount: ${!!this.options?.onUnmount}`,
    );

    this.unregisterConsumer();
    this.lifecycleManager.unmount(this.blocInstance);

    const endTime = performance.now();
    console.log(
      `🔌 [BlacAdapter] ⏱️ Unmount execution time: ${(endTime - startTime).toFixed(2)}ms`,
    );
  };

  getProxyState = (
    state: BlocState<InstanceType<B>>,
  ): BlocState<InstanceType<B>> => {
    console.log(
      `🔌 [BlacAdapter] getProxyState called - State keys: ${Object.keys(state).join(', ')}`,
    );
    return this.proxyProvider.getProxyState(state);
  };

  getProxyBlocInstance = (): InstanceType<B> => {
    console.log(
      `🔌 [BlacAdapter] getProxyBlocInstance called - Bloc: ${this.blocInstance._name} (${this.blocInstance._id})`,
    );
    return this.proxyProvider.getProxyBlocInstance(this.blocInstance);
  };

  // Expose calledOnMount for backward compatibility
  get calledOnMount(): boolean {
    return this.lifecycleManager.hasCalledOnMount();
  }
}
