import { Blac } from '../Blac';
import { BlocBase } from '../BlocBase';
import { BlocConstructor, BlocState } from '../types';
import { generateUUID } from '../utils/uuid';
import { generateInstanceIdFromProps } from '../utils/generateInstanceId';
import { ProxyFactory } from './ProxyFactory';

export interface AdapterOptions<B extends BlocBase<any>> {
  instanceId?: string;
  dependencies?: (bloc: B) => unknown[];
  staticProps?: any;
  onMount?: (bloc: B) => void;
  onUnmount?: (bloc: B) => void;
}

/**
 * BlacAdapter orchestrates the connection between Bloc instances and React components.
 * It manages dependency tracking, lifecycle hooks, and proxy creation.
 */
export class BlacAdapter<B extends BlocConstructor<BlocBase<any>>> {
  public readonly id = `adapter-${generateUUID()}`;
  public readonly blocConstructor: B;
  public readonly componentRef: { current: object } = { current: {} };
  public blocInstance: InstanceType<B>;

  unmountTime: number = 0;
  mountTime: number = 0;

  // Subscription management
  private subscriptionId?: string;
  private unsubscribe?: () => void;

  // Dependency tracking
  private dependencyValues?: unknown[];
  private isUsingDependencies: boolean = false;
  private trackedPaths = new Set<string>();

  // Lifecycle state
  private hasMounted = false;
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

    // Initialize bloc instance
    this.blocInstance = this.updateBlocInstance();

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
    if (this.subscriptionId) {
      const fullPath = type === 'class' ? `_class.${path}` : path;
      this.trackedPaths.add(fullPath);
      this.blocInstance.trackAccess(this.subscriptionId, fullPath, value);
    }
  }

  updateBlocInstance(): InstanceType<B> {
    // Determine the instance ID
    let instanceId = this.options?.instanceId;

    // If no explicit instanceId provided but staticProps exist, generate from them
    if (!instanceId && this.options?.staticProps) {
      const generatedId = generateInstanceIdFromProps(this.options.staticProps);
      if (generatedId) {
        instanceId = generatedId;
      }
    }

    this.blocInstance = Blac.instance.getBloc<B>(this.blocConstructor, {
      constructorParams: this.options?.staticProps,
      id: instanceId,
      instanceRef: this.id,
    });
    return this.blocInstance;
  }

  createSubscription = (options: { onChange: () => void }) => {
    // If using manual dependencies, create a selector-based subscription
    if (this.isUsingDependencies && this.options?.dependencies) {
      this.unsubscribe = this.blocInstance.subscribeWithSelector(
        (_state) => this.options!.dependencies!(this.blocInstance),
        (newValues) => {
          const hasChanged = this.hasDependencyValuesChanged(
            this.dependencyValues,
            newValues as unknown[],
          );

          if (hasChanged) {
            this.dependencyValues = newValues as unknown[];
            options.onChange();
          }
        },
      );
    } else {
      // Create a component subscription with weak reference
      const weakRef = new WeakRef(this.componentRef.current);
      this.unsubscribe = this.blocInstance.subscribeComponent(
        weakRef,
        options.onChange,
      );

      // Get the subscription ID for tracking
      const subscriptions = (this.blocInstance._subscriptionManager as any)
        .subscriptions as Map<string, any>;
      this.subscriptionId = Array.from(subscriptions.keys()).pop();
    }

    // Call onChange initially to establish baseline
    if (this.hasMounted) {
      options.onChange();
    }

    return () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = undefined;
        this.subscriptionId = undefined;
      }
    };
  };

  hasDependencyValuesChanged = (
    oldValues: unknown[] | undefined,
    newValues: unknown[],
  ): boolean => {
    if (!oldValues) return true;
    if (oldValues.length !== newValues.length) return true;

    for (let i = 0; i < oldValues.length; i++) {
      if (!Object.is(oldValues[i], newValues[i])) {
        return true;
      }
    }

    return false;
  };

  getStateProxy = (): BlocState<InstanceType<B>> => {
    // If using manual dependencies, return raw state
    if (this.isUsingDependencies) {
      return this.blocInstance.state;
    }

    // Otherwise create proxy for automatic dependency tracking
    return this.createStateProxy({ target: this.blocInstance.state });
  };

  getBlocProxy = (): InstanceType<B> => {
    // If using manual dependencies, return raw bloc
    if (this.isUsingDependencies) {
      return this.blocInstance;
    }

    // Otherwise create proxy for automatic dependency tracking
    return this.createClassProxy({ target: this.blocInstance });
  };

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

  // Lifecycle methods
  mount = () => {
    this.hasMounted = true;
    this.mountCount++;
    this.mountTime = Date.now();

    // Call onMount hook
    if (this.options?.onMount) {
      this.options.onMount(this.blocInstance);
    }

    // Refresh dependencies if using manual tracking
    if (this.isUsingDependencies && this.options?.dependencies) {
      this.dependencyValues = this.options.dependencies(this.blocInstance);
    }
  };

  unmount = () => {
    this.unmountTime = Date.now();

    // Cancel subscription
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
      this.subscriptionId = undefined;
    }

    // Call onUnmount hook
    if (this.options?.onUnmount) {
      try {
        this.options.onUnmount(this.blocInstance);
      } catch (error) {
        console.error('Error in onUnmount hook:', error);
      }
    }
  };

  // Reset tracking for next render
  resetTracking(): void {
    this.trackedPaths.clear();
  }
}
