import { describe, expect, test, vitest } from 'vitest';
import { CounterActions, CounterBloc, CounterCubit, globalBlacInstance } from '.';

describe('Global Blac', () => {
  test('should be registered in blac', () => {
    const counter = new CounterBloc({ blac: globalBlacInstance });
    expect(globalBlacInstance.globalState[counter.name]).toBe(counter.state);
  });

})

describe('CounterBloc', () => {
  test('should have a state', () => {
    const counter = new CounterBloc();
    expect(counter.state).toBe(0)
  })

  test('should increment', () => {
    const counter = new CounterBloc();
    counter.emit(CounterActions.increment)
    expect(counter.state).toBe(1)
  });

  test('should decrement', () => {
    const counter = new CounterBloc();
    counter.emit(CounterActions.decrement)
    expect(counter.state).toBe(-1)
  });

  test('should throw error if unknown action is passed', () => {
    const counter = new CounterBloc();
    expect(() => counter.emit('unknown' as any)).toThrowError('unknown action')
  })

  describe('observable', () => {
    test('should notify subscribers', () => {
      const counter = new CounterBloc();
      const spy = vitest.fn();
      counter.onStateChange(spy);
      counter.emit(CounterActions.increment);
      expect(spy).toHaveBeenCalledWith(1, 0);
    })

    test('should notify all subscribers', () => {
      const counter = new CounterBloc();
      const spy1 = vitest.fn();
      const spy2 = vitest.fn();
      counter.onStateChange(spy1);
      counter.onStateChange(spy2);
      counter.emit(CounterActions.increment);
      expect(spy1).toHaveBeenCalledWith(1, 0);
      expect(spy2).toHaveBeenCalledWith(1, 0);
    })

    test('should not notify after unsubscribing', () => {
      const counter = new CounterBloc();
      const spy = vitest.fn();
      const unsubscribe = counter.onStateChange(spy);
      unsubscribe();
      counter.emit(CounterActions.increment);
      expect(spy).not.toHaveBeenCalled();
    })
  })
})

describe('CounterCubit', () => {
  test('should have a state', () => {
    const counter = new CounterCubit();
    expect(counter.state).toBe(0)
  })

  test('should update state', () => {
    const counter = new CounterCubit();
    counter.emit(1)
    expect(counter.state).toBe(1)
  });

  test('should increment with method', () => {
    const counter = new CounterCubit();
    counter.increment()
    expect(counter.state).toBe(1)
  });

  describe('observable', () => {
    test('should notify subscribers', () => {
      const counter = new CounterCubit();
      const spy = vitest.fn();
      counter.onStateChange(spy);
      counter.emit(1);
      expect(spy).toHaveBeenCalledWith(1, 0);
    })

    test('should notify all subscribers', () => {
      const counter = new CounterCubit();
      const spy1 = vitest.fn();
      const spy2 = vitest.fn();
      counter.onStateChange(spy1);
      counter.onStateChange(spy2);
      counter.emit(1);
      expect(spy1).toHaveBeenCalledWith(1, 0);
      expect(spy2).toHaveBeenCalledWith(1, 0);
    })

    test('should not notify subscribers if state is not changed', () => {
      const counter = new CounterCubit();
      const spy = vitest.fn();
      counter.onStateChange(spy);
      counter.emit(0);
      expect(spy).not.toHaveBeenCalled();
      counter.emit(0);
      expect(spy).not.toHaveBeenCalled();
    })
  
    test('should not notify after unsubscribing', () => {
      const counter = new CounterCubit();
      const spy = vitest.fn();
      const unsubscribe = counter.onStateChange(spy);
      unsubscribe();
      counter.emit(1);
      expect(spy).not.toHaveBeenCalled();
    })
  })
})


