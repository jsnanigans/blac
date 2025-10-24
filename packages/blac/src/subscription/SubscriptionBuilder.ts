/**
 * Subscription Options Builder
 *
 * Fluent API for configuring subscriptions with type safety
 * and validation.
 */

import {
  SubscriptionConfig,
  ContainerId,
  ConsumerId,
  MetadataValue,
} from './SubscriptionRegistry';
import { NotificationCallback } from './stages/NotificationStage';
import { FilterPredicate } from './stages/FilterStage';
import { SubscriptionPriority } from './stages/PriorityStage';

export interface BuilderValidationError {
  field: string;
  message: string;
}

/**
 * Fluent builder for subscription configuration
 */
export class SubscriptionBuilder<T = unknown> {
  private config: Partial<SubscriptionConfig<T>> = {
    metadata: {},
  };
  private filterPredicate?: FilterPredicate<T>;
  private validationErrors: BuilderValidationError[] = [];

  /**
   * Set the container ID
   */
  forContainer(containerId: ContainerId): this {
    this.config.containerId = containerId;
    return this;
  }

  /**
   * Set the consumer ID
   */
  fromConsumer(consumerId: ConsumerId): this {
    this.config.consumerId = consumerId;
    return this;
  }

  /**
   * Set the notification callback
   */
  notify(callback: NotificationCallback<T>): this {
    this.config.callback = callback;
    return this;
  }

  /**
   * Add path-based filtering
   */
  watchPaths(...paths: string[]): this {
    this.config.paths = paths;
    return this;
  }

  /**
   * Add a filter predicate
   */
  filter(predicate: FilterPredicate<T>): this {
    this.filterPredicate = predicate;
    return this;
  }

  /**
   * Set subscription priority
   */
  withPriority(priority: SubscriptionPriority | number): this {
    this.config.priority = priority;
    return this;
  }

  /**
   * Keep subscription alive even with no references
   */
  keepAlive(value: boolean = true): this {
    this.config.keepAlive = value;
    return this;
  }

  /**
   * Add metadata
   */
  withMetadata(key: string, value: MetadataValue): this {
    if (!this.config.metadata) {
      this.config.metadata = {};
    }
    this.config.metadata[key] = value;
    return this;
  }

  /**
   * Batch notifications
   */
  batch(): this {
    return this.withMetadata('batch', true);
  }

  /**
   * Debounce notifications
   */
  debounce(ms: number): this {
    return this.withMetadata('debounceMs', ms);
  }

  /**
   * Throttle notifications
   */
  throttle(ms: number): this {
    return this.withMetadata('throttleMs', ms);
  }

  /**
   * Enable performance metrics
   */
  trackPerformance(): this {
    return this.withMetadata('enableMetrics', true);
  }

  /**
   * Set max retries for failed notifications
   */
  maxRetries(count: number): this {
    return this.withMetadata('maxRetries', count);
  }

  /**
   * Validate the configuration
   */
  validate(): BuilderValidationError[] {
    const errors: BuilderValidationError[] = [];

    if (!this.config.containerId) {
      errors.push({
        field: 'containerId',
        message: 'Container ID is required',
      });
    }

    if (!this.config.consumerId) {
      errors.push({
        field: 'consumerId',
        message: 'Consumer ID is required',
      });
    }

    if (!this.config.callback) {
      errors.push({
        field: 'callback',
        message: 'Notification callback is required',
      });
    }

    if (this.config.priority !== undefined) {
      if (
        typeof this.config.priority !== 'number' ||
        this.config.priority < 0
      ) {
        errors.push({
          field: 'priority',
          message: 'Priority must be a non-negative number',
        });
      }
    }

    const debounceMs = this.config.metadata?.debounceMs;
    const throttleMs = this.config.metadata?.throttleMs;

    if (debounceMs !== undefined && throttleMs !== undefined) {
      errors.push({
        field: 'timing',
        message: 'Cannot use both debounce and throttle',
      });
    }

    this.validationErrors = errors;
    return errors;
  }

  /**
   * Build the subscription configuration
   */
  build(): SubscriptionConfig<T> {
    const errors = this.validate();

    if (errors.length > 0) {
      const errorMessages = errors
        .map((e) => `${e.field}: ${e.message}`)
        .join(', ');
      throw new Error(`Invalid subscription configuration: ${errorMessages}`);
    }

    // Apply filter to metadata
    if (this.filterPredicate) {
      this.config.metadata = {
        ...this.config.metadata,
        filterPredicate: this.filterPredicate as MetadataValue,
      };
    }

    return this.config as SubscriptionConfig<T>;
  }

  /**
   * Get validation errors without throwing
   */
  getValidationErrors(): BuilderValidationError[] {
    return [...this.validationErrors];
  }

  /**
   * Check if configuration is valid
   */
  isValid(): boolean {
    return this.validate().length === 0;
  }

  /**
   * Clone the builder
   */
  clone(): SubscriptionBuilder<T> {
    const newBuilder = new SubscriptionBuilder<T>();
    newBuilder.config = JSON.parse(JSON.stringify(this.config));
    newBuilder.filterPredicate = this.filterPredicate;
    return newBuilder;
  }

  /**
   * Create a builder from existing configuration
   */
  static from<T = unknown>(
    config: Partial<SubscriptionConfig<T>>,
  ): SubscriptionBuilder<T> {
    const builder = new SubscriptionBuilder<T>();
    builder.config = { ...config };
    return builder;
  }
}

/**
 * Factory functions for common subscription patterns
 */
export class SubscriptionPatterns {
  /**
   * Create a high-priority, real-time subscription
   */
  static realtime<T>(): SubscriptionBuilder<T> {
    return new SubscriptionBuilder<T>()
      .withPriority(SubscriptionPriority.CRITICAL)
      .trackPerformance();
  }

  /**
   * Create a low-priority, batched subscription
   */
  static background<T>(): SubscriptionBuilder<T> {
    return new SubscriptionBuilder<T>()
      .withPriority(SubscriptionPriority.LOW)
      .batch();
  }

  /**
   * Create a debounced UI subscription
   */
  static ui<T>(debounceMs: number = 16): SubscriptionBuilder<T> {
    return new SubscriptionBuilder<T>()
      .withPriority(SubscriptionPriority.HIGH)
      .debounce(debounceMs);
  }

  /**
   * Create a logging subscription
   */
  static logging<T>(): SubscriptionBuilder<T> {
    return new SubscriptionBuilder<T>()
      .withPriority(SubscriptionPriority.DEFERRED)
      .batch()
      .keepAlive(false);
  }

  /**
   * Create a persistent subscription
   */
  static persistent<T>(): SubscriptionBuilder<T> {
    return new SubscriptionBuilder<T>()
      .withPriority(SubscriptionPriority.NORMAL)
      .keepAlive(true)
      .maxRetries(3);
  }
}
