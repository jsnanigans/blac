import {
  DirtyChannel,
  MicrotaskScheduler,
  type Scheduler,
} from '@dirtytalk/engine';
import { diffAlongSkeleton, pathsFromPatch } from './diff';
import { PathInterner } from './path-interner';

/**
 * Recursively make all object-valued properties optional.
 *
 * - Plain-object branches recurse so nested patches type-check without casts.
 * - Arrays are accepted as `ReadonlyArray<DeepPartial<U>>` (matching runtime:
 *   `pathsFromPatch` treats arrays as leaves, not per-index expandable).
 * - `Date | Map | Set | RegExp` are kept as-is; without this carve-out TS
 *   would try to partial their internal prototype properties.
 * - Primitives and functions pass through unchanged.
 */
export type DeepPartial<T> =
  T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T extends Date | Map<unknown, unknown> | Set<unknown> | RegExp
      ? T
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T;
import {
  ALL_PATHS,
  emptyPathSet,
  pathSetEquals,
  pathSetUnion,
  PathSetSpace,
  type PathSet,
} from './path-set';
import type { ConsumerId, PathId } from './types';

export interface StructuralContainerOptions {
  /**
   * Scheduler for the underlying DirtyChannel.
   * Default: a fresh MicrotaskScheduler per instance.
   * Tests and SSR should pass SyncScheduler.
   */
  scheduler?: Scheduler;

  /**
   * Per-path-pattern equality override. v1 keys are *exact dotted path
   * strings* — the container interns each at construction so the diff hook
   * can look them up by `PathId`. Concrete pattern matching (globs, etc.)
   * is a follow-up.
   */
  equality?: ReadonlyMap<string, (a: unknown, b: unknown) => boolean>;
}

/**
 * `StructuralContainer<S>` — owns a piece of state, a `DirtyChannel<PathSet>`,
 * and a consumer registry. Mutations route through `pathsFromPatch` (for
 * `patch`) or `diffAlongSkeleton` (for `emit`) so only consumers whose
 * observed paths intersect the change wake up.
 *
 * Single-consumer flows short-circuit to `ALL_PATHS` to avoid the diff cost.
 */
export abstract class StructuralContainer<S> {
  // Per-class interner registry — keyed by constructor so GC can reclaim
  // interners once all instances of a class are gone (WeakMap, not Map).
  // Keyed as `object` (constructors are objects) to satisfy no-unsafe-function-type.
  private static readonly _interners = new WeakMap<object, PathInterner>();

  static getInternerFor(ctor: object): PathInterner {
    let interner = StructuralContainer._interners.get(ctor);
    if (interner === undefined) {
      interner = new PathInterner();
      StructuralContainer._interners.set(ctor, interner);
    }
    return interner;
  }

  private readonly _channel: DirtyChannel<PathSet>;
  private readonly _consumerPaths = new Map<ConsumerId, PathSet>();
  private _state: S;
  private _skeleton: PathSet = emptyPathSet();
  private readonly _equalsByPathId: Map<
    PathId,
    (a: unknown, b: unknown) => boolean
  >;

