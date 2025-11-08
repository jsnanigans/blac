export * from './core/StateContainer';
export * from './core/StateContainerRegistry';
export * from './core/Cubit';
export * from './core/Vertex';

export { globalRegistry, getPluginManager } from './core/StateContainerRegistry';
export type {
  LifecycleEvent,
  LifecycleListener,
} from './core/StateContainerRegistry';

export type {
  BlacPlugin,
  BlacPluginWithInit,
  PluginContext,
  PluginConfig,
  InstanceMetadata,
} from './plugin/BlacPlugin';
export { PluginManager, createPluginManager } from './plugin/PluginManager';
export { hasInitHook } from './plugin/BlacPlugin';

export * from './tracking';
export * from './proxy/ProxyTracker';
export * from './adapter';

export type { Brand, BrandedId, InstanceId } from './types/branded';
export type { BaseEvent } from './types/events';
export * from './types/utilities';

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

export { BLAC_DEFAULTS } from './constants';

export {
  generateId,
  generateSimpleId,
  createIdGenerator,
  __resetIdCounters,
} from './utils/idGenerator';
