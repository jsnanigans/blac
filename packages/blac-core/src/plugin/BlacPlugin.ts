import type { PathSet } from '@dirtytalk/structural';
import type { HydrationStatus, StateContainer } from '../core/StateContainer';

export interface InstanceMetadata {
  id: string;
  className: string;
  isDisposed: boolean;
  name: string;
  state: any;
  createdAt: number;
  previousState?: any;
  currentState?: any;
  hydrationStatus: HydrationStatus;
  isHydrated: boolean;
  hydrationError?: Error;
  changedWhileHydrating: boolean;
  /** Args passed at acquire time; keys instance identity. */
  args?: unknown;
}

/**
 * Per-event context delivered to plugin hooks.
 *
 * Per Decision 6 (C2 migration): `PluginContext` is per-container — it
 * identifies the bloc, not the event. Per-event data (e.g. the changed
 * `PathSet`) is passed via dedicated method arguments, never via the
 * context object.
 *
 * The `container` field is the focal bloc for the event. For `onInstall`
 * (which fires once at install time, not bound to any container) the
 * `container` field is `undefined`.
 */
export interface PluginContext {
  /**
   * The container this event is about. `undefined` only for `onInstall`,
   * which fires once at plugin install time before any container is known.
   */
  container: StateContainer<any, any, any> | undefined;

  getInstanceMetadata(
    instance: StateContainer<any, any, any>,
  ): InstanceMetadata;

  getState<S extends object = any>(instance: StateContainer<S>): S;

  getHydrationStatus(instance: StateContainer<any, any, any>): HydrationStatus;

  startHydration(instance: StateContainer<any, any, any>): void;

  applyHydratedState<S extends object = any>(
    instance: StateContainer<S>,
    state: S,
  ): boolean;

  finishHydration(instance: StateContainer<any, any, any>): void;

  failHydration(instance: StateContainer<any, any, any>, error: Error): void;

  waitForHydration(instance: StateContainer<any, any, any>): Promise<void>;

  queryInstances<T extends StateContainer<any, any, any>>(
    typeClass: new (...args: any[]) => T,
  ): T[];

  getAllTypes(): Array<new (...args: any[]) => StateContainer<any, any, any>>;

  getStats(): {
    registeredTypes: number;
    totalInstances: number;
    typeBreakdown: Record<string, number>;
  };

  getRefIds(instanceId: string): string[];
}

/**
 * BlaC plugin hook surface.
 *
 * Per C2 (Decision 6), state-change events carry the `PathSet` of paths
 * that changed in the flush. Lifecycle events (`onCreated`, `onDestroyed`)
 * are not tied to a state change and so do not carry `paths`.
 *
 * Hook firing model:
 * - `onCreated` fires synchronously when a container is first acquired.
 * - `onStateChange` fires once per channel flush (microtask-coalesced).
 *   `prev` is the state before the first emit of the flush; `next` is the
 *   state at flush time; `paths` is the set of paths marked during the flush.
 * - `onDestroyed` fires synchronously when a container is disposed (after
 *   its system 'dispose' event).
 *
 * Legacy ref/deps hooks (`onRefAcquired`, `onRefReleased`, `onDepsChanged`)
 * are retained for devtools-connect compatibility — they are orthogonal to
 * the C2 event payload contract.
 */
export interface BlacPlugin {
  readonly name: string;
  readonly version: string;

  /**
   * Fires once when the plugin is installed. `ctx.container` is `undefined`
   * here — `onInstall` is global to the plugin, not per-container.
   */
  onInstall?(ctx: PluginContext): void;

  onUninstall?(): void;

  /**
   * Fires when a container is first created and acquired.
   * `ctx.container` is the new container.
   */
  onCreated?(ctx: PluginContext): void;

  /**
   * Fires once per channel flush with the changed `PathSet`.
   * `paths` may be `ALL_PATHS` when the change spans every path.
   * `prev`/`next` are the coalesced before/after states for the flush.
   */
  onStateChange?<S extends object = any>(
    ctx: PluginContext,
    prev: S,
    next: S,
    paths: PathSet,
  ): void;

  /**
   * Fires when a container is disposed.
   * `ctx.container` is the disposed container (still queryable, but its
   * `isDisposed` is `true` by the time this fires).
   */
  onDestroyed?(ctx: PluginContext): void;

  /**
   * Fires when a container's hydration status transitions.
   */
  onHydrationChange?(
    ctx: PluginContext,
    status: HydrationStatus,
    previousStatus: HydrationStatus,
  ): void;

  /**
   * @internal Devtools-only — fires when a named ref is acquired.
   * Not part of the C2 event payload contract.
   */
  onRefAcquired?(ctx: PluginContext, refId: string): void;

  /**
   * @internal Devtools-only — fires when a named ref is released.
   * Not part of the C2 event payload contract.
   */
  onRefReleased?(ctx: PluginContext, refId: string): void;

  /**
   * @internal Devtools-only — fires when the merged per-consumer deps view
   * for a container changes.
   */
  onDepsChanged?(
    ctx: PluginContext,
    previousDeps: Readonly<Record<string, unknown>>,
    currentDeps: Readonly<Record<string, unknown>>,
  ): void;
}

export interface BlacPluginWithInit extends BlacPlugin {
  onInstall(ctx: PluginContext): void;
}

export interface PluginConfig {
  enabled?: boolean;
  environment?: 'development' | 'production' | 'test' | 'all';
}

export function hasInitHook(plugin: BlacPlugin): plugin is BlacPluginWithInit {
  return typeof plugin.onInstall === 'function';
}
