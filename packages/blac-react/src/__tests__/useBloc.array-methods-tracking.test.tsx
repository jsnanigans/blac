/**
 * Array Methods Tracking Test
 *
 * Verifies that ALL array iteration/access methods properly track the array parent.
 */

import { render, screen, act } from '@testing-library/react';
import { Cubit, clearAll, acquire } from '@blac/core';
import { useBloc } from '../useBloc';
import { describe, it, expect, afterEach } from 'vite-plus/test';

interface TestState {
  items: number[];
}

class ArrayMethodCubit extends Cubit<TestState> {
  constructor() {
    super({ items: [1, 2, 3, 4, 5] });
  }

  updateItems = () => {
    this.emit({ items: [1, 2, 3, 4, 5, 6] }); // New array
  };
}

afterEach(() => {
  clearAll();
});

describe('Array Methods Tracking', () => {
  // Currently tracked methods
  it('should track array when using .map()', () => {
    let renderCount = 0;

    function Component() {
      const [{ items }] = useBloc(ArrayMethodCubit);
      renderCount++;

      const mapped = items.map((x) => x * 2);
      return <div data-testid="result">{mapped.join(',')}</div>;
    }

    render(<Component />);
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('result')).toHaveTextContent('2,4,6,8,10');

    act(() => {
      acquire(ArrayMethodCubit).updateItems();
    });

    expect(renderCount).toBe(2); // Should re-render
    expect(screen.getByTestId('result')).toHaveTextContent('2,4,6,8,10,12');
  });

  it('should track array when using .filter()', () => {
    let renderCount = 0;

    function Component() {
      const [{ items }] = useBloc(ArrayMethodCubit);
      renderCount++;

      const filtered = items.filter((x) => x > 2);
      return <div data-testid="result">{filtered.join(',')}</div>;
    }

    render(<Component />);
    expect(renderCount).toBe(1);

    act(() => {
      acquire(ArrayMethodCubit).updateItems();
    });

    expect(renderCount).toBe(2); // Should re-render
  });

  it('should track array when using .find()', () => {
    let renderCount = 0;

    function Component() {
      const [{ items }] = useBloc(ArrayMethodCubit);
      renderCount++;

      const found = items.find((x) => x > 3);
      return <div data-testid="result">{found}</div>;
    }

    render(<Component />);
    expect(renderCount).toBe(1);

    act(() => {
      acquire(ArrayMethodCubit).updateItems();
    });

    expect(renderCount).toBe(2); // Should re-render
  });

  // Missing methods that SHOULD track
  it('should track array when using .flatMap()', () => {
    let renderCount = 0;

    function Component() {
      const [{ items }] = useBloc(ArrayMethodCubit);
      renderCount++;

      const flat = items.flatMap((x) => [x, x * 2]);
      return <div data-testid="result">{flat.join(',')}</div>;
    }

    render(<Component />);
    expect(renderCount).toBe(1);

    act(() => {
      acquire(ArrayMethodCubit).updateItems();
    });

    expect(renderCount).toBe(2); // Should re-render
  });

  it('should track array when using .findIndex()', () => {
    let renderCount = 0;

    function Component() {
      const [{ items }] = useBloc(ArrayMethodCubit);
      renderCount++;

      const idx = items.findIndex((x) => x > 3);
      return <div data-testid="result">{idx}</div>;
    }

    render(<Component />);
    expect(renderCount).toBe(1);

    act(() => {
      acquire(ArrayMethodCubit).updateItems();
    });

    expect(renderCount).toBe(2); // Should re-render
  });

  it('should track array when using .includes()', () => {
    let renderCount = 0;

    function Component() {
      const [{ items }] = useBloc(ArrayMethodCubit);
      renderCount++;

      const hasThree = items.includes(3);
      return <div data-testid="result">{String(hasThree)}</div>;
    }

    render(<Component />);
    expect(renderCount).toBe(1);

    act(() => {
      acquire(ArrayMethodCubit).updateItems();
    });

    expect(renderCount).toBe(2); // Should re-render
  });

  it('should track array when using .indexOf()', () => {
    let renderCount = 0;

    function Component() {
      const [{ items }] = useBloc(ArrayMethodCubit);
      renderCount++;

      const idx = items.indexOf(3);
      return <div data-testid="result">{idx}</div>;
    }

    render(<Component />);
    expect(renderCount).toBe(1);

    act(() => {
      acquire(ArrayMethodCubit).updateItems();
    });

    expect(renderCount).toBe(2); // Should re-render
  });

  it('should track array when using .slice()', () => {
    let renderCount = 0;

    function Component() {
      const [{ items }] = useBloc(ArrayMethodCubit);
      renderCount++;

      const sliced = items.slice(1, 3);
      return <div data-testid="result">{sliced.join(',')}</div>;
    }

    render(<Component />);
    expect(renderCount).toBe(1);

    act(() => {
      acquire(ArrayMethodCubit).updateItems();
    });

    expect(renderCount).toBe(2); // Should re-render
  });

  it('should track array when using .join()', () => {
    let renderCount = 0;

    function Component() {
      const [{ items }] = useBloc(ArrayMethodCubit);
      renderCount++;

      const joined = items.join('-');
      return <div data-testid="result">{joined}</div>;
    }

    render(<Component />);
    expect(renderCount).toBe(1);

    act(() => {
      acquire(ArrayMethodCubit).updateItems();
    });

    expect(renderCount).toBe(2); // Should re-render
  });

  it('should track array when using .at()', () => {
    let renderCount = 0;

    function Component() {
      const [{ items }] = useBloc(ArrayMethodCubit);
      renderCount++;

      const last = items.at(-1);
      return <div data-testid="result">{last}</div>;
    }

    render(<Component />);
    expect(renderCount).toBe(1);

    act(() => {
      acquire(ArrayMethodCubit).updateItems();
    });

    expect(renderCount).toBe(2); // Should re-render
  });
});
