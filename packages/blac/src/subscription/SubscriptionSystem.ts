/**
 * Subscription System Facade
 *
 * High-level API that orchestrates the subscription pipeline and registry
 * to provide a clean, simple interface for state container integration.
 */

import {
  SubscriptionRegistry,
  SubscriptionConfig,
  ContainerId,
  ConsumerId,
  MetadataValue,
} from './SubscriptionRegistry';
import {
  SubscriptionPipeline,
  SubscriptionId,
  PipelineContext,
  PipelineStage,
} from './SubscriptionPipeline';
import { SubscriptionBuilder } from './SubscriptionBuilder';
import { StateChange } from '../types/events';
import { BlacLogger } from '../logging/Logger';
import { BLAC_DEFAULTS } from '../constants';
import { IdGenerator } from '../utils/idGenerator';

// Import all stages
import {
  ProxyTrackingStage,
  FilterStage,
  NotificationStage,
  NotificationCallback,
  WeakRefStage,
} from './stages';

/**
 * Subscription options for high-level API
 */
export interface SubscriptionOptions<T = unknown> {
  // Core options
  callback: (state: T) => void;

  // Filtering options
  paths?: string[];
  filter?: (current: T, previous: T) => boolean;

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
  enableProxyTracking?: boolean;
  maxSubscriptions?: number;
  cleanupIntervalMs?: number;
}

/**
 * Main subscription system facade
 */
export class SubscriptionSystem<T = unknown> {
  private readonly registry: SubscriptionRegistry;
  private readonly config: Required<SubscriptionSystemConfig>;
  private readonly pipelineCache: Map<string, SubscriptionPipeline> = new Map();
  private containerId: ContainerId;

  constructor(containerId: string, config: SubscriptionSystemConfig = {}) {
    this.containerId = `container_${containerId}` as ContainerId;

    this.config = {
      enableMetrics: config.enableMetrics ?? false,
      enableWeakRefs: config.enableWeakRefs ?? true,
      enableProxyTracking: config.enableProxyTracking ?? true,
      maxSubscriptions:
        config.maxSubscriptions ?? BLAC_DEFAULTS.MAX_SUBSCRIPTIONS,
      cleanupIntervalMs:
        config.cleanupIntervalMs ?? BLAC_DEFAULTS.CLEANUP_INTERVAL_MS,
    };

    this.registry = new SubscriptionRegistry({
      cleanupIntervalMs: this.config.cleanupIntervalMs,
      maxSubscriptions: this.config.maxSubscriptions,
      enableWeakRefs: this.config.enableWeakRefs,
    });
  }

