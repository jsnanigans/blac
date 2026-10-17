import { useEffect, useId, useLayoutEffect, useReducer, useRef } from 'react';
import { emptyPathSet, expandWithAncestors, pathSetEquals } from './path-set';
import type { PathSet } from './path-set';
import { ProxyCache, trackRender } from './tracker';
import type { StructuralContainer } from './container';

export interface UseStructuralOptions {
  select?: never;
}

export interface UseStructuralResult<S, C extends StructuralContainer<S>> {
  0: S;
  1: C;
  readonly length: 2;
  [Symbol.iterator](): IterableIterator<S | C>;
}

export function useStructural<S, C extends StructuralContainer<S>>(
  container: C,
  _options?: UseStructuralOptions,
): readonly [S, C] {
  const consumerId = useId();
  const pathRef = useRef<PathSet>(emptyPathSet());
  // `pathRef` expanded with ancestor-watch ids, so a patch that replaces a
  // parent atomically (e.g. an array) still wakes a reader of a descendant.
  const interestRef = useRef<PathSet>(pathRef.current);
  const cacheRef = useRef<ProxyCache | null>(null);
  // The paths of the last commit; renders that never commit don't touch it.
  const committedRef = useRef<PathSet | null>(null);
  const [, force] = useReducer((x: number) => x + 1, 0);
  // Render-time state snapshot, read by the subscription effect to close the
  // mount gap (T6): an emit landing between the render read and this passive
  // subscribe would otherwise be lost.
  const renderStateRef = useRef<unknown>(undefined);

  useEffect(() => {
    // Re-register paths in case this effect is re-running after a StrictMode
    // cleanup cycle (render body did not re-run, so we re-register from the ref).
    container.registerConsumerPaths(consumerId, pathRef.current);
    const unsub = container.subscribe(
      () => interestRef.current,
      () => force(),
    );
    // Close the mount gap (T6): if state advanced between the render snapshot
    // and this subscribe, force one re-render so we don't stay stale.
    if (container.state !== renderStateRef.current) {
      force();
    }
    return () => {
      unsub();
      container.unregisterConsumer(consumerId);
    };
  }, [container, consumerId]);

  const renderState = container.state;
  const { value, paths, disarm } = trackRender(
    renderState,
    container.interner,
    (cacheRef.current ??= new ProxyCache()),
  );
  pathRef.current = paths;
  renderStateRef.current = renderState;
  // `paths` fills while the caller evaluates its JSX, so it is registered at
  // commit, not here. Disarming first stops reads that outlive the render
  // (effects, handlers) from adding paths.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    disarm();
    // A change between render and commit was diffed against the previous
    // skeleton, which may lack paths only this render read.
    if (container.state !== renderState) force();
    const committed = committedRef.current;
    if (committed !== null && pathSetEquals(committed, paths)) return;
    committedRef.current = paths;
    container.registerConsumerPaths(consumerId, paths);
    interestRef.current = expandWithAncestors(paths, container.interner);
  });

  return [value, container] as const;
}
