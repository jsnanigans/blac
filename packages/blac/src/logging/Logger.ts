import type { LogEntry, LogConfig, LogLevel, LogTopic } from './types';
import { defaultLogConfig, mergeLogConfig, matchesNamespaces } from './LogConfig';
import { isLevelEnabled } from './LogLevel';
import { isTopicEnabled } from './LogTopic';
import { outputLogEntry } from './LogFormatter';

/**
 * Singleton Logger class for BlaC
 * Provides centralized, configurable logging with topic/namespace filtering
 */
export class Logger {
  private static instance: Logger;
  private config: LogConfig = defaultLogConfig;
  private logSpy: ((...args: unknown[]) => void) | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the Logger singleton instance
   * @returns Logger instance
   */
  static getInstance = (): Logger => {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  };

  /**
   * Configure the logger with new settings
   * @param config - Partial configuration to merge with defaults
   */
  configure = (config: Partial<LogConfig>): void => {
    this.config = mergeLogConfig(config);
  };

  /**
   * Log a structured entry
   * @param entry - The log entry to output
   */
  log = (entry: LogEntry): void => {
    if (!this.shouldLog(entry)) {
      return;
    }

    // Add timestamp if not present
    const enrichedEntry: LogEntry = {
      ...entry,
      timestamp: entry.timestamp ?? Date.now(),
    };

    // Capture stack trace for error/warn levels if configured
    if (
      this.config.stackTrace &&
      !enrichedEntry.stackTrace &&
      (entry.level === 'error' || entry.level === 'warn')
    ) {
      enrichedEntry.stackTrace = this.captureStackTrace();
    }

    this.output(enrichedEntry);
  };

  /**
   * Check if a log entry should be output based on configuration
   * Fast O(1) checks to minimize overhead
   * @param entry - The log entry to check
   * @returns true if the log should be output
   */
  private shouldLog = (entry: LogEntry): boolean => {
    // Check if logging is enabled
    if (this.config.level === false) return false;

    // Check level
    if (!isLevelEnabled(entry.level, this.config.level)) return false;

    // Check topic
    if (!isTopicEnabled(entry.topic, this.config.topics)) return false;

    // Check namespace (if provided)
    if (entry.namespace) {
      if (!matchesNamespaces(entry.namespace, this.config.namespaces)) {
        return false;
      }
    }

    return true;
  };

  /**
   * Output a log entry to console
   * @param entry - The enriched log entry to output
   */
  private output = (entry: LogEntry): void => {
    outputLogEntry(entry, this.config, this.logSpy);
  };

  /**
   * Set a spy function for testing (backwards compatibility)
   * @param spy - The spy function to call on each log entry
   */
  setLogSpy = (spy: ((...args: unknown[]) => void) | null): void => {
    this.logSpy = spy;
  };

  /**
   * Capture stack trace for debugging
   * @returns Stack trace string with logger frames removed
   */
  private captureStackTrace = (): string => {
    const stack = new Error().stack || '';

    // Remove logger-internal frames
    const lines = stack.split('\n');
    const filtered = lines.filter((line) => {
      return !line.includes('Logger.') && !line.includes('at Logger');
    });

    return filtered.join('\n');
  };

  /**
   * Set the log level
   * @param level - The minimum log level to output (or false to disable)
   */
  setLevel = (level: LogLevel | false): void => {
    this.config.level = level;
  };

  /**
   * Get the current log level
   * @returns Current log level or false if disabled
   */
  getLevel = (): LogLevel | false => {
    return this.config.level;
  };

  /**
   * Enable a specific topic
   * @param topic - The topic to enable
   */
  enableTopic = (topic: LogTopic): void => {
    if (this.config.topics === 'all') {
      return; // Already enabled
    }

    if (!this.config.topics.includes(topic)) {
      this.config.topics = [...this.config.topics, topic];
    }
  };

  /**
   * Disable a specific topic
   * @param topic - The topic to disable
   */
  disableTopic = (topic: LogTopic): void => {
    if (this.config.topics === 'all') {
      // Convert 'all' to explicit list and remove the topic
      const allTopics: LogTopic[] = ['lifecycle', 'state', 'subscriptions', 'performance'];
      this.config.topics = allTopics.filter((t) => t !== topic);
    } else {
      this.config.topics = this.config.topics.filter((t) => t !== topic);
    }
  };

  /**
   * Set namespace filter patterns
   * @param patterns - Namespace patterns to match
   */
  setNamespaces = (patterns: string | string[]): void => {
    this.config.namespaces = patterns;
  };

  /**
   * Get the current configuration
   * @returns Readonly copy of current config
   */
  getConfig = (): Readonly<LogConfig> => {
    return { ...this.config };
  };

  /**
   * Reset configuration to defaults
   */
  reset = (): void => {
    this.config = { ...defaultLogConfig };
  };

  /**
   * Start a console group (for nested operations)
   * @param label - The group label
   */
  startGroup = (label: string): void => {
    if (this.config.level !== false && typeof console.group === 'function') {
      console.group(label);
    }
  };

  /**
   * End the current console group
   */
  endGroup = (): void => {
    if (this.config.level !== false && typeof console.groupEnd === 'function') {
      console.groupEnd();
    }
  };

  /**
   * Start a performance timer
   * @param label - The timer label
   */
  time = (label: string): void => {
    if (this.config.level !== false && typeof console.time === 'function') {
      console.time(label);
    }
  };

  /**
   * End a performance timer
   * @param label - The timer label
   */
  timeEnd = (label: string): void => {
    if (this.config.level !== false && typeof console.timeEnd === 'function') {
      console.timeEnd(label);
    }
  };

  /**
   * Create a performance mark
   * @param name - The mark name
   */
  mark = (name: string): void => {
    if (
      this.config.level !== false &&
      typeof performance !== 'undefined' &&
      typeof performance.mark === 'function'
    ) {
      performance.mark(name);
    }
  };

  /**
   * Create a performance measure
   * @param name - The measure name
   * @param startMark - The start mark name
   * @param endMark - The end mark name
   */
  measure = (name: string, startMark: string, endMark: string): void => {
    if (
      this.config.level !== false &&
      typeof performance !== 'undefined' &&
      typeof performance.measure === 'function'
    ) {
      try {
        performance.measure(name, startMark, endMark);
      } catch (error) {
        // Marks might not exist, ignore error
      }
    }
  };
}

/**
 * Export singleton instance for convenience
 */
export const logger = Logger.getInstance();
