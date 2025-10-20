import type { LogConfig, LogLevel, LogTopic } from './types';
import { allLogTopics } from './LogTopic';
import { BlacError, ErrorCategory, ErrorSeverity } from '../errors/BlacError';

/**
 * Default logging configuration
 * By default, logging is disabled to prevent noise
 */
export const defaultLogConfig: LogConfig = {
  level: false, // Disabled by default
  topics: 'all',
  namespaces: '*',
  timestamp: true,
  stackTrace: true,
  blocIdentity: true,
};

/**
 * Validate logging configuration
 * @param config - Configuration to validate
 * @throws BlacError if configuration is invalid
 */
export const validateLogConfig = (config: Partial<LogConfig>): void => {
  // Validate level
  if (config.level !== undefined && config.level !== false) {
    if (!['error', 'warn', 'log'].includes(config.level)) {
      throw new BlacError(
        `Invalid log level: ${config.level}. Must be 'error', 'warn', 'log', or false`,
        ErrorCategory.VALIDATION,
        ErrorSeverity.FATAL,
      );
    }
  }

  // Validate topics
  if (config.topics !== undefined && config.topics !== 'all') {
    if (!Array.isArray(config.topics)) {
      throw new BlacError(
        `Invalid topics configuration. Must be 'all' or an array of topics`,
        ErrorCategory.VALIDATION,
        ErrorSeverity.FATAL,
      );
    }

    for (const topic of config.topics) {
      if (!allLogTopics.includes(topic as LogTopic)) {
        throw new BlacError(
          `Invalid log topic: ${topic}. Must be one of: ${allLogTopics.join(', ')}`,
          ErrorCategory.VALIDATION,
          ErrorSeverity.FATAL,
        );
      }
    }
  }

  // Validate namespaces
  if (config.namespaces !== undefined) {
    if (typeof config.namespaces !== 'string' && !Array.isArray(config.namespaces)) {
      throw new BlacError(
        `Invalid namespaces configuration. Must be a string or array of strings`,
        ErrorCategory.VALIDATION,
        ErrorSeverity.FATAL,
      );
    }

    const patterns = Array.isArray(config.namespaces) ? config.namespaces : [config.namespaces];
    for (const pattern of patterns) {
      if (typeof pattern !== 'string') {
        throw new BlacError(
          `Invalid namespace pattern: must be a string`,
          ErrorCategory.VALIDATION,
          ErrorSeverity.FATAL,
        );
      }
    }
  }

  // Validate boolean flags
  if (config.timestamp !== undefined && typeof config.timestamp !== 'boolean') {
    throw new BlacError(
      `LogConfig.timestamp must be a boolean`,
      ErrorCategory.VALIDATION,
      ErrorSeverity.FATAL,
    );
  }

  if (config.stackTrace !== undefined && typeof config.stackTrace !== 'boolean') {
    throw new BlacError(
      `LogConfig.stackTrace must be a boolean`,
      ErrorCategory.VALIDATION,
      ErrorSeverity.FATAL,
    );
  }

  if (config.blocIdentity !== undefined && typeof config.blocIdentity !== 'boolean') {
    throw new BlacError(
      `LogConfig.blocIdentity must be a boolean`,
      ErrorCategory.VALIDATION,
      ErrorSeverity.FATAL,
    );
  }
};

/**
 * Merge partial configuration with defaults
 * @param partial - Partial configuration to merge
 * @returns Complete merged configuration
 */
export const mergeLogConfig = (partial: Partial<LogConfig>): LogConfig => {
  validateLogConfig(partial);

  return {
    ...defaultLogConfig,
    ...partial,
  };
};

/**
 * Check if a bloc name matches a namespace pattern
 * Supports wildcards: 'Bloc*', '*Bloc', 'BlocName'
 * @param blocName - The bloc class name to check
 * @param pattern - The pattern to match against
 * @returns true if the bloc name matches the pattern
 */
export const matchesNamespace = (blocName: string, pattern: string): boolean => {
  // Match all
  if (pattern === '*') return true;

  // Exact match
  if (pattern === blocName) return true;

  // Wildcard at end: 'Bloc*'
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return blocName.startsWith(prefix);
  }

  // Wildcard at start: '*Bloc'
  if (pattern.startsWith('*')) {
    const suffix = pattern.slice(1);
    return blocName.endsWith(suffix);
  }

  // No match
  return false;
};

/**
 * Check if a bloc name matches any of the configured namespace patterns
 * @param blocName - The bloc class name to check
 * @param patterns - The configured namespace patterns
 * @returns true if the bloc name matches any pattern
 */
export const matchesNamespaces = (
  blocName: string,
  patterns: string | string[],
): boolean => {
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];
  return patternArray.some((pattern) => matchesNamespace(blocName, pattern));
};
