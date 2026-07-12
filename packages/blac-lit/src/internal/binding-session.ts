import {
  getRegistry,
  type StateContainer,
  type StateContainerConstructor,
} from '@blac/core';
import {
  asTrackable,
  DEP_BRAND,
  emptyPathSet,
  expandWithAncestors,
  pathSetEqual,
  ProxyCache,
  trackRender,
  trackedBloc,
  unionPaths,
  type PathSet,
} from './track';

let sessionCounter = 0;
let depRefCounter = 0;
let recomputeCount = 0;

/** @internal test-only: real (non-memoized) computeCurrent invocations. */
export const __recomputeProbe = {
  count: (): number => recomputeCount,
  reset: (): void => {
    recomputeCount = 0;
  },
};

let registerCount = 0;

/** @internal test-only: real registerConsumerPaths calls (primary + deps). */
export const __registerProbe = {
  count: (): number => registerCount,
  reset: (): void => {
    registerCount = 0;
  },
};

const nextConsumerId = () => `blac-lit-binding@${(sessionCounter += 1)}`;
const nextDepRefId = () => `blac-lit-dep@${(depRefCounter += 1)}`;

type Reader<T> = (state: unknown, bloc: StateContainer) => T;

/** A branded `depend()` handle read this compute, pending reconciliation. */
interface PendingDep {
  paths: PathSet;
  Type: StateContainerConstructor;
  key: string;
  args: unknown;
}

/**
 * Every container (the primary source, or a cross-bloc `depend()` target)
 * the session tracks reactivity against. The primary is never ref-acquired —
 * the caller owns its lifetime; a dep record additionally owns a registry ref
 * for as long as it stays subscribed (`acquired ⇔ unsubscribe !== undefined`).
 */
interface ContainerRecord {
  readonly container: StateContainer;
  readonly kind: 'primary' | 'dep';
  readonly cache: ProxyCache;
  paths: PathSet;
  interest: PathSet;
  unsubscribe?: () => void;
  registered: boolean;
  snapshot?: unknown;
  // dep-only ref ownership:
  acquired: boolean;
  refId: string;
  Type?: StateContainerConstructor;
  key?: string;
  args?: unknown;
}

/**
 * Owns the complete reactive lifecycle for one Lit binding hole, across the
 * primary source AND every cross-bloc `depend().track()` reached from a
 * getter reader runs off it (including deps-of-deps and mutual cycles).
 *
 * Consumer paths deliberately remain the normal leaves reported by the
 * tracker. Ancestor-watch ids are only channel subscription interest: mixing
 * them into the structural consumer registry would make the source skeleton
 * compare two different path vocabularies.
 */
export class BindingSession<T> {
  readonly consumerId = nextConsumerId();

  private primary?: ContainerRecord;
  private reader?: Reader<T>;
  private connected = false;

  // Per-tick recompute memo: two paths funnel into `computeCurrent` within
  // the same flush (the `each`/`repeat` re-commit AND this session's own
  // channel subscription callback). Both run against the SAME state
  // snapshot, so the second is redundant work. The memo is valid only when
  // EVERY tracked container (primary + all deps) is still byref-identical to
  // what the last real compute saw, AND the reader identity is unchanged —
  // keying on all of them (not just the primary) is what keeps a cross-bloc
  // `depend()` change correct even when the primary hasn't moved.
  private lastValue?: T;
  private lastReader?: Reader<T>;
  private memoValid = false;

  // Per-compute scratch, only meaningful while the reader runs (see
  // `computeCurrent`/`onDepHandle`).
  private trackingActive = false;
  private pendingDeps?: Map<StateContainer, PendingDep>;
  private pendingTracked: Array<{ disarm(): void }> = [];

  private readonly deps = new Map<StateContainer, ContainerRecord>();
  private readonly depWrappers = new WeakMap<object, object>();
  private readonly depCaches = new Map<StateContainer, ProxyCache>();

  constructor(private readonly apply: (value: T) => void) {}

