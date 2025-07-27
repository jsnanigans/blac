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
  dependencies?: (bloc: B) => unknown[];
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

  // Dependency tracking
  private dependencyValues?: unknown[];
  private isUsingDependencies: boolean = false;

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
      hasDependencies: !!options?.dependencies,
      hasProps: !!options?.props,
      hasOnMount: !!options?.onMount,
      hasOnUnmount: !!options?.onUnmount,
      id: options?.id,
    });

    this.options = options;
    this.blocConstructor = instanceProps.blocConstructor;
    this.componentRef = instanceProps.componentRef;
    this.isUsingDependencies = !!options?.dependencies;

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

    // Initialize dependency values if using dependencies
    if (this.isUsingDependencies && options?.dependencies) {
      this.dependencyValues = options.dependencies(this.blocInstance);
      console.log(
        `🔌 [BlacAdapter] Dependencies mode enabled - Initial values:`,
        this.dependencyValues
      );
    }

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
    value?: any,
  ): void {
    console.log(
      `🔌 [BlacAdapter] trackAccess - Type: ${type}, Path: ${path}, Consumer ID: ${this.id}`,
    );
    this.dependencyOrchestrator.trackAccess(consumerRef, type, path, value);
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
      `🔌 [BlacAdapter] Current observer count: ${this.blocInstance._observer.observers?.size || 0}`,
    );

    const unsubscribe = this.blocInstance._observer.subscribe({
      id: this.id,
      fn: (
        newState: BlocState<InstanceType<B>>,
        oldState: BlocState<InstanceType<B>>,
      ) => {
        const callbackStart = performance.now();
        console.log(
          `🔌 [BlacAdapter] 📢 Subscription callback triggered - ID: ${this.id}`,
        );

        // Handle dependency-based change detection
        if (this.isUsingDependencies && this.options?.dependencies) {
          console.log(
            `🔌 [BlacAdapter] 🎯 Dependencies mode - Running dependency function for change detection`,
          );
          
          const newValues = this.options.dependencies(this.blocInstance);
          const hasChanged = this.hasDependencyValuesChanged(
            this.dependencyValues,
            newValues
          );
          
          if (!hasChanged) {
            console.log(
              `🔌 [BlacAdapter] 🚫 Dependency values unchanged - skipping re-render`,
            );
            const callbackEnd = performance.now();
            console.log(
              `🔌 [BlacAdapter] ⏱️ Dependency check time: ${(callbackEnd - callbackStart).toFixed(2)}ms`,
            );
            return; // Don't trigger re-render
          }
          
          console.log(
            `🔌 [BlacAdapter] ✅ Dependency values changed - triggering re-render`,
          );
          console.log(
            `🔌 [BlacAdapter] Previous values:`,
            this.dependencyValues
          );
          console.log(`🔌 [BlacAdapter] New values:`, newValues);
          
          this.dependencyValues = newValues;
        } else {
          // Check if any tracked values have changed (proxy-based tracking)
          const consumerInfo = this.consumerRegistry.getConsumerInfo(
            this.componentRef.current,
          );
          if (consumerInfo && consumerInfo.hasRendered) {
            // Only check dependencies if component has rendered at least once
            const hasChanged = consumerInfo.tracker.hasValuesChanged(
              newState,
              this.blocInstance,
            );

            if (!hasChanged) {
              console.log(
                `🔌 [BlacAdapter] 🚫 No tracked dependencies changed - skipping re-render`,
              );
              const callbackEnd = performance.now();
              console.log(
                `🔌 [BlacAdapter] ⏱️ Dependency check time: ${(callbackEnd - callbackStart).toFixed(2)}ms`,
              );
              return; // Don't trigger re-render
            }

            console.log(
              `🔌 [BlacAdapter] ✅ Tracked dependencies changed - triggering re-render`,
            );
          } else {
            console.log(
              `🔌 [BlacAdapter] 🆕 First render or no consumer info - triggering re-render to establish baseline`,
            );
          }
        }

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

    // Re-run dependencies on mount to ensure fresh values
    if (this.isUsingDependencies && this.options?.dependencies) {
      this.dependencyValues = this.options.dependencies(this.blocInstance);
      console.log(
        `🔌 [BlacAdapter] Dependency values refreshed on mount:`,
        this.dependencyValues
      );
    }

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
    if (this.isUsingDependencies) {
      console.log(
        `🔌 [BlacAdapter] Dependencies mode - Bypassing state proxy creation`,
      );
      return state; // Return raw state when using dependencies
    }
    
    console.log(
      `🔌 [BlacAdapter] getProxyState called - State keys: ${Object.keys(state).join(', ')}`,
    );
    return this.proxyProvider.getProxyState(state);
  };

  getProxyBlocInstance = (): InstanceType<B> => {
    if (this.isUsingDependencies) {
      console.log(
        `🔌 [BlacAdapter] Dependencies mode - Bypassing bloc proxy creation`,
      );
      return this.blocInstance; // Return raw instance when using dependencies
    }
    
    console.log(
      `🔌 [BlacAdapter] getProxyBlocInstance called - Bloc: ${this.blocInstance._name} (${this.blocInstance._id})`,
    );
    return this.proxyProvider.getProxyBlocInstance(this.blocInstance);
  };

  // Expose calledOnMount for backward compatibility
  get calledOnMount(): boolean {
    return this.lifecycleManager.hasCalledOnMount();
  }

  private hasDependencyValuesChanged(
    prev: unknown[] | undefined,
    next: unknown[]
  ): boolean {
    if (!prev) return true; // First run, always trigger
    if (prev.length !== next.length) return true;
    
    // Use Object.is for comparison (handles NaN, +0/-0 correctly)
    for (let i = 0; i < prev.length; i++) {
      if (!Object.is(prev[i], next[i])) {
        console.log(
          `🔌 [BlacAdapter] Dependency at index ${i} changed: ${JSON.stringify(prev[i])} -> ${JSON.stringify(next[i])}`
        );
        return true;
      }
    }
    
    return false;
  }
}
