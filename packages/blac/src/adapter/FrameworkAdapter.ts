import { BlocBase, BlocConstructor } from '../bloc/BlocBase';
import { ConsumerTracker } from './tracking';
import { ProxyFactory } from './proxy';

/**
 * Lifecycle hooks for framework integration
 */
export interface LifecycleHooks<B extends BlocBase<any>> {
  onMount?: (bloc: B) => void;
  onUnmount?: (bloc: B) => void;
}

/**
 * Framework-specific adapter options
 */
export interface FrameworkAdapterOptions<B extends BlocBase<any>> {
  /** Unique identifier for the consumer */
  consumerId: string;
  /** Consumer reference (e.g., component instance) */
  consumerRef: object;
  /** Lifecycle callbacks */
  hooks?: LifecycleHooks<B>;
  /** Enable proxy-based dependency tracking */
  enableProxyTracking?: boolean;
  /** Custom selector function */
  selector?: (state: any, bloc: B) => any;
}

/**
 * Subscription handle returned by framework adapter
 */
export interface SubscriptionHandle {
  /** Unsubscribe function */
  unsubscribe: () => void;
  /** Get current state snapshot */
  getSnapshot: () => any;
}

/**
 * Abstract base class for framework-specific adapters
 * Provides common patterns for integrating Blac with UI frameworks
 */
export abstract class FrameworkAdapter<B extends BlocBase<any>> {
  protected bloc: B;
  protected options: FrameworkAdapterOptions<B>;
  protected consumerTracker?: ConsumerTracker;
  private lifecycleInitialized = false;
  private isSubscribed = false;

  constructor(bloc: B, options: FrameworkAdapterOptions<B>) {
    this.bloc = bloc;
    this.options = options;
    
    if (options.enableProxyTracking && !options.selector) {
      this.consumerTracker = new ConsumerTracker();
      this.consumerTracker.registerConsumer(
        options.consumerId,
        options.consumerRef
      );
    }
  }

  /**
   * Initialize lifecycle and consumer registration
   */
  initialize(): void {
    if (!this.lifecycleInitialized) {
      this.lifecycleInitialized = true;
      this.bloc._addConsumer(this.options.consumerId, this.options.consumerRef);
      this.options.hooks?.onMount?.(this.bloc);
    }
  }

  /**
   * Create subscription to bloc state changes
   */
  createSubscription(onChange: () => void): SubscriptionHandle {
    // Ensure initialized
    this.initialize();

    // Prevent double subscription
    if (this.isSubscribed) {
      throw new Error('Adapter already has an active subscription');
    }
    this.isSubscribed = true;

    // Subscribe to state changes
    const unsubscribe = this.bloc._observer.subscribe({
      id: this.options.consumerId,
      fn: onChange,
    });

    return {
      unsubscribe: () => {
        unsubscribe();
        this.isSubscribed = false;
      },
      getSnapshot: () => this.getStateSnapshot(),
    };
  }

  /**
   * Get current state snapshot with optional proxy wrapping
   */
  protected getStateSnapshot(): any {
    const rawState = this.bloc.state;

    if (this.options.selector) {
      return this.options.selector(rawState, this.bloc);
    }

    if (this.options.enableProxyTracking && this.consumerTracker) {
      // Reset tracking before creating proxy
      this.consumerTracker.resetConsumerTracking(this.options.consumerRef);
      return this.createStateProxy(rawState);
    }

    return rawState;
  }

  /**
   * Cleanup lifecycle and consumer registration
   */
  cleanup(): void {
    if (this.lifecycleInitialized) {
      // Remove consumer
      this.bloc._removeConsumer(this.options.consumerId);
      
      // Cleanup lifecycle
      this.options.hooks?.onUnmount?.(this.bloc);
      this.lifecycleInitialized = false;

      // Cleanup consumer tracker
      if (this.consumerTracker) {
        this.consumerTracker.unregisterConsumer(this.options.consumerId);
      }
    }
  }

  /**
   * Create proxy wrapper for state
   */
  protected createStateProxy(state: any): any {
    if (!this.consumerTracker) {
      return state;
    }
    
    return ProxyFactory.createStateProxy(
      state,
      this.options.consumerRef,
      this.consumerTracker
    );
  }

  /**
   * Get proxy-wrapped bloc instance if needed
   */
  getBlocProxy(): B {
    if (this.options.enableProxyTracking && this.consumerTracker && !this.options.selector) {
      return ProxyFactory.createClassProxy(
        this.bloc,
        this.options.consumerRef,
        this.consumerTracker
      );
    }
    return this.bloc;
  }
}