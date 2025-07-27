import { Blac, GetBlocOptions } from '../Blac';
import { BlocBase } from '../BlocBase';
import { BlocConstructor, BlocState, InferPropsFromGeneric } from '../types';
import { generateUUID } from '../utils/uuid';
import { ConsumerTracker, DependencyArray } from './ConsumerTracker';
import { ProxyFactory } from './ProxyFactory';

export interface AdapterOptions<B extends BlocBase<any>> {
  id?: string;
  dependencies?: (bloc: B) => unknown[];
  props?: InferPropsFromGeneric<B>;
  onMount?: (bloc: B) => void;
  onUnmount?: (bloc: B) => void;
}

/**
 * BlacAdapter orchestrates the connection between Bloc instances and React components.
 * It manages dependency tracking, lifecycle hooks, and proxy creation.
 */
export class BlacAdapter<B extends BlocConstructor<BlocBase<any>>> {
  public readonly id = `consumer-${generateUUID()}`;
  public readonly blocConstructor: B;
  public readonly componentRef: { current: object } = { current: {} };
  public blocInstance: InstanceType<B>;

  // Core components
  private consumerTracker: ConsumerTracker;

  // Dependency tracking
  private dependencyValues?: unknown[];
  private isUsingDependencies: boolean = false;

  // Lifecycle state
  private hasMounted = false;
  private mountTime = 0;
  private unmountTime = 0;
  private mountCount = 0;

  options?: AdapterOptions<InstanceType<B>>;

  constructor(
    instanceProps: { componentRef: { current: object }; blocConstructor: B },
    options?: typeof this.options,
  ) {
    this.options = options;
    this.blocConstructor = instanceProps.blocConstructor;
    this.componentRef = instanceProps.componentRef;
    this.isUsingDependencies = !!options?.dependencies;

    // Initialize consumer tracker
    this.consumerTracker = new ConsumerTracker();

    // Initialize bloc instance and register consumer
    this.blocInstance = this.updateBlocInstance();
    this.consumerTracker.register(instanceProps.componentRef.current, this.id);

    // Initialize dependency values if using dependencies
    if (this.isUsingDependencies && options?.dependencies) {
      this.dependencyValues = options.dependencies(this.blocInstance);
    }
  }

  trackAccess(
    consumerRef: object,
    type: 'state' | 'class',
    path: string,
    value?: any,
  ): void {
    this.consumerTracker.trackAccess(consumerRef, type, path, value);
  }

  getConsumerDependencies(consumerRef: object): DependencyArray | null {
    return this.consumerTracker.getDependencies(consumerRef);
  }

  shouldNotifyConsumer(
    consumerRef: object,
    changedPaths: Set<string>,
  ): boolean {
    const consumerInfo = this.consumerTracker.getConsumerInfo(consumerRef);
    if (!consumerInfo) {
      return true; // If consumer not registered yet, notify by default
    }

    // First render - always notify to establish baseline
    if (!consumerInfo.hasRendered) {
      return true;
    }

    // Use built-in method from ConsumerTracker
    return this.consumerTracker.shouldNotifyConsumer(consumerRef, changedPaths);
  }

  updateLastNotified(consumerRef: object): void {
    this.consumerTracker.updateLastNotified(consumerRef);
    this.consumerTracker.setHasRendered(consumerRef, true);
  }

  resetConsumerTracking(): void {
    this.consumerTracker.resetTracking(this.componentRef.current);
  }

  createStateProxy = <T extends object>(props: { target: T }): T => {
    return ProxyFactory.createStateProxy({
      target: props.target,
      consumerRef: this.componentRef.current,
      consumerTracker: this as any,
    });
  };

  createClassProxy = <T extends object>(props: { target: T }): T => {
    return ProxyFactory.createClassProxy({
      target: props.target,
      consumerRef: this.componentRef.current,
      consumerTracker: this as any,
    });
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
          const consumerInfo = this.consumerTracker.getConsumerInfo(
            this.componentRef.current,
          );
          if (consumerInfo && consumerInfo.hasRendered) {
            // Only check dependencies if component has rendered at least once
            const hasChanged = this.consumerTracker.hasValuesChanged(
              this.componentRef.current,
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

    // Lifecycle management
    this.mountCount++;
    this.blocInstance._addConsumer(this.id, this.componentRef.current);

    // Call onMount callback if provided and not already called
    if (!this.hasMounted) {
      this.hasMounted = true;
      this.mountTime = Date.now();

      if (this.options?.onMount) {
        try {
          this.options.onMount(this.blocInstance);
        } catch (error) {
          throw error;
        }
      }
    }
  };

  unmount = (): void => {
    this.unmountTime = Date.now();
    this.consumerTracker.unregister(this.componentRef.current);
    this.blocInstance._removeConsumer(this.id);

    // Call onUnmount callback
    if (this.options?.onUnmount) {
      try {
        this.options.onUnmount(this.blocInstance);
      } catch (error) {
        // Don't re-throw on unmount to allow cleanup to continue
      }
    }
  };

  getProxyState = (
    state: BlocState<InstanceType<B>>,
  ): BlocState<InstanceType<B>> => {
    if (this.isUsingDependencies) {
      return state; // Return raw state when using dependencies
    }

    return ProxyFactory.getProxyState({
      state,
      consumerRef: this.componentRef.current,
      consumerTracker: this as any,
    });
  };

  getProxyBlocInstance = (): InstanceType<B> => {
    if (this.isUsingDependencies) {
      return this.blocInstance; // Return raw instance when using dependencies
    }

    return ProxyFactory.getProxyBlocInstance({
      blocInstance: this.blocInstance,
      consumerRef: this.componentRef.current,
      consumerTracker: this as any,
    });
  };

  // Expose calledOnMount for backward compatibility
  get calledOnMount(): boolean {
    return this.hasMounted;
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
