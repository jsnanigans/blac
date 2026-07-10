import { describe, it, expect } from 'vite-plus/test';
import { html } from 'lit-html';
import { Cubit, getRegistry, resolveInstanceKey } from '@blac/core';
import { flush } from '@blac/core/testing';
import { component, each, mount, select } from './index';

// ---------------------------------------------------------------------------
// CA-P0-2: cross-bloc `depend().track()` reads must wake Lit bindings.
//
// Before this fix, a getter's `this.someDep.track()` read fell straight
// through `Reflect.get` inside `trackedBloc` and returned live `[state,
// instance]` with no subscription — the binding silently never woke when
// only the dependency changed. Each scenario below is one of the plan's
// explicit acceptance criteria: dep-only wake, primary still wakes, drop
// unsubscribes, deep chains, mutual cycles, and no leak across create/clear
// cycles. Mirrors `leak.test.ts`'s harness style.
//
// Blocs are declared PER TEST (not module-level): `depend()` resolves its
// target from the REGISTRY (`registry.ensure`), so a dep-level bloc that a
// test wants to drive directly must be the SAME registry instance the
// binding's session resolves — a standalone `new XBloc()` is a different
// object and the binding would never observe it. Declaring classes inside
// each `it` also gives every test a distinct registry key, so there is no
// state bleed between tests sharing a class.
// ---------------------------------------------------------------------------

/** Wrap a bloc's channel.subscribe to count currently-live raw subscriptions. */
function instrumentChannel(bloc: unknown): { live: () => number } {
  const ch = (bloc as { channel: any }).channel;
  let live = 0;
  const orig = ch.subscribe.bind(ch);
  ch.subscribe = (interest: () => unknown, cb: (d: unknown) => void) => {
    live += 1;
    const unsub = orig(interest, cb);
    let done = false;
    return () => {
      if (!done) {
        done = true;
        live -= 1;
      }
      unsub();
    };
  };
  return { live: () => live };
}

