/**
 * Type tests for the instance aliases. These pin that narrowing `state` does
 * not erase the class: an `Omit`-based alias drops private members and stops
 * being assignable to `StateContainer`, which is what forced `@blac/react` to
 * hand-roll a structural `DepsTarget` interface.
 */

import { expectTypeOf, it } from 'vite-plus/test';
import { Cubit } from './Cubit';
import type { StateContainer } from './StateContainer';
import { APPLY_DEPS } from './symbols';
import type { InstanceReadonlyState } from '../types/utilities';

class Counter extends Cubit<{ n: number }, void, { ref: string }> {
  constructor() {
    super({ n: 0 });
  }
}

type Instance = InstanceReadonlyState<typeof Counter>;

it('narrows state without erasing the class', () => {
  expectTypeOf<Instance>().toExtend<
    StateContainer<any, any, { ref: string }>
  >();
  expectTypeOf<Instance>().toHaveProperty(APPLY_DEPS);
  expectTypeOf<Instance['state']>().toExtend<Readonly<{ n: number }>>();

  // The assignability that `Omit` broke: the alias used where the real
  // container type is expected, as `useBlocDeps` does.
  const asContainer: StateContainer<any, any, { ref: string }> = {} as Instance;
  void asContainer;

  // @ts-expect-error — state stays narrowed to the bloc's own shape
  const wrongState: { other: string } = ({} as Instance).state;
  void wrongState;
});
