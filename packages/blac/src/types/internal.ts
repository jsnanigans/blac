/**
 * Internal API interfaces for cross-class access
 * These interfaces allow type-safe access to internal members without type assertions
 */

import { Generation, InstanceId, Version } from './branded';

/**
 * Internal state container interface
 * Exposes protected members for framework-internal access
 */
export interface InternalStateContainer<S = unknown> {
  /** Current state */
  readonly state: S;

  /** Current version */
  readonly version: Version;

  /** Disposal state */
  readonly isDisposed: boolean;
  readonly isDisposing: boolean;
  readonly isDisposalRequested: boolean;

  /** Lifecycle generation for race condition prevention */
  readonly generation: Generation;

  /** Instance metadata */
  readonly instanceId: InstanceId;
  readonly className: string;

  /** Internal lifecycle methods */
  requestDisposal(): void;
  cancelDisposal(): void;
  dispose(): void;
}

/**
 * Internal subscription manager interface
 */
export interface InternalSubscriptionManager<S = unknown> {
  /** Get all active subscriptions */
  getActiveSubscriptions(): ReadonlyMap<string, InternalSubscription<S>>;

  /** Notify all subscriptions of a state change */
  notifyAll(previousState: S, currentState: S): void;

  /** Clean up weak references */
  cleanupWeakRefs(): void;

  /** Get subscription statistics */
  getStats(): SubscriptionStats;
}

/**
 * Internal subscription details
 */
export interface InternalSubscription<S = unknown> {
  readonly id: string;
  readonly type: 'observer' | 'consumer';
  readonly priority: number;
  readonly createdAt: number;
  readonly lastNotifiedVersion: Version;
  readonly dependencies?: Set<string>;
  readonly weakRef?: WeakRef<object>;
}

/**
 * Subscription statistics
 */
export interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  weakRefSubscriptions: number;
  totalNotifications: number;
  averageNotificationTime: number;
}

/**
 * Visitor pattern for safe internal access
 * Allows controlled access to internal state without exposing it publicly
 */
export interface StateContainerVisitor<S = unknown, R = void> {
  visitState(state: S): R;
  visitVersion(version: Version): R;
  visitDisposalState(isDisposed: boolean, isDisposing: boolean): R;
  visitMetadata(instanceId: InstanceId, className: string): R;
}

/**
 * Internal registry interface
 */
export interface InternalRegistry {
  /** Get all instances */
  getAllInstances(): ReadonlyMap<InstanceId, InternalStateContainer>;

  /** Get instance by ID */
  getInstance(id: InstanceId): InternalStateContainer | undefined;

  /** Check if instance exists */
  hasInstance(id: InstanceId): boolean;

  /** Dispose instance */
  disposeInstance(id: InstanceId): void;

  /** Get registry statistics */
  getStats(): RegistryStats;
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  totalInstances: number;
  activeInstances: number;
  disposedInstances: number;
  isolatedInstances: number;
  sharedInstances: number;
}

/**
 * Type guard for internal state container
 */
export function isInternalStateContainer(
  obj: unknown,
): obj is InternalStateContainer {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'state' in obj &&
    'version' in obj &&
    'isDisposed' in obj &&
    'instanceId' in obj
  );
}

/**
 * Type guard for internal subscription manager
 */
export function isInternalSubscriptionManager(
  obj: unknown,
): obj is InternalSubscriptionManager {
  if (!obj || typeof obj !== 'object') return false;

  const manager = obj as Record<string, unknown>;
  return (
    typeof manager.getActiveSubscriptions === 'function' &&
    typeof manager.notifyAll === 'function'
  );
}
