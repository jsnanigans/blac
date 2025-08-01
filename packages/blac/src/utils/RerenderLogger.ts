import { Blac } from '../Blac';
import { BlocBase } from '../BlocBase';

export interface RerenderInfo {
  componentName: string;
  blocName: string;
  blocId: string;
  renderCount: number;
  reason: RerenderReason;
  timestamp: number;
  duration?: number;
  stackTrace?: string;
}

export interface RerenderReason {
  type:
    | 'state-change'
    | 'dependency-change'
    | 'mount'
    | 'props-change'
    | 'unknown';
  changedPaths?: string[];
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  dependencies?: string[];
  description?: string;
}

/**
 * Utility class for logging component rerenders with detailed debugging information
 */
export class RerenderLogger {
  private static componentRenderCounts = new Map<string, number>();
  private static lastRenderTimestamps = new Map<string, number>();
  private static groupedLogs = new Map<string, RerenderInfo[]>();
  private static groupTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Log a component rerender with detailed information
   */
  static logRerender(info: RerenderInfo): void {
    // RerenderLogger is now controlled by the RenderLoggingPlugin
    // This method is called by the plugin which already handles configuration
    const config = (Blac as any)._config?.rerenderLogging;
    if (!config) return;

    // Parse config
    const loggingConfig = this.parseConfig(config);
    if (!loggingConfig.enabled) return;

    // Apply filter if provided
    if (
      loggingConfig.filter &&
      !loggingConfig.filter({
        componentName: info.componentName,
        blocName: info.blocName,
      })
    ) {
      return;
    }

    // Track render count
    const key = `${info.componentName}-${info.blocId}`;
    const currentCount = this.componentRenderCounts.get(key) || 0;
    this.componentRenderCounts.set(key, currentCount + 1);
    info.renderCount = currentCount + 1;

    // Calculate duration if possible
    const lastTimestamp = this.lastRenderTimestamps.get(key);
    if (lastTimestamp) {
      info.duration = info.timestamp - lastTimestamp;
    }
    this.lastRenderTimestamps.set(key, info.timestamp);

    // Add stack trace if requested
    if (loggingConfig.includeStackTrace && loggingConfig.level === 'detailed') {
      info.stackTrace = new Error().stack;
    }

    // Handle grouping
    if (loggingConfig.groupRerenders) {
      this.logGrouped(info, loggingConfig);
    } else {
      this.logImmediate(info, loggingConfig);
    }
  }

  /**
   * Parse the logging configuration
   */
  private static parseConfig(config: any) {
    if (config === true) {
      return { enabled: true, level: 'normal' as const };
    }
    if (typeof config === 'string') {
      return {
        enabled: true,
        level:
          config === 'minimal' ? ('minimal' as const) : ('detailed' as const),
      };
    }
    return {
      enabled: config.enabled,
      level: config.level || ('normal' as const),
      filter: config.filter,
      includeStackTrace: config.includeStackTrace,
      groupRerenders: config.groupRerenders,
    };
  }

  /**
   * Log immediately without grouping
   */
  private static logImmediate(
    info: RerenderInfo,
    config: ReturnType<typeof RerenderLogger.parseConfig>,
  ): void {
    const message = this.formatMessage(info, config.level!);

    if (config.level === 'detailed') {
      console.group(message.header);
      if (message.details) console.log(message.details);
      if (message.values) console.table(message.values);
      if (info.stackTrace) console.log('Stack trace:', info.stackTrace);
      console.groupEnd();
    } else {
      console.log(message.header, message.details || '');
    }
  }

  /**
   * Log with grouping (batch multiple rerenders)
   */
  private static logGrouped(
    info: RerenderInfo,
    config: ReturnType<typeof RerenderLogger.parseConfig>,
  ): void {
    const groupKey = `${info.componentName}-${info.blocId}`;

    // Clear existing timeout
    const existingTimeout = this.groupTimeouts.get(groupKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Add to group
    const group = this.groupedLogs.get(groupKey) || [];
    group.push(info);
    this.groupedLogs.set(groupKey, group);

    // Set new timeout
    const timeout = setTimeout(() => {
      const logs = this.groupedLogs.get(groupKey) || [];
      this.groupedLogs.delete(groupKey);
      this.groupTimeouts.delete(groupKey);

      if (logs.length === 1) {
        this.logImmediate(logs[0], config);
      } else {
        console.group(
          `🔄 ${info.componentName} rendered ${logs.length} times (${info.blocName})`,
        );
        logs.forEach((log, index) => {
          const message = this.formatMessage(log, config.level!);
          console.log(`  ${index + 1}. ${message.details || message.header}`);
        });
        console.groupEnd();
      }
    }, 50); // 50ms debounce

    this.groupTimeouts.set(groupKey, timeout);
  }

  /**
   * Format the log message based on level
   */
  private static formatMessage(
    info: RerenderInfo,
    level: 'minimal' | 'normal' | 'detailed',
  ) {
    const emoji = this.getReasonEmoji(info.reason.type);

    if (level === 'minimal') {
      return {
        header: `${emoji} ${info.componentName} #${info.renderCount}`,
        details: null,
        values: null,
      };
    }

    const header = `${emoji} ${info.componentName} rerender #${info.renderCount} (${info.blocName})`;

    let details = `Reason: ${info.reason.description || info.reason.type}`;

    if (info.duration !== undefined) {
      details += ` | Time since last: ${info.duration}ms`;
    }

    if (
      level === 'normal' &&
      info.reason.changedPaths &&
      info.reason.changedPaths.length > 0
    ) {
      details += ` | Changed: ${info.reason.changedPaths.join(', ')}`;
    }

    let values: Record<string, { old: any; new: any }> | null = null;
    if (
      level === 'detailed' &&
      info.reason.changedPaths &&
      info.reason.changedPaths.length > 0
    ) {
      values = {};
      info.reason.changedPaths.forEach((path) => {
        values![path] = {
          old: info.reason.oldValues?.[path],
          new: info.reason.newValues?.[path],
        };
      });

      // If we have values to show in detailed mode, ensure they're not empty
      if (Object.keys(values).length === 0) {
        values = null;
      }
    }

    return { header, details, values };
  }

  /**
   * Get emoji for reason type
   */
  private static getReasonEmoji(type: RerenderReason['type']): string {
    switch (type) {
      case 'state-change':
        return '📊';
      case 'dependency-change':
        return '🔗';
      case 'mount':
        return '🚀';
      case 'props-change':
        return '📦';
      default:
        return '🔄';
    }
  }

  /**
   * Clear all tracking data
   */
  static clear(): void {
    this.componentRenderCounts.clear();
    this.lastRenderTimestamps.clear();
    this.groupedLogs.clear();
    this.groupTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.groupTimeouts.clear();
  }

  /**
   * Get render count for a component
   */
  static getRenderCount(componentName: string, blocId: string): number {
    return this.componentRenderCounts.get(`${componentName}-${blocId}`) || 0;
  }
}
