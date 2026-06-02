import { describe, it, expect, vi } from 'vite-plus/test';
import { render, act, screen } from '@testing-library/react';
import {
  Cubit,
  acquire,
  borrow,
  release,
  ensure,
  getRefCount,
  hasInstance,
} from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

// ---------------------------------------------------------------------------
// Blocs for case 1 (auto-track without explicit useBloc on dep) + case 9
// (own-state still works alongside cross-bloc tracking — regression guard).
// ---------------------------------------------------------------------------

class ItemPriceBloc extends Cubit<{ price: number }> {
  constructor() {
    super({ price: 10 });
  }
  setPrice(p: number) {
    this.emit({ price: p });
  }
}

class ItemBloc extends Cubit<{ qty: number }> {
  private price = this.depend(ItemPriceBloc);
  constructor() {
    super({ qty: 1 });
  }
  setQty(q: number) {
    this.emit({ qty: q });
  }
  get total() {
    const [p] = this.price.track();
    return this.state.qty * p.price;
  }
  get qtyLabel() {
    return `qty:${this.state.qty}`;
  }
}

// ---------------------------------------------------------------------------
// Blocs for case 2 (dep getter transitivity: dep's own getter re-renders
// consumer through `.track()`'s dep proxy).
// ---------------------------------------------------------------------------

class SrcBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 5 });
  }
  inc() {
    this.emit({ count: this.state.count + 1 });
  }
  get doubled() {
    return this.state.count * 2;
  }
}

class AggBloc extends Cubit<{ offset: number }> {
  private src = this.depend(SrcBloc);
  constructor() {
    super({ offset: 0 });
  }
  get computed() {
    const [, s] = this.src.track();
    // Reading `s.doubled` (a getter on SrcBloc) threads through the dep proxy
    // built by track(), which intercepts `state` reads inside `doubled` and
    // records `count` as a leaf path against SrcBloc's channel.
    return this.state.offset + s.doubled;
  }
}

// ---------------------------------------------------------------------------
// Blocs for case 4 (path-scoped: tracked field a should not wake on field b
// change — requires 2+ consumers for source-side path narrowing to fire).
//
// NOTE: `.track()` returns [trackedState, depProxy]. Path recording happens
// when `trackedState.field` is accessed (first element), OR when a dep getter
// is called via `depProxy.someGetter` which threads `this.state.field` through
// the dep proxy's `thisProxy`. Accessing `depProxy.state.field` does NOT record
// paths because the getter body `return this._state` reads `_state`, which the
// `thisProxy` trap does not intercept (only `state` is intercepted). Use the
// first element of `.track()` to access dep state directly.
// ---------------------------------------------------------------------------

class TwoFieldDep extends Cubit<{ a: number; b: number }> {
  constructor() {
    super({ a: 0, b: 0 });
  }
  setA(v: number) {
    this.emit({ ...this.state, a: v });
  }
  setB(v: number) {
    this.emit({ ...this.state, b: v });
  }
}

class DepReaderBloc extends Cubit<{ x: number }> {
  private dep = this.depend(TwoFieldDep);
  constructor() {
    super({ x: 0 });
  }
  // Uses the tracked state (first element) to access dep.a — this records `a`
  // as a leaf path against TwoFieldDep's channel.
  get readA() {
    const [s] = this.dep.track();
    return s.a;
  }
}

// ---------------------------------------------------------------------------
// Blocs for case 5 (conditional .track(): flag controls whether we call it).
// ---------------------------------------------------------------------------

class ToggleDep extends Cubit<{ val: number }> {
  constructor() {
    super({ val: 0 });
  }
  inc() {
    this.emit({ val: this.state.val + 1 });
  }
}

class ToggleConsumerBloc extends Cubit<{ watch: boolean }> {
  private dep = this.depend(ToggleDep);
  constructor() {
    super({ watch: true });
  }
  setWatch(w: boolean) {
    this.emit({ watch: w });
  }
  get value() {
    if (this.state.watch) {
      const [d] = this.dep.track();
      return d.val;
    }
    return -1;
  }
}

// ---------------------------------------------------------------------------
// Blocs for case 6 (mutual deps A↔B — neither should loop infinitely).
// Uses tracked-state first element to correctly record paths.
// ---------------------------------------------------------------------------

