import { describe, it, expect } from 'vite-plus/test';
import { StrictMode } from 'react';
import { render, act, screen } from '@testing-library/react';
import { Cubit, getRefCount, hasInstance, borrow } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

class SharedBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment() {
    this.emit({ count: this.state.count + 1 });
  }
}

// `static key` collapses identity to `id`, ignoring the `tick` arg. Toggling
// `tick` busts the memo's JSON-stringified arg key while the resolved instance
// key stays constant — the R3 divergence that used to double-count the ref.
class KeyedBloc extends Cubit<
  { count: number },
  { id: string; tick?: number }
> {
  static key = (a?: { id: string; tick?: number }) => a?.id ?? 'default';
  constructor() {
    super({ count: 0 });
  }
}

// Two distinct classes, neither with args nor a `static key`, so both resolve
// to the SAME `DEFAULT_STRUCTURAL_KEY` sentinel instance key regardless of
// class — the collapsed-key class-swap scenario.
class SharedBlocA extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment() {
    this.emit({ count: this.state.count + 1 });
  }
}

class SharedBlocB extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment() {
    this.emit({ count: this.state.count + 1 });
  }
}

blacTestSetup();

describe('useBloc — shared instances', () => {
  it('two components using same class get the same instance', async () => {
    // Per-consumer design: each useBloc consumer returns its own proxy that
    // closes over a per-consumer getter tracker. Identity is asserted on the
    // raw underlying instance via the registry.
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
    const raw = borrow(SharedBloc);
    // Both consumer proxies should target the same underlying raw instance.
    await act(async () => {
      raw.increment();
    });
    expect(seen[0].state.count).toBe(1);
    expect(seen[1].state.count).toBe(1);
    expect(seen[0].state).toBe(seen[1].state);
  });

  it('state change in one component is visible in the other', async () => {
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

    await act(async () => {
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

  // R3: a `static key` that ignores a non-identity arg. Toggling that arg
  // re-runs the memo (JSON key differs) but resolves the SAME instance key.
  // The ownership ref must stay at exactly 1 across the churn and the instance
  // must dispose on unmount.
  it('R3: static key ignores a non-key arg — refcount stays 1 across churn', () => {
    // The registry dev-warns when the same key is reused with different args;
    // that is expected here (the whole point of a collapsing static key).
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      function Comp({ tick }: { tick: number }) {
        useBloc(KeyedBloc, { args: { id: 'a', tick } });
        return null;
      }
      const { rerender, unmount } = render(<Comp tick={0} />);
      for (let i = 1; i <= 5; i++) {
        rerender(<Comp tick={i} />);
      }
      expect(getRefCount(KeyedBloc, { args: { id: 'a' } })).toBe(1);
      unmount();
      expect(hasInstance(KeyedBloc, { args: { id: 'a' } })).toBe(false);
    } finally {
      warnSpy.mockRestore();
    }
  });

  // Same-commit ownership handoff of a shared (non-keepAlive) key. Two DIFFERENT
  // components resolve the SAME instance key; the sole owner (A) unmounts while
  // the other (B) mounts in a SINGLE commit. React runs A's layout-effect cleanup
  // (release → refs 0 → synchronous dispose) BEFORE B's layout-effect setup
  // (re-acquire → creates a fresh instance). B's render captured the now-disposed
  // instance; the ownership effect must detect the mismatch and rebind B to the
  // live registry entry — otherwise B is silently bound to a disposed instance.
  it('same-commit handoff of a shared key rebinds B to the LIVE instance', async () => {
    let bBloc: SharedBloc | undefined;
    function A() {
      const [state] = useBloc(SharedBloc);
      return <span data-testid="a">{state.count}</span>;
    }
    function B() {
      const [state, b] = useBloc(SharedBloc);
      bBloc = b as SharedBloc;
      return <span data-testid="b">{state.count}</span>;
    }
    function Parent({ showA }: { showA: boolean }) {
      return showA ? <A /> : <B />;
    }

    const { rerender } = render(<Parent showA={true} />);
    expect(getRefCount(SharedBloc)).toBe(1);

    // Flip in one commit: A unmounts, B mounts.
    await act(async () => {
      rerender(<Parent showA={false} />);
    });

    // Exactly one owner (B) — acquire/release stayed paired across the handoff.
    expect(getRefCount(SharedBloc)).toBe(1);
    expect(hasInstance(SharedBloc)).toBe(true);
    expect(bBloc).toBeDefined();
    // B must NOT be bound to a disposed instance.
    expect((bBloc as SharedBloc).$blac.disposed).toBe(false);

    // State written via the LIVE registry instance must be observed by B — proving
    // B subscribed to and renders against the live entry, not a disconnected fork.
    const live = borrow(SharedBloc);
    expect(live.$blac.disposed).toBe(false);
    await act(async () => {
      live.increment();
    });
    expect(screen.getByTestId('b').textContent).toBe('1');
    expect((bBloc as SharedBloc).state.count).toBe(1);
  });

  // StrictMode double-invoke of a lone consumer: layout setup → cleanup → setup.
  // The cleanup releases refs→0 and synchronously disposes; the second setup
  // re-acquires and creates a fresh instance. The consumer's render captured the
  // first (now-disposed) instance, so the effect must rebind to the live one.
  it('StrictMode remount rebinds a lone consumer to the LIVE instance', async () => {
    let seen: SharedBloc | undefined;
    function Comp() {
      const [state, b] = useBloc(SharedBloc);
      seen = b as SharedBloc;
      return <span data-testid="c">{state.count}</span>;
    }

    render(
      <StrictMode>
        <Comp />
      </StrictMode>,
    );

    expect(getRefCount(SharedBloc)).toBe(1);
    expect(seen).toBeDefined();
    expect((seen as SharedBloc).$blac.disposed).toBe(false);

    const live = borrow(SharedBloc);
    expect(live.$blac.disposed).toBe(false);
    await act(async () => {
      live.increment();
    });
    expect(screen.getByTestId('c').textContent).toBe('1');
    expect((seen as SharedBloc).state.count).toBe(1);
  });

  // Class swap at a collapsed default key: neither class has args nor a
  // `static key`, so `resolveInstanceKey` collapses both to the SAME
  // `DEFAULT_STRUCTURAL_KEY` sentinel independent of the class. The ownership
  // effect must be keyed on `BlocClass` (not just `instanceKey`/`consumerId`) so
  // swapping classes releases the old class's ref and acquires the new class's
  // ref — otherwise the old ref leaks until unmount and the new instance is held
  // with zero ownership refs.
  it('BlocClass swap at a shared default key releases the old class and owns the new one', async () => {
    let bloc: SharedBlocA | SharedBlocB | undefined;
    function Comp({ useA }: { useA: boolean }) {
      const [state, b] = useBloc(useA ? SharedBlocA : SharedBlocB);
      bloc = b as SharedBlocA | SharedBlocB;
      return <span data-testid="swap">{state.count}</span>;
    }

    const { rerender } = render(<Comp useA={true} />);
    expect(getRefCount(SharedBlocA)).toBe(1);
    expect(hasInstance(SharedBlocB)).toBe(false);

    await act(async () => {
      rerender(<Comp useA={false} />);
    });

    // Old class's ref released (not leaked) and old instance disposed.
    expect(getRefCount(SharedBlocA)).toBe(0);
    expect(hasInstance(SharedBlocA)).toBe(false);
    // New class owns exactly one ref via the live registry instance.
    expect(getRefCount(SharedBlocB)).toBe(1);
    expect(hasInstance(SharedBlocB)).toBe(true);
    expect(bloc).toBeInstanceOf(SharedBlocB);
    expect((bloc as SharedBlocB).$blac.disposed).toBe(false);

    // Consumer renders against the LIVE registry instance for the new class.
    const liveB = borrow(SharedBlocB);
    await act(async () => {
      liveB.increment();
    });
    expect(screen.getByTestId('swap').textContent).toBe('1');
  });
});
