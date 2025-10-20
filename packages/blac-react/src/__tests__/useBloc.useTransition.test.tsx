import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Cubit, Vertex, Blac } from '@blac/core';
import { useTransition, startTransition } from 'react';
import useBloc from '../useBloc';
import { waitForTransition, flushMicrotasks } from './utils/react18-helpers';

// Test Cubit for simple state
class CounterCubit extends Cubit<number> {
  static isolated = true;

  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  incrementBy = (amount: number) => {
    this.emit(this.state + amount);
  };

  reset = () => {
    this.emit(0);
  };
}

// Complex state for testing heavy operations
interface ComplexState {
  items: Array<{ id: number; name: string; processed: boolean }>;
  isProcessing: boolean;
}

class ComplexCubit extends Cubit<ComplexState> {
  static isolated = true;

  constructor() {
    super({
      items: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        processed: false,
      })),
      isProcessing: false,
    });
  }

  processItems = () => {
    // Simulate heavy computation
    this.emit({ ...this.state, isProcessing: true });

    const processedItems = this.state.items.map(item => ({
      ...item,
      processed: true,
    }));

    this.emit({
      items: processedItems,
      isProcessing: false,
    });
  };

  addItems = (count: number) => {
    const currentLength = this.state.items.length;
    const newItems = Array.from({ length: count }, (_, i) => ({
      id: currentLength + i,
      name: `Item ${currentLength + i}`,
      processed: false,
    }));

    this.emit({
      ...this.state,
      items: [...this.state.items, ...newItems],
    });
  };
}

describe('useBloc with useTransition', () => {
  afterEach(() => {
    Blac.resetInstance();
  });

  it('should handle state updates within transition', async () => {
    const { result } = renderHook(() => {
      const [isPending, startTransition] = useTransition();
      const [state, cubit] = useBloc(CounterCubit);

      return { isPending, startTransition, state, cubit };
    });

    expect(result.current.state).toBe(0);
    expect(result.current.isPending).toBe(false);

    // Update state within transition
    await act(async () => {
      result.current.startTransition(() => {
        result.current.cubit.increment();
      });
    });

    // State should be updated after transition
    await waitFor(() => {
      expect(result.current.state).toBe(1);
    });
  });

  it('should maintain reactivity during transitions', async () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      const [isPending, startTransition] = useTransition();
      const [state, cubit] = useBloc(CounterCubit);
      renderCount++;

      return { isPending, startTransition, state, cubit, renderCount };
    });

    expect(renderCount).toBe(1);
    expect(result.current.state).toBe(0);

    // Update within transition
    await waitForTransition(() => {
      result.current.cubit.increment();
    });

    // Should trigger re-render with new state
    await waitFor(() => {
      expect(result.current.state).toBe(1);
      expect(renderCount).toBeGreaterThan(1);
    });

    // Non-transition update should also work
    act(() => {
      result.current.cubit.increment();
    });

    expect(result.current.state).toBe(2);
    expect(renderCount).toBeGreaterThan(2);
  });

  it('should handle multiple concurrent transitions', async () => {
    const { result } = renderHook(() => {
      const [isPending, startTransition] = useTransition();
      const [state, cubit] = useBloc(CounterCubit);

      return { isPending, startTransition, state, cubit };
    });

    expect(result.current.state).toBe(0);

    // Start multiple transitions
    const promises = [];

    act(() => {
      // First transition
      result.current.startTransition(() => {
        result.current.cubit.incrementBy(1);
      });

      // Second transition
      result.current.startTransition(() => {
        result.current.cubit.incrementBy(2);
      });

      // Third transition
      result.current.startTransition(() => {
        result.current.cubit.incrementBy(3);
      });
    });

    // Wait for all transitions to complete
    await flushMicrotasks();

    // Final state should reflect all updates
    await waitFor(() => {
      expect(result.current.state).toBe(6); // 0 + 1 + 2 + 3
    });
  });

  it('should handle transition interruption', async () => {
    const { result } = renderHook(() => {
      const [isPending, startTransition] = useTransition();
      const [state, cubit] = useBloc(ComplexCubit);

      return { isPending, startTransition, state, cubit };
    });

    const initialItemCount = result.current.state.items.length;

    // Start a transition that adds items
    act(() => {
      result.current.startTransition(() => {
        result.current.cubit.addItems(50);
      });
    });

    // Interrupt with an urgent update
    act(() => {
      result.current.cubit.processItems();
    });

    // Wait for updates to settle
    await flushMicrotasks();

    // Verify state consistency
    await waitFor(() => {
      // The urgent update (processItems) should take precedence
      expect(result.current.state.isProcessing).toBe(false);
      // Items should be processed
      expect(result.current.state.items.every(item => item.processed)).toBe(true);
    });
  });

  it('should show pending state during bloc operations', async () => {
    const { result } = renderHook(() => {
      const [isPending, startTransition] = useTransition();
      const [state, cubit] = useBloc(ComplexCubit);

      return { isPending, startTransition, state, cubit };
    });

    expect(result.current.isPending).toBe(false);

    // Track pending state changes
    const pendingStates: boolean[] = [];

    act(() => {
      result.current.startTransition(() => {
        pendingStates.push(result.current.isPending);
        result.current.cubit.processItems();
      });
    });

    // Should have been pending during transition
    await waitFor(() => {
      expect(pendingStates.length).toBeGreaterThan(0);
    });

    // Should not be pending after completion
    await flushMicrotasks();
    expect(result.current.isPending).toBe(false);
  });

  it('should work with event-driven Bloc pattern in transitions', async () => {
    // Define events
    class IncrementEvent {
      constructor(public readonly amount: number = 1) {}
    }

    class DecrementEvent {
      constructor(public readonly amount: number = 1) {}
    }

    type CounterEvent = IncrementEvent | DecrementEvent;

    class CounterBloc extends Vertex<number, CounterEvent> {
      static isolated = true;

      constructor() {
        super(0);

        this.on(IncrementEvent, (event, emit) => {
          emit(this.state + event.amount);
        });

        this.on(DecrementEvent, (event, emit) => {
          emit(this.state - event.amount);
        });
      }

      increment = (amount = 1) => {
        this.add(new IncrementEvent(amount));
      };

      decrement = (amount = 1) => {
        this.add(new DecrementEvent(amount));
      };
    }

    const { result } = renderHook(() => {
      const [isPending, startTransition] = useTransition();
      const [state, bloc] = useBloc(CounterBloc);

      return { isPending, startTransition, state, bloc };
    });

    expect(result.current.state).toBe(0);

    // Use Bloc events within transitions
    await act(async () => {
      result.current.startTransition(() => {
        result.current.bloc.increment(5);
      });
    });

    await waitFor(() => {
      expect(result.current.state).toBe(5);
    });

    // Multiple events in a transition
    await act(async () => {
      result.current.startTransition(() => {
        result.current.bloc.increment(3);
        result.current.bloc.decrement(1);
      });
    });

    await waitFor(() => {
      expect(result.current.state).toBe(7); // 5 + 3 - 1
    });
  });
});