import { expectTypeOf, it } from 'vitest';
import { Cubit } from './Cubit';
import type {
  ExtractArgs,
  ExtractDeps,
  ExtractState,
} from '../types/utilities';

class NoArgs extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
}

class WithArgs extends Cubit<
  { n: number },
  { userId: string },
  { ref: { current: unknown } }
> {
  constructor() {
    super({ n: 0 });
  }
}

it('extracts args/deps/state', () => {
  expectTypeOf<ExtractArgs<typeof NoArgs>>().toEqualTypeOf<void>();
  expectTypeOf<ExtractArgs<typeof WithArgs>>().toEqualTypeOf<{
    userId: string;
  }>();
  expectTypeOf<ExtractDeps<typeof WithArgs>>().toEqualTypeOf<{
    ref: { current: unknown };
  }>();
  // ExtractState wraps the state in Readonly<>.
  expectTypeOf<ExtractState<typeof WithArgs>>().toEqualTypeOf<
    Readonly<{ n: number }>
  >();
});
