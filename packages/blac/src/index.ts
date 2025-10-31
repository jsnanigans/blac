/**
 * BLAC Core - Simplified Architecture
 *
 * Reduced from ~3000 lines to ~1000 lines by:
 * - Removing subscription pipeline (SubscriptionSystem, SubscriptionPipeline, etc.)
 * - Removing complex lifecycle management (5 states -> 1 disposed flag)
 * - Removing version tracking and history
 * - Removing StateStream and EventStream (replaced with simple listeners)
 * - Making tracking system a separate concern
 */

// Core State Management
export * from './core/StateContainer';
export * from './core/Cubit';
export * from './core/Vertex';

// Dependency Tracking (framework-agnostic utilities for React/Vue/etc)
export * from './tracking';

// Proxy Tracking (legacy - use tracking/* instead)
export * from './proxy/ProxyTracker';

// Registry
export { BlocRegistry } from './registry/BlocRegistry';

// Essential Types
export type { AnyObject, Brand, BrandedId, InstanceId } from './types/branded';
export type { BaseEvent } from './types/events';
export * from './types/utilities';

// Logging
export {
  createLogger,
  configureLogger,
  debug,
  info,
  warn,
  error,
  LogLevel,
  type LogConfig,
  type LogEntry,
} from './logging/Logger';

// Constants
export { BLAC_DEFAULTS } from './constants';

// Utilities
export {
  generateId,
  generateSimpleId,
  createIdGenerator,
  __resetIdCounters,
} from './utils/idGenerator';
