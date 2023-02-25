import { describe, expect, it, vitest } from "vitest";
import { CounterAction, CounterBloc } from "./examples/CounterBloc";

describe('CounterBloc', () => {
  it('should have a state', () => {
    const counter = new CounterBloc();
    expect(counter.state).toBe(0);
  });

  it('should increment', () => {
    const counter = new CounterBloc();
    counter.emit(CounterAction.increment);
    expect(counter.state).toBe(1);
  });

  it('should decrement', () => {
    const counter = new CounterBloc();
    counter.emit(CounterAction.decrement);
    expect(counter.state).toBe(-1);
  });

  it('should throw error if unknown action is passed', () => {
    const counter = new CounterBloc();
    expect(() => counter.emit('unknown' as any)).toThrowError('unknown action');
  });

  describe('observable', () => {
    it('should notify subscribers', () => {
      const counter = new CounterBloc();
      const spy = vitest.fn();
      counter.onStateChange(spy);
      counter.emit(CounterAction.increment);
      expect(spy).toHaveBeenCalledWith(1, 0);
    });

    it('should notify all subscribers', () => {
      const counter = new CounterBloc();
      const spy1 = vitest.fn();
      const spy2 = vitest.fn();
      counter.onStateChange(spy1);
      counter.onStateChange(spy2);
      counter.emit(CounterAction.increment);
      expect(spy1).toHaveBeenCalledWith(1, 0);
      expect(spy2).toHaveBeenCalledWith(1, 0);
    });

    it('should not notify after unsubscribing', () => {
      const counter = new CounterBloc();
      const spy = vitest.fn();
      const unsubscribe = counter.onStateChange(spy);
      unsubscribe();
      counter.emit(CounterAction.increment);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
