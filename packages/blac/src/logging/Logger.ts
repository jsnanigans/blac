/**
 * Log severity levels (lower number = higher severity)
 */
export enum LogLevel {
  /** Critical errors that may cause application failure */
  ERROR = 0,
  /** Warning conditions that should be addressed */
  WARN = 1,
  /** Informational messages about application state */
  INFO = 2,
  /** Detailed debugging information */
  DEBUG = 3,
}

/**
 * Structure of a log entry passed to output handlers
 */
export interface LogEntry {
  /** Log level as string (DEBUG, INFO, WARN, ERROR) */
  level: string;
  /** Context identifier (typically component or module name) */
  context: string;
  /** Log message */
  message: string;
  /** Optional structured data */
  data?: any;
  /** Unix timestamp in milliseconds */
  timestamp: number;
}

/**
 * Configuration for the logger
 */
export interface LogConfig {
  /** Whether logging is enabled */
  enabled: boolean;
  /** Minimum log level to output */
  level: LogLevel;
  /** Function called to output log entries */
  output: (entry: LogEntry) => void;
}

/**
 * Creates a logger instance with given configuration
 *
 * @param config - Logger configuration
 * @returns Logger instance with debug, info, warn, error, and configure methods
 *
 * @example
 * ```ts
 * const logger = createLogger({
 *   enabled: true,
 *   level: LogLevel.DEBUG,
 *   output: (entry) => console.log(JSON.stringify(entry))
 * });
 * logger.debug('MyComponent', 'Rendering', { props: { foo: 'bar' } });
 * ```
 */
export function createLogger(config: LogConfig) {
  const shouldLog = (level: LogLevel): boolean => {
    return config.enabled && config.level >= level;
  };

  const log = (
    level: string,
    context: string,
    message: string,
    data?: any,
  ): void => {
    try {
      const entry: LogEntry = {
        level,
        context,
        message,
        timestamp: Date.now(),
        ...(data !== undefined && { data: serialize(data) }),
      };
      config.output(entry);
    } catch (e) {
      console.error('[BlacLogger] Error logging:', e);
    }
  };

  const serialize = (data: any): any => {
    try {
      return JSON.parse(JSON.stringify(data));
    } catch {
      return String(data);
    }
  };

  return {
    debug: (context: string, message: string, data?: any) => {
      if (shouldLog(LogLevel.DEBUG)) {
        log('DEBUG', context, message, data);
      }
    },
    info: (context: string, message: string, data?: any) => {
      if (shouldLog(LogLevel.INFO)) {
        log('INFO', context, message, data);
      }
    },
    warn: (context: string, message: string, data?: any) => {
      if (shouldLog(LogLevel.WARN)) {
        log('WARN', context, message, data);
      }
    },
    error: (context: string, message: string, data?: any) => {
      if (shouldLog(LogLevel.ERROR)) {
        log('ERROR', context, message, data);
      }
    },
    configure: (opts: Partial<LogConfig>) => {
      Object.assign(config, opts);
    },
  };
}

// Track current configuration for proper merging
let currentConfig: LogConfig = {
  enabled: false, // Off by default (matches current implementation)
  level: LogLevel.INFO,
  output: (entry) => console.log(JSON.stringify(entry)),
};

// Default logger instance
let defaultLogger = createLogger(currentConfig);

/**
 * Log a debug message (tree-shakeable export)
 * @param context - Context identifier (module or component name)
 * @param message - Log message
 * @param data - Optional structured data
 */
export const debug = (context: string, message: string, data?: any) =>
  defaultLogger.debug(context, message, data);

/**
 * Log an info message (tree-shakeable export)
 * @param context - Context identifier (module or component name)
 * @param message - Log message
 * @param data - Optional structured data
 */
export const info = (context: string, message: string, data?: any) =>
  defaultLogger.info(context, message, data);

/**
 * Log a warning message (tree-shakeable export)
 * @param context - Context identifier (module or component name)
 * @param message - Log message
 * @param data - Optional structured data
 */
export const warn = (context: string, message: string, data?: any) =>
  defaultLogger.warn(context, message, data);

/**
 * Log an error message (tree-shakeable export)
 * @param context - Context identifier (module or component name)
 * @param message - Log message
 * @param data - Optional structured data
 */
export const error = (context: string, message: string, data?: any) =>
  defaultLogger.error(context, message, data);

/**
 * Configuration function that recreates the default logger
 *
 * @param opts - Partial logger configuration
 *
 * @example
 * ```ts
 * configureLogger({ enabled: true, level: LogLevel.DEBUG });
 * ```
 */
export function configureLogger(opts: Partial<LogConfig>): void {
  // Merge with existing config
  currentConfig = {
    ...currentConfig,
    ...opts,
  };
  defaultLogger = createLogger(currentConfig);
}
