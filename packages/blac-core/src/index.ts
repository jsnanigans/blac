export {
  configureBlac,
  getBlacConfig,
  resetBlacConfig,
  shallowEqualState,
  type BlacConfig,
  type EqualityFn,
} from './config';

export { StateContainer } from './core/StateContainer';
export type {
  HydrationStatus,
  StateContainerConfig,
  SystemEvent,
  SystemEventPayloads,
  DepHandle,
} from './core/StateContainer';
export { Cubit } from './core/Cubit';

export type { BlacMeta, BlacHydration } from './core/meta';

// Structural primitives — re-exported for plugins that need to compose
// channel subscriptions on top of a `StateContainer`.
export { ALL_PATHS } from '@dirtytalk/structural';
export type { PathSet } from '@dirtytalk/structural';

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

export {
  watch,
  instance,
  type WatchFn,
  type WatchOptions,
  type BlocRef,
} from './watch';

export type {
  StateContainerConstructor,
  DeepReadonly,
  ExtractState,
  ExtractStateMutable,
  ExtractArgs,
  ExtractDeps,
  InstanceReadonlyState,
  WithState,
  InstanceState,
  StateContainerInstance,
} from './types/utilities';

export type { Brand, BrandedId, InstanceId } from './types/branded';
export { instanceId } from './types/branded';
