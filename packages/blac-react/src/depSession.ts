import type {
  StateContainer,
  StateContainerConstructor,
  StateContainerRegistry,
} from '@blac/core';
import { DEP_BRAND } from '@blac/core/internal';
import {
  ALL_PATHS,
  pathSetEquals,
  trackRender,
  ProxyCache,
  type PathSet,
} from '@dirtytalk/structural';
import { buildTrackedProxy } from './buildTrackedProxy';
import { expandWithAncestors } from './expandWithAncestors';

type SessionEntry =
  | { kind: 'primary'; paths: PathSet }
  | {
      kind: 'dep';
      paths: PathSet;
      Type: StateContainerConstructor;
      key: string;
      args: unknown;
    };

interface DepSub {
  unsubscribe: () => void;
  interestRef: { current: PathSet };
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
 * never leaks one.
 */
export class DepSession {
  private readonly entries = new Map<StateContainer, SessionEntry>();
  private readonly subs = new Map<StateContainer, DepSub>();
  private lastReconciled: Map<StateContainer, SessionEntry> | null = null;
  private readonly refId: string;

  constructor(
    private readonly consumerId: string,
    private readonly onChange: () => void,
  ) {
    this.refId = `useBloc@${consumerId}:dep`;
  }

  begin(primary: StateContainer, paths: PathSet): void {
    this.entries.clear();
    this.entries.set(primary, { kind: 'primary', paths });
  }

  record(
    dep: StateContainer,
    paths: PathSet,
    Type: StateContainerConstructor,
    key: string,
    args: unknown,
  ): void {
    const existing = this.entries.get(dep);
    if (existing !== undefined) {
      existing.paths = unionPaths(existing.paths, paths);
    } else {
      this.entries.set(dep, { kind: 'dep', paths, Type, key, args });
    }
  }

  /** Forces the next `reconcile` to run in full. */
  invalidate(): void {
    this.lastReconciled = null;
  }

  isUnchanged(): boolean {
    const last = this.lastReconciled;
    if (last === null || last.size !== this.entries.size) return false;
    for (const [container, entry] of this.entries) {
      const prev = last.get(container);
      if (prev === undefined || !sameEntry(prev, entry)) return false;
    }
    return true;
  }

  reconcile(registry: StateContainerRegistry): void {
    const { consumerId, refId, subs, entries } = this;

    for (const [dep, sub] of subs) {
      if (!entries.has(dep)) {
        this.drop(dep, sub);
        subs.delete(dep);
      }
    }

    for (const [dep, entry] of entries) {
      if (entry.kind === 'primary') continue;
      // StrictMode's simulated unmount can dispose a dep this render captured;
      // re-render so the session resolves the live instance.
      if (dep.$blac.disposed) {
        this.onChange();
        continue;
      }
      const interest = expandWithAncestors(entry.paths, dep.interner);
      dep.registerConsumerPaths(consumerId, entry.paths);
      const existing = subs.get(dep);
      if (existing) {
        existing.interestRef.current = interest;
        continue;
      }
      const live = registry.acquire(entry.Type, entry.key, {
        canCreate: true,
        countRef: true,
        refId,
        args: entry.args,
      });
      // The key now maps to another instance; re-render against that one.
      if (live !== dep) {
        registry.release(entry.Type, entry.key, false, refId);
        this.onChange();
        continue;
      }
      const interestRef: { current: PathSet } = { current: interest };
      const unsubscribe = dep.channel.subscribe(
        () => interestRef.current,
        this.onChange,
      );
      subs.set(dep, {
        unsubscribe,
        interestRef,
        registry,
        Type: entry.Type,
        key: entry.key,
      });
    }

    this.lastReconciled = new Map(entries);
  }

  dispose(): void {
    for (const [dep, sub] of this.subs) this.drop(dep, sub);
    this.subs.clear();
    this.lastReconciled = null;
  }

  private drop(dep: StateContainer, sub: DepSub): void {
    sub.unsubscribe();
    dep.unregisterConsumer(this.consumerId);
    sub.registry.release(sub.Type, sub.key, false, this.refId);
  }
}

function sameEntry(a: SessionEntry, b: SessionEntry): boolean {
  if (a.kind !== b.kind || !pathSetEquals(a.paths, b.paths)) return false;
  if (a.kind === 'primary' || b.kind === 'primary') return true;
  return a.key === b.key && Object.is(a.args, b.args);
}

function unionPaths(a: PathSet, b: PathSet): PathSet {
  if (a === ALL_PATHS || b === ALL_PATHS) return ALL_PATHS;
  const out = new Set<number>(a as Set<number>);
  for (const id of b as Set<number>) out.add(id);
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
  const perDep = new Map<
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
        cache = { ref, proxy: buildTrackedProxy(dep, ref, onDepHandle).proxy };
        perDep.set(dep, cache);
      } else {
        cache.ref.current = result.value;
      }
      session.record(dep, result.paths, brand.Type, key, args);
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
