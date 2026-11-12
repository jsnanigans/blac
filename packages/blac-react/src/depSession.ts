import type {
  StateContainer,
  StateContainerConstructor,
  StateContainerRegistry,
} from '@blac/core';
import { DEP_BRAND, ON_DISPOSE } from '@blac/core/internal';
import {
  ALL_PATHS,
  emptyPathSet,
  pathSetEquals,
  trackRender,
  ProxyCache,
  type PathSet,
  type PathSubscription,
} from '@dirtytalk/structural';
import { buildTrackedProxy } from './buildTrackedProxy';
import { deferRelease } from './deferRelease';

const NO_PATHS: PathSet = emptyPathSet();

interface DepEntry {
  // One live set per `.track()` call, merged at commit: reads keep landing in
  // each call's own set until the render ends.
  parts: PathSet[];
  paths: PathSet;
  Type: StateContainerConstructor;
  key: string;
  args: unknown;
}

interface DepSub {
  subscription: PathSubscription;
  /** A dep disposed from outside re-renders the consumer onto its successor. */
  offDispose: () => void;
  registry: StateContainerRegistry;
  Type: StateContainerConstructor;
  key: string;
}

/**
 * The containers one `useBloc` consumer reads during a render: its primary
 * bloc plus every dep reached through `this.<handle>.track()`.
 *
 * The render records entries; the commit calls `reconcile`, which subscribes
 * and takes a ref on new deps and drops the ones no longer read. `dispose`
 * releases everything. Refs are only taken at commit, so an uncommitted render
 * never leaks one, and given back at the end of the tick (see `deferRelease`).
 */
export class DepSession {
  // Most consumers read no deps, so everything dep-related is allocated on the
  // first dep a render records.
  private primary: StateContainer | null = null;
  private primaryParts: PathSet[] = [];
  private primaryPaths: PathSet = NO_PATHS;
  private entries: Map<StateContainer, DepEntry> | null = null;
  private subs: Map<StateContainer, DepSub> | null = null;
  private reconciled = false;
  private lastPrimary: StateContainer | null = null;
  private lastPrimaryPaths: PathSet = NO_PATHS;
  private lastEntries: Map<StateContainer, DepEntry> | null = null;
  private disarms: Array<() => void> | null = null;

  constructor(
    private readonly consumerId: string,
    private readonly onChange: () => void,
  ) {}

  private get refId(): string {
    return `useBloc@${this.consumerId}:dep`;
  }

  begin(primary: StateContainer, paths: PathSet): void {
    this.entries?.clear();
    if (this.disarms !== null) this.disarms.length = 0;
    this.primary = primary;
    this.primaryParts = [paths];
  }

  record(
    dep: StateContainer,
    paths: PathSet,
    Type: StateContainerConstructor,
    key: string,
    args: unknown,
    disarm: () => void,
  ): void {
    (this.disarms ??= []).push(disarm);
    // A dep that resolves to the primary only widens the primary's entry.
    if (dep === this.primary) {
      this.primaryParts.push(paths);
      return;
    }
    const entries = (this.entries ??= new Map());
    const existing = entries.get(dep);
    if (existing !== undefined) {
      existing.parts.push(paths);
    } else {
      entries.set(dep, { parts: [paths], paths, Type, key, args });
    }
  }

  /**
   * Merge each container's per-call sets once the render's reads are done.
   * Returns the primary's paths, widened by deps that resolved to it.
   */
  settle(): PathSet {
    this.primaryPaths = mergeParts(this.primaryParts);
    if (this.entries !== null) {
      for (const entry of this.entries.values()) {
        entry.paths = mergeParts(entry.parts);
      }
    }
    return this.primaryPaths;
  }

  /** Stops every dep tracked this render from recording further reads. */
  disarm(): void {
    const disarms = this.disarms;
    if (disarms === null) return;
    for (const disarm of disarms) disarm();
    disarms.length = 0;
  }

  /** Forces the next `reconcile` to run in full. */
  invalidate(): void {
    this.reconciled = false;
  }

  isUnchanged(): boolean {
    if (
      !this.reconciled ||
      this.lastPrimary !== this.primary ||
      !pathSetEquals(this.lastPrimaryPaths, this.primaryPaths)
    ) {
      return false;
    }
    const last = this.lastEntries;
    const entries = this.entries;
    if ((last?.size ?? 0) !== (entries?.size ?? 0)) return false;
    if (last === null || entries === null) return true;
    for (const [container, entry] of entries) {
      const prev = last.get(container);
      if (prev === undefined || !sameEntry(prev, entry)) return false;
    }
    return true;
  }

