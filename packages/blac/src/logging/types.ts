/**
 * Log level type definition
 * - 'error': Critical failures, exceptions, invalid states
 * - 'warn': Deprecations, recoverable issues, potential problems
 * - 'log': General informational messages
 */
export type LogLevel = 'error' | 'warn' | 'log';

/**
 * Log topic type definition for categorizing log entries
 * - 'lifecycle': Bloc creation, disposal, state transitions, registration/unregistration
 * - 'state': State emissions, state changes, previous/next values
 * - 'subscriptions': Consumer/observer subscriptions, dependency tracking, proxy operations
 * - 'performance': Timing data, memory stats, subscription counts
 */
export type LogTopic = 'lifecycle' | 'state' | 'subscriptions' | 'performance';

/**
 * Structured log entry with metadata
 */
export interface LogEntry {
  /** Log severity level */
  level: LogLevel;
  /** Log topic/category */
  topic: LogTopic;
  /** Human-readable message */
  message: string;
  /** Bloc class name (for filtering) */
  namespace?: string;
  /** Bloc instance ID */
  blocId?: string;
  /** Bloc unique identifier (UID) */
  blocUid?: string;
  /** Additional structured context data */
  context?: unknown;
  /** High-resolution timestamp (milliseconds since epoch) */
  timestamp?: number;
  /** Call stack trace (for error/warn levels) */
  stackTrace?: string;
}

/**
 * Logging configuration options
 */
export interface LogConfig {
  /**
   * Log level threshold (false = disabled)
   * Only logs at or above this level will be output
   */
  level: LogLevel | false;

  /**
   * Enabled log topics ('all' = enable all topics)
   * Only logs with these topics will be output
   */
  topics: LogTopic[] | 'all';

  /**
   * Bloc namespace filter patterns
   * - '*' = all blocs (default)
   * - 'BlocName' = exact match
   * - 'Bloc*' = starts with
   * - '*Bloc' = ends with
   * - ['Bloc1', 'Bloc2'] = multiple patterns
   */
  namespaces: string | string[];

  /** Include high-resolution timestamp in log output */
  timestamp: boolean;

  /** Capture stack traces for error/warn levels */
  stackTrace: boolean;

  /** Include bloc identity (name:id:uid) in log output */
  blocIdentity: boolean;
}
