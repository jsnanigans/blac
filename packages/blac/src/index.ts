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
// Registry - Core Functions
// ============================================================================

// Primary registry functions (commonly used)
export {
  acquire,
  borrow,
  borrowSafe,
  ensure,
  release,
  clear,
  clearAll,
} from './registry';

// ============================================================================
// Registry - Debug/Introspection (import from '@blac/core/debug' for tree-shaking)
// ============================================================================
export { globalRegistry } from './core/StateContainerRegistry';
export type {
  LifecycleEvent,
  LifecycleListener,
  InstanceEntry,
} from './core/StateContainerRegistry';

export { hasInstance, getRefCount, getAll, forEach } from './registry';

// ============================================================================
// Decorator
// ============================================================================
export { blac, type BlacOptions } from './decorators';

// ============================================================================
// Plugin System - import from '@blac/core/plugins' for tree-shaking
// ============================================================================
export { getPluginManager } from './core/StateContainerRegistry';
export type {
  BlacPlugin,
  BlacPluginWithInit,
  PluginContext,
  PluginConfig,
  InstanceMetadata,
} from './plugin/BlacPlugin';
export { PluginManager } from './plugin/PluginManager';

// ============================================================================
// Watch - import from '@blac/core/watch' for tree-shaking
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