  /**
   * Subscribe to state changes
   */
  subscribe(options: SubscriptionOptions<T>): Subscription {
    const consumerId = this.generateConsumerId();
    const pipeline = this.createPipeline(options);

    // Build configuration
    const config: SubscriptionConfig<T> = {
      containerId: this.containerId,
      consumerId,
      callback: options.callback,
      paths: options.paths,
      keepAlive: options.keepAlive,
      metadata: options.metadata,
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
      },
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
  notify(stateChange: StateChange<T>): void {
    // Get all subscriptions for this container
    const subscriptionIds = this.registry.getContainerSubscriptions(
      this.containerId,
    );

    BlacLogger.debug(
      'SubscriptionSystem',
      '🔄 STATE CHANGED - Evaluating subscriptions',
      {
        containerId: this.containerId,
        subscriptionCount: subscriptionIds.length,
        version: stateChange.version,
        timestamp: stateChange.timestamp,
      },
    );

    if (subscriptionIds.length === 0) {
      BlacLogger.debug('SubscriptionSystem', '⚠️  No subscriptions to notify', {
        containerId: this.containerId,
        reason:
          'No components are currently subscribed to this state container',
      });
      return;
    }

    // Process each subscription through its pipeline (synchronously)
    for (const subscriptionId of subscriptionIds) {
      const pipeline = this.pipelineCache.get(subscriptionId);
      if (!pipeline) {
        BlacLogger.debug('SubscriptionSystem', '⚠️  No pipeline found', {
          subscriptionId,
          containerId: this.containerId,
        });
        continue;
      }

      const subscription = this.registry.get(subscriptionId);
      if (!subscription) {
        BlacLogger.debug(
          'SubscriptionSystem',
          '⚠️  No subscription found in registry',
          {
            subscriptionId,
            containerId: this.containerId,
          },
        );
        continue;
      }

      BlacLogger.debug(
        'SubscriptionSystem',
        '➡️  Processing subscription through pipeline',
        {
          subscriptionId,
          containerId: this.containerId,
          hasPaths:
            !!subscription.config.paths && subscription.config.paths.length > 0,
          pathCount: subscription.config.paths?.length ?? 0,
        },
      );

      const context: PipelineContext<T> = {
        subscriptionId,
        stateChange,
        metadata: new Map(Object.entries(subscription.config.metadata || {})),
        timestamp: Date.now(),
        shouldContinue: true,
        skipNotification: false,
      };

      try {
        const result = pipeline.execute(context);
        BlacLogger.debug(
          'SubscriptionSystem',
          '✅ Subscription pipeline completed',
          {
            subscriptionId,
            executed: result.executed,
            stagesProcessed: result.stagesProcessed.length,
          },
        );
      } catch (error) {
        BlacLogger.error(
          'SubscriptionSystem',
          '❌ Subscription pipeline error',
          {
            subscriptionId,
            containerId: this.containerId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
        );
      }
    }

    BlacLogger.debug('SubscriptionSystem', '✅ All subscriptions processed', {
      containerId: this.containerId,
      count: subscriptionIds.length,
    });
  }

  /**
   * Create a subscription using the builder API
   */
  builder(): SubscriptionBuilder<T> {
    return new SubscriptionBuilder<T>().forContainer(this.containerId);
  }

  /**
   * Get system statistics
   */
  getStats() {
    return {
      registry: this.registry.getStats(),
      pipelineCount: this.pipelineCache.size,
      config: this.config,
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
  private createPipeline(
    options: SubscriptionOptions<T>,
  ): SubscriptionPipeline {
    const pipeline = new SubscriptionPipeline({
      enableMetrics: this.config.enableMetrics,
      timeout: 100,
    });

    // Add stages in priority order

    // 1. ProxyTracking stage (before filter to set up paths)
    if (this.config.enableProxyTracking) {
      pipeline.addStage(
        new ProxyTrackingStage({
          enabled: true,
        }),
      );
    }

    // 2. WeakRef stage
    if (this.config.enableWeakRefs) {
      pipeline.addStage(new WeakRefStage());
    }

    // 3. Filter stage (always add when proxy tracking is enabled for automatic filtering)
    if (options.paths || options.filter || this.config.enableProxyTracking) {
      pipeline.addStage(
        new FilterStage({
          paths: options.paths,
          predicate: options.filter,
        }),
      );
    }

    // 4. Notification stage (always last)
    pipeline.addStage(
      new NotificationStage({
        callback: options.callback as NotificationCallback,
      }),
    );

    return pipeline;
  }

  /**
   * Find a specific stage type in a pipeline
   */
  private findStage<S extends PipelineStage>(
    pipeline: SubscriptionPipeline,
    StageClass: new (...args: unknown[]) => S,
  ): S | undefined {
    const stages = pipeline.getStages();
    return stages.find((stage) => stage instanceof StageClass) as S | undefined;
  }

  /**
   * Generate unique consumer ID
   */
  private generateConsumerId(): ConsumerId {
    return IdGenerator.generate<ConsumerId>('consumer');
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
      cleanupIntervalMs: 60000,
    });
  }

  /**
   * Create a debug subscription system
   */
  static createDebug<T>(containerId: string): SubscriptionSystem<T> {
    return new SubscriptionSystem<T>(containerId, {
      enableMetrics: true,
      enableWeakRefs: true,
      maxSubscriptions: BLAC_DEFAULTS.MAX_SUBSCRIPTIONS_HIGH_PERF,
      cleanupIntervalMs: BLAC_DEFAULTS.CLEANUP_INTERVAL_HIGH_PERF_MS,
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
      cleanupIntervalMs: 120000,
    });
  }
}
