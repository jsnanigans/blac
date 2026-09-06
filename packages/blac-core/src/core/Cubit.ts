import { StateContainer } from './StateContainer';
import type { DeepPartial } from '@dirtytalk/structural';

/**
 * `Cubit<S>` is a `StateContainer<S>` that exposes mutation publicly.
 *
 * That is the whole difference, and it is a real one: on `StateContainer`
 * `emit` / `patch` / `update` are `protected`, so a container mutates itself
 * from its own methods and callers go through the API it chooses to publish.
 * `Cubit` re-declares the three as `public` for the cases where a caller
 * legitimately drives state from outside — test helpers, devtools
 * time-travel, benchmarks.
 *
 * Reach for `StateContainer` when business logic should live in the class,
 * and `Cubit` when the caller owns the transitions.
 */
export abstract class Cubit<
  S extends object = any,
  Args = void,
  Deps extends object = Record<string, never>,
> extends StateContainer<S, Args, Deps> {
  override emit(next: S): void {
    super.emit(next);
  }

  override patch(partial: DeepPartial<S>): void {
    super.patch(partial);
  }

  override update(fn: (state: S) => S): void {
    super.update(fn);
  }
}
