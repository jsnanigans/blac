import { describe, expect, it, vitest } from "vitest";
import { CounterCubit } from "./examples/CounterCubit";

describe('CounterCubit', () => {
  it('should have a state', () => {
    const counter = new CounterCubit();
    expect(counter.state).toBe(0);
  });

  it('should update state', () => {
    const counter = new CounterCubit();
    counter.emit(1);
    expect(counter.state).toBe(1);
  });

  it('should increment with method', () => {
    const counter = new CounterCubit();
    counter.increment();
    expect(counter.state).toBe(1);
  });

  describe('observable', () => {
    it('should notify subscribers', () => {
      const counter = new CounterCubit();
      const spy = vitest.fn();
      counter.onStateChange(spy);
      counter.emit(1);
      expect(spy).toHaveBeenCalledWith(1, 0);
    });

    it('should notify all subscribers', () => {
      const counter = new CounterCubit();
      const spy1 = vitest.fn();
      const spy2 = vitest.fn();
      counter.onStateChange(spy1);
      counter.onStateChange(spy2);
      counter.emit(1);
      expect(spy1).toHaveBeenCalledWith(1, 0);
      expect(spy2).toHaveBeenCalledWith(1, 0);
    });

    it('should not notify subscribers if state is not changed', () => {
      const counter = new CounterCubit();
      const spy = vitest.fn();
      counter.onStateChange(spy);
      counter.emit(0);
      expect(spy).not.toHaveBeenCalled();
      counter.emit(0);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not notify after unsubscribing', () => {
      const counter = new CounterCubit();
      const spy = vitest.fn();
      const unsubscribe = counter.onStateChange(spy);
      unsubscribe();
      counter.emit(1);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
