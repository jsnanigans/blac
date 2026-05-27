import { it, expect } from 'vite-plus/test';
import { APPLY_DEPS, REMOVE_DEPS_OWNER } from '../index';

it('re-exports APPLY_DEPS as a symbol', () => {
  expect(typeof APPLY_DEPS).toBe('symbol');
});

it('re-exports REMOVE_DEPS_OWNER as a symbol', () => {
  expect(typeof REMOVE_DEPS_OWNER).toBe('symbol');
});
