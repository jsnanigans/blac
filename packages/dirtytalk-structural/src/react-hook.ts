import { useEffect, useId, useReducer, useRef } from 'react';
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

  useEffect(() => {
    // Re-register paths in case this effect is re-running after a StrictMode
    // cleanup cycle (render body did not re-run, so we re-register from the ref).
    container.registerConsumerPaths(consumerId, pathRef.current);
    const unsub = container.subscribe(
      () => pathRef.current,
      () => force(),
    );
    return () => {
      unsub();
      container.unregisterConsumer(consumerId);
    };
  }, [container, consumerId]);

  const { value, paths } = trackRender(container.state, container.interner);
  pathRef.current = paths;
  container.registerConsumerPaths(consumerId, paths);

  return [value, container] as const;
}
