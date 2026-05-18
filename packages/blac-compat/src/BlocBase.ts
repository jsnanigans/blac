import { StateContainer } from '@blac/core';

/**
 * v1 `BlocBase<S, P>` alias. The `P` generic is preserved for type
 * compatibility but discarded at runtime — props now live on the cubit as a
 * plain field (see `./Cubit.ts`). Use the v2 `StateContainer` for typing.
 */
export abstract class BlocBase<
  S extends object,
  _P = null,
> extends StateContainer<S> {}
