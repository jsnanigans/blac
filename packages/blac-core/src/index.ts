// Core Classes
export { StateContainer } from './core/StateContainer';
export type {
  HydrationStatus,
  StateContainerConfig,
  SystemEvent,
  SystemEventPayloads,
} from './core/StateContainer';
export { Cubit } from './core/Cubit';

// Registry
export {
  acquire,
  borrow,
  borrowSafe,
  ensure,
  release,
  clear,
  clearAll,
  register,
  hasInstance,
  getRefCount,
  getAll,
  forEach,
  getRegistry,
  setRegistry,
  getStats,
} from './registry';

export { globalRegistry } from './core/StateContainerRegistry';
export type {
  LifecycleEvent,
  LifecycleListener,
  InstanceEntry,
} from './core/StateContainerRegistry';

// Decorator
export { blac, type BlacOptions } from './decorators';

// Plugin System
export { getPluginManager } from './core/StateContainerRegistry';
export type {
  BlacPlugin,
  BlacPluginWithInit,
  PluginContext,
  PluginConfig,
  InstanceMetadata,
} from './plugin/BlacPlugin';
export { PluginManager } from './plugin/PluginManager';

// Watch
export { watch, instance, type WatchFn, type BlocRef } from './watch';

// Tracked
export {
  tracked,
  createTrackedContext,
  TrackedContext,
  type TrackedResult,
  type TrackedOptions,
} from './tracking/tracked';

// Types
export type {
  StateContainerConstructor,
  ExtractState,
  ExtractStateMutable,
  ExtractConstructorArgs,
  BlocInstanceType,
  BlocConstructor,
  InstanceReadonlyState,
  InstanceState,
  StateContainerInstance,
} from './types/utilities';

export type { Brand, BrandedId, InstanceId } from './types/branded';
export { instanceId } from './types/branded';

// Utilities
export { isIsolatedClass } from './utils/static-props';
export { generateIsolatedKey } from './utils/idGenerator';
