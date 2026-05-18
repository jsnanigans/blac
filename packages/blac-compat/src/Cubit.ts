import { Cubit as V2Cubit } from '@blac/core';

/**
 * v0/v1-compatible Cubit, backed by `@blac/core` Cubit.
 *
 * The second generic `P` was used by v1 to type the `props` field that
 * `useBloc(C, { props })` injected. In v2 props are explicit (callers pair
 * `useBloc(C)` with `useEffect(() => bloc.initWithProps(props), [])`), so
 * `P` is accepted only to keep `class X extends Cubit<S, P>` type-compatible.
 * The shim still exposes a public `props` field so legacy reads keep working
 * until the codemod rewrites them.
 */
export abstract class Cubit<S extends object, _P = null> extends V2Cubit<S> {
  /**
   * Legacy v1 props slot. The shim's `useBloc` (and `Blac.getBloc`) populate
   * this when callers pass a `props` option. Prefer migrating to an explicit
   * `initWithProps(p)` method on the bloc.
   */
  props: unknown = null;
}
