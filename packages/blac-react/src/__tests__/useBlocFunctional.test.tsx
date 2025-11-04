import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  renderHook,
  act,
} from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';

// Test Cubit with multiple properties
class TestCubit extends Cubit<{
  count: number;
  message: string;
  nested: { value: number; timestamp: number };
}> {
  constructor() {
    super({
      count: 0,
      message: 'hello',
      nested: { value: 10, timestamp: Date.now() },
    });
  }

  increment() {
    this.patch({ count: this.state.count + 1 });
  }

  updateMessage(msg: string) {
    this.patch({ message: msg });
  }

  updateNestedValue(value: number) {
    this.patch({
      nested: {
        ...this.state.nested,
        value,
      },
    });
  }

  updateNestedTimestamp(timestamp: number) {
    this.patch({
      nested: {
        ...this.state.nested,
        timestamp,
      },
    });
  }
}

describe('useBloc - Basic Functionality', () => {
  beforeEach(() => {
    // Reset singleton instances between tests
    (TestCubit as any).instance = null;
  });

  it('1. should return initial state and bloc instance', () => {
    const { result } = renderHook(() => useBloc(TestCubit));
    const [state, bloc] = result.current;

    expect(state.count).toBe(0);
    expect(state.message).toBe('hello');
    expect(state.nested.value).toBe(10);
    expect(bloc).toBeInstanceOf(TestCubit);
  });

  it('2. should re-render when accessed property changes', () => {
    let renderCount = 0;

    function TestComponent() {
      const [state, bloc] = useBloc(TestCubit);
      renderCount++;

      // Access only the count property
      return (
        <div>
          <span>Count: {state.count}</span>
          <button onClick={() => bloc.increment()}>Increment</button>
        </div>
      );
    }

    render(<TestComponent />);
    expect(renderCount).toBe(1);
    expect(screen.getByText('Count: 0')).toBeInTheDocument();

    // Change the accessed property
    fireEvent.click(screen.getByText('Increment'));
    expect(renderCount).toBe(2);
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });

  it('3. should NOT re-render when non-accessed property changes', () => {
    let renderCount = 0;
    let blocInstance: TestCubit = null as unknown as TestCubit;

    function TestComponent() {
      const [state, bloc] = useBloc(TestCubit);
      blocInstance = bloc;
      renderCount++;

      // Only access count, NOT message
      return (
        <div>
          <span>Count: {state.count}</span>
          <button onClick={() => bloc.updateMessage('world')}>
            Update Message
          </button>
        </div>
      );
    }

    render(<TestComponent />);
    expect(renderCount).toBe(1);

    expect(blocInstance.state.message).toBe('hello');
    // Change a non-accessed property
    fireEvent.click(screen.getByText('Update Message'));
    expect(blocInstance.state.message).toBe('world');

    // Should NOT re-render because message was never accessed
    expect(renderCount).toBe(1);
  });

  it('4. should handle multiple property access', () => {
    let renderCount = 0;

    function TestComponent() {
      const [state, bloc] = useBloc(TestCubit);
      renderCount++;

      // Access both count and message
      return (
        <div>
          <span>Count: {state.count}</span>
          <span>Message: {state.message}</span>
          <button onClick={() => bloc.updateMessage('updated')}>
            Update Message
          </button>
          <button onClick={() => bloc.increment()}>Increment</button>
          <button onClick={() => bloc.updateNestedValue(99)}>
            Update Nested
          </button>
        </div>
      );
    }

    render(<TestComponent />);
    expect(renderCount).toBe(1);

    // Update message - should re-render (message is accessed)
    fireEvent.click(screen.getByText('Update Message'));
    expect(renderCount).toBe(2);

    // Update count - should re-render (count is accessed)
    fireEvent.click(screen.getByText('Increment'));
    expect(renderCount).toBe(3);

    // Update nested - should NOT re-render (nested.value is not accessed)
    fireEvent.click(screen.getByText('Update Nested'));
    expect(renderCount).toBe(3);
  });

  it('5. should track nested property access', () => {
    let renderCount = 0;

    function TestComponent() {
      const [state, bloc] = useBloc(TestCubit);
      renderCount++;

      // Access nested property
      return (
        <div>
          <span>Nested Value: {state.nested.value}</span>
          <button onClick={() => bloc.updateNestedValue(20)}>
            Update Nested Value
          </button>
          <button onClick={() => bloc.updateNestedTimestamp(Date.now())}>
            Update Nested Timestamp
          </button>
          <button onClick={() => bloc.updateMessage('ignored')}>
            Update Message
          </button>
        </div>
      );
    }

    render(<TestComponent />);
    expect(renderCount).toBe(1);
    expect(screen.getByText('Nested Value: 10')).toBeInTheDocument();

    // Update nested property - should re-render
    fireEvent.click(screen.getByText('Update Nested Value'));
    expect(renderCount).toBe(2);
    expect(screen.getByText('Nested Value: 20')).toBeInTheDocument();

    // Update unrelated nested property - should NOT re-render
    // Note: Fine-grained tracking only tracks 'nested.value', not the parent 'nested' path
    // When nested.timestamp changes, the nested object changes but nested.value stays the same
    fireEvent.click(screen.getByText('Update Nested Timestamp'));
    expect(renderCount).toBe(2);
    expect(screen.getByText('Nested Value: 20')).toBeInTheDocument();

    // Update unrelated property - should NOT re-render
    fireEvent.click(screen.getByText('Update Message'));
    expect(renderCount).toBe(2);
  });
});
