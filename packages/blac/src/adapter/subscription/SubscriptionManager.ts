import { BlocBase } from '../../BlocBase';
import { BlocState } from '../../types';
import { ConsumerTracker } from '../tracking/ConsumerTracker';
import {
  DependencySelector,
  StateListener,
  UnsubscribeFn,
} from '../StateAdapter';

export interface SubscriptionOptions<TBloc extends BlocBase<any>> {
  listener: StateListener<TBloc>;
  selector?: DependencySelector<TBloc>;
  consumerId: string;
  consumerRef: object;
}

export class SubscriptionManager<TBloc extends BlocBase<any>> {
  private consumerTracker = new ConsumerTracker();
  private subscriptions = new Map<
    string,
    {
      listener: StateListener<TBloc>;
      selector?: DependencySelector<TBloc>;
      consumerRef: object;
    }
  >();

  private currentSnapshot: BlocState<TBloc>;
  private serverSnapshot?: BlocState<TBloc>;

  constructor(initialState: BlocState<TBloc>) {
    this.currentSnapshot = initialState;
  }

  subscribe(options: SubscriptionOptions<TBloc>): UnsubscribeFn {
    const { listener, selector, consumerId, consumerRef } = options;

    this.consumerTracker.registerConsumer(consumerId, consumerRef);
    this.subscriptions.set(consumerId, { listener, selector, consumerRef });

    return () => {
      this.subscriptions.delete(consumerId);
      this.consumerTracker.unregisterConsumer(consumerId);
    };
  }

  notifySubscribers(
    previousState: BlocState<TBloc>,
    newState: BlocState<TBloc>,
    instance: TBloc,
  ): void {
    this.currentSnapshot = newState;

    const changedPaths = this.detectChangedPaths(previousState, newState);

    for (const [consumerId, { listener, selector, consumerRef }] of this
      .subscriptions) {
      let shouldNotify = false;

      if (selector) {
        try {
          const prevSelected = selector(previousState, instance);
          const newSelected = selector(newState, instance);
          shouldNotify = prevSelected !== newSelected;
        } catch (error) {
          // Selector error - notify to ensure component updates
          shouldNotify = true;
        }
      } else {
        // For proxy-tracked subscriptions, only notify if accessed properties changed
        shouldNotify = this.consumerTracker.shouldNotifyConsumer(
          consumerRef,
          changedPaths,
        );
      }

      if (shouldNotify) {
        try {
          listener();
          this.consumerTracker.updateLastNotified(consumerRef);
        } catch (error) {
          // Listener error - silently catch to prevent breaking other listeners
        }
      }
    }

    this.consumerTracker.cleanup();
  }

  getSnapshot(): BlocState<TBloc> {
    return this.currentSnapshot;
  }

  getServerSnapshot(): BlocState<TBloc> {
    return this.serverSnapshot ?? this.currentSnapshot;
  }

  setServerSnapshot(snapshot: BlocState<TBloc>): void {
    this.serverSnapshot = snapshot;
  }

  getConsumerTracker(): ConsumerTracker {
    return this.consumerTracker;
  }

  private detectChangedPaths(
    previousState: BlocState<TBloc>,
    newState: BlocState<TBloc>,
  ): Set<string> {
    const changedPaths = new Set<string>();

    if (previousState === newState) {
      return changedPaths;
    }

    const detectChanges = (prev: any, curr: any, path: string = '') => {
      if (prev === curr) return;

      if (
        typeof prev !== 'object' ||
        typeof curr !== 'object' ||
        prev === null ||
        curr === null
      ) {
        changedPaths.add(path);
        return;
      }

      const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);

      for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key;

        if (prev[key] !== curr[key]) {
          changedPaths.add(newPath);
        }
      }
    };

    detectChanges(previousState, newState);
    return changedPaths;
  }
}
