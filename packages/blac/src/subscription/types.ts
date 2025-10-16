import { BlocBase } from '../BlocBase';

/**
 * Cache entry for getter values
 * V2: Used for value-based getter change detection
 */
export interface GetterCacheEntry {
  /** Cached getter value */
  value: unknown;

  /** Error if getter threw during execution */
  error?: Error;
}

/**
 * Unified subscription interface that replaces the dual consumer/observer system
 */
export interface Subscription<S = unknown> {
  /** Unique identifier for the subscription */
  id: string;

  /** Type of subscription for backward compatibility */
  type: 'consumer' | 'observer';

  /** Optional selector function to derive values from state */
  selector?: (state: S, bloc?: BlocBase<S>) => unknown;

  /** Custom equality function for selector results (defaults to Object.is) */
  equalityFn?: (prev: unknown, next: unknown) => boolean;

  /** Notification callback when state changes */
  notify: (value: unknown, oldValue?: unknown, action?: unknown) => void;

  /** Priority for notification order (higher = earlier) */
  priority?: number;

  /** WeakRef to the subscriber for automatic cleanup (React components) */
  weakRef?: WeakRef<object>;

  /** Last computed selector value for comparison */
  lastValue?: unknown;

  /** Tracked state path dependencies */
  dependencies?: Set<string>;

  /**
   * Getter value cache for change detection
   * V2: Maps getter path (_class.getterName) to cached value/error
   */
  getterCache?: Map<string, GetterCacheEntry>;

  /** Metadata for tracking and debugging */
  metadata?: SubscriptionMetadata;
}

export interface SubscriptionMetadata {
  /** Timestamp of last notification */
  lastNotified?: number;

  /** Whether the subscriber has rendered (React-specific) */
  hasRendered?: boolean;

  /** Number of times this subscription accessed state */
  accessCount?: number;

  /** First access timestamp */
  firstAccessTime?: number;

  /** Last access timestamp */
  lastAccessTime?: number;
}

export interface SubscriptionOptions<S> {
  /** Type of subscription */
  type: 'consumer' | 'observer';

  /** Optional selector function */
  selector?: (state: S, bloc?: BlocBase<S>) => unknown;

  /** Custom equality function */
  equalityFn?: (prev: unknown, next: unknown) => boolean;

  /** Notification callback */
  notify: (value: unknown, oldValue?: unknown, action?: unknown) => void;

  /** Priority for notifications */
  priority?: number;

  /** WeakRef to subscriber */
  weakRef?: WeakRef<object>;
}

export interface SubscriptionManagerStats {
  /** Total number of active subscriptions */
  activeSubscriptions: number;

  /** Number of consumer subscriptions */
  consumerCount: number;

  /** Number of observer subscriptions */
  observerCount: number;

  /** Total notifications sent */
  totalNotifications: number;

  /** Number of tracked dependencies */
  trackedDependencies: number;
}

/**
 * Result returned from subscription methods
 * Contains the subscription ID and unsubscribe function
 */
export interface SubscriptionResult {
  /** Unique identifier for this subscription */
  id: string;

  /** Function to unsubscribe and clean up this subscription */
  unsubscribe: () => void;
}
