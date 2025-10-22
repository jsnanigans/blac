/**
 * Tests for Subscription Pipeline System
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  SubscriptionPipeline,
  PipelineStage,
  PipelineContext,
  PipelineFactory
} from './SubscriptionPipeline';
import { StateChange } from '../types/events';

class TestStage extends PipelineStage {
  public processCount = 0;
  public lastContext?: PipelineContext;

  constructor(name: string, priority: number = 0) {
    super(name, priority);
  }

  process<T>(context: PipelineContext<T>): PipelineContext<T> {
    this.processCount++;
    this.lastContext = context;
    context.metadata.set(this.name, true);
    return context;
  }
}

class AsyncTestStage extends PipelineStage {
  constructor(
    name: string,
    private delay: number,
    priority: number = 0
  ) {
    super(name, priority);
  }

  async process<T>(context: PipelineContext<T>): Promise<PipelineContext<T>> {
    await new Promise(resolve => setTimeout(resolve, this.delay));
    context.metadata.set(this.name, true);
    return context;
  }
}

class ErrorStage extends PipelineStage {
  process<T>(_context: PipelineContext<T>): PipelineContext<T> {
    throw new Error('Stage error');
  }
}

describe('SubscriptionPipeline', () => {
  let pipeline: SubscriptionPipeline;

  beforeEach(() => {
    pipeline = new SubscriptionPipeline();
  });

  afterEach(() => {
    pipeline.dispose();
  });

  describe('Stage Management', () => {
    it('should add and remove stages', () => {
      const stage = new TestStage('test');

      pipeline.addStage(stage);
      expect(pipeline.getStages()).toHaveLength(1);
      expect(pipeline.getStages()[0]).toBe(stage);

      const removed = pipeline.removeStage(stage.id);
      expect(removed).toBe(true);
      expect(pipeline.getStages()).toHaveLength(0);
    });

    it('should sort stages by priority', () => {
      const lowPriority = new TestStage('low', 100);
      const highPriority = new TestStage('high', 500);
      const mediumPriority = new TestStage('medium', 300);

      pipeline.addStage(lowPriority);
      pipeline.addStage(highPriority);
      pipeline.addStage(mediumPriority);

      const stages = pipeline.getStages();
      expect(stages[0]).toBe(highPriority);
      expect(stages[1]).toBe(mediumPriority);
      expect(stages[2]).toBe(lowPriority);
    });

    it('should enforce max stages limit', () => {
      const limitedPipeline = new SubscriptionPipeline({ maxStages: 2 });

      limitedPipeline.addStage(new TestStage('stage1'));
      limitedPipeline.addStage(new TestStage('stage2'));

      expect(() => {
        limitedPipeline.addStage(new TestStage('stage3'));
      }).toThrow('Maximum number of stages (2) reached');

      limitedPipeline.dispose();
    });

    it('should call cleanup when removing stage', () => {
      const stage = new TestStage('test');
      const cleanupSpy = vi.fn();
      stage.cleanup = cleanupSpy;

      pipeline.addStage(stage);
      pipeline.removeStage(stage.id);

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Pipeline Execution', () => {
    it('should execute stages in order', async () => {
      const stage1 = new TestStage('stage1', 300);
      const stage2 = new TestStage('stage2', 200);
      const stage3 = new TestStage('stage3', 100);

      pipeline.addStage(stage1);
      pipeline.addStage(stage2);
      pipeline.addStage(stage3);

      const context: PipelineContext = {
        subscriptionId: 'sub_test' as any,
        stateChange: { current: 'new', previous: 'old' } as StateChange,
        metadata: new Map(),
        timestamp: Date.now(),
        shouldContinue: true
      };

      const result = await pipeline.execute(context);

      expect(result.executed).toBe(true);
      expect(result.stagesProcessed).toHaveLength(3);
      expect(stage1.processCount).toBe(1);
      expect(stage2.processCount).toBe(1);
      expect(stage3.processCount).toBe(1);
    });

    it('should stop execution when shouldContinue is false', async () => {
      const stage1 = new TestStage('stage1');
      const stage2 = new TestStage('stage2');

      // Stage1 will set shouldContinue to false
      stage1.process = (context) => {
        context.shouldContinue = false;
        return context;
      };

      pipeline.addStage(stage1);
      pipeline.addStage(stage2);

      const context: PipelineContext = {
        subscriptionId: 'sub_test' as any,
        stateChange: { current: 'new', previous: 'old' } as StateChange,
        metadata: new Map(),
        timestamp: Date.now(),
        shouldContinue: true
      };

      const result = await pipeline.execute(context);

      expect(result.executed).toBe(true);
      expect(result.stagesProcessed).toHaveLength(1);
      expect(stage2.processCount).toBe(0);
    });

    it('should handle async stages', async () => {
      const asyncStage = new AsyncTestStage('async', 10);
      pipeline.addStage(asyncStage);

      const context: PipelineContext = {
        subscriptionId: 'sub_test' as any,
        stateChange: { current: 'new', previous: 'old' } as StateChange,
        metadata: new Map(),
        timestamp: Date.now(),
        shouldContinue: true
      };

      const result = await pipeline.execute(context);

      expect(result.executed).toBe(true);
      expect(context.metadata.get('async')).toBe(true);
    });

    it('should handle stage errors', async () => {
      const errorHandler = vi.fn();
      const errorPipeline = new SubscriptionPipeline({ errorHandler });

      errorPipeline.addStage(new ErrorStage('error'));

      const context: PipelineContext = {
        subscriptionId: 'sub_test' as any,
        stateChange: { current: 'new', previous: 'old' } as StateChange,
        metadata: new Map(),
        timestamp: Date.now(),
        shouldContinue: true
      };

      const result = await errorPipeline.execute(context);

      expect(result.executed).toBe(false);
      expect(result.error).toBeDefined();
      expect(errorHandler).toHaveBeenCalled();

      errorPipeline.dispose();
    });

    it('should timeout long-running stages', async () => {
      const timeoutPipeline = new SubscriptionPipeline({ timeout: 50 });
      const slowStage = new AsyncTestStage('slow', 100);

      timeoutPipeline.addStage(slowStage);

      const context: PipelineContext = {
        subscriptionId: 'sub_test' as any,
        stateChange: { current: 'new', previous: 'old' } as StateChange,
        metadata: new Map(),
        timestamp: Date.now(),
        shouldContinue: true
      };

      const result = await timeoutPipeline.execute(context);

      expect(result.executed).toBe(false);
      expect(result.error?.message).toContain('timed out');

      timeoutPipeline.dispose();
    });

    it('should validate stages if validation is provided', async () => {
      const stage = new TestStage('validated');
      stage.validate = (context) => context.metadata.has('required');

      pipeline.addStage(stage);

      const contextWithoutRequired: PipelineContext = {
        subscriptionId: 'sub_test' as any,
        stateChange: { current: 'new', previous: 'old' } as StateChange,
        metadata: new Map(),
        timestamp: Date.now(),
        shouldContinue: true
      };

      await pipeline.execute(contextWithoutRequired);
      expect(stage.processCount).toBe(0);

      const contextWithRequired: PipelineContext = {
        subscriptionId: 'sub_test' as any,
        stateChange: { current: 'new', previous: 'old' } as StateChange,
        metadata: new Map([['required', true]]),
        timestamp: Date.now(),
        shouldContinue: true
      };

      await pipeline.execute(contextWithRequired);
      expect(stage.processCount).toBe(1);
    });
  });

  describe('Performance Metrics', () => {
    it('should collect performance metrics when enabled', async () => {
      const metricsPipeline = new SubscriptionPipeline({ enableMetrics: true });

      metricsPipeline.addStage(new TestStage('stage1'));
      metricsPipeline.addStage(new AsyncTestStage('stage2', 10));

      const context: PipelineContext = {
        subscriptionId: 'sub_test' as any,
        stateChange: { current: 'new', previous: 'old' } as StateChange,
        metadata: new Map(),
        timestamp: Date.now(),
        shouldContinue: true
      };

      const result = await metricsPipeline.execute(context);

      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics!.totalDuration).toBeGreaterThan(0);
      expect(result.performanceMetrics!.stageDurations.size).toBe(2);

      metricsPipeline.dispose();
    });

    it('should not collect metrics when disabled', async () => {
      const stage = new TestStage('test');
      pipeline.addStage(stage);

      const context: PipelineContext = {
        subscriptionId: 'sub_test' as any,
        stateChange: { current: 'new', previous: 'old' } as StateChange,
        metadata: new Map(),
        timestamp: Date.now(),
        shouldContinue: true
      };

      const result = await pipeline.execute(context);

      expect(result.performanceMetrics).toBeUndefined();
    });
  });

  describe('PipelineFactory', () => {
    it('should create performance pipeline', () => {
      const pipeline = PipelineFactory.createPerformancePipeline();
      const config = pipeline.getConfig();

      expect(config.enableMetrics).toBe(true);
      expect(config.maxStages).toBe(10);
      expect(config.timeout).toBe(100);

      pipeline.dispose();
    });

    it('should create debug pipeline', () => {
      const pipeline = PipelineFactory.createDebugPipeline();
      const config = pipeline.getConfig();

      expect(config.enableMetrics).toBe(true);
      expect(config.maxStages).toBe(30);
      expect(config.timeout).toBe(5000);

      pipeline.dispose();
    });

    it('should create minimal pipeline', () => {
      const pipeline = PipelineFactory.createMinimalPipeline();
      const config = pipeline.getConfig();

      expect(config.enableMetrics).toBe(false);
      expect(config.maxStages).toBe(5);
      expect(config.timeout).toBe(50);

      pipeline.dispose();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all stages on dispose', () => {
      const cleanupSpies = [vi.fn(), vi.fn(), vi.fn()];

      for (let i = 0; i < 3; i++) {
        const stage = new TestStage(`stage${i}`);
        stage.cleanup = cleanupSpies[i];
        pipeline.addStage(stage);
      }

      pipeline.dispose();

      cleanupSpies.forEach(spy => {
        expect(spy).toHaveBeenCalled();
      });

      expect(pipeline.getStages()).toHaveLength(0);
    });
  });
});