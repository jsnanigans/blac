/**
 * Filter Stage
 *
 * Filters state changes based on paths, dependencies,
 * and custom predicates.
 */

import { PipelineStage, PipelineContext } from '../SubscriptionPipeline';
import { StateChange } from '../../types/events';

export type FilterPredicate<T> = (
  current: T,
  previous: T,
  change: StateChange<T>
) => boolean;

export interface FilterOptions<T = unknown> {
  paths?: string[];
  predicate?: FilterPredicate<T>;
  includeNested?: boolean;
  excludePaths?: string[];
}

export class FilterStage<T = unknown> extends PipelineStage {
  private readonly options: FilterOptions<T>;

  constructor(options: FilterOptions<T> = {}) {
    super('Filter', 900);
    this.options = options;
  }

  process<T>(context: PipelineContext<T>): PipelineContext<T> {
    const { stateChange } = context;
    const { current, previous } = stateChange;

    // Get dynamic filter paths from metadata (set by ProxyTrackingStage)
    // or use static paths from options
    const dynamicFilterPaths = context.metadata.get('filterPaths') as string[] | undefined;
    const pathsToCheck = dynamicFilterPaths || this.options.paths;

    // Apply path filtering
    if (pathsToCheck && pathsToCheck.length > 0) {
      const hasRelevantChange = this.checkPaths(current, previous, pathsToCheck);
      if (!hasRelevantChange) {
        context.shouldContinue = false;
        context.skipNotification = true;
        context.metadata.set('filteredReason', 'path_mismatch');
        return context;
      }
    }

    // Apply exclusion paths
    if (this.options.excludePaths && this.options.excludePaths.length > 0) {
      const hasExcludedChange = this.checkPaths(current, previous, this.options.excludePaths);
      if (hasExcludedChange) {
        context.shouldContinue = false;
        context.skipNotification = true;
        context.metadata.set('filteredReason', 'excluded_path');
        return context;
      }
    }

    // Apply custom predicate
    if (this.options.predicate) {
      const shouldNotify = (this.options.predicate as FilterPredicate<unknown>)(current, previous, stateChange);
      if (!shouldNotify) {
        context.shouldContinue = false;
        context.skipNotification = true;
        context.metadata.set('filteredReason', 'predicate_false');
        return context;
      }
    }

    context.metadata.set('filterPassed', true);
    return context;
  }

  private checkPaths<T>(current: T, previous: T, paths: string[]): boolean {
    for (const path of paths) {
      if (this.hasPathChanged(current, previous, path)) {
        return true;
      }
    }
    return false;
  }

  private hasPathChanged<U>(current: U, previous: U, path: string): boolean {
    const currentValue = this.getValueAtPath(current, path);
    const previousValue = this.getValueAtPath(previous, path);

    if (this.options.includeNested) {
      return !this.deepEqual(currentValue, previousValue);
    }

    return currentValue !== previousValue;
  }

  private getValueAtPath<U>(obj: U, path: string): unknown {
    const segments = path.split('.');
    let value: unknown = obj;

    for (const segment of segments) {
      if (value == null) return undefined;
      value = (value as Record<string, unknown>)[segment];
    }

    return value;
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object' && typeof b === 'object') {
      const objA = a as Record<string, unknown>;
      const objB = b as Record<string, unknown>;

      const keysA = Object.keys(objA);
      const keysB = Object.keys(objB);

      if (keysA.length !== keysB.length) return false;

      for (const key of keysA) {
        if (!this.deepEqual(objA[key], objB[key])) return false;
      }

      return true;
    }

    return false;
  }
}