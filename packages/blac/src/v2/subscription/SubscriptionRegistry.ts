/**
 * Subscription Registry
 *
 * Manages subscription lifecycle, ID generation, reference counting,
 * and cleanup scheduling.
 */

import { BrandedId } from '../types/branded';
import { SubscriptionPipeline, SubscriptionId, PipelineContext, MetadataValue } from './SubscriptionPipeline';
import { NotificationCallback } from './stages/NotificationStage';
import { StateChange } from '../types/events';

export type ContainerId = BrandedId<'Container'>;
export type ConsumerId = BrandedId<'Consumer'>;
export { MetadataValue } from './SubscriptionPipeline';

/**
 * Subscription configuration
 */
export interface SubscriptionConfig<TState = unknown, TResult = TState> {
  containerId: ContainerId;
  consumerId: ConsumerId;
  callback: NotificationCallback<TResult>;
  selector?: (state: TState) => TResult;
  paths?: string[];
  priority?: number;
  keepAlive?: boolean;
  metadata?: Record<string, MetadataValue>;
}

/**
 * Subscription entry in the registry
 */
interface SubscriptionEntry<TState = unknown, TResult = TState> {
  id: SubscriptionId;
  config: SubscriptionConfig<TState, TResult>;
  pipeline: SubscriptionPipeline;
  refCount: number;
  created: number;
  lastAccessed: number;
  isActive: boolean;
  weakRef?: WeakRef<object>;
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  inactiveSubscriptions: number;
  averageRefCount: number;
  oldestSubscription: number;
  memoryEstimate: number;
}

/**
 * Main subscription registry class
 */
export class SubscriptionRegistry {
  private subscriptions: Map<SubscriptionId, SubscriptionEntry<unknown>> = new Map();
  private consumerIndex: Map<ConsumerId, Set<SubscriptionId>> = new Map();
  private containerIndex: Map<ContainerId, Set<SubscriptionId>> = new Map();
  private cleanupInterval?: NodeJS.Timeout;
  private idCounter = 0;

  constructor(
    private readonly options: {
      cleanupIntervalMs?: number;
      maxSubscriptions?: number;
      enableWeakRefs?: boolean;
    } = {}
  ) {
    this.startCleanupScheduler();
  }

  /**
   * Register a new subscription
   */
  register<TState = unknown, TResult = TState>(config: SubscriptionConfig<TState, TResult>): SubscriptionId {
    if (this.options.maxSubscriptions && this.subscriptions.size >= this.options.maxSubscriptions) {
      throw new Error(`Maximum subscriptions (${this.options.maxSubscriptions}) reached`);
    }

    const id = this.generateId();
    const pipeline = this.createPipeline(config);

    const entry: SubscriptionEntry<TState, TResult> = {
      id,
      config,
      pipeline,
      refCount: 1,
      created: Date.now(),
      lastAccessed: Date.now(),
      isActive: true
    };

    // Add weak reference if enabled
    if (this.options.enableWeakRefs && config.callback) {
      entry.weakRef = new WeakRef(config.callback);
    }

    this.subscriptions.set(id, entry);
    this.updateIndices(id, config, 'add');

    return id;
  }

  /**
   * Unregister a subscription
   */
  unregister(id: SubscriptionId): boolean {
    const entry = this.subscriptions.get(id);
    if (!entry) return false;

    // Cleanup pipeline
    entry.pipeline.dispose();

    // Update indices
    this.updateIndices(id, entry.config, 'remove');

    // Remove from registry
    this.subscriptions.delete(id);

    return true;
  }

  /**
   * Increment reference count for a subscription
   */
  retain(id: SubscriptionId): void {
    const entry = this.subscriptions.get(id);
    if (entry) {
      entry.refCount++;
      entry.lastAccessed = Date.now();
    }
  }

  /**
   * Decrement reference count for a subscription
   */
  release(id: SubscriptionId): void {
    const entry = this.subscriptions.get(id);
    if (!entry) return;

    entry.refCount--;
    entry.lastAccessed = Date.now();

    if (entry.refCount <= 0 && !entry.config.keepAlive) {
      this.scheduleCleanup(id);
    }
  }