  /** Compute the current value, detaching every prior container before rebinding. */
  compute(source: StateContainer, reader: Reader<T>): T {
    if (!this.primary || this.primary.container !== source) {
      // A primary swap invalidates every dep discovered against the old
      // source too — detachAll() tears down the primary AND the dep map so a
      // fresh compute rediscovers deps from scratch.
      this.detachAll();
      this.primary = {
        container: source,
        kind: 'primary',
        cache: this.cacheFor(source),
        paths: emptyPathSet(),
        interest: emptyPathSet(),
        registered: false,
        acquired: false,
        refId: '',
      };
      // A new primary invalidates the memo — the old snapshots refer to a
      // container this session no longer tracks.
      this.memoValid = false;
      this.lastValue = undefined;
      this.lastReader = undefined;
    }

    this.reader = reader;
    return this.computeCurrent();
  }

  /** Attach after an initial render-time compute. */
  connect(): void {
    this.connected = true;
    this.attach();
  }

  /** Reconnection starts from a fresh read so old interest can never be reused. */
  reconnect(): void {
    this.connected = true;
    if (!this.primary || !this.reader) return;

    const value = this.computeCurrent();
    this.apply(value);
    this.attach();
  }

  /** Disconnecting removes both channel interest and structural registration
   * for the primary AND every dep, releasing every dep ref held. */
  disconnect(): void {
    this.connected = false;
    this.detachAll();
    this.memoValid = false;
    this.lastValue = undefined;
    this.lastReader = undefined;
  }

  private computeCurrent(): T {
    const primary = this.primary;
    const reader = this.reader;
    if (!primary || !reader) {
      throw new Error(
        'Cannot compute a binding before a source and reader exist.',
      );
    }
    const source = primary.container;

    // Memo short-circuit: if the reader identity and every tracked
    // container's live state (primary + all deps) are byref-identical to
    // what the last real compute saw, the result is provably unchanged —
    // return it without re-running the reader or re-touching registration.
    if (
      this.memoValid &&
      reader === this.lastReader &&
      primary.snapshot === asTrackable(source).state
    ) {
      let depsUnchanged = true;
      for (const rec of this.deps.values()) {
        if (rec.snapshot !== asTrackable(rec.container).state) {
          depsUnchanged = false;
          break;
        }
      }
      if (depsUnchanged) return this.lastValue as T;
    }

    recomputeCount += 1;

    const trackable = asTrackable(source);
    const snapshot = trackable.state;
    const tracked = trackRender(snapshot, trackable.interner, primary.cache);

    // Scratch for this compute: dep handles reached via `onDepHandle` record
    // themselves here so `reconcileDeps` can diff against the live dep set.
    const pending = new Map<StateContainer, PendingDep>();
    this.pendingDeps = pending;
    this.pendingTracked = [];
    this.trackingActive = true;

    let value: T;
    try {
      value = reader(
        tracked.value,
        trackedBloc(source, tracked.value, this.onDepHandle),
      );
    } catch (error) {
      // A failed tracked read must not leave previous paths subscribed or in
      // the source skeleton on any container (primary or dep) touched this
      // compute. A later Lit update can establish a fresh session.
      this.detachAfterFailure();
      throw error;
    } finally {
      // Lit completes this read synchronously. Unlike React JSX, no later
      // commit phase needs these proxies armed.
      this.trackingActive = false;
      this.pendingDeps = undefined;
      tracked.disarm();
      for (const t of this.pendingTracked) t.disarm();
      this.pendingTracked = [];
    }

    primary.snapshot = snapshot;
    // Reuse the cached interest + skip re-registration when the tracked leaf
    // SET is structurally unchanged (the common case: only values moved). The
    // per-tick memo above handles unchanged snapshots; this handles unchanged
    // SHAPE on a genuine value change.
    if (!pathSetEqual(tracked.paths, primary.paths)) {
      primary.paths = tracked.paths;
      primary.interest = expandWithAncestors(tracked.paths, trackable.interner);
      // An existing subscription reads `interest` lazily, so dynamic selectors
      // only need their source-side leaf registration refreshed here.
      if (primary.unsubscribe) this.registerPaths(primary);
    }

    this.reconcileDeps(pending);

    this.lastReader = reader;
    this.lastValue = value;
    this.memoValid = true;
    return value;
  }

