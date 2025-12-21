export * from './core/StateContainer';
export type { SystemEvent, SystemEventPayloads } from './core/StateContainer';
export * from './core/StateContainerRegistry';
export * from './core/Cubit';
export * from './core/Vertex';
export * from './core/StatelessCubit';
export * from './core/StatelessVertex';

export {
  globalRegistry,
  getPluginManager,
} from './core/StateContainerRegistry';
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
export * from './adapter';

export type { Brand, BrandedId, InstanceId } from './types/branded';
export type {
  DiscriminatedEvent,
  EventWithMetadata,
  EventType,
  ExtractEvent,
  EventHandlerMap,
} from './types/events';
export * from './types/utilities';
export type {
  IsStatelessContainer,
  StatefulContainerOnly,
  ExtractStatefulState,
} from './types/utilities';

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

export {
  configureBlac,
  getBlacConfig,
  isDevMode,
  resetBlacConfig,
  type BlacConfig,
} from './config';

export {
  BLAC_DEFAULTS,
  BLAC_STATIC_PROPS,
  BLAC_ID_PATTERNS,
  BLAC_ERROR_PREFIX,
} from './constants';

export {
  generateId,
  generateSimpleId,
  createIdGenerator,
  __resetIdCounters,
  generateIsolatedKey,
  isIsolatedKey,
} from './utils/idGenerator';

export {
  getStaticProp,
  isIsolatedClass,
  isKeepAliveClass,
  isExcludedFromDevTools,
  isStatelessClass,
} from './utils/static-props';

export { blac, type BlacOptions } from './decorators';

export {
  waitUntil,
  type WaitUntilOptions,
  WaitUntilTimeoutError,
  WaitUntilAbortedError,
  WaitUntilDisposedError,
} from './waitUntil';

export { watch, instance, type WatchFn, type BlocRef } from './watch';

export {
  tracked,
  createTrackedContext,
  TrackedContext,
  DependencySubscriptionManager,
  type TrackedResult,
  type TrackedOptions,
} from './tracking';

export {
  acquire,
  borrow,
  borrowSafe,
  ensure,
  release,
  hasInstance,
  getRefCount,
  getAll,
  forEach,
  clear,
  clearAll,
  register,
  getRegistry,
  setRegistry,
  getStats,
  type AcquireOptions,
} from './registry';