  /**
   * Process a state change through relevant subscriptions
   */
  async processStateChange<T>(
    containerId: ContainerId,
    change: StateChange<T>
  ): Promise<void> {
    const subscriptionIds = this.containerIndex.get(containerId);
    if (!subscriptionIds) return;

    const promises: Promise<void>[] = [];

    for (const id of subscriptionIds) {
      const entry = this.subscriptions.get(id);
      if (!entry || !entry.isActive) continue;

      // Check weak reference if enabled
      if (entry.weakRef && !entry.weakRef.deref()) {
        this.scheduleCleanup(id);
        continue;
      }

      const context: PipelineContext<T> = {
        subscriptionId: id,
        stateChange: change,
        metadata: new Map([
          ['priority', entry.config.priority ?? 500],
          ...Object.entries(entry.config.metadata ?? {})
        ]),
        timestamp: Date.now(),
        shouldContinue: true
      };

      promises.push(
        entry.pipeline.execute(context).then(() => {
          entry.lastAccessed = Date.now();
        }).catch(error => {
          console.error(`Subscription ${id} processing error:`, error);
        })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Get subscriptions for a consumer
   */
  getConsumerSubscriptions(consumerId: ConsumerId): SubscriptionId[] {
    const ids = this.consumerIndex.get(consumerId);
    return ids ? Array.from(ids) : [];
  }

  /**
   * Get subscriptions for a container
   */
  getContainerSubscriptions(containerId: ContainerId): SubscriptionId[] {
    const ids = this.containerIndex.get(containerId);
    return ids ? Array.from(ids) : [];
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const entries = Array.from(this.subscriptions.values());
    const active = entries.filter(e => e.isActive);

    return {
      totalSubscriptions: entries.length,
      activeSubscriptions: active.length,
      inactiveSubscriptions: entries.length - active.length,
      averageRefCount: entries.reduce((sum, e) => sum + e.refCount, 0) / entries.length || 0,
      oldestSubscription: Math.min(...entries.map(e => e.created)) || Date.now(),
      memoryEstimate: this.estimateMemoryUsage()
    };
  }

  /**
   * Generate unique subscription ID
   */
  private generateId(): SubscriptionId {
    const timestamp = Date.now();
    const counter = ++this.idCounter;
    const random = Math.random().toString(36).substr(2, 9);
    return `sub_${timestamp}_${counter}_${random}` as SubscriptionId;
  }

  /**
   * Create pipeline for subscription
   */
  private createPipeline<TState = unknown, TResult = TState>(config: SubscriptionConfig<TState, TResult>): SubscriptionPipeline {
    const pipeline = new SubscriptionPipeline({
      enableMetrics: false,
      timeout: 100
    });

    // Pipeline is created and configured by SubscriptionSystem,
    // not here. This is just a placeholder.

    return pipeline;
  }

  /**
   * Update indices when adding/removing subscriptions
   */
  private updateIndices<TState = unknown, TResult = TState>(
    id: SubscriptionId,
    config: SubscriptionConfig<TState, TResult>,
    operation: 'add' | 'remove'
  ): void {
    // Update consumer index
    if (!this.consumerIndex.has(config.consumerId)) {
      this.consumerIndex.set(config.consumerId, new Set());
    }
    const consumerSet = this.consumerIndex.get(config.consumerId)!;

    if (operation === 'add') {
      consumerSet.add(id);
    } else {
      consumerSet.delete(id);
      if (consumerSet.size === 0) {
        this.consumerIndex.delete(config.consumerId);
      }
    }

    // Update container index
    if (!this.containerIndex.has(config.containerId)) {
      this.containerIndex.set(config.containerId, new Set());
    }
    const containerSet = this.containerIndex.get(config.containerId)!;

    if (operation === 'add') {
      containerSet.add(id);
    } else {
      containerSet.delete(id);
      if (containerSet.size === 0) {
        this.containerIndex.delete(config.containerId);
      }
    }
  }

  /**
   * Schedule cleanup for subscription
   */
  private scheduleCleanup(id: SubscriptionId): void {
    const entry = this.subscriptions.get(id);
    if (entry) {
      entry.isActive = false;
      // Actual cleanup happens in cleanup scheduler
    }
  }

  /**
   * Start cleanup scheduler
   */
  private startCleanupScheduler(): void {
    const intervalMs = this.options.cleanupIntervalMs ?? 30000; // 30 seconds default

    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, intervalMs);

    // Don't block Node.js exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Perform cleanup of inactive subscriptions
   */
  private performCleanup(): void {
    const now = Date.now();
    const maxAge = 60000; // 1 minute

    for (const [id, entry] of this.subscriptions.entries()) {
      if (!entry.isActive && (now - entry.lastAccessed) > maxAge) {
        this.unregister(id);
      }

      // Check weak references
      if (entry.weakRef && !entry.weakRef.deref()) {
        this.unregister(id);
      }
    }
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // Rough estimate: 500 bytes per subscription base
    // Plus 100 bytes per stage in pipeline
    let total = this.subscriptions.size * 500;

    for (const entry of this.subscriptions.values()) {
      total += entry.pipeline.getStages().length * 100;
    }

    return total;
  }

  /**
   * Dispose of the registry
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    // Cleanup all subscriptions
    for (const id of this.subscriptions.keys()) {
      this.unregister(id);
    }

    this.subscriptions.clear();
    this.consumerIndex.clear();
    this.containerIndex.clear();
  }
}