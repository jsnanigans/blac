import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Cubit, Bloc, Blac } from '@blac/core';
import useBlocStream from '../useBlocStream';
import useBloc from '../useBloc';

// Test Cubit
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
  setValue = (value: number) => this.emit(value);
}

// Test Bloc with events
abstract class TestEvent {}
class IncrementEvent extends TestEvent {}
class DecrementEvent extends TestEvent {}
class SetValueEvent extends TestEvent {
  constructor(public value: number) {
    super();
  }
}

class CounterBloc extends Bloc<number, TestEvent> {
  constructor() {
    super(0);
    
    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + 1);
    });
    
    this.on(DecrementEvent, (event, emit) => {
      emit(this.state - 1);
    });
    
    this.on(SetValueEvent, (event, emit) => {
      emit(event.value);
    });
  }
}

describe('useBlocStream', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  describe('backward compatibility', () => {
    it('should work exactly like useBloc when used traditionally', async () => {
      const { result, rerender } = renderHook(() => useBlocStream(CounterCubit));
      
      expect(result.current.state).toBe(0);
      expect(result.current.bloc).toBeInstanceOf(CounterCubit);
      
      await act(async () => {
        result.current.bloc.increment();
      });
      
      // Check bloc state directly
      expect(result.current.bloc.state).toBe(1);
      
      // Force re-render
      rerender();
      
      // Hook state should also be updated
      expect(result.current.state).toBe(1);
    });

    it('should support all useBloc options', () => {
      const onMount = vi.fn();
      const onUnmount = vi.fn();
      
      const { result, unmount } = renderHook(() => 
        useBlocStream(CounterCubit, {
          instanceId: 'test-counter',
          onMount,
          onUnmount,
        })
      );
      
      expect(onMount).toHaveBeenCalledWith(result.current.bloc);
      
      unmount();
      
      expect(onUnmount).toHaveBeenCalledWith(result.current.bloc);
    });
  });

  describe('stream functionality', () => {
    it('should provide an async iterable stream', async () => {
      const { result } = renderHook(() => useBlocStream(CounterCubit));
      
      const states: number[] = [];
      const collectStates = async () => {
        let count = 0;
        for await (const state of result.current.stream) {
          states.push(state);
          count++;
          if (count >= 3) break;
        }
      };
      
      const promise = collectStates();
      
      // Wait a bit for the stream to start
      await waitFor(() => expect(states.length).toBeGreaterThan(0));
      
      act(() => {
        result.current.bloc.increment();
      });
      
      act(() => {
        result.current.bloc.increment();
      });
      
      await promise;
      
      expect(states).toEqual([0, 1, 2]);
    });

    it('should provide stateChanges stream', async () => {
      const { result } = renderHook(() => useBlocStream(CounterCubit));
      
      const changes: Array<{ previous: number; current: number }> = [];
      const collectChanges = async () => {
        let count = 0;
        for await (const change of result.current.stateChanges) {
          changes.push(change);
          count++;
          if (count >= 2) break;
        }
      };
      
      const promise = collectChanges();
      
      // Give the stream time to set up
      await new Promise(resolve => setTimeout(resolve, 10));
      
      act(() => {
        result.current.bloc.increment();
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      act(() => {
        result.current.bloc.setValue(10);
      });
      
      await promise;
      
      expect(changes).toEqual([
        { previous: 0, current: 1 },
        { previous: 1, current: 10 },
      ]);
    });

    it('should support takeNext utility', async () => {
      const { result } = renderHook(() => useBlocStream(CounterCubit));
      
      act(() => {
        result.current.bloc.setValue(42);
      });
      
      const nextState = await result.current.takeNext();
      expect(nextState).toBe(42);
    });
  });

  describe('stream control', () => {
    it('should start and stop streaming on demand', async () => {
      const { result } = renderHook(() => 
        useBlocStream(CounterCubit, { streamMode: 'disabled' })
      );
      
      expect(result.current.isStreaming).toBe(false);
      
      act(() => {
        result.current.startStream();
      });
      
      await waitFor(() => {
        expect(result.current.isStreaming).toBe(true);
      });
      
      act(() => {
        result.current.stopStream();
      });
      
      await waitFor(() => {
        expect(result.current.isStreaming).toBe(false);
      });
    });

    it('should auto-start stream when streamMode is set', async () => {
      const { result } = renderHook(() => 
        useBlocStream(CounterCubit, { streamMode: 'state' })
      );
      
      await waitFor(() => {
        expect(result.current.isStreaming).toBe(true);
      });
    });

    it('should clean up streams on unmount', async () => {
      const { result, unmount } = renderHook(() => useBlocStream(CounterCubit));
      
      const iterator = result.current.stream[Symbol.asyncIterator]();
      const nextPromise = iterator.next();
      
      unmount();
      
      // Stream should complete after unmount
      await expect(iterator.return?.()).resolves.toEqual({ done: true, value: undefined });
    });
  });

  describe('with Bloc events', () => {
    it('should work with event-driven Blocs', async () => {
      const { result, rerender } = renderHook(() => useBlocStream(CounterBloc));
      
      expect(result.current.state).toBe(0);
      
      await act(async () => {
        result.current.bloc.add(new IncrementEvent());
        // Wait a bit for event processing
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      rerender();
      expect(result.current.state).toBe(1);
      
      await act(async () => {
        result.current.bloc.add(new SetValueEvent(100));
        // Wait a bit for event processing
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      rerender();
      expect(result.current.state).toBe(100);
    });
  });

  describe('error handling', () => {
    it('should handle stream errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      class ErrorCubit extends Cubit<number> {
        constructor() {
          super(0);
        }
        
        async *stateStream() {
          yield this.state;
          throw new Error('Stream error');
        }
      }
      
      const { result } = renderHook(() => 
        useBlocStream(ErrorCubit, { streamMode: 'state' })
      );
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Stream error:', expect.any(Error));
      });
      
      consoleError.mockRestore();
    });
  });

  describe('memory management', () => {
    it('should not leak memory with multiple stream iterations', async () => {
      const { result } = renderHook(() => useBlocStream(CounterCubit));
      
      // Start multiple iterations
      const iterations = Array.from({ length: 5 }, async () => {
        const iterator = result.current.stream[Symbol.asyncIterator]();
        const { value } = await iterator.next();
        await iterator.return?.();
        return value;
      });
      
      const results = await Promise.all(iterations);
      
      // All should get the same initial state
      expect(results).toEqual([0, 0, 0, 0, 0]);
    });
  });
});