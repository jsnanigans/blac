import { BlocBase } from '../BlocBase';
import { BlocConstructor, BlocState } from '../types';
import { BlocInstanceManager } from '../BlocInstanceManager';
import { SubscriptionManager } from './subscription/SubscriptionManager';
import { BlacAdapter } from './BlacAdapter';
import { ProxyFactory } from './ProxyFactory';

export interface StateAdapterOptions<TBloc extends BlocBase<any>> {
  blocConstructor: BlocConstructor<TBloc>;
  blocId?: string;
  blocProps?: any;

  isolated?: boolean;
  keepAlive?: boolean;

  enableProxyTracking?: boolean;
  selector?: DependencySelector<TBloc>;

  enableBatching?: boolean;
  batchTimeout?: number;
  enableMetrics?: boolean;

  onMount?: (bloc: TBloc) => void;
  onUnmount?: (bloc: TBloc) => void;
  onError?: (error: Error) => void;
}

export type StateListener<TBloc extends BlocBase<any>> = () => void;
export type UnsubscribeFn = () => void;
export type DependencySelector<TBloc extends BlocBase<any>> = (
  state: BlocState<TBloc>,
  bloc: TBloc,
) => any;

export class StateAdapter<TBloc extends BlocBase<any>> {
  private instance: TBloc;
  private subscriptionManager: SubscriptionManager<TBloc>;
  private currentState: BlocState<TBloc>;
  private isDisposed = false;
  private unsubscribeFromBloc?: UnsubscribeFn;
  private consumerRegistry = new Map<string, object>();
  private lastConsumerId?: string;
  private adapterid = `state-adapter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  private createdAt = Date.now();
  private stateChangeCount = 0;

  constructor(private options: StateAdapterOptions<TBloc>) {
    const startTime = performance.now();
    console.log(`🎯 [StateAdapter] Creating adapter: ${this.adapterid}`);
    console.log(`🎯 [StateAdapter] Options:`, {
      blocConstructor: options.blocConstructor.name,
      blocId: options.blocId,
      isolated: options.isolated || options.blocConstructor.isolated,
      keepAlive: options.keepAlive || options.blocConstructor.keepAlive,
      enableProxyTracking: options.enableProxyTracking,
      hasSelector: !!options.selector,
      hasCallbacks: {
        onMount: !!options.onMount,
        onUnmount: !!options.onUnmount,
        onError: !!options.onError,
      },
    });

    this.instance = this.createOrGetInstance();
    this.currentState = this.instance.state;
    this.subscriptionManager = new SubscriptionManager<TBloc>(
      this.currentState,
    );
    this.activate();

    const endTime = performance.now();
    console.log(
      `🎯 [StateAdapter] ✅ Adapter created in ${(endTime - startTime).toFixed(2)}ms`,
    );
  }

  private createOrGetInstance(): TBloc {
    const startTime = performance.now();
    const { blocConstructor, blocId, blocProps, isolated } = this.options;
    const isIsolated = isolated || blocConstructor.isolated;

    console.log(
      `🎯 [StateAdapter] Creating/Getting instance for ${blocConstructor.name}`,
    );
    console.log(
      `🎯 [StateAdapter] Instance mode: ${isIsolated ? 'ISOLATED' : 'SHARED'}`,
    );

    if (isIsolated) {
      console.log(
        `🎯 [StateAdapter] 🏛️ Creating isolated instance with props:`,
        blocProps,
      );
      const instance = new blocConstructor(blocProps);
      const endTime = performance.now();
      console.log(
        `🎯 [StateAdapter] ✅ Isolated instance created in ${(endTime - startTime).toFixed(2)}ms`,
      );
      return instance;
    }

    const manager = BlocInstanceManager.getInstance();
    const id = blocId || blocConstructor.name;

    console.log(`🎯 [StateAdapter] Checking instance manager for ID: ${id}`);

    const existingInstance = manager.get(blocConstructor, id);
    if (existingInstance) {
      const endTime = performance.now();
      console.log(
        `🎯 [StateAdapter] 🔁 Reusing existing instance (${existingInstance._id})`,
      );
      console.log(`🎯 [StateAdapter] ⚠️ Props ignored for shared instance`);
      console.log(
        `🎯 [StateAdapter] ✅ Instance retrieved in ${(endTime - startTime).toFixed(2)}ms`,
      );
      return existingInstance;
    }

    console.log(
      `🎯 [StateAdapter] 🆕 Creating new shared instance with props:`,
      blocProps,
    );
    const newInstance = new blocConstructor(blocProps);
    manager.set(blocConstructor, id, newInstance);

    const endTime = performance.now();
    console.log(
      `🎯 [StateAdapter] ✅ New shared instance created and registered in ${(endTime - startTime).toFixed(2)}ms`,
    );

    return newInstance;
  }

  subscribe(listener: StateListener<TBloc>): UnsubscribeFn {
    const startTime = performance.now();

    if (this.isDisposed) {
      console.error(
        `🎯 [StateAdapter] ❌ Cannot subscribe to disposed adapter`,
      );
      throw new Error('Cannot subscribe to disposed StateAdapter');
    }

    // Try to use the last registered consumer if available
    let consumerRef: object;
    let consumerId: string;

    if (this.lastConsumerId && this.consumerRegistry.has(this.lastConsumerId)) {
      consumerId = this.lastConsumerId;
      consumerRef = this.consumerRegistry.get(this.lastConsumerId)!;
      console.log(
        `🎯 [StateAdapter] 🔗 Using existing consumer: ${consumerId}`,
      );
    } else {
      // Fallback for non-React usage
      consumerId = `subscription-${Date.now()}-${Math.random()}`;
      consumerRef = {};
      console.log(`🎯 [StateAdapter] 🆕 Creating new consumer: ${consumerId}`);
    }

    const unsubscribe = this.subscriptionManager.subscribe({
      listener,
      selector: this.options.selector,
      consumerId,
      consumerRef,
    });

    const endTime = performance.now();
    console.log(
      `🎯 [StateAdapter] ✅ Subscription created in ${(endTime - startTime).toFixed(2)}ms`,
    );

    return unsubscribe;
  }

  getSnapshot(): BlocState<TBloc> {
    return this.subscriptionManager.getSnapshot();
  }

  getServerSnapshot(): BlocState<TBloc> {
    return this.subscriptionManager.getServerSnapshot();
  }

  getInstance(): TBloc {
    return this.instance;
  }

  activate(): void {
    const startTime = performance.now();
    console.log(`🎯 [StateAdapter] 🚀 Activating adapter: ${this.adapterid}`);

    if (this.isDisposed) {
      console.error(`🎯 [StateAdapter] ❌ Cannot activate disposed adapter`);
      throw new Error('Cannot activate disposed StateAdapter');
    }

    // Call onMount callback
    if (this.options.onMount) {
      const mountStart = performance.now();
      console.log(`🎯 [StateAdapter] 🎯 Calling onMount callback`);
      try {
        this.options.onMount(this.instance);
        const mountEnd = performance.now();
        console.log(
          `🎯 [StateAdapter] ✅ onMount completed in ${(mountEnd - mountStart).toFixed(2)}ms`,
        );
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`🎯 [StateAdapter] ❌ onMount error:`, err);
        this.options.onError?.(err);
        // Don't throw - allow component to render even if onMount fails
      }
    }

    const observerId = `adapter-${Date.now()}-${Math.random()}`;
    console.log(
      `🎯 [StateAdapter] 🔔 Setting up state observer: ${observerId}`,
    );

    const unsubscribe = this.instance._observer.subscribe({
      id: observerId,
      fn: (newState: BlocState<TBloc>, oldState: BlocState<TBloc>) => {
        const changeTime = performance.now();
        this.stateChangeCount++;

        console.log(
          `🎯 [StateAdapter] 🔄 State change #${this.stateChangeCount}`,
        );

        try {
          this.currentState = newState;
          this.subscriptionManager.notifySubscribers(
            oldState,
            newState,
            this.instance,
          );

          const notifyEnd = performance.now();
          console.log(
            `🎯 [StateAdapter] ✅ Subscribers notified in ${(notifyEnd - changeTime).toFixed(2)}ms`,
          );
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          console.error(
            `🎯 [StateAdapter] ❌ Error notifying subscribers:`,
            err,
          );
          this.options.onError?.(err);
        }
      },
    });

    this.unsubscribeFromBloc = unsubscribe;

    const endTime = performance.now();
    console.log(
      `🎯 [StateAdapter] ✅ Activation complete in ${(endTime - startTime).toFixed(2)}ms`,
    );
  }

  dispose(): void {
    if (this.isDisposed) {
      console.log(`🎯 [StateAdapter] ⚠️ Already disposed: ${this.adapterid}`);
      return;
    }

    const startTime = performance.now();
    const lifetime = Date.now() - this.createdAt;

    console.log(`🎯 [StateAdapter] 🏚️ Disposing adapter: ${this.adapterid}`);
    console.log(`🎯 [StateAdapter] Lifetime stats:`, {
      lifetime: `${lifetime}ms`,
      stateChanges: this.stateChangeCount,
      changesPerSecond:
        lifetime > 0
          ? (this.stateChangeCount / (lifetime / 1000)).toFixed(2)
          : 'N/A',
      consumers: this.consumerRegistry.size,
    });

    this.isDisposed = true;

    // Unsubscribe from bloc
    if (this.unsubscribeFromBloc) {
      console.log(`🎯 [StateAdapter] Unsubscribing from bloc observer`);
      this.unsubscribeFromBloc();
    }

    // Call onUnmount callback
    if (this.options.onUnmount) {
      const unmountStart = performance.now();
      console.log(`🎯 [StateAdapter] 🎯 Calling onUnmount callback`);
      try {
        this.options.onUnmount(this.instance);
        const unmountEnd = performance.now();
        console.log(
          `🎯 [StateAdapter] ✅ onUnmount completed in ${(unmountEnd - unmountStart).toFixed(2)}ms`,
        );
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`🎯 [StateAdapter] ❌ onUnmount error:`, err);
        this.options.onError?.(err);
        // Don't throw - allow disposal to complete
      }
    }

    const { blocConstructor, blocId, isolated, keepAlive } = this.options;
    const shouldDispose =
      !isolated &&
      !blocConstructor.isolated &&
      !keepAlive &&
      !blocConstructor.keepAlive;

    if (shouldDispose) {
      const manager = BlocInstanceManager.getInstance();
      const id = blocId || blocConstructor.name;
      console.log(
        `🎯 [StateAdapter] 🚮 Removing bloc instance from manager: ${id}`,
      );
      manager.delete(blocConstructor, id);
    } else {
      console.log(`🎯 [StateAdapter] 📦 Keeping bloc instance alive`);
    }

    const endTime = performance.now();
    console.log(
      `🎯 [StateAdapter] ✅ Disposal complete in ${(endTime - startTime).toFixed(2)}ms`,
    );
  }

  addConsumer(consumerId: string, consumerRef: object): void {
    console.log(`🎯 [StateAdapter] ➕ Adding consumer: ${consumerId}`);

    this.subscriptionManager
      .getConsumerTracker()
      .registerConsumer(consumerId, consumerRef);
    this.consumerRegistry.set(consumerId, consumerRef);
    this.lastConsumerId = consumerId;

    console.log(
      `🎯 [StateAdapter] Total consumers: ${this.consumerRegistry.size}`,
    );
  }

  removeConsumer(consumerId: string): void {
    console.log(`🎯 [StateAdapter] ➖ Removing consumer: ${consumerId}`);

    this.subscriptionManager
      .getConsumerTracker()
      .unregisterConsumer(consumerId);
    this.consumerRegistry.delete(consumerId);
    if (this.lastConsumerId === consumerId) {
      this.lastConsumerId = undefined;
    }

    console.log(
      `🎯 [StateAdapter] Remaining consumers: ${this.consumerRegistry.size}`,
    );
  }

  createStateProxy(
    state: BlocState<TBloc>,
    consumerRef?: object,
  ): BlocState<TBloc> {
    if (!this.options.enableProxyTracking || this.options.selector) {
      console.log(
        `🎯 [StateAdapter] Proxy tracking disabled or selector present`,
      );
      return state;
    }

    console.log(`🎯 [StateAdapter] Creating state proxy`);

    const ref = consumerRef || {};
    const tracker = this.subscriptionManager.getConsumerTracker();

    return ProxyFactory.createStateProxy(
      state,
      ref,
      tracker,
    ) as BlocState<TBloc>;
  }

  createClassProxy(instance: TBloc, consumerRef?: object): TBloc {
    if (!this.options.enableProxyTracking || this.options.selector) {
      console.log(
        `🎯 [StateAdapter] Proxy tracking disabled or selector present`,
      );
      return instance;
    }

    console.log(`🎯 [StateAdapter] Creating class proxy for ${instance._name}`);

    const ref = consumerRef || {};
    const tracker = this.subscriptionManager.getConsumerTracker();

    return ProxyFactory.createClassProxy(instance, ref, tracker) as TBloc;
  }

  resetConsumerTracking(consumerRef: object): void {
    console.log(`🎯 [StateAdapter] 🔄 Resetting consumer tracking`);

    this.subscriptionManager
      .getConsumerTracker()
      .resetConsumerTracking(consumerRef);
  }

  markConsumerRendered(consumerRef: object): void {
    console.log(`🎯 [StateAdapter] 🎨 Marking consumer as rendered`);

    this.subscriptionManager
      .getConsumerTracker()
      .updateLastNotified(consumerRef);
  }
}
