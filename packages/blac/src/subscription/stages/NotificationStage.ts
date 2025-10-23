/**
 * Notification Stage
 *
 * Dispatches change notifications to subscribers.
 * Handles batching, debouncing, and error recovery.
 */

import { PipelineStage, PipelineContext } from '../SubscriptionPipeline';
import { BlacLogger } from '../../logging/Logger';

export type NotificationCallback<T = unknown> = (state: T) => void;

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
      const filteredReason = context.metadata.get('filteredReason') || 'unknown';
      BlacLogger.debug('NotificationStage', '⏭️  NOTIFICATION SKIPPED', {
        reason: filteredReason,
        subscriptionId: context.subscriptionId,
        explanation: 'A previous pipeline stage blocked this notification',
      });
      return context;
    }

    BlacLogger.debug('NotificationStage', 'Processing notification', {
      subscriptionId: context.subscriptionId,
      batch: this.options.batch,
      debounceMs: this.options.debounceMs,
      throttleMs: this.options.throttleMs,
    });

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

    BlacLogger.debug('NotificationStage', '📦 Batching notification', {
      subscriptionId: context.subscriptionId,
      batchSize: this.batchedNotifications.length,
      explanation: 'Notification added to batch, will be sent on next tick',
    });

    // Process batch on next tick
    if (this.batchedNotifications.length === 1) {
      process.nextTick(() => this.processBatch());
    }
  }

  private debounceNotification<T>(context: PipelineContext<T>): void {
    const wasDebouncing = !!this.debounceTimer;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    BlacLogger.debug('NotificationStage', '⏰ Debouncing notification', {
      subscriptionId: context.subscriptionId,
      debounceMs: this.options.debounceMs,
      wasCancelled: wasDebouncing,
      explanation: wasDebouncing
        ? `Previous debounced notification cancelled, restarting ${this.options.debounceMs}ms timer`
        : `Starting ${this.options.debounceMs}ms debounce timer`,
    });

    this.debounceTimer = setTimeout(() => {
      BlacLogger.debug('NotificationStage', '⏰ Debounce timer fired', {
        subscriptionId: context.subscriptionId,
      });
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

      BlacLogger.debug('NotificationStage', '⚡ Throttle allowed - sending notification', {
        subscriptionId: context.subscriptionId,
        timeSinceLastCall,
        throttleMs: this.options.throttleMs,
        explanation: `Enough time (${timeSinceLastCall}ms) passed since last notification`,
      });

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

        BlacLogger.debug('NotificationStage', '⚡ Throttle blocked - scheduling trailing call', {
          subscriptionId: context.subscriptionId,
          timeSinceLastCall,
          remainingTime,
          explanation: `Within throttle window, notification will fire in ${remainingTime}ms`,
        });

        this.throttleTimer = setTimeout(() => {
          this.lastThrottleTime = Date.now();
          BlacLogger.debug('NotificationStage', '⚡ Throttle trailing call firing', {
            subscriptionId: context.subscriptionId,
          });
          this.sendNotification(context);
          this.throttleTimer = undefined;
        }, remainingTime);
      } else {
        BlacLogger.debug('NotificationStage', '⚡ Throttle blocked - trailing call already scheduled', {
          subscriptionId: context.subscriptionId,
          explanation: 'Within throttle window and a trailing call is already scheduled',
        });
      }
    }
  }

  private processBatch(): void {
    if (this.batchedNotifications.length === 0) return;

    const batch = [...this.batchedNotifications];
    this.batchedNotifications = [];

    BlacLogger.debug('NotificationStage', '📦 Processing batch', {
      batchSize: batch.length,
      explanation: batch.length > 1
        ? `Batch had ${batch.length} notifications, sending only the last one`
        : 'Batch had 1 notification, sending it',
    });

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

      BlacLogger.debug('NotificationStage', '🔔 TRIGGERING REACT RENDER', {
        subscriptionId: context.subscriptionId,
        hasSelectedValue: context.metadata.has('selectedValue'),
        retryCount,
        explanation: 'Calling React listener to trigger component re-render',
      });

      this.options.callback(value);
      context.metadata.set('notificationSent', true);

      BlacLogger.debug('NotificationStage', '✅ React render triggered successfully', {
        subscriptionId: context.subscriptionId,
      });
    } catch (error) {
      BlacLogger.debug('NotificationStage', '❌ Error triggering React render', {
        subscriptionId: context.subscriptionId,
        error: error instanceof Error ? error.message : String(error),
        retryCount,
        willRetry: retryCount < this.options.maxRetries,
      });

      if (retryCount < this.options.maxRetries) {
        const backoffMs = Math.pow(2, retryCount) * 100;
        BlacLogger.debug('NotificationStage', '🔄 Retrying notification', {
          subscriptionId: context.subscriptionId,
          retryCount: retryCount + 1,
          backoffMs,
        });

        // Retry with exponential backoff
        setTimeout(() => {
          this.sendNotification(context, retryCount + 1);
        }, backoffMs);
      } else {
        BlacLogger.debug('NotificationStage', '❌ Max retries exceeded', {
          subscriptionId: context.subscriptionId,
          maxRetries: this.options.maxRetries,
        });
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