describe('blac-lit cross-bloc depend().track() reactivity', () => {
  it('wakes the binding when only the tracked dep changes (dep-only wake)', async () => {
    class OtherBloc extends Cubit<{ y: number }> {
      set = (y: number): void => this.emit({ y });
      constructor() {
        super({ y: 0 });
      }
    }
    class CombinedBloc extends Cubit<{ x: number; useDep: boolean }> {
      getOther = this.depend(OtherBloc);
      constructor() {
        super({ x: 0, useDep: true });
      }
      get total(): number {
        const [o] = this.getOther.track();
        return this.state.useDep ? this.state.x + o.y : this.state.x;
      }
    }

    // `depend()` resolves OtherBloc from the registry, so the driven `other`
    // must be that same registry instance — not a standalone `new OtherBloc()`.
    const otherKey = resolveInstanceKey(OtherBloc as any, undefined as any);
    const other = getRegistry().acquire(OtherBloc as any, otherKey, {
      canCreate: true,
      countRef: true,
      refId: 'dep-only-wake-holder',
    }) as OtherBloc;
    const combined = new CombinedBloc();
    const container = document.createElement('div');
    document.body.appendChild(container);

    const handle = mount(
      select(combined, (_s, b) => b.total),
      container,
    );
    await flush();
    expect(container.textContent).toBe('0');

    other.set(5);
    await flush();
    expect(container.textContent).toBe('5');

    handle.unmount();
    container.remove();
    getRegistry().release(
      OtherBloc as any,
      otherKey,
      false,
      'dep-only-wake-holder',
    );
  });

  it('still wakes when the primary changes (regression guard)', async () => {
    class OtherBloc extends Cubit<{ y: number }> {
      constructor() {
        super({ y: 0 });
      }
    }
    class CombinedBloc extends Cubit<{ x: number; useDep: boolean }> {
      getOther = this.depend(OtherBloc);
      constructor() {
        super({ x: 0, useDep: true });
      }
      get total(): number {
        const [o] = this.getOther.track();
        return this.state.useDep ? this.state.x + o.y : this.state.x;
      }
      setX = (x: number): void => this.emit({ ...this.state, x });
    }

    // The dep is never driven directly here, so it needs no registry
    // acquire — only the primary (`combined`) is exercised.
    const combined = new CombinedBloc();
    const container = document.createElement('div');
    document.body.appendChild(container);

    const handle = mount(
      select(combined, (_s, b) => b.total),
      container,
    );
    await flush();
    expect(container.textContent).toBe('0');

    combined.setX(3);
    await flush();
    expect(container.textContent).toBe('3');

    handle.unmount();
    container.remove();
  });

  it('drops an unsubscribed dep: consumer/sub counts fall back and it stops recomputing', async () => {
    class OtherBloc extends Cubit<{ y: number }> {
      set = (y: number): void => this.emit({ y });
      constructor() {
        super({ y: 0 });
      }
    }
    class CombinedBloc extends Cubit<{ x: number; useDep: boolean }> {
      getOther = this.depend(OtherBloc);
      constructor() {
        super({ x: 0, useDep: true });
      }
      get total(): number {
        // track() is called ONLY while the dep is in use, so flipping
        // `useDep` off genuinely drops the dep from the reader's reach —
        // an unconditional track() would keep it subscribed forever.
        if (!this.state.useDep) return this.state.x;
        const [o] = this.getOther.track();
        return this.state.x + o.y;
      }
      toggleDep = (): void =>
        this.emit({ ...this.state, useDep: !this.state.useDep });
    }

    const otherKey = resolveInstanceKey(OtherBloc as any, undefined as any);
    const other = getRegistry().acquire(OtherBloc as any, otherKey, {
      canCreate: true,
      countRef: true,
      refId: 'drop-dep-holder',
    }) as OtherBloc;
    const otherCh = instrumentChannel(other);
    const combined = new CombinedBloc();
    const container = document.createElement('div');
    document.body.appendChild(container);

    let computeCount = 0;
    const handle = mount(
      select(combined, (_s, b) => {
        computeCount += 1;
        return b.total;
      }),
      container,
    );
    await flush();
    expect(container.textContent).toBe('0');
    // The test-holder ref above only affects registry refcount, not
    // consumers/subs, so a fresh dep starts at consumer/sub count 1.
    expect(other.consumerCount).toBe(1);
    expect(otherCh.live()).toBe(1);

    combined.toggleDep();
    await flush();
    expect(container.textContent).toBe('0'); // x=0, dep no longer read

    // The dropped dep's ref/consumer/subscription must all drain, not just
    // its channel subscription.
    expect(other.consumerCount).toBe(0);
    expect(otherCh.live()).toBe(0);

    const before = computeCount;
    other.set(99);
    await flush();
    expect(computeCount).toBe(before); // unsubscribed: no recompute

    handle.unmount();
    container.remove();
    getRegistry().release(OtherBloc as any, otherKey, false, 'drop-dep-holder');
  });

  it('wakes through a deep chain (A reads B reads C)', async () => {
    class CBloc extends Cubit<{ z: number }> {
      set = (z: number): void => this.emit({ z });
      constructor() {
        super({ z: 0 });
      }
    }
    class BBloc extends Cubit<{ w: number }> {
      getC = this.depend(CBloc);
      constructor() {
        super({ w: 0 });
      }
      get total(): number {
        const [c] = this.getC.track();
        return this.state.w + c.z;
      }
    }
    class ABloc extends Cubit<{ v: number }> {
      getB = this.depend(BBloc);
      constructor() {
        super({ v: 0 });
      }
      get total(): number {
        const [, b] = this.getB.track();
        return this.state.v + b.total;
      }
    }

    // `a.getB.track()` resolves BBloc from the registry, which in turn
    // resolves CBloc from the registry — so `c` must be that registry
    // instance for `c.set(7)` to reach the chain. `a` itself is never
    // driven directly, so it can stay a standalone primary.
    const cKey = resolveInstanceKey(CBloc as any, undefined as any);
    const c = getRegistry().acquire(CBloc as any, cKey, {
      canCreate: true,
      countRef: true,
      refId: 'deep-chain-c-holder',
    }) as CBloc;
    const a = new ABloc();
    const container = document.createElement('div');
    document.body.appendChild(container);

    const handle = mount(
      select(a, (_s, blocA) => blocA.total),
      container,
    );
    await flush();
    expect(container.textContent).toBe('0');

    c.set(7);
    await flush();
    expect(container.textContent).toBe('7');

    handle.unmount();
    container.remove();
    getRegistry().release(CBloc as any, cKey, false, 'deep-chain-c-holder');
  });

  it('mutual A<->B deps union paths and wake without runaway recomputes', async () => {
    class MutualABloc extends Cubit<{ a: number }> {
      getB = this.depend(MutualBBloc);
      set = (a: number): void => this.emit({ a });
      constructor() {
        super({ a: 0 });
      }
      get combined(): number {
        const [b] = this.getB.track();
        return this.state.a + b.b;
      }
    }
    class MutualBBloc extends Cubit<{ b: number }> {
      getA = this.depend(MutualABloc);
      set = (b: number): void => this.emit({ b });
      constructor() {
        super({ b: 0 });
      }
      get combined(): number {
        const [a] = this.getA.track();
        return this.state.b + a.a;
      }
    }

    // Both blocs are simultaneously a mounted primary AND the other's
    // depend() target, so both must be the registry instances `depend()`
    // resolves — not standalone `new` instances.
    const aKey = resolveInstanceKey(MutualABloc as any, undefined as any);
    const bKey = resolveInstanceKey(MutualBBloc as any, undefined as any);
    const a = getRegistry().acquire(MutualABloc as any, aKey, {
      canCreate: true,
      countRef: true,
      refId: 'mutual-a-holder',
    }) as MutualABloc;
    const b = getRegistry().acquire(MutualBBloc as any, bKey, {
      canCreate: true,
      countRef: true,
      refId: 'mutual-b-holder',
    }) as MutualBBloc;

    const containerA = document.createElement('div');
    const containerB = document.createElement('div');
    document.body.appendChild(containerA);
    document.body.appendChild(containerB);

    let computesA = 0;
    let computesB = 0;
    const handleA = mount(
      select(a, (_s, blocA) => {
        computesA += 1;
        return blocA.combined;
      }),
      containerA,
    );
    const handleB = mount(
      select(b, (_s, blocB) => {
        computesB += 1;
        return blocB.combined;
      }),
      containerB,
    );
    await flush();
    expect(containerA.textContent).toBe('0');
    expect(containerB.textContent).toBe('0');

    const beforeA = computesA;
    const beforeB = computesB;
    a.set(4);
    await flush();

    expect(containerA.textContent).toBe('4');
    expect(containerB.textContent).toBe('4'); // b.combined = b.b(0) + a.a(4)

    // Bounded: one change recomputes each session a small, fixed number of
    // times — never a runaway A-wakes-B-wakes-A cascade.
    expect(computesA - beforeA).toBeLessThanOrEqual(2);
    expect(computesB - beforeB).toBeLessThanOrEqual(2);

    handleA.unmount();
    handleB.unmount();
    containerA.remove();
    containerB.remove();
    getRegistry().release(MutualABloc as any, aKey, false, 'mutual-a-holder');
    getRegistry().release(MutualBBloc as any, bKey, false, 'mutual-b-holder');
  });

  it('no ref/consumer/subscription leak across create/clear cycles with a depend()ed dep', async () => {
    let nextId = 1;
    const freshIds = (n: number): number[] =>
      Array.from({ length: n }, () => nextId++);

    class ListBloc extends Cubit<{ ids: number[] }> {
      constructor() {
        super({ ids: [] });
      }
      create(n: number): void {
        this.emit({ ids: freshIds(n) });
      }
      clear(): void {
        this.emit({ ids: [] });
      }
    }

    class SharedBloc extends Cubit<{ n: number }> {
      set = (n: number): void => this.emit({ n });
      constructor() {
        super({ n: 0 });
      }
    }

    // A per-row bloc that `depend()`s the page-singleton `SharedBloc` and
    // reads it via `.track()` — the depend()-based analog of leak.test.ts's
    // `ctx.use`-based RowBloc.
    class DepRowBloc extends Cubit<{ id: number }> {
      static create(args: { id: number }): DepRowBloc {
        return new DepRowBloc(args.id);
      }
      getShared = this.depend(SharedBloc);
      constructor(id: number) {
        super({ id });
      }
      get label(): string {
        const [s] = this.getShared.track();
        return `${this.state.id}:${s.n}`;
      }
    }

    const ROWS = 200;
    const CYCLES = 6;

    const list = new ListBloc();
    const sharedKey = resolveInstanceKey(SharedBloc as any, undefined as any);
    const shared = getRegistry().acquire(SharedBloc as any, sharedKey, {
      canCreate: true,
      countRef: true,
      refId: 'depend-test-page-holder',
    }) as SharedBloc;
    const sharedCh = instrumentChannel(shared);
    const container = document.createElement('div');
    document.body.appendChild(container);

    const Row = component(
      DepRowBloc,
      (bloc) => html`<div>${select(bloc, (_s, b) => b.label)}</div>`,
    );

    const handle = mount(
      each(
        select(list, (s) => s.ids),
        (id) => (Row as any)({ id }),
        (id) => id,
      ),
      container,
    );

    const liveRowInstances = (): number =>
      getRegistry().getInstancesMap(DepRowBloc).size;
    const refCount = (): number =>
      getRegistry().getInstancesMap(SharedBloc).get(sharedKey)?.refs.size ?? 0;

    const baselineConsumers = shared.consumerCount;
    const baselineSubs = sharedCh.live();
    const baselineRefs = refCount();

    const afterClearRows: number[] = [];
    const afterClearConsumers: number[] = [];
    const afterClearSubs: number[] = [];
    const afterClearRefs: number[] = [];

    for (let c = 0; c < CYCLES; c++) {
      list.create(ROWS);
      await flush();

      list.clear();
      await flush();
      afterClearRows.push(liveRowInstances());
      afterClearConsumers.push(shared.consumerCount);
      afterClearSubs.push(sharedCh.live());
      afterClearRefs.push(refCount());
    }

    handle.unmount();
    container.remove();
    getRegistry().release(
      SharedBloc as any,
      sharedKey,
      false,
      'depend-test-page-holder',
    );

    for (const n of afterClearRows) expect(n).toBe(0);
    for (const n of afterClearConsumers) {
      expect(n).toBeLessThanOrEqual(baselineConsumers + 2);
    }
    for (const n of afterClearSubs) {
      expect(n).toBeLessThanOrEqual(baselineSubs + 2);
    }
    for (const n of afterClearRefs) {
      expect(n).toBeLessThanOrEqual(baselineRefs + 2);
    }
  });
});
