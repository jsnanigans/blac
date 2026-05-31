// Global config
export {
  configureBlac,
  getBlacConfig,
  resetBlacConfig,
  shallowEqualState,
  type BlacConfig,
  type EqualityFn,
} from './config';

// Core Classes
export { StateContainer } from './core/StateContainer';
export type {
  HydrationStatus,
  StateContainerConfig,
  SystemEvent,
  SystemEventPayloads,
} from './core/StateContainer';
export { Cubit } from './core/Cubit';
/**
 * @internal symbols — read by framework adapters (`@blac/react` via the
 * `@blac/adapter` re-export). Kept until D0 ports `useBloc` off this surface.
 *
 * `EMIT` is deprecated: zero external consumers per A2 audit, but the
 * in-package legacy tests still index `[EMIT]`. Kept as a thin alias for
 * `emit()` so those tests typecheck and run unchanged; C5 deletes it.
 */
export { EMIT, APPLY_DEPS, REMOVE_DEPS_OWNER } from './core/symbols';

// Structural primitives — re-exported for plugins that need to compose
// channel subscriptions on top of a `StateContainer`.
export { ALL_PATHS } from '@dirtytalk/structural';
export type { PathSet } from '@dirtytalk/structural';

// Registry
export {
  acquire,
  resolveInstanceKey,
  borrow,
  borrowSafe,
  ensure,
  release,
  clear,
  clearAll,
  register,
  hasInstance,
  getRefCount,
  getRefIds,
  getAll,
  forEach,
  getRegistry,
  setRegistry,
  getStats,
} from './registry';

export type { BorrowTarget } from './registry';

export {
  globalRegistry,
  StateContainerRegistry,
} from './core/StateContainerRegistry';
export type {
  LifecycleEvent,
  LifecycleListener,
  InstanceEntry,
} from './core/StateContainerRegistry';

// Decorator
export { blac, type BlacOptions } from './decorators';

// Static-property feature flags (read by framework adapters)
export {
  isKeepAliveClass,
  isExcludedFromDevTools,
  isIsolatedClass,
} from './utils/static-props';

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

// Types
export type {
  StateContainerConstructor,
  ExtractState,
  ExtractStateMutable,
  ExtractConstructorArgs,
  ExtractArgs,
  ExtractDeps,
  BlocInstanceType,
  BlocConstructor,
  InstanceReadonlyState,
  InstanceState,
  StateContainerInstance,
} from './types/utilities';

export type { Brand, BrandedId, InstanceId } from './types/branded';
export { instanceId } from './types/branded';
