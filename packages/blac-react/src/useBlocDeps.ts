import { useEffect, useId, useRef } from 'react';
import { APPLY_DEPS, REMOVE_DEPS_OWNER, type StateContainer } from '@blac/core';

/**
 * Feed live values from the component into a bloc's `deps` lane.
 *
 * Each calling component is one owner: its slice is shallow-merged into the
 * bloc's merged `deps` view, and withdrawn when the component unmounts. The
 * bloc observes changes through `onDepsChanged`.
 *
 * ```tsx
 * const [state, bloc] = useBloc(CanvasCubit);
 * useBlocDeps(bloc, { canvas, onTick });
 * ```
 *
 * Use this for values a bloc must *read* but should not own — DOM handles,
 * callbacks, values from other hooks. Pass identity-stable values (`useMemo` /
 * `useCallback`) as you would to any hook; a new function identity each render
 * counts as a change.
 */
export function useBlocDeps<D extends object>(
  bloc: StateContainer<any, any, D>,
  slice: Partial<D>,
): void {
  const ownerId = useId();
  const latest = useRef(slice);
  latest.current = slice;

  // `APPLY_DEPS` shallow-compares and no-ops on an unchanged slice, so applying
  // on every commit is cheaper than asking callers to maintain a dep array.
  useEffect(() => {
    bloc[APPLY_DEPS](ownerId, latest.current);
  });

  useEffect(() => {
    return () => {
      bloc[REMOVE_DEPS_OWNER](ownerId);
    };
  }, [bloc, ownerId]);
}
