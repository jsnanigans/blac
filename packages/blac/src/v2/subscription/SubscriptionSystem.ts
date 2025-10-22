/**
 * Subscription System Facade
 *
 * High-level API that orchestrates the subscription pipeline and registry
 * to provide a clean, simple interface for state container integration.
 */

import { SubscriptionRegistry, SubscriptionConfig, ContainerId, ConsumerId, MetadataValue } from './SubscriptionRegistry';
import { SubscriptionPipeline, SubscriptionId, PipelineContext, PipelineStage } from './SubscriptionPipeline';
import { SubscriptionBuilder } from './SubscriptionBuilder';
import { StateChange } from '../types/events';

// Import all stages
import {
  PriorityStage,
  FilterStage,
  SelectorStage,
  NotificationStage,
  WeakRefStage,
  OptimizationStage,
  OptimizationOptions,
  SubscriptionPriority
} from './stages';

/**
 * Subscription options for high-level API
 */
export interface SubscriptionOptions<T = unknown, R = T> {
  // Core options
  callback: (state: R) => void;
  selector?: (state: T) => R;

  // Filtering options
  paths?: string[];
  filter?: (current: T, previous: T) => boolean;

  // Performance options
  priority?: SubscriptionPriority | number;
  debounce?: number;
  throttle?: number;
  batch?: boolean;

  // Lifecycle options
  keepAlive?: boolean;
  weakRef?: object;

  // Metadata
  metadata?: Record<string, MetadataValue>;
}

/**
 * Subscription handle returned to consumers
 */
export interface Subscription {
  readonly id: SubscriptionId;
  readonly isActive: boolean;
  unsubscribe(): void;
  pause(): void;
  resume(): void;
}

/**
 * Configuration for the subscription system
 */
export interface SubscriptionSystemConfig {
  enableMetrics?: boolean;
  enableWeakRefs?: boolean;
  maxSubscriptions?: number;
  cleanupIntervalMs?: number;
  defaultPriority?: SubscriptionPriority;
}

/**
 * Main subscription system facade
 */
export class SubscriptionSystem<T = unknown> {
  private readonly registry: SubscriptionRegistry;
  private readonly config: Required<SubscriptionSystemConfig>;
  private readonly pipelineCache: Map<string, SubscriptionPipeline> = new Map();
  private containerId: ContainerId;
  private consumerCounter = 0;

  constructor(
    containerId: string,
    config: SubscriptionSystemConfig = {}
  ) {
    this.containerId = `container_${containerId}` as ContainerId;

    this.config = {
      enableMetrics: config.enableMetrics ?? false,
      enableWeakRefs: config.enableWeakRefs ?? true,
      maxSubscriptions: config.maxSubscriptions ?? 1000,
      cleanupIntervalMs: config.cleanupIntervalMs ?? 30000,
      defaultPriority: config.defaultPriority ?? SubscriptionPriority.NORMAL
    };

    this.registry = new SubscriptionRegistry({
      cleanupIntervalMs: this.config.cleanupIntervalMs,
      maxSubscriptions: this.config.maxSubscriptions,
      enableWeakRefs: this.config.enableWeakRefs
    });
  }

  /**
   * Subscribe to state changes
   */
  subscribe<R = T>(options: SubscriptionOptions<T, R>): Subscription {
    const consumerId = this.generateConsumerId();
    const pipeline = this.createPipeline(options);

    // Build configuration
    const config: SubscriptionConfig<T, R> = {
      containerId: this.containerId,
      consumerId,
      callback: options.callback,
      selector: options.selector,
      paths: options.paths,
      priority: options.priority ?? this.config.defaultPriority,
      keepAlive: options.keepAlive,
      metadata: options.metadata
    };

    // Register subscription
    const subscriptionId = this.registry.register(config);

    // Store pipeline
    this.pipelineCache.set(subscriptionId, pipeline);

    // Register weak reference if provided
    if (options.weakRef && this.config.enableWeakRefs) {
      const weakRefStage = this.findStage(pipeline, WeakRefStage);
      if (weakRefStage) {
        weakRefStage.registerConsumer(consumerId, options.weakRef);
      }
    }

    // Create subscription handle
    const subscription: Subscription = {
      id: subscriptionId,
      get isActive() {
        return true; // Will be updated to check registry
      },
      unsubscribe: () => {
        this.unsubscribe(subscriptionId);
      },
      pause: () => {
        // Implementation for pausing
      },
      resume: () => {
        // Implementation for resuming
      }
    };

    return subscription;
  }

  /**
   * Unsubscribe from state changes
   */
  unsubscribe(subscriptionId: SubscriptionId): void {
    // Remove pipeline
    const pipeline = this.pipelineCache.get(subscriptionId);
    if (pipeline) {
      pipeline.dispose();
      this.pipelineCache.delete(subscriptionId);
    }

    // Unregister from registry
    this.registry.unregister(subscriptionId);
  }