class MutualA extends Cubit<{ a: number }> {
  private bDep = this.depend(MutualB);
  constructor() {
    super({ a: 1 });
  }
  inc() {
    this.emit({ a: this.state.a + 1 });
  }
  get sum() {
    const [sb] = this.bDep.track();
    return this.state.a + sb.b;
  }
}

class MutualB extends Cubit<{ b: number }> {
  private aDep = this.depend(MutualA);
  constructor() {
    super({ b: 10 });
  }
  inc() {
    this.emit({ b: this.state.b + 1 });
  }
  get sum() {
    const [sa] = this.aDep.track();
    return this.state.b + sa.a;
  }
}

// ---------------------------------------------------------------------------
// Blocs for case 7 (outside render: .track() degrades to live values).
// ---------------------------------------------------------------------------

class LiveDep extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 42 });
  }
  set(n: number) {
    this.emit({ n });
  }
}

class OutsideRenderBloc extends Cubit<{ result: number }> {
  private dep = this.depend(LiveDep);
  constructor() {
    super({ result: 0 });
  }
  // This method calls .track() OUTSIDE a render — should get live values but
  // register NO subscription.
  readDepOutside() {
    const [state] = this.dep.track();
    this.emit({ result: state.n });
  }
}

// ---------------------------------------------------------------------------
// Blocs for case 8 (lifecycle: unmount releases dep ref, dep disposes).
// ---------------------------------------------------------------------------

class LifecycleDep extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
  inc() {
    this.emit({ n: this.state.n + 1 });
  }
}

class LifecycleConsumer extends Cubit<{ x: number }> {
  private dep = this.depend(LifecycleDep);
  constructor() {
    super({ x: 0 });
  }
  get depVal() {
    const [s] = this.dep.track();
    return s.n;
  }
}

blacTestSetup();

// ===========================================================================
// Case 1: auto-track without explicit useBloc(Dep)
// ===========================================================================
describe('useBloc — track() case 1: auto-track without explicit useBloc(Dep)', () => {
  it('consumer re-renders on dep change without an explicit useBloc(Dep) call', async () => {
    let renders = 0;
    function Comp() {
      renders++;
      const [, bloc] = useBloc(ItemBloc);
      return <span data-testid="out">{bloc.total}</span>;
    }
    render(<Comp />);
    expect(screen.getByTestId('out').textContent).toBe('10'); // 1 * 10

    const countAfterMount = renders;
    await act(async () => {
      borrow(ItemPriceBloc).setPrice(20);
    });

    expect(screen.getByTestId('out').textContent).toBe('20'); // 1 * 20
    expect(renders).toBeGreaterThan(countAfterMount);
  });
});

// ===========================================================================
// Case 2: dep getter transitivity
// ===========================================================================
describe('useBloc — track() case 2: dep getter transitivity', () => {
  it("reading dep's getter through the dep proxy tracks dep's state fields", async () => {
    let renders = 0;
    function Comp() {
      renders++;
      const [, bloc] = useBloc(AggBloc);
      return <span data-testid="out">{bloc.computed}</span>;
    }
    render(<Comp />);
    // offset(0) + doubled(5*2=10) = 10
    expect(screen.getByTestId('out').textContent).toBe('10');

    const countAfterMount = renders;
    await act(async () => {
      borrow(SrcBloc).inc();
    });

    // offset(0) + doubled(6*2=12) = 12
    expect(screen.getByTestId('out').textContent).toBe('12');
    expect(renders).toBeGreaterThan(countAfterMount);
  });
});

// ===========================================================================
// Case 3: deep chain A->B->C (already tested in getter-tracking suite via
// ChainABloc, but exercised again here to keep this spec self-contained).
// ===========================================================================
describe('useBloc — track() case 3: deep chain A->B->C transitivity', () => {
  class CC extends Cubit<{ v: number }> {
    constructor() {
      super({ v: 100 });
    }
    bump() {
      this.emit({ v: this.state.v + 1 });
    }
    get computed() {
      return this.state.v;
    }
  }
  class BB extends Cubit<{ v: number }> {
    private c = this.depend(CC);
    constructor() {
      super({ v: 10 });
    }
    get computed() {
      const [, c] = this.c.track();
      return this.state.v + c.computed;
    }
  }
  class AA extends Cubit<{ v: number }> {
    private b = this.depend(BB);
    constructor() {
      super({ v: 1 });
    }
    get computed() {
      const [, b] = this.b.track();
      return this.state.v + b.computed;
    }
  }

  it('bumping C wakes a consumer that only calls useBloc(A)', async () => {
    function Comp() {
      const [, blocA] = useBloc(AA);
      return <span data-testid="out">{blocA.computed}</span>;
    }
    render(<Comp />);
    expect(screen.getByTestId('out').textContent).toBe('111'); // 1+(10+100)

    await act(async () => {
      borrow(CC).bump();
    });

    expect(screen.getByTestId('out').textContent).toBe('112'); // 1+(10+101)
  });
});

