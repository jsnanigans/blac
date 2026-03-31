import type { InstanceMetadata } from '@blac/core';
import type { Logger, ResolvedConfig } from '../types';

export class GroupedFormatter {
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

  private group(label: string, collapsed = true): void {
    if (collapsed && this.logger.groupCollapsed) {
      this.logger.groupCollapsed(label);
    } else if (this.logger.group) {
      this.logger.group(label);
    } else {
      this.logger.log(label);
    }
  }

  private groupEnd(): void {
    if (this.logger.groupEnd) {
      this.logger.groupEnd();
    }
  }

  logInstall(stats: { registeredTypes: number; totalInstances: number }): void {
    this.group(`${this.prefix} Plugin installed`);
    this.logger.log('Registered types:', stats.registeredTypes);
    this.logger.log('Total instances:', stats.totalInstances);
    this.groupEnd();
  }

  logUninstall(): void {
    this.logger.log(`${this.prefix} Plugin uninstalled`);
  }

  logInstanceCreated(metadata: InstanceMetadata, initialState: unknown): void {
    const instanceId = this.formatInstanceId(metadata.className, metadata.id);
    this.group(`${this.prefix} Created ${instanceId}`);
    this.logger.log('Class:', metadata.className);
    this.logger.log('Instance ID:', metadata.id);
    this.logger.log('Initial state:', initialState);
    this.groupEnd();
  }

  logInstanceDisposed(
    metadata: InstanceMetadata,
    lifespanMs: number,
    stateChangeCount: number,
  ): void {
    const instanceId = this.formatInstanceId(metadata.className, metadata.id);
    this.group(`${this.prefix} Disposed ${instanceId}`);
    this.logger.log('Lifespan:', this.formatDuration(lifespanMs));
    this.logger.log('State changes:', stateChangeCount);
    this.logger.log('Final state:', metadata.state);
    this.groupEnd();
  }

  logStateChanged(
    metadata: InstanceMetadata,
    previousState: unknown,
    currentState: unknown,
    callstack: string | undefined,
    includeCallstack: boolean,
  ): void {
    const instanceId = this.formatInstanceId(metadata.className, metadata.id);
    this.group(`${this.prefix} ${instanceId} state changed`);
    this.logger.log('Previous:', previousState);
    this.logger.log('Current:', currentState);
    if (includeCallstack && callstack) {
      this.logger.log('Callstack:', callstack);
    }
    this.groupEnd();
  }

  logWarning(message: string, details?: Record<string, unknown>): void {
    if (details) {
      this.group(`${this.prefix} ⚠️ ${message}`, false);
      for (const [key, value] of Object.entries(details)) {
        this.logger.log(`${key}:`, value);
      }
      this.groupEnd();
    } else {
      this.logger.warn(`${this.prefix} ⚠️ ${message}`);
    }
  }

  logStats(stats: {
    registeredTypes: number;
    totalInstances: number;
    typeBreakdown: Record<string, number>;
  }): void {
    this.group(`${this.prefix} Stats`);
    this.logger.log('Registered types:', stats.registeredTypes);
    this.logger.log('Total instances:', stats.totalInstances);
    this.logger.log('Breakdown:', stats.typeBreakdown);
    this.groupEnd();
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}
