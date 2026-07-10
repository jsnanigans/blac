import {
  trackRender,
  ProxyCache,
  ALL_PATHS,
  emptyPathSet,
  type PathSet,
  type PathInterner,
} from '@dirtytalk/structural';

/**
 * Runtime members of a blac StateContainer that the binding relies on. The
 * published type may not surface all of these, so internal code accesses a bloc
 * through this cast.
 */
export interface Trackable {
  readonly state: unknown;
  readonly interner: PathInterner;
  readonly channel: {
    subscribe(
      interest: () => PathSet,
      cb: (dirty: PathSet) => void,
    ): () => void;
  };
  registerConsumerPaths(id: string, paths: PathSet): void;
  unregisterConsumer(id: string): void;
}

export const asTrackable = (bloc: unknown): Trackable => bloc as Trackable;

/**
 * Expand a PathSet to include an *ancestor-watch* id for every ancestor of
 * every tracked leaf.
 *
 * The auto-tracker records leaf paths (e.g. `'items.length'`), but
 * `StructuralContainer.patch` can only mark the parent (`'items'`) when it
 * replaces a value atomically (arrays, `null`, primitives — it can't see
 * inside). Without expansion, a subscriber with interest `{'items.length'}`
 * would miss a `patch`-triggered atomic-replacement of `items`.
 *
 * Ancestors are added under the interner's *ancestor-watch* lane
 * (`internAncestor`), NOT as normal ids. The source emits a matching
 * ancestor-watch mark only for paths it replaces atomically — never for a
 * plain-object structural pulse-up. So `{'items.length'}` wakes when the array
 * `items` is replaced, but `{'user.email'}` does NOT wake when a sibling
 * `user.name` changes and pulses `user` up: pulse-up `user` is a normal id and
 * the ancestor-watch `user` only intersects another ancestor-watch `user`.
 *
 * Example: leaf `'a.b.c'` adds ancestor-watch ids for `'a.b'` and `'a'` (but
 * NOT the `''` root — a root change is covered by `ALL_PATHS` from the source,
 * and `''` would wake this consumer on every field change).
 *
 * Ported verbatim from `packages/blac-react/src/useBloc.ts` (lines 918-941).
 */
export function expandWithAncestors(
  paths: PathSet,
  interner: PathInterner,
): PathSet {
  if (paths === ALL_PATHS) return ALL_PATHS;
  const leafPaths = paths as Set<number>;
  if (leafPaths.size === 0) return paths;

  const expanded = new Set<number>(leafPaths);
  for (const id of leafPaths) {
    const str = interner.lookup(id);
    // Add all non-root ancestor segments as *ancestor-watch* ids: 'a.b.c' →
    // watch 'a.b' and 'a'. These live in the interner's ancestor lane so they
    // only intersect the source's atomic-replacement marks (`internAncestor`),
    // never a structural pulse-up mark of the same path. That is what lets a
    // descendant-reader (e.g. `items.length`) wake on an array/null replacement
    // without a sibling-leaf reader (`user.email`) waking when a sibling
    // (`user.name`) changes and pulses up through `user`.
    let idx = str.lastIndexOf('.');
    while (idx > 0) {
      const ancestor = str.slice(0, idx);
      expanded.add(interner.internAncestor(ancestor));
      idx = ancestor.lastIndexOf('.');
    }
  }
  return expanded;
}

/**
 * A tracked view of a bloc so prototype getters record their real state deps.
 * Reading `.state` returns the tracking proxy; getters invoked with this proxy
 * as receiver therefore read through it.
 */
export function trackedBloc<B extends object>(
  bloc: B,
  trackedState: unknown,
): B {
  return new Proxy(bloc, {
    get(target, prop, receiver) {
      if (prop === 'state') return trackedState;
      return Reflect.get(target, prop, receiver);
    },
  }) as B;
}

export { trackRender, ProxyCache, ALL_PATHS, emptyPathSet };
export type { PathSet, PathInterner };
