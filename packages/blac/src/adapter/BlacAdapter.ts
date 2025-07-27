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
    }
  }

  registerConsumer(consumerRef: object): void {
    this.consumerRegistry.register(consumerRef, this.id);
  }

  unregisterConsumer = (): void => {
    this.consumerRegistry.unregister(this.componentRef.current);
  };

  trackAccess(
    consumerRef: object,
    type: 'state' | 'class',
    path: string,
    value?: any,
  ): void {
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
    this.blocInstance = Blac.instance.getBloc<B>(this.blocConstructor, {
      props: this.options?.props,
      id: this.options?.id,
      instanceRef: this.id,
    });
    return this.blocInstance;
  }

  createSubscription = (options: { onChange: () => void }) => {
    const unsubscribe = this.blocInstance._observer.subscribe({
      id: this.id,
      fn: (
        newState: BlocState<InstanceType<B>>,
        oldState: BlocState<InstanceType<B>>,
      ) => {
        // Handle dependency-based change detection
        if (this.isUsingDependencies && this.options?.dependencies) {
          const newValues = this.options.dependencies(this.blocInstance);
          const hasChanged = this.hasDependencyValuesChanged(
            this.dependencyValues,
            newValues,
          );

          if (!hasChanged) {
            return; // Don't trigger re-render
          }

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
              return; // Don't trigger re-render
            }
          }
        }

        options.onChange();
      },
    });

    return unsubscribe;
  };

  mount = (): void => {
    // Re-run dependencies on mount to ensure fresh values
    if (this.isUsingDependencies && this.options?.dependencies) {
      this.dependencyValues = this.options.dependencies(this.blocInstance);
    }

    this.lifecycleManager.mount(this.blocInstance, this.componentRef.current);
  };

  unmount = (): void => {
    this.unregisterConsumer();
    this.lifecycleManager.unmount(this.blocInstance);
  };

  getProxyState = (
    state: BlocState<InstanceType<B>>,
  ): BlocState<InstanceType<B>> => {
    if (this.isUsingDependencies) {
      return state; // Return raw state when using dependencies
    }

    return this.proxyProvider.getProxyState(state);
  };

  getProxyBlocInstance = (): InstanceType<B> => {
    if (this.isUsingDependencies) {
      return this.blocInstance; // Return raw instance when using dependencies
    }

    return this.proxyProvider.getProxyBlocInstance(this.blocInstance);
  };

  // Expose calledOnMount for backward compatibility
  get calledOnMount(): boolean {
    return this.lifecycleManager.hasCalledOnMount();
  }

  private hasDependencyValuesChanged(
    prev: unknown[] | undefined,
    next: unknown[],
  ): boolean {
    if (!prev) return true; // First run, always trigger
    if (prev.length !== next.length) return true;

    // Use Object.is for comparison (handles NaN, +0/-0 correctly)
    for (let i = 0; i < prev.length; i++) {
      if (!Object.is(prev[i], next[i])) {
        return true;
      }
    }

    return false;
  }
}