  constructor(initial: S, options: StructuralContainerOptions = {}) {
    this._state = initial;
    const scheduler = options.scheduler ?? new MicrotaskScheduler();
    this._channel = new DirtyChannel<PathSet>(PathSetSpace, scheduler);

    this._equalsByPathId = new Map();
    if (options.equality) {
      for (const [path, eq] of options.equality) {
        this._equalsByPathId.set(this.interner.intern(path), eq);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  get state(): S {
    return this._state;
  }

  get interner(): PathInterner {
    return StructuralContainer.getInternerFor(this.constructor);
  }

  get channel(): DirtyChannel<PathSet> {
    return this._channel;
  }

  get consumerCount(): number {
    return this._consumerPaths.size;
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  emit(next: S): void {
    if (Object.is(this._state, next)) return; // reference-equal short-circuit
    const prev = this._state;
    this._state = next;

    let dirty: PathSet;
    if (this._consumerPaths.size <= 1) {
      // Single-consumer skip: with at most one consumer, the diff cost isn't
      // worth it — mark the whole space so the sole consumer (if any) wakes.
      dirty = ALL_PATHS;
    } else {
      dirty = diffAlongSkeleton(
        prev,
        next,
        this._skeleton,
        this.interner,
        this._equalsByPathId.size === 0
          ? undefined
          : (id, a, b) => {
              const eq = this._equalsByPathId.get(id);
              return eq ? eq(a, b) : Object.is(a, b);
            },
      );
    }
    this._channel.mark(dirty);
  }

  /**
   * Shallow-or-deep patch: accepts a `DeepPartial<S>` so nested object
   * branches type-check without casts (deep-partial: nested object branches
   * are accepted). Runtime behaviour is unchanged — `pathsFromPatch` walks
   * plain-object branches and treats class instances, arrays, Date, Map, Set,
   * etc. as atomic leaves.
   */
  patch(partial: DeepPartial<S>): void {
    if (Object.keys(partial as object).length === 0) return;
    const paths = pathsFromPatch(partial as Partial<S>, this.interner);
    // Apply state mutation atomically *before* mark so consumers see the new
    // state when they read it inside the dirty callback.
    this._state = deepMerge(this._state, partial as Partial<S>);
    this._channel.mark(paths);
  }

  update(fn: (state: S) => S): void {
    this.emit(fn(this._state));
  }

  // ---------------------------------------------------------------------------
  // Subscriptions / registry
  // ---------------------------------------------------------------------------

  /**
   * Pass-through subscribe on the underlying channel — for devtools, plugins,
   * and manual subscribers that don't go through the tracker.
   */
  subscribe(interest: () => PathSet, cb: (dirty: PathSet) => void): () => void {
    return this._channel.subscribe(interest, cb);
  }

  registerConsumerPaths(id: ConsumerId, paths: PathSet): void {
    const prev = this._consumerPaths.get(id);
    if (prev && pathSetEquals(prev, paths)) return; // fast-path skip

    this._consumerPaths.set(id, paths);
    this._recomputeSkeleton();
  }

  unregisterConsumer(id: ConsumerId): void {
    if (this._consumerPaths.delete(id)) this._recomputeSkeleton();
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  // O(consumers × paths); incremental update is a future optimisation.
  private _recomputeSkeleton(): void {
    let s: PathSet = emptyPathSet();
    for (const p of this._consumerPaths.values()) s = pathSetUnion(s, p);
    this._skeleton = s;
  }
}

// ---------------------------------------------------------------------------
// deepMerge — patch-shaped recursive merge.
//
// Mirrors `pathsFromPatch`'s leaf/branch decision exactly:
// - Plain-object branches merge recursively.
// - Arrays, class instances, primitives, null, undefined, Date, Map, Set,
//   etc. replace the corresponding slot atomically.
//
// Kept local to this module — the predicate is duplicated from diff.ts on
// purpose. If a third call site appears, factor at that point.
// ---------------------------------------------------------------------------

const isPlainPatchObject = (v: unknown): v is Record<string, unknown> => {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

const deepMerge = <S>(target: S, patch: Partial<S>): S => {
  if (!isPlainPatchObject(target) || !isPlainPatchObject(patch)) {
    // Either side isn't a plain object — patch replaces wholesale.
    return patch as S;
  }
  const out: Record<string, unknown> = {
    ...(target as Record<string, unknown>),
  };
  for (const key of Object.keys(patch)) {
    const nextVal = (patch as Record<string, unknown>)[key];
    const prevVal = (target as Record<string, unknown>)[key];
    if (isPlainPatchObject(nextVal) && isPlainPatchObject(prevVal)) {
      out[key] = deepMerge(prevVal, nextVal as Partial<typeof prevVal>);
    } else {
      out[key] = nextVal;
    }
  }
  return out as S;
};