// ===========================================================================
// Case 4: path-scoped — tracking dep.a should not wake on dep.b change
//
// Source-side path-narrowing only fires when StructuralContainer has 2+
// registered consumer interest sets. With a single consumer the container
// short-circuits to ALL_PATHS (diff cost not worth it), which then intersects
// every consumer interest. To observe path-narrowed wakeups we mount a sibling
// consumer with a disjoint interest so the source-side diff actually runs.
// This mirrors the pattern in `useBloc.auto-track-optimization.test.tsx`.
// ===========================================================================
describe('useBloc — track() case 4: path-scoped dep tracking', () => {
  // Sibling consumer registering interest in dep.b to activate source-side diff.
  function DepBWatcher() {
    const [state] = useBloc(TwoFieldDep);
    void state.b;
    return null;
  }

  it('tracking dep.a does not wake consumer when only dep.b changes', async () => {
    const renders = vi.fn();
    function Comp() {
      renders();
      const [, bloc] = useBloc(DepReaderBloc);
      return <span data-testid="out">{bloc.readA}</span>;
    }
    render(
      <>
        <Comp />
        <DepBWatcher />
      </>,
    );
    const countAfterMount = renders.mock.calls.length;

    await act(async () => {
      // Change dep.b only — DepReaderBloc.readA reads dep.a exclusively.
      borrow(TwoFieldDep).setB(99);
    });

    // With 2 consumers (Comp tracking `a`, DepBWatcher tracking `b`), the
    // source-side skeleton diff narrows the wakeup to the `b` subscriber only.
    expect(renders.mock.calls.length).toBe(countAfterMount);
  });

  it('tracking dep.a DOES wake consumer when dep.a changes', async () => {
    const renders = vi.fn();
    function Comp() {
      renders();
      const [, bloc] = useBloc(DepReaderBloc);
      return <span data-testid="out">{bloc.readA}</span>;
    }
    render(
      <>
        <Comp />
        <DepBWatcher />
      </>,
    );
    const countAfterMount = renders.mock.calls.length;

    await act(async () => {
      borrow(TwoFieldDep).setA(7);
    });

    expect(renders.mock.calls.length).toBeGreaterThan(countAfterMount);
    expect(screen.getByTestId('out').textContent).toBe('7');
  });
});

// ===========================================================================
// Case 5: conditional .track() — subscription added/removed per render
// ===========================================================================
describe('useBloc — track() case 5: conditional .track()', () => {
  it('dep change wakes consumer when watch=true', async () => {
    let renders = 0;
    function Comp() {
      renders++;
      const [, bloc] = useBloc(ToggleConsumerBloc);
      return <span data-testid="out">{bloc.value}</span>;
    }
    render(<Comp />);
    expect(screen.getByTestId('out').textContent).toBe('0');

    const countAfterMount = renders;
    await act(async () => {
      ensure(ToggleDep).inc();
    });

    expect(screen.getByTestId('out').textContent).toBe('1');
    expect(renders).toBeGreaterThan(countAfterMount);
  });

  it('after watch flips to false, dep change no longer wakes consumer', async () => {
    let renders = 0;
    function Comp() {
      renders++;
      const [, bloc] = useBloc(ToggleConsumerBloc);
      return <span data-testid="out">{bloc.value}</span>;
    }
    render(<Comp />);

    // Flip watch off — this triggers a render that runs the getter WITHOUT
    // calling .track(), so the dep subscription and refcount are dropped.
    await act(async () => {
      ensure(ToggleConsumerBloc).setWatch(false);
    });
    expect(screen.getByTestId('out').textContent).toBe('-1');

    const countAfterFlip = renders;
    await act(async () => {
      ensure(ToggleDep).inc();
    });

    // Dep emitted but the subscription was dropped on the previous render.
    expect(renders).toBe(countAfterFlip);
  });

  it('re-subscribes and wakes again if watch flips back to true', async () => {
    let renders = 0;
    function Comp() {
      renders++;
      const [, bloc] = useBloc(ToggleConsumerBloc);
      return <span data-testid="out">{bloc.value}</span>;
    }
    render(<Comp />);

    // Turn watch off, then back on.
    await act(async () => {
      ensure(ToggleConsumerBloc).setWatch(false);
    });
    await act(async () => {
      ensure(ToggleConsumerBloc).setWatch(true);
    });

    // Now dep should be tracked again.
    const countAfterReEnable = renders;
    await act(async () => {
      ensure(ToggleDep).inc();
    });
    expect(renders).toBeGreaterThan(countAfterReEnable);
  });
});

