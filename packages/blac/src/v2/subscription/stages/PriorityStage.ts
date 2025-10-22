/**
 * Priority Stage
 *
 * Handles subscription priorities to ensure high-priority
 * subscriptions are processed first and can influence
 * lower-priority ones.
 */

import { PipelineStage, PipelineContext } from '../SubscriptionPipeline';

export enum SubscriptionPriority {
  CRITICAL = 1000,
  HIGH = 750,
  NORMAL = 500,
  LOW = 250,
  DEFERRED = 0
}

export class PriorityStage extends PipelineStage {
  private readonly minPriority: number;

  constructor(minPriority: number = SubscriptionPriority.DEFERRED) {
    super('Priority', 1000); // Runs first
    this.minPriority = minPriority;
  }

  process<T>(context: PipelineContext<T>): PipelineContext<T> {
    const priorityValue = context.metadata.get('priority');
    const priority = typeof priorityValue === 'number' ? priorityValue : SubscriptionPriority.NORMAL;

    if (priority < this.minPriority) {
      // Skip low-priority subscriptions during high-load
      context.shouldContinue = false;
      context.skipNotification = true;
      context.metadata.set('skippedReason', 'priority_threshold');
    }

    context.metadata.set('processedPriority', priority);
    return context;
  }

  validate(context: PipelineContext): boolean {
    const priority = context.metadata.get('priority');
    return typeof priority === 'number' || priority === undefined;
  }
}