import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Bloc, Blac } from '@blac/core';
import useBlocEvents from '../useBlocEvents';

// Test events
abstract class CounterEvent {}
class IncrementEvent extends CounterEvent {
  constructor(public amount: number = 1) {
    super();
  }
}
class DecrementEvent extends CounterEvent {}
class ResetEvent extends CounterEvent {}

// Test Bloc
class CounterBloc extends Bloc<number, CounterEvent> {
  constructor() {
    super(0);
    
    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });
    
    this.on(DecrementEvent, (event, emit) => {
      emit(this.state - 1);
    });
    
    this.on(ResetEvent, (event, emit) => {
      emit(0);
    });
  }
}

describe('useBlocEvents', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  describe('basic functionality', () => {
    it('should listen to all events by default', async () => {
      const events: CounterEvent[] = [];
      
      const { result } = renderHook(() => 
        useBlocEvents(CounterBloc, {
          onEvent: (event) => {
            events.push(event);
          },
        })
      );
      
      act(() => {
        result.current.bloc.add(new IncrementEvent());
        result.current.bloc.add(new DecrementEvent());
        result.current.bloc.add(new ResetEvent());
      });
      
      await waitFor(() => expect(events).toHaveLength(3));
      
      expect(events[0]).toBeInstanceOf(IncrementEvent);
      expect(events[1]).toBeInstanceOf(DecrementEvent);
      expect(events[2]).toBeInstanceOf(ResetEvent);
    });

    it('should filter events by type', async () => {
      const incrementEvents: IncrementEvent[] = [];
      
      const { result } = renderHook(() => 
        useBlocEvents(CounterBloc, {
          eventType: IncrementEvent,
          onEvent: (event) => {
            incrementEvents.push(event);
          },
        })
      );
      
      act(() => {
        result.current.bloc.add(new IncrementEvent(5));
        result.current.bloc.add(new DecrementEvent());
        result.current.bloc.add(new IncrementEvent(10));
        result.current.bloc.add(new ResetEvent());
      });
      
      await waitFor(() => expect(incrementEvents).toHaveLength(2));
      
      expect(incrementEvents[0].amount).toBe(5);
      expect(incrementEvents[1].amount).toBe(10);
    });
  });

  describe('lifecycle management', () => {
    it('should start listening automatically by default', async () => {
      const onEvent = vi.fn();
      
      const { result } = renderHook(() => 
        useBlocEvents(CounterBloc, { onEvent })
      );
      
      act(() => {
        result.current.bloc.add(new IncrementEvent());
      });
      
      await waitFor(() => {
        expect(onEvent).toHaveBeenCalled();
      });
    });

    it('should not start automatically when autoStart is false', async () => {
      const onEvent = vi.fn();
      
      const { result } = renderHook(() => 
        useBlocEvents(CounterBloc, {
          onEvent,
          autoStart: false,
        })
      );
      
      act(() => {
        result.current.bloc.add(new IncrementEvent());
      });
      
      // Wait a bit to ensure no event is processed
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(onEvent).not.toHaveBeenCalled();
      
      act(() => {
        result.current.startListening();
      });
      
      act(() => {
        result.current.bloc.add(new IncrementEvent());
      });
      
      await waitFor(() => {
        expect(onEvent).toHaveBeenCalled();
      });
    });

    it('should stop listening when requested', async () => {
      const onEvent = vi.fn();
      
      const { result } = renderHook(() => 
        useBlocEvents(CounterBloc, { onEvent })
      );
      
      act(() => {
        result.current.bloc.add(new IncrementEvent());
      });
      
      await waitFor(() => expect(onEvent).toHaveBeenCalledTimes(1));
      
      act(() => {
        result.current.stopListening();
      });
      
      act(() => {
        result.current.bloc.add(new IncrementEvent());
      });
      
      // Should still be 1 since we stopped listening
      expect(onEvent).toHaveBeenCalledTimes(1);
    });

    it('should clean up on unmount', async () => {
      const onEvent = vi.fn();
      
      const { result, unmount } = renderHook(() => 
        useBlocEvents(CounterBloc, { onEvent })
      );
      
      unmount();
      
      act(() => {
        result.current.bloc.add(new IncrementEvent());
      });
      
      // Should not be called after unmount
      expect(onEvent).not.toHaveBeenCalled();
    });
  });

  describe('async event handlers', () => {
    it('should handle async onEvent callbacks', async () => {
      const processedEvents: CounterEvent[] = [];
      
      const { result } = renderHook(() => 
        useBlocEvents(CounterBloc, {
          onEvent: async (event) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            processedEvents.push(event);
          },
        })
      );
      
      act(() => {
        result.current.bloc.add(new IncrementEvent());
        result.current.bloc.add(new DecrementEvent());
      });
      
      await waitFor(() => expect(processedEvents).toHaveLength(2));
      
      expect(processedEvents[0]).toBeInstanceOf(IncrementEvent);
      expect(processedEvents[1]).toBeInstanceOf(DecrementEvent);
    });

    it('should handle errors in event handlers', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const successfulEvents: CounterEvent[] = [];
      
      const { result } = renderHook(() => 
        useBlocEvents(CounterBloc, {
          onEvent: (event) => {
            if (event instanceof IncrementEvent) {
              throw new Error('Handler error');
            }
            successfulEvents.push(event);
          },
        })
      );
      
      act(() => {
        result.current.bloc.add(new IncrementEvent());
        result.current.bloc.add(new DecrementEvent());
      });
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Error in event handler:', expect.any(Error));
        expect(successfulEvents).toHaveLength(1);
      });
      
      expect(successfulEvents[0]).toBeInstanceOf(DecrementEvent);
      
      consoleError.mockRestore();
    });
  });

  describe('multiple listeners', () => {
    it('should support multiple hooks listening to the same bloc', async () => {
      const listener1Events: CounterEvent[] = [];
      const listener2Events: IncrementEvent[] = [];
      
      const { result: result1 } = renderHook(() => 
        useBlocEvents(CounterBloc, {
          onEvent: (event) => { listener1Events.push(event); },
        })
      );
      
      const { result: result2 } = renderHook(() => 
        useBlocEvents(CounterBloc, {
          eventType: IncrementEvent,
          onEvent: (event) => { listener2Events.push(event); },
        })
      );
      
      // Both should reference the same bloc instance by ID
      expect(result1.current.bloc._id).toBe(result2.current.bloc._id);
      
      act(() => {
        result1.current.bloc.add(new IncrementEvent(5));
        result1.current.bloc.add(new DecrementEvent());
      });
      
      await waitFor(() => {
        expect(listener1Events).toHaveLength(2);
        expect(listener2Events).toHaveLength(1);
      });
      
      expect(listener2Events[0].amount).toBe(5);
    });
  });

  describe('useBloc options integration', () => {
    it('should support all useBloc options', () => {
      const onMount = vi.fn();
      const onUnmount = vi.fn();
      
      const { unmount } = renderHook(() => 
        useBlocEvents(CounterBloc, {
          instanceId: 'test-counter',
          onMount,
          onUnmount,
          onEvent: () => {},
        })
      );
      
      expect(onMount).toHaveBeenCalled();
      
      unmount();
      
      expect(onUnmount).toHaveBeenCalled();
    });
  });
});