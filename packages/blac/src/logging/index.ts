/**
 * BlaC Logging Module
 *
 * Provides structured, configurable logging for BlaC state management library.
 * Supports topic-based filtering, namespace filtering, and zero-overhead mode.
 *
 * @example
 * ```typescript
 * import { logger, Blac } from '@blac/core';
 *
 * // Configure via Blac.setConfig()
 * Blac.setConfig({
 *   logging: {
 *     level: 'log',
 *     topics: ['lifecycle', 'state'],
 *     namespaces: 'Counter*',
 *   }
 * });
 *
 * // Or use runtime API
 * Blac.logging.setLevel('log');
 * Blac.logging.enableTopic('subscriptions');
 *
 * // Log structured entries
 * logger.log({
 *   level: 'log',
 *   topic: 'lifecycle',
 *   message: 'Bloc created',
 *   namespace: 'CounterBloc',
 *   context: { initialState: 0 },
 * });
 * ```
 */

export { Logger, logger } from './Logger';
export type { LogLevel, LogTopic, LogEntry, LogConfig } from './types';
export { defaultLogConfig } from './LogConfig';
export { isLevelEnabled, logLevelPriority } from './LogLevel';
export { isTopicEnabled, allLogTopics } from './LogTopic';