  /**
   * Stable arrow field routed through `trackedBloc`'s `onDepHandle` param so a
   * getter reading `this.someDep` (a branded `depend()` handle) gets a
   * session-bound wrapper back. Nested chains (a dep's own getter reading
   * ANOTHER dep) re-enter this same callback, so deep chains and mutual
   * cycles union paths into one session rather than re-acquiring.
   */
  private readonly onDepHandle = (handle: object): unknown => {
    const cached = this.depWrappers.get(handle);
    if (cached) return cached;

    const brand = (
      handle as Record<
        symbol,
        { Type: StateContainerConstructor; defaultArgs?: unknown }
      >
    )[DEP_BRAND]!;
    const registry = getRegistry();
    const resolve = (options?: { args?: unknown }) => {
      const args = options?.args ?? brand.defaultArgs;
      const key = registry.resolveKey(brand.Type, undefined, args);
      const dep = registry.ensure(
        brand.Type,
        key,
        args,
      ) as unknown as StateContainer;
      return { dep, key, args };
    };

    const wrapper = {
      untracked: (options?: { args?: unknown }) => resolve(options).dep,
      track: (options?: { args?: unknown }) => {
        const { dep, key, args } = resolve(options);

        // Outside a tracking pass: live values, no subscription (core base
        // behavior) — matches calling `.track()` from an event handler.
        if (!this.trackingActive) return [dep.state, dep];

        const depTrackable = asTrackable(dep);
        const tracked = trackRender(
          dep.state,
          depTrackable.interner,
          this.cacheFor(dep),
        );
        this.pendingTracked.push(tracked);

        const pending = this.pendingDeps!;
        const existing = pending.get(dep);
        if (existing) {
          // Re-entry this compute (`.track()` twice, or a mutual cycle):
          // union the new paths into the existing entry rather than
          // recording a second one.
          existing.paths = unionPaths(existing.paths, tracked.paths);
        } else {
          pending.set(dep, {
            paths: tracked.paths,
            Type: brand.Type,
            key,
            args,
          });
        }

        // Nested trackedBloc so a getter on `dep` reading its OWN dep
        // re-enters this same session (deep chains, mutual A<->B deps).
        return [
          tracked.value,
          trackedBloc(dep, tracked.value, this.onDepHandle),
        ];
      },
    };
    Object.defineProperty(wrapper, DEP_BRAND, {
      value: brand,
      enumerable: false,
    });
    this.depWrappers.set(handle, wrapper);
    return wrapper;
  };

  /** Diff this compute's reached deps against the live dep set. */
  private reconcileDeps(pending: Map<StateContainer, PendingDep>): void {
    // Drop deps no longer reached this compute.
    for (const [container, rec] of this.deps) {
      if (!pending.has(container)) {
        this.detachContainer(rec);
        this.deps.delete(container);
      }
    }

    // Add/refresh deps reached this compute.
    for (const [container, p] of pending) {
      const t = asTrackable(container);
      const rec = this.deps.get(container);
      if (rec) {
        // This compute just read this dep's live state — stamp it so the
        // memo key stays complete for the next `computeCurrent`.
        rec.snapshot = asTrackable(container).state;
        if (!pathSetEqual(p.paths, rec.paths)) {
          rec.paths = p.paths;
          rec.interest = expandWithAncestors(p.paths, t.interner);
          if (rec.unsubscribe) {
            registerCount += 1;
            t.registerConsumerPaths(this.consumerId, p.paths);
          }
        }
        continue;
      }

      const interest = expandWithAncestors(p.paths, t.interner);
      const fresh: ContainerRecord = {
        container,
        kind: 'dep',
        cache: this.cacheFor(container),
        paths: p.paths,
        interest,
        registered: false,
        acquired: false,
        refId: nextDepRefId(),
        Type: p.Type,
        key: p.key,
        args: p.args,
        snapshot: asTrackable(container).state,
      };
      this.deps.set(container, fresh);
      // Only wire up when already connected/subscribed; otherwise `attach()`
      // picks up every dep once `connect()` runs.
      if (this.connected && this.primary?.unsubscribe) {
        this.attachContainer(fresh);
      }
    }
  }

