import { StateContainer } from './StateContainer';

/**
 * `Cubit<S>` is a `StateContainer<S>` with `emit` / `patch` exposed as
 * public mutation surface. Today it adds nothing structurally beyond
 * `StateContainer` — both are inherited from the underlying
 * `StructuralContainer<S>`. Kept as a real class (not a type alias) because
 * downstream code does `instance instanceof Cubit` checks (see A2 audit).
 *
 * The class body is intentionally empty: a no-op `emit` override would
 * still go through `applyState`, and `patch` is inherited from
 * `StructuralContainer` (path-diffed, microtask-flushed). If a caller
 * needs the old "skip if no real change" patch semantics, they can wrap
 * `patch` themselves or call `emit` after a manual equality check.
 */
export abstract class Cubit<
  S extends object = any,
  Args = void,
  Deps extends object = Record<string, never>,
> extends StateContainer<S, Args, Deps> {}
