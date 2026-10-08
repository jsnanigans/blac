/**
 * Framework hooks used by `@blac/react` and the testing helpers. Not public
 * API; may change in any release.
 *
 * @packageDocumentation
 */
export { DEP_BRAND } from './core/StateContainer';
export {
  APPLY_DEPS,
  REMOVE_DEPS_OWNER,
  INIT_CONFIG,
  INSERT_INSTANCE,
  ON_DISPOSE,
  WITH_TRACKED_STATE,
} from './core/symbols';
