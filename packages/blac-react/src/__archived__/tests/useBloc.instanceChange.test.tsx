import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { BlocConstructorParams, Cubit, Blac } from '@blac/core';
import useBloc from '../useBloc';

interface CounterProps {
  initialValue: number;
  step?: number;
}

class CounterCubit extends Cubit<number> {
  props: BlocConstructorParams<typeof CounterCubit>;

  constructor(props?: CounterProps) {
    super(props?.initialValue ?? 0);
    this.props = props;
  }

  increment = () => {
    const step = this.props?.step ?? 1;
    this.emit(this.state + step);
  };
}

describe('useBloc instance changes', () => {
  afterEach(() => {
    Blac.resetInstance();
  });

  describe('when instanceId changes', () => {
    it('should use a different bloc instance', async () => {
      const { result, rerender } = renderHook(
        ({ instanceId }) =>
          useBloc(CounterCubit, {
            instanceId,
            staticProps: { initialValue: 0 },
          }),
        { initialProps: { instanceId: 'counter-1' } },
      );

      // Wait for initial render
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const firstInstance = result.current[1];
      expect(firstInstance._id).toBe('counter-1');
      expect(firstInstance.props).toEqual({ initialValue: 0 });

      // Change instanceId
      rerender({ instanceId: 'counter-2' });

      const secondInstance = result.current[1];
      expect(secondInstance._id).toBe('counter-2');
      expect(secondInstance).not.toBe(firstInstance);
      expect(result.current[0]).toBe(0); // New instance starts at 0
    });
  });

  describe('when staticProps change', () => {
    it('should use a different bloc instance when staticProps change', async () => {
      const { result, rerender } = renderHook(
        ({ initialValue }) =>
          useBloc(CounterCubit, {
            staticProps: { initialValue },
          }),
        { initialProps: { initialValue: 10 } },
      );

      // Wait for initial render
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const firstInstance = result.current[1];
      expect(result.current[0]).toBe(10);
      expect(firstInstance._id).toBe('initialValue:10');

      // Change staticProps
      rerender({ initialValue: 20 });

      const secondInstance = result.current[1];
      expect(secondInstance).not.toBe(firstInstance);
      expect(result.current[0]).toBe(20); // New instance with new initial value
      expect(secondInstance._id).toBe('initialValue:20');
    });

    it('should use same instance when non-primitive staticProps values change', () => {
      const { result, rerender } = renderHook(
        ({ config }) =>
          useBloc(CounterCubit, {
            staticProps: {
              initialValue: 5,
              config, // This will be ignored for instance ID
            } as any,
          }),
        { initialProps: { config: { debug: true } } },
      );

      const firstInstance = result.current[1];
      expect(firstInstance._id).toBe('initialValue:5');

      // Change non-primitive prop
      rerender({ config: { debug: false } });

      const secondInstance = result.current[1];
      expect(secondInstance).toBe(firstInstance); // Same instance
      expect(secondInstance._id).toBe('initialValue:5');
    });

    it('should change instance when primitive staticProps change', () => {
      const { result, rerender } = renderHook(
        ({ step }) =>
          useBloc(CounterCubit, {
            staticProps: { initialValue: 0, step },
          }),
        { initialProps: { step: 1 } },
      );

      const firstInstance = result.current[1];
      expect(firstInstance._id).toBe('initialValue:0|step:1');

      // Change primitive prop
      rerender({ step: 2 });

      const secondInstance = result.current[1];
      expect(secondInstance).not.toBe(firstInstance); // Different instance
      expect(secondInstance._id).toBe('initialValue:0|step:2');
    });
  });

  describe('when using both instanceId and staticProps', () => {
    it('should use explicit instanceId over generated one', () => {
      const { result } = renderHook(() =>
        useBloc(CounterCubit, {
          instanceId: 'my-counter',
          staticProps: { initialValue: 100 },
        }),
      );

      expect(result.current[1]._id).toBe('my-counter');
      expect(result.current[0]).toBe(100);
    });

    it('should change instance when instanceId changes even if staticProps are same', () => {
      const { result, rerender } = renderHook(
        ({ instanceId }) =>
          useBloc(CounterCubit, {
            instanceId,
            staticProps: { initialValue: 50 },
          }),
        { initialProps: { instanceId: 'counter-a' } },
      );

      const firstInstance = result.current[1];

      // Change instanceId
      rerender({ instanceId: 'counter-b' });

      const secondInstance = result.current[1];
      expect(secondInstance).not.toBe(firstInstance);
      expect(secondInstance._id).toBe('counter-b');
      expect(result.current[0]).toBe(50); // Same initial value, different instance
    });
  });

  describe('lifecycle hooks', () => {
    it('should call onMount/onUnmount when instance changes', () => {
      const onMount1 = vi.fn();
      const onUnmount1 = vi.fn();
      const onMount2 = vi.fn();
      const onUnmount2 = vi.fn();

      const { rerender, unmount } = renderHook(
        ({ instanceId, onMount, onUnmount }) =>
          useBloc(CounterCubit, { instanceId, onMount, onUnmount }),
        {
          initialProps: {
            instanceId: 'counter-1',
            onMount: onMount1,
            onUnmount: onUnmount1,
          },
        },
      );

      expect(onMount1).toHaveBeenCalledTimes(1);
      expect(onUnmount1).not.toHaveBeenCalled();

      // Change instance
      rerender({
        instanceId: 'counter-2',
        onMount: onMount2,
        onUnmount: onUnmount2,
      });

      expect(onUnmount1).toHaveBeenCalledTimes(1);
      expect(onMount2).toHaveBeenCalledTimes(1);
      expect(onUnmount2).not.toHaveBeenCalled();

      unmount();
      expect(onUnmount2).toHaveBeenCalledTimes(1);
    });
  });
});
