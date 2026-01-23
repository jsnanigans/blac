// ============================================================================
// Core Classes
// ============================================================================
export { StateContainer } from './core/StateContainer';
export type {
  StateContainerConfig,
  SystemEvent,
  SystemEventPayloads,
} from './core/StateContainer';
export { Cubit } from './core/Cubit';

// ============================================================================
// Registry - Global Instance Management
// ============================================================================
export {
  globalRegistry,
  getPluginManager,
} from './core/StateContainerRegistry';
export type {
  LifecycleEvent,
  LifecycleListener,
  InstanceEntry,
} from './core/StateContainerRegistry';

// Registry functions (convenience exports)
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
} from './registry';

// ============================================================================
// Plugin System
// ============================================================================
export type {
  BlacPlugin,
  BlacPluginWithInit,
  PluginContext,
  PluginConfig,
  InstanceMetadata,
} from './plugin/BlacPlugin';
export { PluginManager } from './plugin/PluginManager';

// ============================================================================
// Decorator
// ============================================================================
export { blac, type BlacOptions } from './decorators';

// ============================================================================
// Watch - Reactive Subscriptions
// ============================================================================
export { watch, instance, type WatchFn, type BlocRef } from './watch';

// ============================================================================
// Types
// ============================================================================
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

// ============================================================================
// Tracking (exported for @blac/adapter)
// ============================================================================
export * from './tracking';

// ============================================================================
// Utilities (exported for @blac/adapter)
// ============================================================================
export { isIsolatedClass } from './utils/static-props';
export { generateIsolatedKey } from './utils/idGenerator';