  private attach(): void {
    const primary = this.primary;
    if (!this.connected || !primary || primary.unsubscribe || !this.reader) {
      return;
    }

    try {
      this.attachContainer(primary);
      for (const rec of this.deps.values()) this.attachContainer(rec);

      // Close the compute → subscription gap. The recompute refreshes both
      // leaf registration and expanded subscription interest, for every
      // container, before applying.
      if (asTrackable(primary.container).state !== primary.snapshot) {
        this.apply(this.computeCurrent());
      }
    } catch (error) {
      // Register/subscribe is transactional from the directive's perspective:
      // a partial attempt cannot leave a stale skeleton consumer behind on
      // any container.
      this.detachAfterFailure();
      throw error;
    }
  }

  private attachContainer(rec: ContainerRecord): void {
    if (rec.unsubscribe) return;
    const t = asTrackable(rec.container);

    if (rec.kind === 'dep' && !rec.acquired) {
      // First commit that sees this dep: take the ownership ref HERE (not in
      // the reader/`.track()`), so a render that never connects can never
      // leak it.
      getRegistry().acquire(rec.Type!, rec.key!, {
        canCreate: true,
        countRef: true,
        refId: rec.refId,
        args: rec.args,
      });
      rec.acquired = true;
    }

    this.registerPaths(rec);
    rec.unsubscribe = t.channel.subscribe(
      () => rec.interest,
      () => this.apply(this.computeCurrent()),
    );
  }

  private detachContainer(rec: ContainerRecord): void {
    const { unsubscribe, registered, acquired } = rec;
    rec.unsubscribe = undefined;
    rec.registered = false;
    rec.acquired = false;

    let error: unknown;
    try {
      unsubscribe?.();
    } catch (cause) {
      error = cause;
    } finally {
      if (registered) {
        try {
          asTrackable(rec.container).unregisterConsumer(this.consumerId);
        } catch (cause) {
          if (error === undefined) error = cause;
        }
      }
      if (rec.kind === 'dep' && acquired) {
        try {
          getRegistry().release(rec.Type!, rec.key!, false, rec.refId);
        } catch (cause) {
          if (error === undefined) error = cause;
        }
      }
    }
    if (error !== undefined) throw error;
  }

  /** Detach the primary (if any) and every live dep, clearing the dep map. */
  private detachAll(): void {
    let error: unknown;
    if (this.primary) {
      try {
        this.detachContainer(this.primary);
      } catch (cause) {
        error = cause;
      }
    }
    for (const [container, rec] of this.deps) {
      try {
        this.detachContainer(rec);
      } catch (cause) {
        if (error === undefined) error = cause;
      }
      this.deps.delete(container);
    }
    if (error !== undefined) throw error;
  }

  private registerPaths(rec: ContainerRecord): void {
    registerCount += 1;
    asTrackable(rec.container).registerConsumerPaths(
      this.consumerId,
      rec.paths,
    );
    rec.registered = true;
  }

  /** Get-or-create the shared `ProxyCache` for a container (primary or dep). */
  private cacheFor(container: StateContainer): ProxyCache {
    let cache = this.depCaches.get(container);
    if (!cache) {
      cache = new ProxyCache();
      this.depCaches.set(container, cache);
    }
    return cache;
  }

  private resetInterest(): void {
    if (!this.primary) return;
    this.primary.paths = emptyPathSet();
    this.primary.interest = emptyPathSet();
    this.primary.snapshot = undefined;
  }

  private detachAfterFailure(): void {
    // Preserve the read/setup error while still making a best effort to
    // remove every piece of reactive state that was installed before it was
    // thrown, across every container (primary or dep) touched this compute.
    try {
      this.detachAll();
    } catch {
      // `detachContainer` clears local flags before invoking user/channel
      // cleanup, so even a failing cleanup cannot leave this session
      // registered here.
    }
    this.resetInterest();
    this.memoValid = false;
    this.lastValue = undefined;
    this.lastReader = undefined;
  }
}
