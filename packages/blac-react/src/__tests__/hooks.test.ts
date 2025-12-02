import { describe, it, expectTypeOf } from 'vitest';
import { Cubit, StateContainer } from '@blac/core';
import type { UseBlocReturn } from '../types';
import type { useBloc } from '../useBloc';
import type { useBlocActions } from '../useBlocActions';

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

type UseBlocFn = typeof useBloc;
type UseBlocActionsFn = typeof useBlocActions;

describe('useBloc type inference', () => {
  describe('without S type parameter', () => {
    it('should infer state type from bloc class', () => {
      type Result = ReturnType<UseBlocFn<never, typeof CounterCubit>>;

      expectTypeOf<Result[0]>().toEqualTypeOf<CounterState>();
      expectTypeOf<Result[1]>().toEqualTypeOf<CounterCubit>();
    });

    it('should preserve bloc instance methods', () => {
      type Result = ReturnType<UseBlocFn<never, typeof CounterCubit>>;
      type Bloc = Result[1];

      expectTypeOf<Bloc['increment']>().toBeFunction();
      expectTypeOf<Bloc['getLabel']>().toBeFunction();
      expectTypeOf<Bloc['emit']>().toBeFunction();
    });

    it('should not infer as StateContainer<any>', () => {
      type Result = ReturnType<UseBlocFn<never, typeof CounterCubit>>;

      expectTypeOf<Result[0]>().not.toBeAny();
      expectTypeOf<Result[1]>().not.toEqualTypeOf<StateContainer<any>>();
    });
  });

  describe('with S type parameter for state override', () => {
    it('should allow overriding state type with S parameter', () => {
      interface OverriddenState {
        custom: boolean;
      }

      type Result = ReturnType<UseBlocFn<OverriddenState, typeof GenericCubit>>;

      expectTypeOf<Result[0]>().toEqualTypeOf<OverriddenState>();
    });
  });

  describe('return tuple structure', () => {
    it('should return correct UseBlocReturn type', () => {
      type Result = ReturnType<UseBlocFn<never, typeof CounterCubit>>;

      expectTypeOf<Result>().toMatchTypeOf<UseBlocReturn<CounterCubit, never>>();
    });
  });
});

describe('useBlocActions type inference', () => {
  describe('without S type parameter', () => {
    it('should infer bloc type from class', () => {
      type Result = ReturnType<UseBlocActionsFn<never, typeof CounterCubit>>;

      expectTypeOf<Result>().toEqualTypeOf<CounterCubit>();
    });

    it('should preserve all bloc methods', () => {
      type Result = ReturnType<UseBlocActionsFn<never, typeof CounterCubit>>;

      expectTypeOf<Result['increment']>().toBeFunction();
      expectTypeOf<Result['getLabel']>().toBeFunction();
      expectTypeOf<Result['emit']>().toBeFunction();
      expectTypeOf<Result['subscribe']>().toBeFunction();
    });

    it('should have correct state type', () => {
      type Result = ReturnType<UseBlocActionsFn<never, typeof CounterCubit>>;

      expectTypeOf<Result['state']>().toEqualTypeOf<CounterState>();
    });

    it('should not infer as StateContainer<any>', () => {
      type Result = ReturnType<UseBlocActionsFn<never, typeof CounterCubit>>;

      expectTypeOf<Result>().not.toEqualTypeOf<StateContainer<any>>();
      expectTypeOf<Result['state']>().not.toBeAny();
    });
  });

  describe('with S type parameter for state override', () => {
    it('should allow overriding state type with S parameter', () => {
      interface OverriddenState {
        custom: boolean;
      }

      type Result = ReturnType<
        UseBlocActionsFn<OverriddenState, typeof GenericCubit>
      >;

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

    type Result = ReturnType<UseBlocFn<never, typeof TodoCubit>>;

    expectTypeOf<Result[0]['items']>().toEqualTypeOf<string[]>();
    expectTypeOf<Result[1]['addItem']>().toBeFunction();
    expectTypeOf<Result[1]['removeItem']>().toBeFunction();
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

    type Result = ReturnType<UseBlocFn<never, typeof NestedCubit>>;
    type State = Result[0];

    expectTypeOf<State['user']['profile']['name']>().toBeString();
    expectTypeOf<State['user']['profile']['age']>().toBeNumber();
    expectTypeOf<State['user']['settings']['theme']>().toEqualTypeOf<
      'light' | 'dark'
    >();
  });
});
