/**
 * Performance Optimization Stage
 *
 * Provides batching, throttling, and debouncing capabilities
 * for optimizing notification performance.
 */

import { PipelineStage, PipelineContext } from '../SubscriptionPipeline';

export interface OptimizationOptions {
  batch?: {
    enabled: boolean;
    maxSize?: number;
    flushInterval?: number;
  };
  throttle?: {
    interval: number;
    leading?: boolean;
    trailing?: boolean;
  };
  debounce?: {
    wait: number;
    maxWait?: number;
  };
  cache?: {
    enabled: boolean;
    ttl?: number;
    maxSize?: number;
  };
}

interface BatchEntry<T> {
  context: PipelineContext<T>;
  timestamp: number;
}

interface ThrottleState {
  lastCall: number;
  pendingContext?: PipelineContext;
  timer?: NodeJS.Timeout;
}

interface DebounceState {
  timer?: NodeJS.Timeout;
  startTime?: number;
  pendingContext?: PipelineContext;
}

interface CacheEntry<T = unknown> {
  value: T;
  timestamp: number;
}

export class OptimizationStage extends PipelineStage {
  private readonly options: OptimizationOptions;
  private batch: BatchEntry<unknown>[] = [];
  private batchTimer?: NodeJS.Timeout;
  private throttleState: ThrottleState = { lastCall: 0 };
  private debounceState: DebounceState = {};
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  constructor(options: OptimizationOptions = {}) {
    super('Optimization', 850);
    this.options = options;
  }

  process<T>(context: PipelineContext<T>): PipelineContext<T> {
    // Check cache first
    if (this.options.cache?.enabled) {
      const cached = this.checkCache(context);
      if (cached) {
        context.metadata.set('cacheHit', true);
        context.skipNotification = true;
        return context;
      }
    }

    // Apply batching
    if (this.options.batch?.enabled) {
      return this.processBatch(context);
    }

    // Apply throttling
    if (this.options.throttle) {
      return this.processThrottle(context);
    }

    // Apply debouncing
    if (this.options.debounce) {
      return this.processDebounce(context);
    }

    // Update cache
    if (this.options.cache?.enabled) {
      this.updateCache(context);
    }

    return context;
  }

  private processBatch<T>(context: PipelineContext<T>): PipelineContext<T> {
    const { maxSize = 100, flushInterval = 10 } = this.options.batch!;

    this.batch.push({
      context: { ...context },
      timestamp: Date.now()
    });

    // Flush if batch is full
    if (this.batch.length >= maxSize) {
      this.flushBatch();
    } else if (!this.batchTimer) {
      // Schedule flush
      this.batchTimer = setTimeout(() => {
        this.flushBatch();
      }, flushInterval);
    }

    // Skip individual notification
    context.skipNotification = true;
    context.metadata.set('batched', true);

    return context;
  }

  private flushBatch(): void {
    if (this.batch.length === 0) return;

    // Process only the most recent context from the batch
    const latestEntry = this.batch[this.batch.length - 1];
    const batchSize = this.batch.length;

    // Clear batch
    this.batch = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Re-enable notification for the latest context
    const flushedContext = latestEntry.context;
    flushedContext.skipNotification = false;
    flushedContext.metadata.set('batchSize', batchSize);
    flushedContext.metadata.set('batchFlushed', true);

    // Process the notification immediately
    // Since we're in a flush, we need to continue the pipeline
    // This is a bit of a hack - in production, we'd need better integration
    process.nextTick(() => {
      const callback = flushedContext.metadata.get('notificationCallback');
      if (callback) {
        const value = flushedContext.metadata.has('selectedValue')
          ? flushedContext.metadata.get('selectedValue')
          : flushedContext.stateChange.current;
        callback(value);
      }
    });
  }

