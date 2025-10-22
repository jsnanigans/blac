/**
 * Selector Stage
 *
 * Evaluates selectors and caches results for performance.
 * Only triggers notifications when selected values change.
 */

import { PipelineStage, PipelineContext } from '../SubscriptionPipeline';

export type Selector<TState, TResult> = (state: TState) => TResult;

export interface SelectorOptions<T = unknown> {
  memoize?: boolean;
  equalityFn?: (a: T, b: T) => boolean;
  cacheSize?: number;
}

interface CacheEntry<TInput, TOutput> {
  input: TInput;
  output: TOutput;
  timestamp: number;
}

export class SelectorStage<TState = unknown, TResult = unknown> extends PipelineStage {
  private readonly selector?: Selector<TState, TResult>;
  private readonly options: Required<SelectorOptions<TResult>>;
  private cache: Map<string, CacheEntry<TState, TResult>> = new Map();
  private previousSelected: TResult | undefined = undefined;

  constructor(selector?: Selector<TState, TResult>, options: SelectorOptions<TResult> = {}) {
    super('Selector', 800);
    this.selector = selector;
    this.options = {
      memoize: options.memoize ?? true,
      equalityFn: options.equalityFn ?? Object.is,
      cacheSize: options.cacheSize ?? 100
    } as Required<SelectorOptions<TResult>>;
  }

  process<T>(context: PipelineContext<T>): PipelineContext<T> {
    if (!this.selector) {
      // No selector, pass through
      return context;
    }

    const { stateChange } = context;
    const { current } = stateChange;

    // Evaluate selector
    const selected = this.options.memoize
      ? this.memoizedSelect(current)
      : this.selector(current);

    // Check if selected value changed
    const hasChanged = !this.options.equalityFn(selected, this.previousSelected);

    if (!hasChanged) {
      context.shouldContinue = false;
      context.skipNotification = true;
      context.metadata.set('selectorUnchanged', true);
    } else {
      context.metadata.set('selectedValue', selected);
      context.metadata.set('previousSelected', this.previousSelected);
      this.previousSelected = selected;
    }

    return context;
  }

  private memoizedSelect(state: TState): TResult {
    const cacheKey = this.getCacheKey(state);
    const cached = this.cache.get(cacheKey);

    if (cached && this.isCacheValid(cached)) {
      return cached.output;
    }

    const result = this.selector!(state);

    // Update cache
    this.cache.set(cacheKey, {
      input: state,
      output: result,
      timestamp: Date.now()
    });

    // Maintain cache size
    if (this.cache.size > this.options.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    return result;
  }

  private getCacheKey(state: TState): string {
    // Simple stringification for cache key
    // In production, use a proper hashing algorithm
    try {
      return JSON.stringify(state);
    } catch {
      // Fallback for circular references
      return `${Date.now()}_${Math.random()}`;
    }
  }

  private isCacheValid(entry: CacheEntry): boolean {
    // Cache entries are valid for 1 second
    return Date.now() - entry.timestamp < 1000;
  }

  cleanup(): void {
    this.cache.clear();
    this.previousSelected = undefined;
  }
}