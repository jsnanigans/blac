import { describe, it, expect, afterEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import { Cubit, clearAll, getRefCount, hasInstance, borrow } from '@blac/core';
import { useBloc } from '../useBloc';

class CounterBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  inc() { this.emit({ count: this.state.count + 1 }); }
  set(n: number) { this.emit({ count: n }); }
}

afterEach(() => clearAll());

describe('useBloc — stress tests', () => {
  it('100 rapid state changes — renders complete without error, shows final state', () => {
    function Comp() {
      const [state] = useBloc(CounterBloc);
      return <span data-testid="count">{state.count}</span>;
    }
    render(<Comp />);

    act(() => {
      const bloc = borrow(CounterBloc) as CounterBloc;
      for (let i = 1; i <= 100; i++) {
        bloc.set(i);
      }
    });

    expect(screen.getByTestId('count').textContent).toBe('100');
  });

  it('10 components sharing one bloc — all update correctly on state change', () => {
    function Comp({ id }: { id: number }) {
      const [state] = useBloc(CounterBloc);
      return <span data-testid={`c${id}`}>{state.count}</span>;
    }
    render(
      <>
        {Array.from({ length: 10 }, (_, i) => <Comp key={i} id={i} />)}
      </>,
    );
    expect(getRefCount(CounterBloc)).toBe(10);

    act(() => {
      borrow(CounterBloc).set(42);
    });

    for (let i = 0; i < 10; i++) {
      expect(screen.getByTestId(`c${i}`).textContent).toBe('42');
    }
  });

  it('mount/unmount 50 times — refCount returns to 0 after each cycle', () => {
    function Comp() {
      useBloc(CounterBloc);
      return null;
    }
    for (let i = 0; i < 50; i++) {
      const { unmount } = render(<Comp />);
      unmount();
      expect(hasInstance(CounterBloc)).toBe(false);
    }
  });

  it('parent and child both calling useBloc — both get the same correct instance', () => {
    let parentBloc: CounterBloc | null = null;
    let childBloc: CounterBloc | null = null;

    function Child() {
      const [state, b] = useBloc(CounterBloc);
      childBloc = b as CounterBloc;
      return <span data-testid="child">{state.count}</span>;
    }
    function Parent() {
      const [state, b] = useBloc(CounterBloc);
      parentBloc = b as CounterBloc;
      return (
        <div>
          <span data-testid="parent">{state.count}</span>
          <Child />
        </div>
      );
    }
    render(<Parent />);

    expect(parentBloc).not.toBeNull();
    expect(childBloc).not.toBeNull();
    expect(parentBloc).toBe(childBloc);

    act(() => { (parentBloc as CounterBloc).set(7); });
    expect(screen.getByTestId('parent').textContent).toBe('7');
    expect(screen.getByTestId('child').textContent).toBe('7');
  });

  it('50 unique instanceIds created simultaneously — all tracked correctly', () => {
    function Comp({ id }: { id: number }) {
      const [state] = useBloc(CounterBloc, { instanceId: `inst-${id}` });
      return <span data-testid={`inst-${id}`}>{state.count}</span>;
    }
    render(
      <>
        {Array.from({ length: 50 }, (_, i) => <Comp key={i} id={i} />)}
      </>,
    );

    for (let i = 0; i < 50; i++) {
      expect(hasInstance(CounterBloc, `inst-${i}`)).toBe(true);
      expect(screen.getByTestId(`inst-${i}`).textContent).toBe('0');
    }

    // Emit on one instance should not affect others
    act(() => {
      borrow(CounterBloc, 'inst-5').set(99);
    });
    expect(screen.getByTestId('inst-5').textContent).toBe('99');
    expect(screen.getByTestId('inst-6').textContent).toBe('0');
  });
});
