/**
 * Subscription Pipeline System
 *
 * A composable pipeline architecture for processing subscriptions.
 * Each stage in the pipeline can transform, filter, or enhance
 * subscription behavior.
 */

import { BrandedId } from '../types/branded';
import { StateChange } from '../types/events';
import { error } from '../logging/Logger';
import { BLAC_DEFAULTS } from '../constants';
import { generateId } from '../utils/idGenerator';

// Branded types for type safety
export type SubscriptionId = BrandedId<'Subscription'>;
export type StageId = BrandedId<'Stage'>;

/**
 * Metadata value type for pipeline context
 */
export type MetadataValue =
  | string
  | number
  | boolean
  | object
  | undefined
  | null
  | unknown;

/**
 * Context passed through the subscription pipeline
 */
export interface PipelineContext<T = unknown> {
  readonly subscriptionId: SubscriptionId;
  readonly stateChange: StateChange<T>;
  readonly metadata: Map<string, MetadataValue>;
  readonly timestamp: number;
  shouldContinue: boolean;
  skipNotification?: boolean;
}

/**
 * Result from pipeline execution
 */
export interface PipelineResult {
  readonly executed: boolean;
  readonly stagesProcessed: StageId[];
  readonly error?: Error;
  readonly performanceMetrics?: PerformanceMetrics;
}

/**
 * Performance metrics for pipeline execution
 */
export interface PerformanceMetrics {
  readonly totalDuration: number;
  readonly stageDurations: Map<StageId, number>;
  readonly memoryUsed?: number;
}

/**
 * Abstract base class for pipeline stages
 */
export abstract class PipelineStage {
  readonly id: StageId;
  readonly priority: number;
  readonly name: string;

  constructor(name: string, priority: number = 0) {
    this.id = generateId(`stage_${name}`) as StageId;
    this.name = name;
    this.priority = priority;
  }

  /**
   * Process the context through this stage
   */
  abstract process<T>(context: PipelineContext<T>): PipelineContext<T>;

  /**
   * Optional cleanup when stage is removed
   */
  cleanup?(): void;

  /**
   * Optional validation before processing
   */
  validate?(context: PipelineContext): boolean;
}

/**
 * Configuration for subscription pipeline
 */
export interface PipelineConfig {
  readonly enableMetrics?: boolean;
  readonly maxStages?: number;
  readonly timeout?: number;
  readonly errorHandler?: (error: Error, stage: PipelineStage) => void;
}

/**
 * Main subscription pipeline class
 */
export class SubscriptionPipeline {
  private stages: Map<StageId, PipelineStage> = new Map();
  private sortedStages: PipelineStage[] = [];
  private readonly config: Required<PipelineConfig>;

  constructor(config: PipelineConfig = {}) {
    this.config = {
      enableMetrics: config.enableMetrics ?? false,
      maxStages: config.maxStages ?? 20,
      timeout: config.timeout ?? 1000,
      errorHandler:
        config.errorHandler ??
        ((error, stage) => {
          console.error(`Pipeline stage ${stage.name} error:`, error);
        }),
    };
  }

  /**
   * Add a stage to the pipeline
   */
  addStage(stage: PipelineStage): void {
    if (this.stages.size >= this.config.maxStages) {
      throw new Error(
        `Maximum number of stages (${this.config.maxStages}) reached`,
      );
    }

    this.stages.set(stage.id, stage);
    this.rebuildSortedStages();
  }

  /**
   * Remove a stage from the pipeline
   */
  removeStage(stageId: StageId): boolean {
    const stage = this.stages.get(stageId);
    if (!stage) return false;

    stage.cleanup?.();
    this.stages.delete(stageId);
    this.rebuildSortedStages();
    return true;
  }

  /**
   * Execute the pipeline with given context
   */
  execute<T>(context: PipelineContext<T>): PipelineResult {
    const startTime = performance.now();
    const stagesProcessed: StageId[] = [];
    const stageDurations = new Map<StageId, number>();

    try {
      let currentContext = context;

      for (const stage of this.sortedStages) {
        if (!currentContext.shouldContinue) {
          break;
        }

        // Validate if needed
        if (stage.validate && !stage.validate(currentContext)) {
          continue;
        }

        const stageStart = performance.now();

        try {
          currentContext = this.executeStage(stage, currentContext);
          stagesProcessed.push(stage.id);

          if (this.config.enableMetrics) {
            stageDurations.set(stage.id, performance.now() - stageStart);
          }
        } catch (err) {
          error('SubscriptionPipeline', 'Stage execution error', {
            stageId: stage.id,
            stageName: stage.name,
            error: err instanceof Error ? err.message : String(err),
          });
          this.config.errorHandler(err as Error, stage);
          throw err;
        }
      }

      const result: PipelineResult = {
        executed: true,
        stagesProcessed,
        ...(this.config.enableMetrics && {
          performanceMetrics: {
            totalDuration: performance.now() - startTime,
            stageDurations,
          },
        }),
      };

      return result;
    } catch (err) {
      error('SubscriptionPipeline', 'Pipeline execution error', {
        stagesProcessed,
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        executed: false,
        stagesProcessed,
        error: err as Error,
      };
    }
  }

  /**
   * Execute a single stage with timeout
   */
  private executeStage<T>(
    stage: PipelineStage,
    context: PipelineContext<T>,
  ): PipelineContext<T> {
    return stage.process(context);
  }

  /**
   * Rebuild sorted stages array after changes
   */
  private rebuildSortedStages(): void {
    this.sortedStages = Array.from(this.stages.values()).sort(
      (a, b) => b.priority - a.priority,
    );
  }

  /**
   * Get current pipeline configuration
   */
  getConfig(): Readonly<Required<PipelineConfig>> {
    return this.config;
  }

  /**
   * Get all stages in execution order
   */
  getStages(): ReadonlyArray<PipelineStage> {
    return [...this.sortedStages];
  }

  /**
   * Clear all stages and cleanup
   */
  dispose(): void {
    for (const stage of this.stages.values()) {
      stage.cleanup?.();
    }
    this.stages.clear();
    this.sortedStages = [];
  }
}

/**
 * Factory for creating common pipeline configurations
 */
export class PipelineFactory {
  /**
   * Create a high-performance pipeline
   */
  static createPerformancePipeline(): SubscriptionPipeline {
    return new SubscriptionPipeline({
      enableMetrics: true,
      maxStages: 10,
      timeout: 100,
    });
  }

  /**
   * Create a debug pipeline with extensive logging
   */
  static createDebugPipeline(): SubscriptionPipeline {
    return new SubscriptionPipeline({
      enableMetrics: true,
      maxStages: BLAC_DEFAULTS.MAX_PIPELINE_STAGES,
      timeout: BLAC_DEFAULTS.PIPELINE_TIMEOUT_MS,
      errorHandler: (error, stage) => {
        console.error(
          `[DEBUG] Pipeline stage ${stage.name} (${stage.id}) failed:`,
          error,
        );
        console.trace();
      },
    });
  }

  /**
   * Create a minimal pipeline for simple subscriptions
   */
  static createMinimalPipeline(): SubscriptionPipeline {
    return new SubscriptionPipeline({
      enableMetrics: false,
      maxStages: 5,
      timeout: 50,
    });
  }
}
