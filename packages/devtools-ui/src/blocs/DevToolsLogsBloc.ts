import { Cubit, blac } from '@blac/core';
import type { LogEntry, LogEventType } from '../types';

type LogsState = {
  logs: LogEntry[];
  // Maximum number of logs to keep (prevent memory issues)
  maxLogs: number;
  // Filters (empty array = show all)
  filters: {
    eventTypes: LogEventType[];
    classNames: string[];
    instanceIds: string[];
  };
};

let logIdCounter = 0;

/**
 * Manages log entries for all BlaC instances
 * Captures lifecycle events, state changes, and other events
 */
@blac({ excludeFromDevTools: true })
export class DevToolsLogsBloc extends Cubit<LogsState> {
  constructor(maxLogs = 1000) {
    super({
      logs: [],
      maxLogs,
      filters: {
        eventTypes: [],
        classNames: [],
        instanceIds: [],
      },
    });
  }

  /**
   * Add a log entry
   */
  addLog = (
    eventType: LogEventType,
    instanceId: string,
    className: string,
    instanceName?: string,
    data?: any,
    callstack?: string,
    trigger?: string,
  ) => {
    const entry: LogEntry = {
      id: `log-${++logIdCounter}`,
      timestamp: Date.now(),
      eventType,
      instanceId,
      className,
      instanceName,
      data,
      callstack,
      trigger,
    };

    // Add to beginning (newest first)
    const logs = [entry, ...this.state.logs];

    // Trim to max logs
    if (logs.length > this.state.maxLogs) {
      logs.length = this.state.maxLogs;
    }

    this.patch({ logs });
  };

  /**
   * Clear all logs
   */
  clearLogs = () => {
    this.patch({ logs: [] });
  };

  /**
   * Get logs for a specific instance
   */
  getLogsForInstance = (instanceId: string): LogEntry[] => {
    return this.state.logs.filter((log) => log.instanceId === instanceId);
  };

  /**
   * Get logs by event type
   */
  getLogsByType = (eventType: LogEventType): LogEntry[] => {
    return this.state.logs.filter((log) => log.eventType === eventType);
  };

  /**
   * Set event type filters (empty array = show all)
   */
  setEventTypeFilters = (eventTypes: LogEventType[]) => {
    this.patch({
      filters: {
        ...this.state.filters,
        eventTypes,
      },
    });
  };

  /**
   * Set class name filters (empty array = show all)
   */
  setClassNameFilters = (classNames: string[]) => {
    this.patch({
      filters: {
        ...this.state.filters,
        classNames,
      },
    });
  };

  /**
   * Set instance ID filters (empty array = show all)
   */
  setInstanceIdFilters = (instanceIds: string[]) => {
    this.patch({
      filters: {
        ...this.state.filters,
        instanceIds,
      },
    });
  };

  /**
   * Clear all filters
   */
  clearFilters = () => {
    this.patch({
      filters: {
        eventTypes: [],
        classNames: [],
        instanceIds: [],
      },
    });
  };

  /**
   * Get filtered logs based on current filters
   */
  get filteredLogs(): LogEntry[] {
    const { logs, filters } = this.state;

    // If all filters are empty, return all logs
    if (
      filters.eventTypes.length === 0 &&
      filters.classNames.length === 0 &&
      filters.instanceIds.length === 0
    ) {
      return logs;
    }

    // Apply filters
    return logs.filter((log) => {
      // Event type filter
      if (
        filters.eventTypes.length > 0 &&
        !filters.eventTypes.includes(log.eventType)
      ) {
        return false;
      }

      // Class name filter
      if (
        filters.classNames.length > 0 &&
        !filters.classNames.includes(log.className)
      ) {
        return false;
      }

      // Instance ID filter
      if (
        filters.instanceIds.length > 0 &&
        !filters.instanceIds.includes(log.instanceId)
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get unique event types from all logs
   */
  get availableEventTypes(): LogEventType[] {
    const types = new Set<LogEventType>();
    this.state.logs.forEach((log) => types.add(log.eventType));
    return Array.from(types).sort();
  }

  /**
   * Get unique class names from all logs
   */
  get availableClassNames(): string[] {
    const classNames = new Set<string>();
    this.state.logs.forEach((log) => classNames.add(log.className));
    return Array.from(classNames).sort();
  }

  /**
   * Get unique instance IDs from all logs
   */
  get availableInstanceIds(): string[] {
    const instanceIds = new Set<string>();
    this.state.logs.forEach((log) => instanceIds.add(log.instanceId));
    return Array.from(instanceIds).sort();
  }

  /**
   * Get unique instance IDs filtered by selected class names
   * If no classes are selected, returns all instance IDs
   */
  getAvailableInstanceIdsForClasses(classNames: string[]): string[] {
    // If no classes selected, return all instance IDs
    if (classNames.length === 0) {
      return this.availableInstanceIds;
    }

    // Filter logs by selected class names and collect unique instance IDs
    const instanceIds = new Set<string>();
    this.state.logs.forEach((log) => {
      if (classNames.includes(log.className)) {
        instanceIds.add(log.instanceId);
      }
    });
    return Array.from(instanceIds).sort();
  }

  /**
   * Get instance count for a specific class name
   */
  getClassInstanceCount = (className: string): number => {
    const instanceIds = new Set<string>();
    this.state.logs.forEach((log) => {
      if (log.className === className) {
        instanceIds.add(log.instanceId);
      }
    });
    return instanceIds.size;
  };
}
