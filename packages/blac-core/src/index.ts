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
export { StateContainer, DEP_BRAND } from './core/StateContainer';
export type {
  HydrationStatus,
  StateContainerConfig,
  SystemEvent,
  SystemEventPayloads,
  DepHandle,
} from './core/StateContainer';
export { Cubit } from './core/Cubit';
/**
 * @internal symbols — read by `@blac/react` (APPLY_DEPS / REMOVE_DEPS_OWNER),
 * in-package tests (INIT_CONFIG), and `watch()` (ON_DISPOSE).
 */
export {
  APPLY_DEPS,
  REMOVE_DEPS_OWNER,
  INIT_CONFIG,
  ON_DISPOSE,
  WITH_TRACKED_STATE,
} from './core/symbols';

// `$blac` meta namespace (identity / lifecycle / hydration).
export type { BlacMeta, BlacHydration } from './core/meta';

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
  getBlacName,
} from './utils/static-props';

// Plugin System — the manager itself lives in `@blac/core/plugins` so it
// tree-shakes out of apps that never install a plugin.
export type {
  BlacPlugin,
  BlacPluginWithInit,
  PluginContext,
  PluginConfig,
  InstanceMetadata,
} from './plugin/BlacPlugin';

// Watch
export {
  watch,
  instance,
  type WatchFn,
  type WatchOptions,
  type BlocRef,
} from './watch';

// Types
export type {
  StateContainerConstructor,
  DeepReadonly,
  ExtractState,
  ExtractStateMutable,
  ExtractConstructorArgs,
  ExtractArgs,
  ExtractDeps,
  BlocInstanceType,
  BlocConstructor,
  InstanceReadonlyState,
  WithState,
  InstanceState,
  StateContainerInstance,
} from './types/utilities';

export type { Brand, BrandedId, InstanceId } from './types/branded';
export { instanceId } from './types/branded';
