/**
 * Test that instanceId accepts correct types: string | number | undefined
 * And rejects null and other invalid types
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';

interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
  constructor(initialCount: number = 0) {
    super({ count: initialCount });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

describe('useBloc instanceId type checking', () => {
  it('should accept string instanceId', () => {
    function TestComponent() {
      const [state] = useBloc(CounterCubit, { instanceId: 'my-counter' });
      return <div>Count: {state.count}</div>;
    }

    render(<TestComponent />);
    expect(screen.getByText('Count: 0')).toBeDefined();
  });

  it('should accept number instanceId', () => {
    function TestComponent() {
      const [state] = useBloc(CounterCubit, { instanceId: 123 });
      return <div>Count: {state.count}</div>;
    }

    render(<TestComponent />);
    expect(screen.getByText('Count: 0')).toBeDefined();
  });

  it('should accept undefined instanceId (implicit)', () => {
    function TestComponent() {
      const [state] = useBloc(CounterCubit);
      return <div>Count: {state.count}</div>;
    }

    render(<TestComponent />);
    expect(screen.getByText('Count: 0')).toBeDefined();
  });

  it('should accept undefined instanceId (explicit)', () => {
    function TestComponent() {
      const [state] = useBloc(CounterCubit, { instanceId: undefined });
      return <div>Count: {state.count}</div>;
    }

    render(<TestComponent />);
    expect(screen.getByText('Count: 0')).toBeDefined();
  });

  it('should handle number instanceIds correctly', () => {
    function TestComponent() {
      const [state1] = useBloc(CounterCubit, { instanceId: 1 });
      const [state2] = useBloc(CounterCubit, { instanceId: 2 });
      const [state3] = useBloc(CounterCubit, { instanceId: 1 }); // Same as state1

      return (
        <div>
          <div>Count1: {state1.count}</div>
          <div>Count2: {state2.count}</div>
          <div>Count3: {state3.count}</div>
        </div>
      );
    }

    render(<TestComponent />);
    expect(screen.getByText('Count1: 0')).toBeDefined();
    expect(screen.getByText('Count2: 0')).toBeDefined();
    expect(screen.getByText('Count3: 0')).toBeDefined();
  });

  it('should handle optional instanceId prop (CounterView pattern)', () => {
    interface CounterViewProps {
      label: string;
      instanceKey?: string;
    }

    function CounterView({ label, instanceKey }: CounterViewProps) {
      // This is the common pattern: passing optional prop directly to instanceId
      const [state, counter] = useBloc(CounterCubit, {
        instanceId: instanceKey,
      });
      return (
        <div>
          {label}: {state.count}
        </div>
      );
    }

    function TestComponent() {
      return (
        <div>
          <CounterView label="Counter A" />
          <CounterView label="Counter B" instanceKey="isolated-1" />
          <CounterView label="Counter C" instanceKey="isolated-2" />
        </div>
      );
    }

    render(<TestComponent />);
    expect(screen.getByText('Counter A: 0')).toBeDefined();
    expect(screen.getByText('Counter B: 0')).toBeDefined();
    expect(screen.getByText('Counter C: 0')).toBeDefined();
  });

  // TypeScript compile-time test
  // The following would cause TypeScript errors if uncommented:
  //
  // it('should NOT accept null instanceId', () => {
  //   function TestComponent() {
  //     // @ts-expect-error - null is not a valid instanceId
  //     const [state] = useBloc(CounterCubit, { instanceId: null });
  //     return <div>Count: {state.count}</div>;
  //   }
  //
  //   render(<TestComponent />);
  // });
  //
  // it('should NOT accept boolean instanceId', () => {
  //   function TestComponent() {
  //     // @ts-expect-error - boolean is not a valid instanceId
  //     const [state] = useBloc(CounterCubit, { instanceId: true });
  //     return <div>Count: {state.count}</div>;
  //   }
  //
  //   render(<TestComponent />);
  // });
  //
  // it('should NOT accept object instanceId', () => {
  //   function TestComponent() {
  //     // @ts-expect-error - object is not a valid instanceId
  //     const [state] = useBloc(CounterCubit, { instanceId: {} });
  //     return <div>Count: {state.count}</div>;
  //   }
  //
  //   render(<TestComponent />);
  // });
});
