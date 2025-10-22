/**
 * EventStream - Type-safe event dispatch and handling
 *
 * This class manages event flow with support for filtering,
 * transformation, and backpressure handling.
 */

import { BaseEvent, TypedEventEmitter } from '../types/events';

/**
 * Event filter function type
 */
export type EventFilter<E extends BaseEvent> = (event: E) => boolean;

/**
 * Event transformer function type
 */
export type EventTransformer<E extends BaseEvent, R extends BaseEvent> = (
  event: E
) => R | null;

/**
 * Event handler function type
 */
export type EventHandler<E extends BaseEvent> = (event: E) => void | Promise<void>;

/**
 * Options for EventStream
 */
export interface EventStreamOptions {
  /** Maximum queue size for buffered events (0 = unlimited) */
  maxQueueSize?: number;
  /** Whether to process events asynchronously */
  async?: boolean;
  /** Error handling strategy */
  errorStrategy?: 'throw' | 'log' | 'silent';
}

/**
 * EventStream manages type-safe event dispatch with advanced features
 */
export class EventStream<E extends BaseEvent = BaseEvent> {
  private emitter = new TypedEventEmitter<E>();
  private filters: EventFilter<E>[] = [];
  private transformers: EventTransformer<E, any>[] = [];
  private eventQueue: E[] = [];
  private processing = false;
  private options: Required<EventStreamOptions>;
  private paused = false;
  private metrics = {
    totalEvents: 0,
    filteredEvents: 0,
    transformedEvents: 0,
    erroredEvents: 0,
    queuedEvents: 0,
  };

  constructor(options: EventStreamOptions = {}) {
    this.options = {
      maxQueueSize: options.maxQueueSize ?? 1000,
      async: options.async ?? false,
      errorStrategy: options.errorStrategy ?? 'log',
    };
  }

  /**
   * Dispatch an event
   * @param event The event to dispatch
   */
  dispatch(event: E): void {
    this.metrics.totalEvents++;

    // Apply filters
    if (!this.passesFilters(event)) {
      this.metrics.filteredEvents++;
      return;
    }

    // Apply transformations
    const transformed = this.applyTransformers(event);
    if (!transformed) {
      this.metrics.transformedEvents++;
      return;
    }

    // Handle async mode with queueing
    if (this.options.async) {
      this.enqueue(transformed);
      this.processQueue();
    } else {
      this.emit(transformed);
    }
  }

  /**
   * Subscribe to events
   * @param handler Event handler
   * @returns Unsubscribe function
   */
  subscribe(handler: EventHandler<E>): () => void {
    return this.emitter.on(handler);
  }

  /**
   * Subscribe to a single event
   * @param handler Event handler
   * @returns Unsubscribe function
   */
  once(handler: EventHandler<E>): () => void {
    return this.emitter.once(handler);
  }

  /**
   * Add an event filter
   * @param filter Filter function
   * @returns Remove function
   */
  addFilter(filter: EventFilter<E>): () => void {
    this.filters.push(filter);
    return () => {
      const index = this.filters.indexOf(filter);
      if (index >= 0) {
        this.filters.splice(index, 1);
      }
    };
  }

  /**
   * Add an event transformer
   * @param transformer Transformer function
   * @returns Remove function
   */
  addTransformer<R extends BaseEvent>(
    transformer: EventTransformer<E, R>
  ): () => void {
    this.transformers.push(transformer);
    return () => {
      const index = this.transformers.indexOf(transformer);
      if (index >= 0) {
        this.transformers.splice(index, 1);
      }
    };
  }

  /**
   * Pause event processing (for async mode)
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume event processing (for async mode)
   */
  resume(): void {
    this.paused = false;
    if (this.options.async) {
      this.processQueue();
    }
  }

  /**
   * Clear event queue
   */
  clearQueue(): void {
    this.eventQueue = [];
    this.metrics.queuedEvents = 0;
  }

  /**
   * Get stream metrics
   */
  getMetrics(): Readonly<typeof this.metrics> {
    return { ...this.metrics };
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }

  /**
   * Check if stream is processing
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Check if stream is paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Pipe events to another stream
   * @param target Target event stream
   * @returns Unsubscribe function
   */
  pipe<T extends BaseEvent>(target: EventStream<T>): () => void {
    return this.subscribe((event) => {
      target.dispatch(event as unknown as T);
    });
  }

  /**
   * Create a filtered stream
   * @param filter Filter function
   * @returns New filtered stream
   */
  filter(filter: EventFilter<E>): EventStream<E> {
    const filtered = new EventStream<E>(this.options);
    this.subscribe((event) => {
      if (filter(event)) {
        filtered.dispatch(event);
      }
    });
    return filtered;
  }

  /**
   * Create a mapped stream
   * @param mapper Mapping function
   * @returns New mapped stream
   */
  map<R extends BaseEvent>(mapper: (event: E) => R): EventStream<R> {
    const mapped = new EventStream<R>(this.options);
    this.subscribe((event) => {
      try {
        const result = mapper(event);
        if (result) {
          mapped.dispatch(result);
        }
      } catch (error) {
        this.handleError(error as Error, event);
      }
    });
    return mapped;
  }

  /**
   * Check if event passes all filters
   */
  private passesFilters(event: E): boolean {
    for (const filter of this.filters) {
      try {
        if (!filter(event)) {
          return false;
        }
      } catch (error) {
        this.handleError(error as Error, event);
        return false;
      }
    }
    return true;
  }

  /**
   * Apply transformers to event
   */
  private applyTransformers(event: E): E | null {
    let current: any = event;

    for (const transformer of this.transformers) {
      try {
        const result = transformer(current);
        if (result === null) {
          return null;
        }
        current = result;
      } catch (error) {
        this.handleError(error as Error, event);
        return null;
      }
    }

    return current;
  }

  /**
   * Enqueue event for async processing
   */
  private enqueue(event: E): void {
    // Check queue size limit
    if (
      this.options.maxQueueSize > 0 &&
      this.eventQueue.length >= this.options.maxQueueSize
    ) {
      // Drop oldest event
      this.eventQueue.shift();
    }

    this.eventQueue.push(event);
    this.metrics.queuedEvents = this.eventQueue.length;
  }

  /**
   * Process queued events
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.paused || this.eventQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.eventQueue.length > 0 && !this.paused) {
      const event = this.eventQueue.shift()!;
      this.metrics.queuedEvents = this.eventQueue.length;

      try {
        await this.emitAsync(event);
      } catch (error) {
        this.handleError(error as Error, event);
      }
    }

    this.processing = false;
  }

  /**
   * Emit event synchronously
   */
  private emit(event: E): void {
    try {
      this.emitter.emit(event);
    } catch (error) {
      this.handleError(error as Error, event);
    }
  }

  /**
   * Emit event asynchronously
   */
  private async emitAsync(event: E): Promise<void> {
    return new Promise((resolve) => {
      // Use microtask for async emission
      queueMicrotask(() => {
        try {
          this.emitter.emit(event);
          resolve();
        } catch (error) {
          this.handleError(error as Error, event);
          resolve();
        }
      });
    });
  }

  /**
   * Handle errors based on strategy
   */
  private handleError(error: Error, event: E): void {
    this.metrics.erroredEvents++;

    switch (this.options.errorStrategy) {
      case 'throw':
        throw error;
      case 'log':
        console.error('EventStream error:', error, 'Event:', event);
        break;
      case 'silent':
        // Do nothing
        break;
    }
  }
}