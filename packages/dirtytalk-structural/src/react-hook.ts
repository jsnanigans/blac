import type { StructuralContainer } from './container';

export interface UseStructuralOptions {
  select?: never;
}

export const useStructural = <S, C extends StructuralContainer<S>>(
  _container: C,
  _options?: UseStructuralOptions,
): readonly [S, C] => {
  throw new Error('useStructural: not implemented (Phase 4)');
};
