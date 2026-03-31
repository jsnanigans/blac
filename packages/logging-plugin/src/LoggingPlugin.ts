import type { BlacPlugin, PluginContext, StateContainer } from '@blac/core';
import { SimpleFormatter } from './formatters/SimpleFormatter';
import { GroupedFormatter } from './formatters/GroupedFormatter';
import { InstanceCountMonitor } from './monitors/InstanceCountMonitor';
import { LifecycleMonitor } from './monitors/LifecycleMonitor';
import type {
  LoggingPluginConfig,
  ResolvedConfig,
  FilterContext,
} from './types';
import { resolveConfig } from './types';

const STATE_CHANGE_RATE_LIMIT = 1000; // max state changes per second

export class LoggingPlugin implements BlacPlugin {
  readonly name = 'LoggingPlugin';
  readonly version = '1.0.0';

  private config: ResolvedConfig;
  private context?: PluginContext;
  private simpleFormatter: SimpleFormatter;
  private groupedFormatter: GroupedFormatter;
  private instanceCountMonitor: InstanceCountMonitor;
  private lifecycleMonitor: LifecycleMonitor;

  // Rate limiting for state changes
  private stateChangeCount = 0;
  private stateChangeWindowStart = Date.now();
  private stateChangeLoggingDisabled = false;

  constructor(config: LoggingPluginConfig = {}) {
    this.config = resolveConfig(config);

    const warningHandler = (
      message: string,
      details?: Record<string, unknown>,
    ) => {
      this.logWarning(message, details);
    };

    this.simpleFormatter = new SimpleFormatter(this.config);
    this.groupedFormatter = new GroupedFormatter(this.config);
    this.instanceCountMonitor = new InstanceCountMonitor(
      this.config,
      warningHandler,
    );
    this.lifecycleMonitor = new LifecycleMonitor(this.config, warningHandler);
  }

  onInstall(context: PluginContext): void {
    this.context = context;
    const stats = context.getStats();

    if (this.config.format === 'simple') {
      this.simpleFormatter.logInstall(stats);
    } else {
      this.groupedFormatter.logInstall(stats);
    }
  }

  onUninstall(): void {
    if (this.config.format === 'simple') {
      this.simpleFormatter.logUninstall();
    } else {
      this.groupedFormatter.logUninstall();
    }

    this.instanceCountMonitor.reset();
    this.lifecycleMonitor.reset();
    this.stateChangeCount = 0;
    this.stateChangeWindowStart = Date.now();
    this.stateChangeLoggingDisabled = false;
    this.context = undefined;
  }

  onInstanceCreated(
    instance: StateContainer<any>,
    context: PluginContext,
  ): void {
    const metadata = context.getInstanceMetadata(instance);

    if (!this.shouldLog(instance, metadata.className, metadata.id)) {
      return;
    }

    this.instanceCountMonitor.onInstanceCreated(metadata.className);
    this.lifecycleMonitor.onInstanceCreated(metadata.className, metadata.id);

    if (!this.shouldLogLifecycle()) return;

    if (this.config.format === 'simple') {
      this.simpleFormatter.logInstanceCreated(metadata);
    } else {
      this.groupedFormatter.logInstanceCreated(
        metadata,
        context.getState(instance),
      );
    }
  }

  onStateChanged<S extends object>(
    instance: StateContainer<S>,
    previousState: S,
    currentState: S,
    context: PluginContext,
  ): void {
    const metadata = context.getInstanceMetadata(instance);

    if (!this.shouldLog(instance, metadata.className, metadata.id)) {
      return;
    }

    this.lifecycleMonitor.onStateChanged(metadata.id);

    if (!this.shouldLogStateChanges()) return;

    // Check rate limit
    if (this.stateChangeLoggingDisabled) return;

    const now = Date.now();
    if (now - this.stateChangeWindowStart >= 1000) {
      // Reset window
      this.stateChangeCount = 0;
      this.stateChangeWindowStart = now;
    }

    this.stateChangeCount++;

    if (this.stateChangeCount > STATE_CHANGE_RATE_LIMIT) {
      this.stateChangeLoggingDisabled = true;
      this.logWarning(
        `State change logging disabled: exceeded ${STATE_CHANGE_RATE_LIMIT} changes/second`,
      );
      return;
    }

    const callstack = this.config.includeCallstack
      ? new Error().stack
      : undefined;

    if (this.config.format === 'simple') {
      this.simpleFormatter.logStateChanged(
        metadata,
        previousState,
        currentState,
        callstack,
        this.config.includeCallstack,
      );
    } else {
      this.groupedFormatter.logStateChanged(
        metadata,
        previousState,
        currentState,
        callstack,
        this.config.includeCallstack,
      );
    }
  }

  onInstanceDisposed(
    instance: StateContainer<any>,
    context: PluginContext,
  ): void {
    const metadata = context.getInstanceMetadata(instance);

    if (!this.shouldLog(instance, metadata.className, metadata.id)) {
      return;
    }

    const info = this.lifecycleMonitor.getInstanceInfo(metadata.id);
    const lifespanMs = info ? Date.now() - info.createdAt : 0;
    const stateChangeCount = info?.stateChangeCount ?? 0;

    this.instanceCountMonitor.onInstanceDisposed(metadata.className);
    this.lifecycleMonitor.onInstanceDisposed(metadata.className, metadata.id);

    if (!this.shouldLogLifecycle()) return;

    if (this.config.format === 'simple') {
      this.simpleFormatter.logInstanceDisposed(metadata, lifespanMs);
    } else {
      this.groupedFormatter.logInstanceDisposed(
        metadata,
        lifespanMs,
        stateChangeCount,
      );
    }
  }

  logStats(): void {
    if (!this.context) return;
    const stats = this.context.getStats();

    if (this.config.format === 'simple') {
      this.simpleFormatter.logStats(stats);
    } else {
      this.groupedFormatter.logStats(stats);
    }
  }

  private shouldLog(
    instance: StateContainer<any>,
    className: string,
    instanceId: string,
  ): boolean {
    if (this.config.include && !this.config.include.includes(className)) {
      return false;
    }

    if (this.config.exclude?.includes(className)) {
      return false;
    }

    if (this.config.filter) {
      const ctx: FilterContext = {
        instance,
        className,
        instanceId,
      };
      return this.config.filter(ctx);
    }

    return true;
  }

  private shouldLogLifecycle(): boolean {
    if (!this.config.logLifecycle) return false;
    return this.config.level !== 'minimal';
  }

  private shouldLogStateChanges(): boolean {
    if (!this.config.logStateChanges) return false;
    return (
      this.config.level === 'info' ||
      this.config.level === 'debug' ||
      this.config.level === 'verbose'
    );
  }

  private logWarning(message: string, details?: Record<string, unknown>): void {
    if (this.config.format === 'simple') {
      this.simpleFormatter.logWarning(message);
    } else {
      this.groupedFormatter.logWarning(message, details);
    }
  }
}
