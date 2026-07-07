import { useEffect, useId, useLayoutEffect, useReducer, useRef } from 'react';
import { emptyPathSet } from './path-set';
import type { PathSet } from './path-set';
import { trackRender } from './tracker';
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
      () => pathRef.current,
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

  const { value, paths } = trackRender(container.state, container.interner);
  pathRef.current = paths;
  renderStateRef.current = container.state;
  // NOTE: registerConsumerPaths is intentionally NOT called here. The proxy
  // hasn't been accessed yet, so `paths` is an empty Set that the proxy will
  // mutate during JSX evaluation. Registering at this point would store an
  // empty interest with the container and freeze the skeleton at that
  // snapshot — subsequent emits would diff against an empty skeleton and
  // silently drop wakeups. The useLayoutEffect below registers the populated
  // set after render.
  useLayoutEffect(() => {
    container.registerConsumerPaths(consumerId, pathRef.current);
  });

  return [value, container] as const;
}