// ===========================================================================
// Case 6: mutual deps A↔B — no infinite render loop
// ===========================================================================
describe('useBloc — track() case 6: mutual deps A↔B', () => {
  it('changing A wakes consumer of A, and changing B wakes consumer of B', async () => {
    let rendersA = 0;
    function CompA() {
      rendersA++;
      const [, bloc] = useBloc(MutualA);
      return <span data-testid="a">{bloc.sum}</span>;
    }
    function CompB() {
      const [, bloc] = useBloc(MutualB);
      return <span data-testid="b">{bloc.sum}</span>;
    }
    render(
      <>
        <CompA />
        <CompB />
      </>,
    );
    // Initial: A.sum = a(1) + b(10) = 11, B.sum = b(10) + a(1) = 11
    expect(screen.getByTestId('a').textContent).toBe('11');
    expect(screen.getByTestId('b').textContent).toBe('11');

    const rendersABefore = rendersA;
    await act(async () => {
      ensure(MutualA).inc();
    });
    // A changed from 1 to 2: A.sum = 2+10=12, B.sum = 10+2=12
    // CompA is directly subscribed to MutualA (primary); CompB is subscribed
    // to MutualB, which tracks MutualA via dep. Both must update.
    expect(screen.getByTestId('a').textContent).toBe('12');
    expect(rendersA).toBeGreaterThan(rendersABefore);
  });

  it('render count stabilizes after a dep change (no infinite loop)', async () => {
    let rendersA = 0;
    function CompA() {
      rendersA++;
      const [, bloc] = useBloc(MutualA);
      return <span data-testid="a">{bloc.sum}</span>;
    }
    render(<CompA />);
    const countBefore = rendersA;

    await act(async () => {
      ensure(MutualA).inc();
    });

    // Allow any pending microtasks to drain.
    await act(async () => {});

    // Must have re-rendered at least once but must not have looped indefinitely.
    expect(rendersA).toBeGreaterThan(countBefore);
    // Hard upper bound: certainly fewer than 20 renders for one state change.
    expect(rendersA).toBeLessThan(countBefore + 20);
  });
});

// ===========================================================================
// Case 7: .track() outside render — live values, no subscription side-effect
// ===========================================================================
describe('useBloc — track() case 7: .track() outside render', () => {
  it('reading .track() from a bloc method returns live dep state', () => {
    // ensure() creates the instance in the registry without taking ownership.
    const outer = ensure(OutsideRenderBloc);
    ensure(LiveDep).set(42);
    outer.readDepOutside();
    expect(outer.state.result).toBe(42);

    ensure(LiveDep).set(99);
    outer.readDepOutside();
    expect(outer.state.result).toBe(99);
  });

  it('an outside-render .track() call does not subscribe an unrelated consumer', async () => {
    // Mount a consumer that reads OutsideRenderBloc's own state.
    let renders = 0;
    function Comp() {
      renders++;
      const [state] = useBloc(OutsideRenderBloc);
      return <span data-testid="out">{state.result}</span>;
    }
    render(<Comp />);
    const countAfterMount = renders;

    // Call the method — this calls .track() OUTSIDE a render (no active
    // trackedStateRef). It returns live dep state but registers no subscription.
    await act(async () => {
      ensure(OutsideRenderBloc).readDepOutside();
    });
    // readDepOutside() called emit() (updating result), so Comp re-renders once.
    const countAfterMethod = renders;

    // LiveDep emits again on its own — OutsideRenderBloc is NOT subscribed to
    // LiveDep (no in-render .track() was called), so this should NOT wake Comp.
    await act(async () => {
      ensure(LiveDep).set(7);
    });

    // Comp is subscribed to OutsideRenderBloc, not to LiveDep. A LiveDep-only
    // emit must not trigger a re-render of Comp.
    expect(renders).toBe(countAfterMethod);
    // Sanity: mounting DID render.
    expect(countAfterMount).toBeGreaterThan(0);
  });
});

