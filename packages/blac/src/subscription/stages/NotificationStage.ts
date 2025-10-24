/**
 * Notification Stage
 *
 * Dispatches change notifications to subscribers.
 * Handles error recovery.
 */

import { PipelineStage, PipelineContext } from '../SubscriptionPipeline';
import { BlacLogger } from '../../logging/Logger';

export type NotificationCallback<T = unknown> = (state: T) => void;

export interface NotificationOptions {
  callback: NotificationCallback;
  errorHandler?: (error: Error) => void;
  maxRetries?: number;
}

export class NotificationStage extends PipelineStage {
  private readonly options: Required<NotificationOptions>;

  constructor(options: NotificationOptions) {
    super('Notification', 100); // Runs last
    this.options = {
      errorHandler:
        options.errorHandler ??
        ((error) => console.error('Notification error:', error)),
      maxRetries: options.maxRetries ?? 0,
      callback: options.callback,
    };
  }

  process<T>(context: PipelineContext<T>): PipelineContext<T> {
    if (context.skipNotification) {
      const filteredReason =
        context.metadata.get('filteredReason') || 'unknown';
      BlacLogger.debug('NotificationStage', '⏭️  NOTIFICATION SKIPPED', {
        reason: filteredReason,
        subscriptionId: context.subscriptionId,
        explanation: 'A previous pipeline stage blocked this notification',
      });
      return context;
    }

    BlacLogger.debug('NotificationStage', 'Processing notification', {
      subscriptionId: context.subscriptionId,
    });

    this.sendNotification(context);

    return context;
  }

  private sendNotification<T>(
    context: PipelineContext<T>,
    retryCount: number = 0,
  ): void {
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

      BlacLogger.debug(
        'NotificationStage',
        '✅ React render triggered successfully',
        {
          subscriptionId: context.subscriptionId,
        },
      );
    } catch (error) {
      BlacLogger.debug(
        'NotificationStage',
        '❌ Error triggering React render',
        {
          subscriptionId: context.subscriptionId,
          error: error instanceof Error ? error.message : String(error),
          retryCount,
          willRetry: retryCount < this.options.maxRetries,
        },
      );

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
    // No cleanup needed for simplified notification stage
  }
}
