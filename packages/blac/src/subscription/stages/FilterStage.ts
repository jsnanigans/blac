/**
 * Filter Stage
 *
 * Filters state changes based on paths, dependencies,
 * and custom predicates.
 */

import { PipelineStage, PipelineContext } from '../SubscriptionPipeline';
import { StateChange } from '../../types/events';
import { debug } from '../../logging/Logger';
import { deepEqual } from '../../utils/equality';

export type FilterPredicate<T> = (
  current: T,
  previous: T,
  change: StateChange<T>,
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
    const dynamicFilterPaths = context.metadata.get('filterPaths') as
      | string[]
      | undefined;
    const pathsToCheck = dynamicFilterPaths || this.options.paths;

    debug('FilterStage', 'Evaluating render trigger', {
      subscriptionId: context.subscriptionId,
      hasDynamicPaths: !!dynamicFilterPaths,
      hasStaticPaths: !!this.options.paths,
      pathCount: pathsToCheck?.length ?? 0,
      paths: pathsToCheck,
    });

    // Apply path filtering
    if (pathsToCheck && pathsToCheck.length > 0) {
      const hasRelevantChange = this.checkPaths(
        current,
        previous,
        pathsToCheck,
      );

      if (!hasRelevantChange) {
        context.shouldContinue = false;
        context.skipNotification = true;
        context.metadata.set('filteredReason', 'path_mismatch');

        debug(
          'FilterStage',
          '❌ RENDER BLOCKED - No tracked properties changed',
          {
            reason: 'None of the tracked paths have changed values',
            trackedPaths: pathsToCheck,
            subscriptionId: context.subscriptionId,
          },
        );

        return context;
      }

      debug('FilterStage', '✅ RENDER ALLOWED - Tracked properties changed', {
        reason: 'At least one tracked path has changed',
        trackedPaths: pathsToCheck,
        subscriptionId: context.subscriptionId,
      });
    } else {
      debug('FilterStage', '✅ RENDER ALLOWED - No path filtering', {
        reason: 'No specific paths being tracked, all changes trigger render',
        subscriptionId: context.subscriptionId,
      });
    }

    // Apply exclusion paths
    if (this.options.excludePaths && this.options.excludePaths.length > 0) {
      const hasExcludedChange = this.checkPaths(
        current,
        previous,
        this.options.excludePaths,
      );
      if (hasExcludedChange) {
        context.shouldContinue = false;
        context.skipNotification = true;
        context.metadata.set('filteredReason', 'excluded_path');

        debug('FilterStage', '❌ RENDER BLOCKED - Excluded path changed', {
          reason:
            'An excluded path changed (changes to these paths should not trigger renders)',
          excludedPaths: this.options.excludePaths,
          subscriptionId: context.subscriptionId,
        });

        return context;
      }
    }

    // Apply custom predicate
    if (this.options.predicate) {
      const shouldNotify = (this.options.predicate as FilterPredicate<unknown>)(
        current,
        previous,
        stateChange,
      );
      if (!shouldNotify) {
        context.shouldContinue = false;
        context.skipNotification = true;
        context.metadata.set('filteredReason', 'predicate_false');

        debug(
          'FilterStage',
          '❌ RENDER BLOCKED - Custom predicate returned false',
          {
            reason:
              'Custom filter predicate determined that this change should not trigger a render',
            subscriptionId: context.subscriptionId,
          },
        );

        return context;
      }

      debug(
        'FilterStage',
        '✅ RENDER ALLOWED - Custom predicate returned true',
        {
          reason:
            'Custom filter predicate determined this change should trigger a render',
          subscriptionId: context.subscriptionId,
        },
      );
    }

    context.metadata.set('filterPassed', true);
    debug('FilterStage', '✅ All filters passed - proceeding to notification', {
      subscriptionId: context.subscriptionId,
    });
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

    const changed = this.options.includeNested
      ? !deepEqual(currentValue, previousValue)
      : currentValue !== previousValue;

    debug('FilterStage', 'hasPathChanged', {
      path,
      currentValue,
      previousValue,
      changed,
    });

    return changed;
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
}
