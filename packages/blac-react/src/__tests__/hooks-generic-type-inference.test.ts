import { describe, it, expectTypeOf } from 'vitest';
import { Cubit, StateContainer, type StateOverride } from '@blac/core';
import type { UseBlocReturn } from '../types';

interface CounterState {
  count: number;
  label: string;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, label: 'counter' });
  }

  increment() {
    this.emit({ ...this.state, count: this.state.count + 1 });
  }

  getLabel(): string {
    return this.state.label;
  }
}

interface GenericState<T> {
  data: T;
  loading: boolean;
}

class GenericCubit<T> extends Cubit<GenericState<T>> {
  constructor(initialData: T) {
    super({ data: initialData, loading: false });
  }

  setData(data: T) {
    this.emit({ ...this.state, data });
  }
}

/**
 * Helper type that represents the return of calling useBloc<S>(BlocClass)
 * This allows type-level testing without actually calling the hook.
 */
type UseBlocResult<
  S,
  BlocClass extends new (...args: any[]) => StateContainer<any, any>,
> = UseBlocReturn<InstanceType<BlocClass>, S>;

/**
 * Helper type that represents the return of calling useBlocActions<S>(BlocClass)
 */
type UseBlocActionsResult<
  S,
  BlocClass extends new (...args: any[]) => StateContainer<any, any>,
> = StateOverride<InstanceType<BlocClass>, S>;

describe('useBloc type inference', () => {
  describe('without S type parameter', () => {
    it('should infer state type from bloc class', () => {
      type Result = UseBlocResult<never, typeof CounterCubit>;

      expectTypeOf<Result[0]>().toEqualTypeOf<CounterState>();
      expectTypeOf<Result[1]>().toEqualTypeOf<CounterCubit>();
    });

    it('should preserve bloc instance methods', () => {
      type Result = UseBlocResult<never, typeof CounterCubit>;
      type Bloc = Result[1];

      expectTypeOf<Bloc['increment']>().toMatchTypeOf<() => void>();
      expectTypeOf<Bloc['getLabel']>().toMatchTypeOf<() => string>();
      expectTypeOf<Bloc['emit']>().toMatchTypeOf<(state: CounterState) => void>();
    });

    it('should not infer as StateContainer<any>', () => {
      type Result = UseBlocResult<never, typeof CounterCubit>;

      // State should be CounterState, not any
      expectTypeOf<Result[0]>().toEqualTypeOf<CounterState>();
      // Bloc should be CounterCubit, not StateContainer<any>
      expectTypeOf<Result[1]>().toEqualTypeOf<CounterCubit>();
    });
  });

  describe('with S type parameter for state override', () => {
    it('should allow overriding state type with S parameter', () => {
      interface OverriddenState {
        custom: boolean;
      }

      type Result = UseBlocResult<OverriddenState, typeof GenericCubit>;

      expectTypeOf<Result[0]>().toEqualTypeOf<OverriddenState>();
    });
  });

  describe('return tuple structure', () => {
    it('should return correct UseBlocReturn type', () => {
      type Result = UseBlocResult<never, typeof CounterCubit>;

      expectTypeOf<Result>().toMatchTypeOf<UseBlocReturn<CounterCubit, never>>();
    });
  });
});

describe('useBlocActions type inference', () => {
  describe('without S type parameter', () => {
    it('should infer bloc type from class', () => {
      type Result = UseBlocActionsResult<never, typeof CounterCubit>;

      expectTypeOf<Result>().toEqualTypeOf<CounterCubit>();
    });

    it('should preserve all bloc methods', () => {
      type Result = UseBlocActionsResult<never, typeof CounterCubit>;

      expectTypeOf<Result['increment']>().toMatchTypeOf<() => void>();
      expectTypeOf<Result['getLabel']>().toMatchTypeOf<() => string>();
      expectTypeOf<Result['emit']>().toMatchTypeOf<(state: CounterState) => void>();
      expectTypeOf<Result['subscribe']>().toMatchTypeOf<
        (listener: (state: CounterState) => void) => () => void
      >();
    });

    it('should have correct state type', () => {
      type Result = UseBlocActionsResult<never, typeof CounterCubit>;

      expectTypeOf<Result['state']>().toEqualTypeOf<CounterState>();
    });

    it('should not infer as StateContainer<any>', () => {
      type Result = UseBlocActionsResult<never, typeof CounterCubit>;

      // Result should be CounterCubit, not StateContainer<any>
      expectTypeOf<Result>().toEqualTypeOf<CounterCubit>();
      // State should be CounterState, not any
      expectTypeOf<Result['state']>().toEqualTypeOf<CounterState>();
    });
  });

  describe('with S type parameter for state override', () => {
    it('should allow overriding state type with S parameter', () => {
      interface OverriddenState {
        custom: boolean;
      }

      type Result = UseBlocActionsResult<OverriddenState, typeof GenericCubit>;

      expectTypeOf<Result['state']>().toEqualTypeOf<OverriddenState>();
    });
  });
});

describe('type safety: complex scenarios', () => {
  it('should work with classes that have custom methods', () => {
    class TodoCubit extends Cubit<{ items: string[] }> {
      constructor() {
        super({ items: [] });
      }

      addItem(item: string) {
        this.emit({ items: [...this.state.items, item] });
      }

      removeItem(index: number) {
        this.emit({ items: this.state.items.filter((_, i) => i !== index) });
      }
    }

    type Result = UseBlocResult<never, typeof TodoCubit>;

    expectTypeOf<Result[0]['items']>().toEqualTypeOf<string[]>();
    expectTypeOf<Result[1]['addItem']>().toMatchTypeOf<(item: string) => void>();
    expectTypeOf<Result[1]['removeItem']>().toMatchTypeOf<(index: number) => void>();
  });

  it('should work with nested state types', () => {
    interface NestedState {
      user: {
        profile: {
          name: string;
          age: number;
        };
        settings: {
          theme: 'light' | 'dark';
        };
      };
    }

    class NestedCubit extends Cubit<NestedState> {
      constructor() {
        super({
          user: {
            profile: { name: '', age: 0 },
            settings: { theme: 'light' },
          },
        });
      }
    }

    type Result = UseBlocResult<never, typeof NestedCubit>;
    type State = Result[0];

    expectTypeOf<State['user']['profile']['name']>().toEqualTypeOf<string>();
    expectTypeOf<State['user']['profile']['age']>().toEqualTypeOf<number>();
    expectTypeOf<State['user']['settings']['theme']>().toEqualTypeOf<
      'light' | 'dark'
    >();
  });
});
