import type { PathSet } from './path-set';
import type { PathInterner } from './path-interner';

export interface TrackResult<S> {
  value: S;
  paths: PathSet;
}

export const trackRender = <S>(
  _state: S,
  _interner: PathInterner,
): TrackResult<S> => {
  throw new Error('trackRender: not implemented (Phase 2)');
};