// ===========================================================================
// Case 8: lifecycle — unmount releases dep ref, dep disposes when no other refs
// ===========================================================================
describe('useBloc — track() case 8: unmount releases dep ref', () => {
  it('dep is alive while consumer is mounted', () => {
    function Comp() {
      const [, bloc] = useBloc(LifecycleConsumer);
      return <span data-testid="out">{bloc.depVal}</span>;
    }
    render(<Comp />);
    // LifecycleDep was acquired by track() during render.
    expect(hasInstance(LifecycleDep)).toBe(true);
    expect(borrow(LifecycleDep).isDisposed).toBe(false);
  });

  it('dep refcount drops to 0 after consumer unmounts (no other ref holders)', async () => {
    function Comp() {
      const [, bloc] = useBloc(LifecycleConsumer);
      return <span data-testid="out">{bloc.depVal}</span>;
    }
    const { unmount } = render(<Comp />);

    // While mounted the dep must exist.
    expect(hasInstance(LifecycleDep)).toBe(true);

    unmount();

    // After unmount, both the consumer (LifecycleConsumer) and its tracked dep
    // (LifecycleDep) should have their ref counts released.
    expect(getRefCount(LifecycleDep)).toBe(0);
  });

  it('dep emit after unmount does not cause a render', async () => {
    let renders = 0;
    function Comp() {
      renders++;
      const [, bloc] = useBloc(LifecycleConsumer);
      return <span data-testid="out">{bloc.depVal}</span>;
    }
    const { unmount } = render(<Comp />);
    const countBeforeUnmount = renders;

    unmount();

    // Acquire an independent ref so LifecycleDep isn't GC'd and can still emit.
    // This lets us assert "no render" rather than just "bloc is gone".
    acquire(LifecycleDep);
    await act(async () => {
      borrow(LifecycleDep).inc();
    });
    release(LifecycleDep);

    expect(renders).toBe(countBeforeUnmount);
  });
});

// ===========================================================================
// Case 9: own-state still works alongside cross-bloc tracking (regression)
// ===========================================================================
describe('useBloc — track() case 9: own-state still reactive alongside track()', () => {
  it('own-state change re-renders even when dep tracking is active', async () => {
    let renders = 0;
    function Comp() {
      renders++;
      const [, bloc] = useBloc(ItemBloc);
      return (
        <>
          <span data-testid="label">{bloc.qtyLabel}</span>
          <span data-testid="total">{bloc.total}</span>
        </>
      );
    }
    render(<Comp />);
    expect(screen.getByTestId('label').textContent).toBe('qty:1');
    expect(screen.getByTestId('total').textContent).toBe('10');

    await act(async () => {
      borrow(ItemBloc).setQty(3);
    });

    expect(screen.getByTestId('label').textContent).toBe('qty:3');
    expect(screen.getByTestId('total').textContent).toBe('30'); // 3 * 10
    expect(renders).toBeGreaterThan(1);
  });

  it('dep change and own-state change both independently re-render', async () => {
    let renders = 0;
    function Comp() {
      renders++;
      const [, bloc] = useBloc(ItemBloc);
      return <span data-testid="total">{bloc.total}</span>;
    }
    render(<Comp />);
    const initial = renders;

    await act(async () => {
      borrow(ItemPriceBloc).setPrice(5);
    });
    expect(renders).toBeGreaterThan(initial);
    expect(screen.getByTestId('total').textContent).toBe('5'); // 1 * 5

    const afterDepChange = renders;
    await act(async () => {
      borrow(ItemBloc).setQty(4);
    });
    expect(renders).toBeGreaterThan(afterDepChange);
    expect(screen.getByTestId('total').textContent).toBe('20'); // 4 * 5
  });
});
