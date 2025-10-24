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
   * Create a persistent subscription
   */
  static persistent<T>(): SubscriptionBuilder<T> {
    return new SubscriptionBuilder<T>().keepAlive(true).maxRetries(3);
  }
}
