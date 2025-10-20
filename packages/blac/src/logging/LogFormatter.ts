import type { LogEntry, LogConfig, LogLevel } from './types';

/**
 * Console color styles for different log levels (browser only)
 */
const levelStyles: Record<LogLevel, string> = {
  error: 'color: #ff4444; font-weight: bold',
  warn: 'color: #ff8c00',
  log: 'color: #4a9eff',
};

/**
 * Console color styles for different topics (browser only)
 */
const topicStyles: Record<string, string> = {
  lifecycle: 'background: #22c55e; color: white; padding: 2px 6px; border-radius: 3px',
  state: 'background: #3b82f6; color: white; padding: 2px 6px; border-radius: 3px',
  subscriptions: 'background: #a855f7; color: white; padding: 2px 6px; border-radius: 3px',
  performance: 'background: #f59e0b; color: white; padding: 2px 6px; border-radius: 3px',
};

/**
 * Detect if we're running in a browser environment
 */
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

/**
 * Format a log entry for console output
 * @param entry - The log entry to format
 * @param config - The logging configuration
 * @returns Formatted log message
 */
export const formatLogEntry = (entry: LogEntry, config: LogConfig): string => {
  const parts: string[] = [];

  // Timestamp
  if (config.timestamp && entry.timestamp !== undefined) {
    const date = new Date(entry.timestamp);
    parts.push(`[${date.toISOString()}]`);
  }

  // Bloc identity
  if (config.blocIdentity && entry.namespace) {
    const identity = [entry.namespace];
    if (entry.blocId) identity.push(String(entry.blocId));
    if (entry.blocUid) identity.push(entry.blocUid);
    parts.push(`[${identity.join(':')}]`);
  }

  // Topic
  parts.push(`[${entry.topic}]`);

  // Message
  parts.push(entry.message);

  return parts.join(' ');
};

/**
 * Format context data for output
 * @param context - The context data to format
 * @returns Formatted context string or empty string if no context
 */
export const formatContext = (context: unknown): string => {
  if (context === undefined || context === null) {
    return '';
  }

  // Handle different types
  if (typeof context === 'string') {
    return context;
  }

  if (typeof context === 'number' || typeof context === 'boolean') {
    return String(context);
  }

  // For objects, use JSON.stringify with depth limit
  try {
    return JSON.stringify(context, null, 2);
  } catch (error) {
    return '[Unable to stringify context]';
  }
};

/**
 * Get console method for a log level
 * @param level - The log level
 * @returns Console method to use
 */
export const getConsoleMethod = (level: LogLevel): typeof console.log => {
  switch (level) {
    case 'error':
      return console.error;
    case 'warn':
      return console.warn;
    case 'log':
    default:
      return console.log;
  }
};

/**
 * Format and output a log entry to console with colors (if browser)
 * @param entry - The log entry to output
 * @param config - The logging configuration
 * @param logSpy - Optional spy function for testing (for backwards compatibility)
 */
export const outputLogEntry = (
  entry: LogEntry,
  config: LogConfig,
  logSpy?: ((...args: unknown[]) => void) | null,
): void => {
  const consoleMethod = getConsoleMethod(entry.level);
  const message = formatLogEntry(entry, config);

  // Call logSpy if provided (for test compatibility)
  if (logSpy) {
    logSpy([entry.level, entry.topic, message, entry.context]);
  }

  // Browser: Use styled console output
  if (isBrowser) {
    // Format: %c[topic]%c message
    const topicLabel = `[${entry.topic}]`;
    const messageWithoutTopic = message.replace(`[${entry.topic}]`, '').trim();

    consoleMethod(
      `%c${topicLabel}%c ${messageWithoutTopic}`,
      topicStyles[entry.topic] || '',
      levelStyles[entry.level] || '',
      entry.context !== undefined ? entry.context : '',
    );
  } else {
    // Node.js: Plain text output
    if (entry.context !== undefined) {
      consoleMethod(message, entry.context);
    } else {
      consoleMethod(message);
    }
  }

  // Output stack trace if present
  if (entry.stackTrace && config.stackTrace) {
    consoleMethod('Stack trace:', entry.stackTrace);
  }
};
