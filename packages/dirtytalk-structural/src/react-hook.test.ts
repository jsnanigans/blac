// @vitest-environment jsdom
import React from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { SyncScheduler } from '@dirtytalk/engine';
import { TestContainer } from './test-support';
import { useStructural } from './react-hook';
import { ALL_PATHS } from './path-set';

// ---------------------------------------------------------------------------
// Test state type
// ---------------------------------------------------------------------------

interface CounterState {
  count: number;
  label: string;
}

class Counter extends TestContainer<CounterState> {}

const makeContainer = (state: CounterState = { count: 0, label: 'a' }) =>
  new Counter(state, { scheduler: new SyncScheduler() });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useStructural', () => {
  it('1. initial render returns [state, container]', () => {
    const c = makeContainer();
    let capturedState: CounterState | undefined;
    let capturedContainer: Counter | undefined;

    function App() {
      const [state, container] = useStructural(c);
      capturedState = state as CounterState;
      capturedContainer = container;
      return null;
    }

    act(() => {
      render(React.createElement(App));
    });

    expect(capturedContainer).toBe(c);
    expect(capturedState).toEqual({ count: 0, label: 'a' });
  });

  it('2. reading state during render registers paths', () => {
    const c = makeContainer();
    let renderCount = 0;

    function App() {
      renderCount++;
      const [state] = useStructural(c);
      // Read only 'count'
      void (state as CounterState).count;
      return null;
    }

    act(() => {
      render(React.createElement(App));
    });

    expect(c.consumerCount).toBe(1);
    const before = renderCount;

    // Patch 'count' — should re-render
    act(() => {
      c.patch({ count: 1 });
    });
    expect(renderCount).toBe(before + 1);

    // Patch 'label' — should NOT re-render
    const after = renderCount;
    act(() => {
      c.patch({ label: 'b' });
    });
    expect(renderCount).toBe(after);
  });

  it('3. patch triggers a re-render for tracked paths', () => {
    const c = makeContainer();
    const results: number[] = [];

    function App() {
      const [state] = useStructural(c);
      results.push((state as CounterState).count);
      return null;
    }

    act(() => {
      render(React.createElement(App));
    });

    act(() => {
      c.patch({ count: 42 });
    });

    expect(results).toEqual([0, 42]);
  });

  it('4. patch does NOT re-render for untracked paths', () => {
    const c = makeContainer();
    let renderCount = 0;

    function App() {
      renderCount++;
      const [state] = useStructural(c);
      void (state as CounterState).count;
      return null;
    }

    act(() => {
      render(React.createElement(App));
    });

    const before = renderCount;
    act(() => {
      c.patch({ label: 'z' });
    });
    expect(renderCount).toBe(before);
  });

  it('5. conditional reads adapt the skeleton', () => {
    const c = makeContainer();
    let renderCount = 0;

    function App({ readLabel }: { readLabel: boolean }) {
      renderCount++;
      const [state] = useStructural(c);
      if (readLabel) {
        void (state as CounterState).label;
      } else {
        void (state as CounterState).count;
      }
      return null;
    }

    const { rerender } = render(React.createElement(App, { readLabel: false }));

    // First render: reading 'count'
    const afterFirst = renderCount;

    // Parent re-renders to flip conditional to read 'label'
    act(() => {
      rerender(React.createElement(App, { readLabel: true }));
    });

    // Now: reading 'label' only
    // patch label → should re-render
    const beforeLabelPatch = renderCount;
    act(() => {
      c.patch({ label: 'x' });
    });
    expect(renderCount).toBeGreaterThan(beforeLabelPatch);

    // patch count → should NOT re-render
    const afterLabelPatch = renderCount;
    act(() => {
      c.patch({ count: 99 });
    });
    expect(renderCount).toBe(afterLabelPatch);

    // Suppress unused variable warning
    void afterFirst;
  });

  it('6. emit with two consumers does source-diff', () => {
    const c = makeContainer({ count: 0, label: 'a' });

    // Track which callback fired
    const firedFor: string[] = [];

    // Register two direct subscriptions to verify the channel selective fanout
    // works at the non-React level — isolates the test from React scheduling.
    const { ALL_PATHS: _ap } = { ALL_PATHS };
    const countId = c.interner.intern('count');
    const labelId = c.interner.intern('label');

    const unsubA = c.subscribe(
      () => new Set([countId]),
      () => firedFor.push('A'),
    );
    const unsubB = c.subscribe(
      () => new Set([labelId]),
      () => firedFor.push('B'),
    );

    // Also register consumer paths so emit uses diffAlongSkeleton (> 1 consumer)
    c.registerConsumerPaths('p-count', new Set([countId]));
    c.registerConsumerPaths('p-label', new Set([labelId]));

    expect(c.consumerCount).toBe(2);

    // emit a new state that only changes 'label' — diffAlongSkeleton should
    // produce dirty = {labelId} so only subscriber B fires.
    c.emit({ count: 0, label: 'changed' });

    expect(firedFor).toEqual(['B']);

    unsubA();
    unsubB();
  });

  it('7. unmount removes the consumer', () => {
    const c = makeContainer();

    function App() {
      useStructural(c);
      return null;
    }

    const { unmount } = render(React.createElement(App));
    expect(c.consumerCount).toBe(1);

    act(() => {
      unmount();
    });

    expect(c.consumerCount).toBe(0);
  });

  it('8. StrictMode double-invoke leaves a clean registry', () => {
    const c = makeContainer();

    function App() {
      useStructural(c);
      return null;
    }

    // Mount in StrictMode, unmount, remount via key change
    const { rerender, unmount } = render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(App, { key: 'a' }),
      ),
    );

    // Remount by changing key
    act(() => {
      rerender(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(App, { key: 'b' }),
        ),
      );
    });

    // One active consumer, no stale entries
    expect(c.consumerCount).toBe(1);

    act(() => {
      unmount();
    });
    expect(c.consumerCount).toBe(0);
  });

  it('9. two components on same container have distinct consumerIds', () => {
    const c = makeContainer();

    function CompA() {
      const [state] = useStructural(c);
      void (state as CounterState).count;
      return null;
    }

    function CompB() {
      const [state] = useStructural(c);
      void (state as CounterState).label;
      return null;
    }

    const { unmount: unmountB } = render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(CompA),
        React.createElement(CompB),
      ),
    );

    expect(c.consumerCount).toBe(2);

    // Unmount CompB — CompA's consumer remains
    act(() => {
      unmountB();
    });

    // After unmounting the whole tree both are gone, but before that we should
    // have verified it via separate mounts. Let's do it properly:
    const c2 = makeContainer();

    let unmountA2: (() => void) | undefined;
    let unmountB2: (() => void) | undefined;

    act(() => {
      const resultA = render(
        React.createElement(function CompA2() {
          const [state] = useStructural(c2);
          void (state as CounterState).count;
          return null;
        }),
      );
      unmountA2 = resultA.unmount;
    });

    act(() => {
      const resultB = render(
        React.createElement(function CompB2() {
          const [state] = useStructural(c2);
          void (state as CounterState).label;
          return null;
        }),
      );
      unmountB2 = resultB.unmount;
    });

    expect(c2.consumerCount).toBe(2);

    act(() => {
      unmountB2?.();
    });
    expect(c2.consumerCount).toBe(1);

    act(() => {
      unmountA2?.();
    });
    expect(c2.consumerCount).toBe(0);
  });

  it('10. direct c.subscribe and useStructural coexist', () => {
    const c = makeContainer();
    const pluginCb = vi.fn();
    let renderCount = 0;

    // Register a plugin-style subscriber that listens to all paths
    const unsub = c.subscribe(
      () => ALL_PATHS,
      () => pluginCb(),
    );

    function App() {
      renderCount++;
      const [state] = useStructural(c);
      void (state as CounterState).count;
      return null;
    }

    act(() => {
      render(React.createElement(App));
    });

    pluginCb.mockClear();
    const before = renderCount;

    act(() => {
      c.patch({ count: 5 });
    });

    // Plugin fired
    expect(pluginCb).toHaveBeenCalled();
    // Hook re-rendered
    expect(renderCount).toBeGreaterThan(before);

    unsub();
  });

  it('11. emit in the render→subscribe window is not missed (T6)', () => {
    const c = makeContainer({ count: 0, label: 'a' });
    const seen: number[] = [];

    // Layout effects run BEFORE passive effects, and `useStructural` subscribes
    // in a passive effect. So this patch lands after App has rendered (snapshot
    // seeded) but before App subscribes — the exact mount gap. Without the
    // post-subscribe recheck the advanced state would be silently missed.
    function Mutator() {
      React.useLayoutEffect(() => {
        c.patch({ count: 7 });
      }, []);
      return null;
    }

    function App() {
      const [state] = useStructural(c);
      seen.push((state as CounterState).count);
      return null;
    }

    act(() => {
      render(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(Mutator),
          React.createElement(App),
        ),
      );
    });

    // App recovered: it re-rendered with the advanced state rather than staying
    // stale at the render-time snapshot of 0.
    expect(seen).toContain(7);
    expect(seen[seen.length - 1]).toBe(7);
  });

  it('12. a descendant reader wakes on an atomic parent replacement under an ALL_PATHS skeleton', () => {
    class List extends TestContainer<{ items: number[] }> {}
    const c = new List({ items: [1] }, { scheduler: new SyncScheduler() });
    c.registerConsumerPaths('all', ALL_PATHS);
    let renders = 0;
    function App() {
      const [state] = useStructural(c);
      renders++;
      return React.createElement(
        'span',
        null,
        (state as { items: number[] }).items.length,
      );
    }
    act(() => {
      render(React.createElement(App));
    });
    const before = renders;
    act(() => {
      c.patch({ items: [1, 2] });
    });
    expect(renders).toBe(before + 1);
  });

  it('13. reads after commit do not add paths', () => {
    const c = makeContainer();
    let captured: CounterState | undefined;
    function App() {
      const [state] = useStructural(c);
      captured = state as CounterState;
      return React.createElement('span', null, captured.count);
    }
    act(() => {
      render(React.createElement(App));
    });
    void captured?.label;
    const paths = [...c.getConsumerPaths().values()][0] as Set<number>;
    expect([...paths].map((id) => c.interner.lookup(id))).toEqual(['count']);
  });

  it('14. a memo keyed on state still tracks after a local re-render', () => {
    class User extends TestContainer<{ user: { name: string } }> {}
    const c = new User(
      { user: { name: 'a' } },
      { scheduler: new SyncScheduler() },
    );
    let bump: () => void = () => {};
    let seen = '';
    function App() {
      const [state] = useStructural(c);
      const [, setTick] = React.useState(0);
      bump = () => setTick((t) => t + 1);
      seen = React.useMemo(
        () => (state as { user: { name: string } }).user.name,
        [state],
      );
      return null;
    }
    act(() => {
      render(React.createElement(App));
    });
    act(() => bump());
    act(() => {
      c.emit({ user: { name: 'b' } });
    });
    expect(seen).toBe('b');
  });

  it('15. Object.keys on the root wakes when a root key is added', () => {
    class Bag extends TestContainer<Record<string, number>> {}
    const c = new Bag({ a: 1, b: 2 }, { scheduler: new SyncScheduler() });
    let seen = 0;
    function App() {
      const [state] = useStructural(c);
      seen = Object.keys(state as object).length;
      return null;
    }
    act(() => {
      render(React.createElement(App));
    });
    act(() => {
      c.emit({ ...c.state, c: 3 });
    });
    expect(seen).toBe(3);
  });

  it('15b. a large root array wakes when replaced', () => {
    class List extends TestContainer<number[]> {}
    const initial = Array.from({ length: 1000 }, (_, i) => i);
    const c = new List(initial, { scheduler: new SyncScheduler() });
    let seen = 0;
    function App() {
      const [state] = useStructural(c);
      seen = (state as number[])[0];
      return null;
    }
    act(() => {
      render(React.createElement(App));
    });
    act(() => {
      c.emit(c.state.map((n) => n + 1));
    });
    expect(seen).toBe(1);
  });

  it('16. a change between render and commit re-renders', () => {
    const c = makeContainer();
    let showLabel = false;
    let seen = '';
    function Child() {
      React.useLayoutEffect(() => {
        if (showLabel) c.patch({ label: 'b' });
      });
      return null;
    }
    function App() {
      const [state] = useStructural(c);
      const s = state as CounterState;
      seen = showLabel ? s.label : String(s.count);
      return React.createElement(Child);
    }
    const { rerender } = render(React.createElement(App));
    showLabel = true;
    act(() => {
      rerender(React.createElement(App));
    });
    expect(seen).toBe('b');
  });
});
