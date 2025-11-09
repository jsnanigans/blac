import { Cubit } from '@blac/core';
import type { LogEntry, LogEventType } from '../types';

type LogsState = {
  logs: LogEntry[];
  // Maximum number of logs to keep (prevent memory issues)
  maxLogs: number;
};

let logIdCounter = 0;

/**
 * Manages log entries for all BlaC instances
 * Captures lifecycle events, state changes, and other events
 */
export class DevToolsLogsBloc extends Cubit<LogsState> {
  /**
   * Exclude from DevTools to prevent infinite loop
   */
  static __excludeFromDevTools = true;

  constructor(maxLogs = 1000) {
    super({
      logs: [],
      maxLogs,
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
}