  reconcile(registry: StateContainerRegistry): void {
    const { consumerId } = this;
    const entries = this.entries;
    this.reconciled = true;
    this.lastPrimary = this.primary;
    this.lastPrimaryPaths = this.primaryPaths;
    this.lastEntries =
      entries === null || entries.size === 0 ? null : new Map(entries);

    const subs = this.subs;
    if (subs !== null) {
      for (const [dep, sub] of subs) {
        if (entries?.has(dep) !== true) {
          this.drop(dep, sub);
          subs.delete(dep);
        }
      }
    }
    if (entries === null) return;

    for (const [dep, entry] of entries) {
      // StrictMode's simulated unmount can dispose a dep this render captured;
      // re-render so the session resolves the live instance.
      if (dep.$blac.disposed) {
        this.onChange();
        continue;
      }
      dep.registerConsumerPaths(consumerId, entry.paths);
      const existing = subs?.get(dep);
      if (existing) {
        existing.subscription.setInterest(entry.paths);
        continue;
      }
      const refId = this.refId;
      const live = registry.acquire(entry.Type, entry.key, {
        canCreate: true,
        countRef: true,
        refId,
        args: entry.args,
      });
      // The key now maps to another instance; re-render against that one.
      if (live !== dep) {
        deferRelease(registry, entry.Type, entry.key, refId, live);
        this.onChange();
        continue;
      }
      const subscription = dep.subscribePaths(this.onChange);
      subscription.setInterest(entry.paths);
      (this.subs ??= new Map()).set(dep, {
        subscription,
        offDispose: dep[ON_DISPOSE](() => {
          if (!registry.destroyed) this.onChange();
        }),
        registry,
        Type: entry.Type,
        key: entry.key,
      });
    }
  }

  dispose(): void {
    const subs = this.subs;
    if (subs !== null) {
      for (const [dep, sub] of subs) this.drop(dep, sub);
      subs.clear();
    }
    this.reconciled = false;
  }

  private drop(dep: StateContainer, sub: DepSub): void {
    sub.subscription.unsubscribe();
    sub.offDispose();
    dep.unregisterConsumer(this.consumerId);
    deferRelease(sub.registry, sub.Type, sub.key, this.refId, dep);
  }
}

function sameEntry(a: DepEntry, b: DepEntry): boolean {
  return (
    pathSetEquals(a.paths, b.paths) &&
    a.key === b.key &&
    Object.is(a.args, b.args)
  );
}

function mergeParts(parts: PathSet[]): PathSet {
  if (parts.length === 1) return parts[0];
  const out = new Set<number>();
  for (const part of parts) {
    if (part === ALL_PATHS) return ALL_PATHS;
    for (const id of part) out.add(id);
  }
  return out;
}

interface DepAccessOptionsLike {
  args?: unknown;
}

/** Structural shape of a branded `depend()` handle as seen from React. */
export interface DepHandleLike {
  track(options?: DepAccessOptionsLike): [unknown, StateContainer];
  untracked(options?: DepAccessOptionsLike): StateContainer;
  readonly [DEP_BRAND]: {
    Type: StateContainerConstructor;
    defaultArgs?: unknown;
  };
}

/**
 * Wrap a dep handle read inside a tracked getter. During a render (`tracked`
 * is set) `.track()` records the dep's read paths into `session` and returns
 * a tracked proxy, so the dep's own getters track too. Outside a render it
 * returns the live `[state, dep]`, like the core handle.
 *
 * Args resolve per call, so one handle can reach several instances; proxies
 * are cached per resolved instance.
 */
export function makeDepWrapper(
  handle: DepHandleLike,
  registry: StateContainerRegistry,
  session: DepSession,
  tracked: { current: unknown },
  onDepHandle: (handle: object) => unknown,
): DepHandleLike {
  const brand = handle[DEP_BRAND];
  // Weak, so instances a getter stops reaching (e.g. by switching args) can
  // be collected once disposed.
  const perDep = new WeakMap<
    StateContainer,
    { ref: { current: unknown }; proxy: StateContainer }
  >();
  const proxyCache = new ProxyCache();

  const resolve = (options?: DepAccessOptionsLike) => {
    const args = options?.args ?? brand.defaultArgs;
    const key = registry.resolveKey(brand.Type, undefined, args);
    const dep = registry.acquire(brand.Type, key, {
      canCreate: true,
      countRef: false,
      args,
      sweepIfUnowned: tracked.current != null,
    }) as unknown as StateContainer;
    return { dep, key, args };
  };

  const wrapper = {
    untracked: (options?: DepAccessOptionsLike) => resolve(options).dep,
    track: (options?: DepAccessOptionsLike) => {
      const { dep, key, args } = resolve(options);
      if (tracked.current == null) return [dep.state, dep];

      const result = trackRender(dep.state, dep.interner, proxyCache);
      let cache = perDep.get(dep);
      if (cache === undefined) {
        const ref = { current: result.value as unknown };
        cache = { ref, proxy: buildTrackedProxy(dep, ref, onDepHandle) };
        perDep.set(dep, cache);
      } else {
        cache.ref.current = result.value;
      }
      session.record(dep, result.paths, brand.Type, key, args, result.disarm);
      return [result.value, cache.proxy];
    },
  } as DepHandleLike;

  Object.defineProperty(wrapper, DEP_BRAND, {
    value: brand,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  return wrapper;
}
