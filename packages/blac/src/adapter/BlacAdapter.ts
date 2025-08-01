import { Blac } from '../Blac';
import { BlocBase } from '../BlocBase';
import { BlocConstructor, BlocState } from '../types';
import { generateUUID } from '../utils/uuid';
import { generateInstanceIdFromProps } from '../utils/generateInstanceId';
import { ConsumerTracker, DependencyArray } from './ConsumerTracker';
import { ProxyFactory } from './ProxyFactory';

export interface AdapterOptions<B extends BlocBase<any>> {
  instanceId?: string;
  dependencies?: (bloc: B) => unknown[];
  staticProps?: any;
  onMount?: (bloc: B) => void;
  onUnmount?: (bloc: B) => void;
}

/**
 * BlacAdapter v3 - Generator-based implementation
 * Manages the connection between Bloc instances and React components using async generators
 */
export class BlacAdapter<B extends BlocConstructor<BlocBase<any>>> {
  public readonly id = `consumer-${generateUUID()}`;
  public readonly blocConstructor: B;
  public readonly componentRef: { current: object } = { current: {} };
  public blocInstance: InstanceType<B>;

  // Core components
  private consumerTracker: ConsumerTracker;

  unmountTime: number = 0;
  mountTime: number = 0;

  // Dependency tracking
  private dependencyValues?: unknown[];
  private isUsingDependencies: boolean = false;

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

  private updateBlocInstance(): InstanceType<B> {
    const instanceKey = this.options?.instanceId || 
      (this.options?.staticProps ? generateInstanceIdFromProps(this.options.staticProps) : null) || 
      this.blocConstructor.name;

    this.blocInstance = Blac.getBloc(this.blocConstructor, {
      id: instanceKey,
      constructorParams: this.options?.staticProps,
      instanceRef: this.id,
    });
    return this.blocInstance;
  }

  /**
   * Creates a generator-based state stream with dependency checking
   */
  async *createStateStream(): AsyncGenerator<BlocState<InstanceType<B>>, void, void> {
    let isFirst = true;
    
    for await (const newState of this.blocInstance.stateStream()) {
      // Skip initial state from stateStream since it's already handled by useSyncExternalStore
      if (isFirst) {
        isFirst = false;
        continue;
      }
      // Case 1: Manual dependencies provided
      if (this.isUsingDependencies && this.options?.dependencies) {
        const newValues = this.options.dependencies(this.blocInstance);
        const hasChanged = this.hasDependencyValuesChanged(
          this.dependencyValues,
          newValues,
        );

        if (!hasChanged) {
          continue; // Skip this state update
        }

        this.dependencyValues = newValues;
      }
      
      // Case 2: Proxy tracking
      else if (Blac.config.proxyDependencyTracking) {
        const changedPaths = this.getChangedPaths(this.blocInstance._oldState || this.blocInstance.state, newState);
        
        if (!this.shouldNotifyConsumer(this.componentRef.current, changedPaths)) {
          continue; // Skip this update
        }
      }

      // Yield the new state
      yield newState;
    }
  }

  private hasDependencyValuesChanged(
    oldValues: unknown[] | undefined,
    newValues: unknown[],
  ): boolean {
    if (!oldValues) return true;
    if (oldValues.length !== newValues.length) return true;
    
    for (let i = 0; i < newValues.length; i++) {
      if (!Object.is(oldValues[i], newValues[i])) {
        return true;
      }
    }
    
    return false;
  }

  private getChangedPaths(oldState: any, newState: any): Set<string> {
    const paths = new Set<string>();
    
    const traverse = (oldObj: any, newObj: any, path: string = '') => {
      if (oldObj === newObj) return;
      
      if (typeof newObj !== 'object' || newObj === null) {
        paths.add(path);
        return;
      }
      
      for (const key in newObj) {
        const newPath = path ? `${path}.${key}` : key;
        if (!Object.is(oldObj?.[key], newObj[key])) {
          traverse(oldObj?.[key], newObj[key], newPath);
        }
      }
    };
    
    traverse(oldState, newState);
    return paths;
  }

  resetConsumerTracking(): void {
    this.consumerTracker.resetTracking(this.componentRef.current);
  }

  mount(): void {
    this.mountCount++;
    this.hasMounted = true;
    this.mountTime = Date.now();

    // Add consumer to bloc
    this.blocInstance._addConsumer(this.id, this.componentRef.current);

    // Call onMount lifecycle
    if (this.options?.onMount) {
      this.options.onMount(this.blocInstance);
    }
  }

  unmount(): void {
    this.unmountTime = Date.now();

    // Remove consumer from bloc
    this.blocInstance._removeConsumer(this.id);

    // Call onUnmount lifecycle
    if (this.options?.onUnmount) {
      this.options.onUnmount(this.blocInstance);
    }

    // Cleanup consumer tracking
    this.consumerTracker.unregister(this.componentRef.current);
  }

  getProxyState(rawState: BlocState<InstanceType<B>>): BlocState<InstanceType<B>> {
    if (!Blac.config.proxyDependencyTracking) {
      return rawState;
    }

    return ProxyFactory.createStateProxy({
      target: rawState,
      consumerRef: this.componentRef.current,
      consumerTracker: this,
    });
  }

  getProxyBlocInstance(): InstanceType<B> {
    if (!Blac.config.proxyDependencyTracking) {
      return this.blocInstance;
    }

    return ProxyFactory.createClassProxy({
      target: this.blocInstance,
      consumerRef: this.componentRef.current,
      consumerTracker: this,
    });
  }
}