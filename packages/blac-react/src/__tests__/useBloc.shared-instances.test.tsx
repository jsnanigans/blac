import { describe, it, expect } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import { Cubit, getRefCount, hasInstance } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/test';

class SharedBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment() {
    this.emit({ count: this.state.count + 1 });
  }
}

blacTestSetup();

describe('useBloc — shared instances', () => {
  it('two components using same class get the same instance', () => {
    const seen: SharedBloc[] = [];
    function Comp() {
      const [, b] = useBloc(SharedBloc);
      seen.push(b as SharedBloc);
      return null;
    }
    render(
      <>
        <Comp />
        <Comp />
      </>,
    );
    expect(seen[0]).toBe(seen[1]);
  });

  it('state change in one component is visible in the other', () => {
    let sharedBloc!: SharedBloc;
    function Comp({ id }: { id: string }) {
      const [state, b] = useBloc(SharedBloc);
      sharedBloc = b as SharedBloc;
      return <span data-testid={id}>{state.count}</span>;
    }
    render(
      <>
        <Comp id="a" />
        <Comp id="b" />
      </>,
    );
    expect(screen.getByTestId('a').textContent).toBe('0');
    expect(screen.getByTestId('b').textContent).toBe('0');

    act(() => {
      sharedBloc.increment();
    });

    expect(screen.getByTestId('a').textContent).toBe('1');
    expect(screen.getByTestId('b').textContent).toBe('1');
  });

  it('unmounting one of two consumers does not dispose the instance', () => {
    function Comp() {
      useBloc(SharedBloc);
      return null;
    }
    function Parent({ count }: { count: number }) {
      return (
        <>
          {Array.from({ length: count }, (_, i) => (
            <Comp key={i} />
          ))}
        </>
      );
    }
    const { rerender } = render(<Parent count={2} />);
    expect(getRefCount(SharedBloc)).toBe(2);

    rerender(<Parent count={1} />);

    expect(getRefCount(SharedBloc)).toBe(1);
    expect(hasInstance(SharedBloc)).toBe(true);
  });

  it('unmounting the last consumer disposes the instance', () => {
    function Comp() {
      useBloc(SharedBloc);
      return null;
    }
    const { unmount } = render(<Comp />);
    expect(hasInstance(SharedBloc)).toBe(true);

    unmount();

    expect(hasInstance(SharedBloc)).toBe(false);
  });

  it('three consumers: only disposed after all three unmount', () => {
    function Comp() {
      useBloc(SharedBloc);
      return null;
    }
    function Parent({ count }: { count: number }) {
      return (
        <>
          {Array.from({ length: count }, (_, i) => (
            <Comp key={i} />
          ))}
        </>
      );
    }
    const { rerender } = render(<Parent count={3} />);
    expect(getRefCount(SharedBloc)).toBe(3);

    rerender(<Parent count={2} />);
    expect(hasInstance(SharedBloc)).toBe(true);

    rerender(<Parent count={1} />);
    expect(hasInstance(SharedBloc)).toBe(true);

    rerender(<Parent count={0} />);
    expect(hasInstance(SharedBloc)).toBe(false);
  });

  it('re-mounting after dispose creates a fresh instance', () => {
    function Comp() {
      useBloc(SharedBloc);
      return null;
    }
    const { unmount } = render(<Comp />);
    unmount();
    expect(hasInstance(SharedBloc)).toBe(false);

    render(<Comp />);
    expect(hasInstance(SharedBloc)).toBe(true);
  });
});
