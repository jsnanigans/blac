import type {
  BlacPlugin,
  PluginContext,
  StateContainer,
  Vertex,
  DiscriminatedEvent,
  InstanceMetadata,
} from '@blac/core';
import { SimpleFormatter } from './formatters/SimpleFormatter';
import { GroupedFormatter } from './formatters/GroupedFormatter';
import { InstanceCountMonitor } from './monitors/InstanceCountMonitor';
import { LifecycleMonitor } from './monitors/LifecycleMonitor';
import { StateChangeBuffer } from './monitors/StateChangeBuffer';
import type {
  LoggingPluginConfig,
  ResolvedConfig,
  FilterContext,
} from './types';
import { resolveConfig } from './types';

export class LoggingPlugin implements BlacPlugin {
  readonly name = 'LoggingPlugin';
  readonly version = '1.0.0';

  private config: ResolvedConfig;
  private context?: PluginContext;
  private simpleFormatter: SimpleFormatter;
  private groupedFormatter: GroupedFormatter;
  private instanceCountMonitor: InstanceCountMonitor;
  private lifecycleMonitor: LifecycleMonitor;
  private stateChangeBuffer: StateChangeBuffer;

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
    this.stateChangeBuffer = new StateChangeBuffer(
      this.config,
      this.flushStateChanges.bind(this),
    );
  }

  private flushStateChanges(
    metadata: InstanceMetadata,
    initialState: unknown,
    finalState: unknown,
    changes: Array<{ previous: unknown; current: unknown; callstack?: string }>,
  ): void {
    if (changes.length === 1) {
      if (this.config.format === 'simple') {
        this.simpleFormatter.logStateChanged(
          metadata,
          initialState,
          finalState,
          changes[0].callstack,
          this.config.includeCallstack,
        );
      } else {
        this.groupedFormatter.logStateChanged(
          metadata,
          initialState,
          finalState,
          changes[0].callstack,
          this.config.includeCallstack,
        );
      }
    } else {
      if (this.config.format === 'simple') {
        this.simpleFormatter.logBatchedStateChanges(
          metadata,
          initialState,
          finalState,
          changes.length,
          this.config.includeCallstack,
        );
      } else {
        this.groupedFormatter.logBatchedStateChanges(
          metadata,
          initialState,
          finalState,
          changes,
          this.config.includeCallstack,
        );
      }
    }
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
    this.stateChangeBuffer.flushAll();

    if (this.config.format === 'simple') {
      this.simpleFormatter.logUninstall();
    } else {
      this.groupedFormatter.logUninstall();
    }

    this.instanceCountMonitor.reset();
    this.lifecycleMonitor.reset();
    this.stateChangeBuffer.reset();
    this.context = undefined;
  }

  onInstanceCreated(
    instance: StateContainer<any>,
    context: PluginContext,
  ): void {
    const metadata = context.getInstanceMetadata(instance);

    if (
      !this.shouldLog(
        instance,
        metadata.className,
        metadata.id,
        metadata.isIsolated,
      )
    ) {
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
    callstack: string | undefined,
    context: PluginContext,
  ): void {
    const metadata = context.getInstanceMetadata(instance);

    if (
      !this.shouldLog(
        instance,
        metadata.className,
        metadata.id,
        metadata.isIsolated,
      )
    ) {
      return;
    }

    this.lifecycleMonitor.onStateChanged(metadata.id);

    if (!this.shouldLogStateChanges()) return;

    const buffered = this.stateChangeBuffer.add(
      metadata,
      previousState,
      currentState,
      callstack,
    );

    if (!buffered) {
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
  }

  onEventAdded<E extends DiscriminatedEvent>(
    vertex: Vertex<any, E>,
    event: E & { timestamp?: number; source?: string },
    context: PluginContext,
  ): void {
    const metadata = context.getInstanceMetadata(vertex);

    if (
      !this.shouldLog(
        vertex,
        metadata.className,
        metadata.id,
        metadata.isIsolated,
      )
    ) {
      return;
    }

    if (!this.shouldLogEvents()) return;

    const eventType = event.type ?? 'UnknownEvent';

    if (this.config.format === 'simple') {
      this.simpleFormatter.logEventAdded(
        metadata.className,
        metadata.id,
        eventType,
        event,
      );
    } else {
      this.groupedFormatter.logEventAdded(
        metadata.className,
        metadata.id,
        eventType,
        event,
      );
    }
  }

  onInstanceDisposed(
    instance: StateContainer<any>,
    context: PluginContext,
  ): void {
    const metadata = context.getInstanceMetadata(instance);

    if (
      !this.shouldLog(
        instance,
        metadata.className,
        metadata.id,
        metadata.isIsolated,
      )
    ) {
      return;
    }

    this.stateChangeBuffer.flushInstance(metadata.id);

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
    isIsolated: boolean,
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
        isIsolated,
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
    return this.config.level === 'debug' || this.config.level === 'verbose';
  }

  private shouldLogEvents(): boolean {
    if (!this.config.logEvents) return false;
    return this.config.level === 'debug' || this.config.level === 'verbose';
  }

  private logWarning(message: string, details?: Record<string, unknown>): void {
    if (this.config.format === 'simple') {
      this.simpleFormatter.logWarning(message);
    } else {
      this.groupedFormatter.logWarning(message, details);
    }
  }
}
