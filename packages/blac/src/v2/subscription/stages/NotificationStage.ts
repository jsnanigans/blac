/**
 * Notification Stage
 *
 * Dispatches change notifications to subscribers.
 * Handles batching, debouncing, and error recovery.
 */

import { PipelineStage, PipelineContext } from '../SubscriptionPipeline';

export type NotificationCallback<T = any> = (state: T) => void;

export interface NotificationOptions {
  callback: NotificationCallback;
  batch?: boolean;
  debounceMs?: number;
  throttleMs?: number;
  errorHandler?: (error: Error) => void;
  maxRetries?: number;
}

export class NotificationStage extends PipelineStage {
  private readonly options: Required<NotificationOptions>;
  private batchedNotifications: PipelineContext[] = [];
  private debounceTimer?: NodeJS.Timeout;
  private lastThrottleTime: number = 0;
  private throttleTimer?: NodeJS.Timeout;

  constructor(options: NotificationOptions) {
    super('Notification', 100); // Runs last
    this.options = {
      batch: options.batch ?? false,
      debounceMs: options.debounceMs ?? 0,
      throttleMs: options.throttleMs ?? 0,
      errorHandler: options.errorHandler ?? ((error) => console.error('Notification error:', error)),
      maxRetries: options.maxRetries ?? 0,
      callback: options.callback
    };
  }

  process<T>(context: PipelineContext<T>): PipelineContext<T> {
    if (context.skipNotification) {
      return context;
    }

    if (this.options.batch) {
      this.batchNotification(context);
    } else if (this.options.debounceMs > 0) {
      this.debounceNotification(context);
    } else if (this.options.throttleMs > 0) {
      this.throttleNotification(context);
    } else {
      this.sendNotification(context);
    }

    return context;
  }

  private batchNotification<T>(context: PipelineContext<T>): void {
    this.batchedNotifications.push(context);

    // Process batch on next tick
    if (this.batchedNotifications.length === 1) {
      process.nextTick(() => this.processBatch());
    }
  }

  private debounceNotification<T>(context: PipelineContext<T>): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.sendNotification(context);
      this.debounceTimer = undefined;
    }, this.options.debounceMs);
  }

  private throttleNotification<T>(context: PipelineContext<T>): void {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastThrottleTime;

    if (timeSinceLastCall >= this.options.throttleMs) {
      // Enough time has passed, allow the call
      this.lastThrottleTime = now;
      this.sendNotification(context);

      // Clear any pending timer
      if (this.throttleTimer) {
        clearTimeout(this.throttleTimer);
        this.throttleTimer = undefined;
      }
    } else {
      // Within throttle window, skip this call
      // But schedule a trailing call if not already scheduled
      if (!this.throttleTimer) {
        const remainingTime = this.options.throttleMs - timeSinceLastCall;
        this.throttleTimer = setTimeout(() => {
          this.lastThrottleTime = Date.now();
          this.sendNotification(context);
          this.throttleTimer = undefined;
        }, remainingTime);
      }
    }
  }

  private processBatch(): void {
    if (this.batchedNotifications.length === 0) return;

    const batch = [...this.batchedNotifications];
    this.batchedNotifications = [];

    // Send only the last notification from the batch
    const lastContext = batch[batch.length - 1];
    this.sendNotification(lastContext);
  }

  private sendNotification<T>(context: PipelineContext<T>, retryCount: number = 0): void {
    try {
      // Use selected value if available, otherwise use current state
      const value = context.metadata.has('selectedValue')
        ? context.metadata.get('selectedValue')
        : context.stateChange.current;
      this.options.callback(value);
      context.metadata.set('notificationSent', true);
    } catch (error) {
      if (retryCount < this.options.maxRetries) {
        // Retry with exponential backoff
        setTimeout(() => {
          this.sendNotification(context, retryCount + 1);
        }, Math.pow(2, retryCount) * 100);
      } else {
        this.options.errorHandler(error as Error);
        context.metadata.set('notificationError', error as unknown);
      }
    }
  }

  cleanup(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    // Process any remaining batched notifications
    if (this.batchedNotifications.length > 0) {
      this.processBatch();
    }
  }
}