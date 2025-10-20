import type { LogLevel } from './types';

/**
 * Log level priority mapping (lower = more severe)
 */
export const logLevelPriority: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  log: 2,
};

/**
 * Check if a log level is enabled based on the configured threshold
 * @param current - The level of the current log entry
 * @param threshold - The configured minimum level (or false if disabled)
 * @returns true if the log should be output
 */
export const isLevelEnabled = (
  current: LogLevel,
  threshold: LogLevel | false,
): boolean => {
  if (threshold === false) return false;
  return logLevelPriority[current] <= logLevelPriority[threshold];
};

/**
 * Parse a log level from string or boolean
 * @param value - The value to parse
 * @returns Parsed log level or false
 */
export const parseLogLevel = (value: string | boolean): LogLevel | false => {
  if (typeof value === 'boolean') {
    return value ? 'log' : false;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'error' || normalized === 'warn' || normalized === 'log') {
    return normalized as LogLevel;
  }

  if (normalized === 'false' || normalized === 'off' || normalized === 'disabled') {
    return false;
  }

  // Default to 'log' for unknown values
  return 'log';
};
