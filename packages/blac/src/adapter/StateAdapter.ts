import { BlocBase } from '../BlocBase';
import { BlocConstructor, BlocState } from '../types';
import { BlocInstanceManager } from '../BlocInstanceManager';
import { SubscriptionManager } from './subscription/SubscriptionManager';
import { ConsumerTracker } from './tracking/ConsumerTracker';
import { ProxyFactory } from './proxy/ProxyFactory';

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

  constructor(private options: StateAdapterOptions<TBloc>) {
    this.instance = this.createOrGetInstance();
    this.currentState = this.instance.state;
    this.subscriptionManager = new SubscriptionManager<TBloc>(
      this.currentState,
    );
    this.activate();
  }

  private createOrGetInstance(): TBloc {
    const { blocConstructor, blocId, blocProps, isolated } = this.options;

    if (isolated || blocConstructor.isolated) {
      return new blocConstructor(blocProps);
    }

    const manager = BlocInstanceManager.getInstance();
    const id = blocId || blocConstructor.name;

    const existingInstance = manager.get(blocConstructor, id);
    if (existingInstance) {
      // For shared instances, props are ignored after initial creation
      return existingInstance;
    }

    const newInstance = new blocConstructor(blocProps);
    manager.set(blocConstructor, id, newInstance);

    return newInstance;
  }

  subscribe(listener: StateListener<TBloc>): UnsubscribeFn {
    if (this.isDisposed) {
      throw new Error('Cannot subscribe to disposed StateAdapter');
    }

    // Try to use the last registered consumer if available
    let consumerRef: object;
    let consumerId: string;

    if (this.lastConsumerId && this.consumerRegistry.has(this.lastConsumerId)) {
      consumerId = this.lastConsumerId;
      consumerRef = this.consumerRegistry.get(this.lastConsumerId)!;
    } else {
      // Fallback for non-React usage
      consumerId = `subscription-${Date.now()}-${Math.random()}`;
      consumerRef = {};
    }

    return this.subscriptionManager.subscribe({
      listener,
      selector: this.options.selector,
      consumerId,
      consumerRef,
    });
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
    if (this.isDisposed) {
      throw new Error('Cannot activate disposed StateAdapter');
    }

    try {
      this.options.onMount?.(this.instance);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.options.onError?.(err);
      // Don't throw - allow component to render even if onMount fails
    }

    const observerId = `adapter-${Date.now()}-${Math.random()}`;
    const unsubscribe = this.instance._observer.subscribe({
      id: observerId,
      fn: (newState: BlocState<TBloc>, oldState: BlocState<TBloc>) => {
        try {
          this.currentState = newState;
          this.subscriptionManager.notifySubscribers(
            oldState,
            newState,
            this.instance,
          );
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          this.options.onError?.(err);
        }
      },
    });

    this.unsubscribeFromBloc = unsubscribe;
  }

  dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;
    this.unsubscribeFromBloc?.();

    try {
      this.options.onUnmount?.(this.instance);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.options.onError?.(err);
      // Don't throw - allow disposal to complete
    }

    const { blocConstructor, blocId, isolated, keepAlive } = this.options;

    if (
      !isolated &&
      !blocConstructor.isolated &&
      !keepAlive &&
      !blocConstructor.keepAlive
    ) {
      const manager = BlocInstanceManager.getInstance();
      const id = blocId || blocConstructor.name;
      manager.delete(blocConstructor, id);
    }
  }

  addConsumer(consumerId: string, consumerRef: object): void {
    this.subscriptionManager
      .getConsumerTracker()
      .registerConsumer(consumerId, consumerRef);
    this.consumerRegistry.set(consumerId, consumerRef);
    this.lastConsumerId = consumerId;
  }

  removeConsumer(consumerId: string): void {
    this.subscriptionManager
      .getConsumerTracker()
      .unregisterConsumer(consumerId);
    this.consumerRegistry.delete(consumerId);
    if (this.lastConsumerId === consumerId) {
      this.lastConsumerId = undefined;
    }
  }

  createStateProxy(
    state: BlocState<TBloc>,
    consumerRef?: object,
  ): BlocState<TBloc> {
    if (!this.options.enableProxyTracking || this.options.selector) {
      return state;
    }

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
      return instance;
    }

    const ref = consumerRef || {};
    const tracker = this.subscriptionManager.getConsumerTracker();

    return ProxyFactory.createClassProxy(instance, ref, tracker) as TBloc;
  }

  resetConsumerTracking(consumerRef: object): void {
    this.subscriptionManager
      .getConsumerTracker()
      .resetConsumerTracking(consumerRef);
  }

  markConsumerRendered(consumerRef: object): void {
    this.subscriptionManager
      .getConsumerTracker()
      .updateLastNotified(consumerRef);
  }
}