  private processThrottle<T>(context: PipelineContext<T>): PipelineContext<T> {
    const { interval, leading = true, trailing = true } = this.options.throttle!;
    const now = Date.now();
    const timeSinceLastCall = now - this.throttleState.lastCall;

    if (timeSinceLastCall >= interval) {
      // Enough time has passed, allow the call
      this.throttleState.lastCall = now;

      if (this.throttleState.timer) {
        clearTimeout(this.throttleState.timer);
        this.throttleState.timer = undefined;
      }

      context.metadata.set('throttled', false);
      return context;
    }

    // Within throttle interval
    if (!this.throttleState.lastCall || (leading && timeSinceLastCall === 0)) {
      // First call or leading edge
      this.throttleState.lastCall = now;
      context.metadata.set('throttleLeading', true);
      return context;
    }

    // Store for potential trailing call
    if (trailing) {
      this.throttleState.pendingContext = { ...context };

      if (!this.throttleState.timer) {
        const remainingTime = interval - timeSinceLastCall;
        this.throttleState.timer = setTimeout(() => {
          if (this.throttleState.pendingContext) {
            this.throttleState.pendingContext.skipNotification = false;
            this.throttleState.pendingContext.shouldContinue = true;
            this.throttleState.pendingContext.metadata.set('throttleTrailing', true);
          }
          this.throttleState.lastCall = Date.now();
          this.throttleState.timer = undefined;
          this.throttleState.pendingContext = undefined;
        }, remainingTime);
      }
    }

    // Skip this notification
    context.skipNotification = true;
    context.metadata.set('throttled', true);
    return context;
  }

  private processDebounce<T>(context: PipelineContext<T>): PipelineContext<T> {
    const { wait, maxWait } = this.options.debounce!;
    const now = Date.now();

    // Clear existing timer
    if (this.debounceState.timer) {
      clearTimeout(this.debounceState.timer);
    }

    // Initialize start time
    if (!this.debounceState.startTime) {
      this.debounceState.startTime = now;
    }

    // Store the latest context
    this.debounceState.pendingContext = { ...context };

    // Check if maxWait has been exceeded
    const timeWaiting = now - this.debounceState.startTime;
    const shouldFlush = maxWait && timeWaiting >= maxWait;

    if (shouldFlush) {
      // Flush immediately due to maxWait
      this.flushDebounce();
    } else {
      // Schedule debounced call
      this.debounceState.timer = setTimeout(() => {
        this.flushDebounce();
      }, wait);

      // Skip this notification
      context.skipNotification = true;
      context.metadata.set('debounced', true);
    }

    return context;
  }

  private flushDebounce(): void {
    if (this.debounceState.pendingContext) {
      this.debounceState.pendingContext.skipNotification = false;
      this.debounceState.pendingContext.shouldContinue = true;
      this.debounceState.pendingContext.metadata.set('debounceFlush', true);
    }

    // Reset state
    this.debounceState = {};
  }

  private checkCache<T>(context: PipelineContext<T>): boolean {
    if (!this.options.cache?.enabled) return false;

    const cacheKey = this.getCacheKey(context);
    const cached = this.cache.get(cacheKey);

    if (!cached) return false;

    const { ttl = 1000 } = this.options.cache;
    const age = Date.now() - cached.timestamp;

    if (age > ttl) {
      this.cache.delete(cacheKey);
      return false;
    }

    return true;
  }

  private updateCache<T>(context: PipelineContext<T>): void {
    if (!this.options.cache?.enabled) return;

    const cacheKey = this.getCacheKey(context);
    const { maxSize = 1000 } = this.options.cache;

    // Maintain cache size
    if (this.cache.size >= maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(cacheKey, {
      value: context.stateChange.current,
      timestamp: Date.now()
    });
  }

  private getCacheKey<T>(context: PipelineContext<T>): string {
    // Generate cache key from subscription ID and state hash
    const subscriptionId = context.subscriptionId;
    const stateHash = this.hashState(context.stateChange.current);
    return `${subscriptionId}_${stateHash}`;
  }

  private hashState(state: unknown): string {
    // Simple hash for demo - use proper hashing in production
    try {
      return JSON.stringify(state).substring(0, 50);
    } catch {
      return `${Date.now()}`;
    }
  }

  cleanup(): void {
    // Clear all timers
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    if (this.throttleState.timer) {
      clearTimeout(this.throttleState.timer);
      this.throttleState.timer = undefined;
    }

    if (this.debounceState.timer) {
      clearTimeout(this.debounceState.timer);
      this.debounceState.timer = undefined;
    }

    // Clear data
    this.batch = [];
    this.throttleState = { lastCall: 0 };
    this.debounceState = {};
    this.cache.clear();
  }

  /**
   * Get stage statistics
   */
  getStats(): {
    batchSize: number;
    cacheSize: number;
    hasPendingThrottle: boolean;
    hasPendingDebounce: boolean;
  } {
    return {
      batchSize: this.batch.length,
      cacheSize: this.cache.size,
      hasPendingThrottle: !!this.throttleState.pendingContext,
      hasPendingDebounce: !!this.debounceState.pendingContext
    };
  }
}