  /**
   * Process a state change through all subscriptions
   */
  async notify(stateChange: StateChange<T>): Promise<void> {
    // Get all subscriptions for this container
    const subscriptionIds = this.registry.getContainerSubscriptions(this.containerId);

    // Process each subscription through its pipeline
    const promises: Promise<void>[] = [];

    for (const subscriptionId of subscriptionIds) {
      const pipeline = this.pipelineCache.get(subscriptionId);
      if (!pipeline) continue;

      const context: PipelineContext<T> = {
        subscriptionId,
        stateChange,
        metadata: new Map(),
        timestamp: Date.now(),
        shouldContinue: true
      };

      promises.push(
        pipeline.execute(context)
          .then(() => {
            // Success
          })
          .catch(error => {
            console.error(`Subscription ${subscriptionId} error:`, error);
          })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Create a subscription using the builder API
   */
  builder(): SubscriptionBuilder<T> {
    return new SubscriptionBuilder<T>()
      .forContainer(this.containerId);
  }

  /**
   * Get system statistics
   */
  getStats() {
    return {
      registry: this.registry.getStats(),
      pipelineCount: this.pipelineCache.size,
      config: this.config
    };
  }

  /**
   * Cleanup all subscriptions
   */
  dispose(): void {
    // Dispose all pipelines
    for (const pipeline of this.pipelineCache.values()) {
      pipeline.dispose();
    }
    this.pipelineCache.clear();

    // Dispose registry
    this.registry.dispose();
  }

  /**
   * Create a pipeline for subscription options
   */
  private createPipeline<R>(options: SubscriptionOptions<T, R>): SubscriptionPipeline {
    const pipeline = new SubscriptionPipeline({
      enableMetrics: this.config.enableMetrics,
      timeout: 100
    });

    // Add stages in priority order

    // 1. Priority stage
    if (options.priority !== undefined) {
      pipeline.addStage(new PriorityStage(0)); // Min priority threshold
    }

    // 2. WeakRef stage
    if (this.config.enableWeakRefs) {
      pipeline.addStage(new WeakRefStage());
    }

    // 3. Filter stage
    if (options.paths || options.filter) {
      pipeline.addStage(new FilterStage({
        paths: options.paths,
        predicate: options.filter
      }));
    }

    // 4. Optimization stage (only for throttling and caching)
    if (options.throttle) {
      const optimizationOptions: OptimizationOptions = {};
      optimizationOptions.throttle = { interval: options.throttle };
      optimizationOptions.callback = options.callback; // Pass callback for deferred execution
      pipeline.addStage(new OptimizationStage(optimizationOptions));
    }

    // 5. Selector stage
    if (options.selector) {
      pipeline.addStage(new SelectorStage(options.selector));
    }

    // 6. Notification stage (always last)
    // Handle batching and debouncing in the NotificationStage where it can properly defer callbacks
    pipeline.addStage(new NotificationStage({
      callback: options.callback,
      batch: options.batch ?? false,
      debounceMs: options.debounce ?? 0
    }));

    return pipeline;
  }

  /**
   * Find a specific stage type in a pipeline
   */
  private findStage<S extends PipelineStage>(
    pipeline: SubscriptionPipeline,
    StageClass: new (...args: unknown[]) => S
  ): S | undefined {
    const stages = pipeline.getStages();
    return stages.find(stage => stage instanceof StageClass) as S | undefined;
  }

  /**
   * Generate unique consumer ID
   */
  private generateConsumerId(): ConsumerId {
    const timestamp = Date.now();
    const counter = ++this.consumerCounter;
    const random = Math.random().toString(36).substr(2, 9);
    return `consumer_${timestamp}_${counter}_${random}` as ConsumerId;
  }
}

/**
 * Factory for creating subscription systems with common configurations
 */
export class SubscriptionSystemFactory {
  /**
   * Create a high-performance subscription system
   */
  static createPerformance<T>(containerId: string): SubscriptionSystem<T> {
    return new SubscriptionSystem<T>(containerId, {
      enableMetrics: false,
      enableWeakRefs: true,
      maxSubscriptions: 1000,
      cleanupIntervalMs: 60000
    });
  }

  /**
   * Create a debug subscription system
   */
  static createDebug<T>(containerId: string): SubscriptionSystem<T> {
    return new SubscriptionSystem<T>(containerId, {
      enableMetrics: true,
      enableWeakRefs: true,
      maxSubscriptions: 10000,
      cleanupIntervalMs: 5000
    });
  }

  /**
   * Create a minimal subscription system
   */
  static createMinimal<T>(containerId: string): SubscriptionSystem<T> {
    return new SubscriptionSystem<T>(containerId, {
      enableMetrics: false,
      enableWeakRefs: false,
      maxSubscriptions: 100,
      cleanupIntervalMs: 120000
    });
  }
}