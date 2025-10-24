/**
 * Type-safe event system for the new architecture
 */

import { Version } from './branded';

/**
 * Base event interface
 */
export interface BaseEvent {
  readonly type: string;
  readonly timestamp: number;
  readonly source?: string;
}

/**
 * State change event
 */
export interface StateChangeEvent<S> extends BaseEvent {
  readonly type: 'state-change';
  readonly previous: S;
  readonly current: S;
  readonly version: Version;
  readonly metadata: ChangeMetadata;
}

/**
 * Type alias for StateChangeEvent (for simpler naming)
 */
export type StateChange<S> = StateChangeEvent<S>;

/**
 * Metadata about a state change
 */
export interface ChangeMetadata {
  /** Paths that changed (for nested state) */
  readonly changedPaths?: Set<string>;
  /** Source of the change (method name, event, etc.) */
  readonly source?: string;
  /** Additional context */
  readonly context?: Record<string, unknown>;
}

/**
 * Lifecycle events
 */
export interface LifecycleEvent extends BaseEvent {
  readonly type: 'mount' | 'unmount' | 'dispose-requested' | 'disposed';
  readonly instanceId: string;
}

/**
 * Error event
 */
export interface ErrorEvent extends BaseEvent {
  readonly type: 'error';
  readonly error: Error;
  readonly context?: Record<string, unknown>;
}

/**
 * Subscription event
 */
export interface SubscriptionEvent extends BaseEvent {
  readonly type: 'subscription-added' | 'subscription-removed';
  readonly subscriptionId: string;
  readonly subscriptionType: 'observer' | 'consumer';
}

/**
 * Event emitter interface
 */
export interface EventEmitter<T extends BaseEvent = BaseEvent> {
  emit(event: T): void;
  on(handler: (event: T) => void): () => void;
  once(handler: (event: T) => void): () => void;
  off(handler: (event: T) => void): void;
}

/**
 * Typed event emitter for specific event types
 */
export class TypedEventEmitter<T extends BaseEvent = BaseEvent>
  implements EventEmitter<T>
{
  private handlers = new Set<(event: T) => void>();
  private onceHandlers = new Set<(event: T) => void>();

  emit(event: T): void {
    // Notify all regular handlers
    this.handlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in event handler:', error);
      }
    });

    // Notify and remove once handlers
    this.onceHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in once handler:', error);
      }
    });
    this.onceHandlers.clear();
  }

  on(handler: (event: T) => void): () => void {
    this.handlers.add(handler);
    return () => this.off(handler);
  }

  once(handler: (event: T) => void): () => void {
    this.onceHandlers.add(handler);
    return () => this.onceHandlers.delete(handler);
  }

  off(handler: (event: T) => void): void {
    this.handlers.delete(handler);
    this.onceHandlers.delete(handler);
  }

  clear(): void {
    this.handlers.clear();
    this.onceHandlers.clear();
  }

  get size(): number {
    return this.handlers.size + this.onceHandlers.size;
  }
}

/**
 * Create a state change event
 */
export function createStateChangeEvent<S>(
  previous: S,
  current: S,
  version: Version,
  metadata?: Partial<ChangeMetadata>,
): StateChangeEvent<S> {
  return {
    type: 'state-change',
    timestamp: Date.now(),
    previous,
    current,
    version,
    metadata: {
      changedPaths: metadata?.changedPaths,
      source: metadata?.source,
      context: metadata?.context,
    },
  };
}

/**
 * Create a lifecycle event
 */
export function createLifecycleEvent(
  type: LifecycleEvent['type'],
  instanceId: string,
): LifecycleEvent {
  return {
    type,
    timestamp: Date.now(),
    instanceId,
  };
}

/**
 * Create an error event
 */
export function createErrorEvent(
  error: Error,
  context?: Record<string, unknown>,
): ErrorEvent {
  return {
    type: 'error',
    timestamp: Date.now(),
    error,
    context,
  };
}
