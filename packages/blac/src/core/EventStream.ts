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
  event: E,
) => R | null;

/**
 * Event handler function type (synchronous only)
 */
export type EventHandler<E extends BaseEvent> = (event: E) => void;

/**
 * Options for EventStream
 */
export interface EventStreamOptions {
  /** Maximum queue size for buffered events (0 = unlimited) */
  maxQueueSize?: number;
  /** Error handling strategy */
  errorStrategy?: 'throw' | 'log' | 'silent';
}

/**
 * EventStream manages type-safe event dispatch with advanced features
 */
export class EventStream<E extends BaseEvent = BaseEvent> {
  private emitter = new TypedEventEmitter<E>();
  private filters: EventFilter<E>[] = [];
  private transformers: EventTransformer<E, BaseEvent>[] = [];
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
      errorStrategy: options.errorStrategy ?? 'log',
    };
  }

  /**
   * Dispatch an event (synchronously)
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

    // Emit synchronously
    this.emitInternal(transformed);
  }

  /**
   * Alias for dispatch for simpler API
   * @param event The event to emit
   */
  emit(event: E): void {
    this.dispatch(event);
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
    transformer: EventTransformer<E, R>,
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
   * Resume event processing
   */
  resume(): void {
    this.paused = false;
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
    let current: BaseEvent = event;

    for (const transformer of this.transformers) {
      try {
        const result = transformer(current as E);
        if (result === null) {
          return null;
        }
        current = result;
      } catch (error) {
        this.handleError(error as Error, event);
        return null;
      }
    }

    return current as E;
  }

  /**
   * Emit event synchronously (internal)
   */
  private emitInternal(event: E): void {
    try {
      this.emitter.emit(event);
    } catch (error) {
      this.handleError(error as Error, event);
    }
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
