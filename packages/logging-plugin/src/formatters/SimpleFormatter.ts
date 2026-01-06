import type { InstanceMetadata } from '@blac/core';
import type { Logger, ResolvedConfig } from '../types';

export class SimpleFormatter {
  private logger: Logger;
  private prefix: string;

  constructor(config: ResolvedConfig) {
    this.logger = config.logger;
    this.prefix = config.prefix;
  }

  private formatInstanceId(className: string, id: string): string {
    const shortId = id.length > 8 ? id.slice(0, 8) : id;
    return `${className}#${shortId}`;
  }

  logInstall(stats: { registeredTypes: number; totalInstances: number }): void {
    this.logger.log(
      `${this.prefix} Plugin installed (${stats.registeredTypes} types, ${stats.totalInstances} instances)`,
    );
  }

  logUninstall(): void {
    this.logger.log(`${this.prefix} Plugin uninstalled`);
  }

  logInstanceCreated(metadata: InstanceMetadata): void {
    const instanceId = this.formatInstanceId(metadata.className, metadata.id);
    const isolated = metadata.isIsolated ? ' (isolated)' : '';
    this.logger.log(`${this.prefix} Created ${instanceId}${isolated}`);
  }

  logInstanceDisposed(metadata: InstanceMetadata, lifespanMs: number): void {
    const instanceId = this.formatInstanceId(metadata.className, metadata.id);
    const lifespan = this.formatDuration(lifespanMs);
    this.logger.log(
      `${this.prefix} Disposed ${instanceId} (lived ${lifespan})`,
    );
  }

  logStateChanged(
    metadata: InstanceMetadata,
    previousState: unknown,
    currentState: unknown,
    _callstack: string | undefined,
    includeCallstack: boolean,
  ): void {
    const instanceId = this.formatInstanceId(metadata.className, metadata.id);
    const prev = this.formatState(previousState);
    const curr = this.formatState(currentState);
    this.logger.log(`${this.prefix} ${instanceId} state: ${prev} → ${curr}`);

    if (includeCallstack && _callstack) {
      this.logger.log(`${this.prefix}   Callstack: ${_callstack}`);
    }
  }

  logBatchedStateChanges(
    metadata: InstanceMetadata,
    initialState: unknown,
    finalState: unknown,
    changeCount: number,
    _includeCallstack: boolean,
  ): void {
    const instanceId = this.formatInstanceId(metadata.className, metadata.id);
    const initial = this.formatState(initialState);
    const final = this.formatState(finalState);
    this.logger.log(
      `${this.prefix} ${instanceId} state: ${initial} → ${final} (${changeCount} changes batched)`,
    );
  }

  logEventAdded(
    className: string,
    instanceId: string,
    eventType: string,
    payload: unknown,
  ): void {
    const id = this.formatInstanceId(className, instanceId);
    const payloadStr = this.formatState(payload);
    this.logger.log(`${this.prefix} ${id} event: ${eventType} ${payloadStr}`);
  }

  logWarning(message: string): void {
    this.logger.warn(`${this.prefix} ⚠️ ${message}`);
  }

  logStats(stats: {
    registeredTypes: number;
    totalInstances: number;
    typeBreakdown: Record<string, number>;
  }): void {
    this.logger.log(
      `${this.prefix} Stats: ${stats.totalInstances} instances across ${stats.registeredTypes} types`,
    );
  }

  private formatState(state: unknown): string {
    if (state === null) return 'null';
    if (state === undefined) return 'undefined';
    if (typeof state === 'object') {
      try {
        const str = JSON.stringify(state);
        return str.length > 50 ? str.slice(0, 50) + '...' : str;
      } catch {
        return '[Object]';
      }
    }
    return String(state);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}
