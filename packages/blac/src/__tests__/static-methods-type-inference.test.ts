import { describe, it, expectTypeOf, beforeEach } from 'vitest';
import { Cubit, StateContainer } from '../index';

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

describe('StateContainer static methods type inference', () => {
  beforeEach(() => {
    StateContainer.clearAllInstances();
  });
  describe('resolve', () => {
    it('should infer T from the class (not default to StateContainer<any>)', () => {
      const instance = CounterCubit.resolve();

      expectTypeOf(instance).toEqualTypeOf<CounterCubit>();
      expectTypeOf(instance.state).toEqualTypeOf<CounterState>();
      expectTypeOf(instance.increment).toBeFunction();
    });

    it('should allow S type parameter to override state type', () => {
      interface OverriddenState {
        custom: boolean;
      }

      const instance = GenericCubit.resolve<OverriddenState>();

      expectTypeOf(instance.state).toEqualTypeOf<OverriddenState>();
    });

    it('should preserve all instance methods when T is inferred', () => {
      const instance = CounterCubit.resolve('test-key');

      expectTypeOf(instance.increment).toBeFunction();
      expectTypeOf(instance.emit).toBeFunction();
      expectTypeOf(instance.subscribe).toBeFunction();
    });
  });

  describe('get', () => {
    it('should infer T from the class (not default to StateContainer<any>)', () => {
      CounterCubit.resolve();
      const instance = CounterCubit.get();

      expectTypeOf(instance).toEqualTypeOf<CounterCubit>();
      expectTypeOf(instance.state).toEqualTypeOf<CounterState>();
      expectTypeOf(instance.increment).toBeFunction();
    });

    it('should allow S type parameter to override state type', () => {
      interface OverriddenState {
        custom: boolean;
      }

      GenericCubit.resolve('test');
      const instance = GenericCubit.get<OverriddenState>('test');

      expectTypeOf(instance.state).toEqualTypeOf<OverriddenState>();
    });
  });

  describe('getSafe', () => {
    it('should infer T from the class in success case', () => {
      CounterCubit.resolve();
      const result = CounterCubit.getSafe();

      if (result.error === null) {
        expectTypeOf(result.instance).toEqualTypeOf<CounterCubit>();
        expectTypeOf(result.instance.state).toEqualTypeOf<CounterState>();
        expectTypeOf(result.instance.increment).toBeFunction();
      }
    });

    it('should allow S type parameter to override state type in success case', () => {
      interface OverriddenState {
        custom: boolean;
      }

      GenericCubit.resolve('test');
      const result = GenericCubit.getSafe<OverriddenState>('test');

      if (result.error === null) {
        expectTypeOf(result.instance.state).toEqualTypeOf<OverriddenState>();
      }
    });

    it('should have correct discriminated union type', () => {
      const result = CounterCubit.getSafe();

      expectTypeOf(result).toEqualTypeOf<
        { error: Error; instance: null } | { error: null; instance: CounterCubit }
      >();
    });
  });

  describe('connect', () => {
    it('should infer T from the class (not default to StateContainer<any>)', () => {
      const instance = CounterCubit.connect();

      expectTypeOf(instance).toEqualTypeOf<CounterCubit>();
      expectTypeOf(instance.state).toEqualTypeOf<CounterState>();
      expectTypeOf(instance.increment).toBeFunction();
    });

    it('should allow S type parameter to override state type', () => {
      interface OverriddenState {
        custom: boolean;
      }

      const instance = GenericCubit.connect<OverriddenState>();

      expectTypeOf(instance.state).toEqualTypeOf<OverriddenState>();
    });
  });

  describe('type safety: should NOT compile with wrong types', () => {
    it('inferred instance should not be assignable to StateContainer<any>', () => {
      const instance = CounterCubit.resolve();

      expectTypeOf(instance).not.toEqualTypeOf<StateContainer<any>>();
    });

    it('state should not be any', () => {
      const instance = CounterCubit.resolve();

      expectTypeOf(instance.state).not.toBeAny();
    });
  });
});
