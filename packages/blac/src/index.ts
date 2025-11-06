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
export * from './core/StateContainerRegistry';
export * from './core/Cubit';
export * from './core/Vertex';

// Plugin System - Export registry and lifecycle types
export { globalRegistry, getPluginManager } from './core/StateContainerRegistry';
export type {
  LifecycleEvent,
  LifecycleListener,
} from './core/StateContainerRegistry';

// Plugin API
export type {
  BlacPlugin,
  BlacPluginWithInit,
  PluginContext,
  PluginConfig,
  InstanceMetadata,
} from './plugin/BlacPlugin';
export { PluginManager, createPluginManager } from './plugin/PluginManager';
export { hasInitHook } from './plugin/BlacPlugin';

// Dependency Tracking (framework-agnostic utilities for React/Vue/etc)
export * from './tracking';

// Proxy Tracking (legacy - use tracking/* instead)
export * from './proxy/ProxyTracker';

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

// Note: DevTools is now a plugin in @blac/devtools-connect
// Usage:
//   import { getPluginManager } from '@blac/core';
//   import { createDevToolsBrowserPlugin } from '@blac/devtools-connect';
//   getPluginManager().install(createDevToolsBrowserPlugin(), { environment: 'development' });
