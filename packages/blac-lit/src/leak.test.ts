import { describe, it, expect } from 'vite-plus/test';
import { html } from 'lit-html';
import { Cubit, getRegistry, resolveInstanceKey } from '@blac/core';
import { flush } from '@blac/core/testing';
import { component, mount, each, select, type Ctx } from './index';

// ---------------------------------------------------------------------------
// Headless leak harness.
//
// The lit-demo benchmark's "Create 1,000 rows" replaces the whole data array
// with FRESH ids every run, so the keyed `each`/`repeat` removes all 1,000 old
// rows and builds 1,000 new ones each cycle. A leak shows up as some retained
// resource that fails to return to baseline across cycles. We measure three
// deterministic, layer-specific counters (no flaky heap sampling needed):
//
//   1. registry instances of a per-row bloc   -> @blac/core ref/dispose leak
//   2. `bloc.consumerCount` (registered paths) -> dirtytalk consumer leak
//   3. live raw channel subscriptions          -> binding-session subscribe leak
//
// GC/heap is corroboration only, gated behind --expose-gc.
// ---------------------------------------------------------------------------

let nextId = 1;
const freshIds = (n: number): number[] =>
  Array.from({ length: n }, () => nextId++);

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

const consumerCount = (bloc: unknown): number =>
  (bloc as { consumerCount: number }).consumerCount;

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

// A per-row bloc so each row owns a distinct registry instance. If a row's
// teardown never fires, its instance is never released/disposed and the
// registry instance count for RowBloc grows without bound.
class RowBloc extends Cubit<{ id: number }> {
  static create(args: { id: number }): RowBloc {
    return new RowBloc(args.id);
  }
  constructor(id: number) {
    super({ id });
  }
}

const ROWS = 200; // enough to be decisive, small enough to stay fast
const CYCLES = 6;

describe('blac-lit create/clear leak harness', () => {
  it('per-row bloc instances are released after each clear (no registry growth)', async () => {
    const list = new ListBloc();
    const container = document.createElement('div');
    document.body.appendChild(container);

    const Row = component(RowBloc, (bloc) => {
      return html`<div>${select(bloc, (s) => s.id)}</div>`;
    });

    const handle = mount(
      each(
        select(list, (s) => s.ids),
        (id) => (Row as any)({ id }),
        (id) => id,
      ),
      container,
    );

    const liveInstances = (): number =>
      getRegistry().getInstancesMap(RowBloc).size;

    const afterCreate: number[] = [];
    const afterClear: number[] = [];

    for (let c = 0; c < CYCLES; c++) {
      list.create(ROWS);
      await flush();
      afterCreate.push(liveInstances());

      list.clear();
      await flush();
      afterClear.push(liveInstances());
    }

    // eslint-disable-next-line no-console
    console.log('[RowBloc] live instances after create:', afterCreate);
    // eslint-disable-next-line no-console
    console.log('[RowBloc] live instances after clear :', afterClear);

    handle.unmount();
    container.remove();

    // After every clear the per-row instances must be fully released.
    for (const n of afterClear) expect(n).toBe(0);
    // And a create must never accumulate beyond one screen of rows.
    for (const n of afterCreate) expect(n).toBeLessThanOrEqual(ROWS);
  });

  it('registered consumers + raw channel subs return to baseline (mirrors benchmark singleton)', async () => {
    // Mirrors BenchmarkRow: rows depend on a page-singleton bloc via `use`
    // + `select`, so every row registers a consumer and a raw subscription on
    // that one bloc. These must drain on clear. We hold a permanent ref on the
    // singleton (as a live page would) so it is never auto-disposed, and drive
    // it directly — exactly the same instance rows resolve via `ctx.use`.
    const sharedKey = resolveInstanceKey(ListBloc as any, undefined as any);
    const shared = getRegistry().acquire(ListBloc as any, sharedKey, {
      canCreate: true,
      countRef: true,
      refId: 'leak-test-page-holder',
    }) as ListBloc;
    const sharedCh = instrumentChannel(shared);
    const container = document.createElement('div');
    document.body.appendChild(container);

    const Row = component<{ id: number }>((ctx: Ctx<{ id: number }>) => {
      const b = ctx.use(ListBloc); // resolves to `shared`
      const id = ctx.args!.id;
      return html`<div>
        ${select(b, (s) => (s.ids.includes(id) ? 'in' : 'out'))}
      </div>`;
    });

    const handle = mount(
      each(
        select(shared, (s) => s.ids),
        (id) => Row({ id }),
        (id) => id,
      ),
      container,
    );

    // The benchmark's real leak signal: every row `ctx.use(...)` acquires a
    // ref (unique refId) on the singleton; if the row never disconnects, that
    // ref is never released and the entry's `refs` Map grows without bound
    // (and eventually trips core's assertRefLimit).
    const refCount = (): number =>
      getRegistry().getInstancesMap(ListBloc).get(sharedKey)?.refs.size ?? 0;

    const baselineConsumers = consumerCount(shared);
    const baselineSubs = sharedCh.live();
    const baselineRefs = refCount();

    const consumersAfterClear: number[] = [];
    const subsAfterClear: number[] = [];
    const consumersAfterCreate: number[] = [];
    const refsAfterCreate: number[] = [];
    const refsAfterClear: number[] = [];

    for (let c = 0; c < CYCLES; c++) {
      shared.create(ROWS);
      await flush();
      consumersAfterCreate.push(consumerCount(shared));
      refsAfterCreate.push(refCount());

      shared.clear();
      await flush();
      consumersAfterClear.push(consumerCount(shared));
      subsAfterClear.push(sharedCh.live());
      refsAfterClear.push(refCount());
    }

    // eslint-disable-next-line no-console
    console.log('[shared] baseline refs:', baselineRefs);
    // eslint-disable-next-line no-console
    console.log('[shared] refs after create:', refsAfterCreate);
    // eslint-disable-next-line no-console
    console.log('[shared] refs after clear :', refsAfterClear);

    // eslint-disable-next-line no-console
    console.log(
      '[shared] baseline consumers/subs:',
      baselineConsumers,
      baselineSubs,
    );
    // eslint-disable-next-line no-console
    console.log('[shared] consumers after create:', consumersAfterCreate);
    // eslint-disable-next-line no-console
    console.log('[shared] consumers after clear :', consumersAfterClear);
    // eslint-disable-next-line no-console
    console.log('[shared] raw subs after clear  :', subsAfterClear);
    // eslint-disable-next-line no-console
    console.log('[shared] raw subs after create :', sharedCh.live());

    handle.unmount();
    container.remove();
    getRegistry().release(
      ListBloc as any,
      sharedKey,
      false,
      'leak-test-page-holder',
    );

    // The tell-tale: after each clear, consumer/sub counts must fall back to
    // baseline. Monotonic growth across cycles == the leak.
    for (const n of consumersAfterClear) {
      expect(n).toBeLessThanOrEqual(baselineConsumers + 2);
    }
    for (const n of subsAfterClear) {
      expect(n).toBeLessThanOrEqual(baselineSubs + 2);
    }
    // The decisive benchmark signal: refs must not accumulate across cycles.
    for (const n of refsAfterClear) {
      expect(n).toBeLessThanOrEqual(baselineRefs + 2);
    }
  });

  // Real memory monitor. Run with: NODE_OPTIONS='--expose-gc' vp test run.
  // Catches retention the deterministic counters can't see: detached DOM held
  // by a live part, directive/session closures, etc. WeakRef liveness after a
  // forced GC is the ground truth for "did the object graph actually free?".
  it('reclaims the per-row object graph after clear (WeakRef + heap)', async () => {
    const gc = (globalThis as { gc?: () => void }).gc;
    const forceGc = async (): Promise<void> => {
      if (!gc) return;
      // Two passes + a macrotask lets FinalizationRegistry/WeakRef settle.
      gc();
      await new Promise((r) => setTimeout(r, 0));
      gc();
    };

    const list = new ListBloc();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const Row = component(
      RowBloc,
      (bloc) => html`<div>${select(bloc, (s) => s.id)}</div>`,
    );
    const handle = mount(
      each(
        select(list, (s) => s.ids),
        (id) => (Row as any)({ id }),
        (id) => id,
      ),
      container,
    );

    // Capture WeakRefs to one cohort of row instances, then evict them.
    list.create(ROWS);
    await flush();
    const cohort = [...getRegistry().getInstancesMap(RowBloc).values()].map(
      (e) => new WeakRef(e.instance as object),
    );
    expect(cohort.length).toBe(ROWS);

    list.clear();
    await flush();
    await forceGc();

    const alive = cohort.filter((r) => r.deref() !== undefined).length;
    // eslint-disable-next-line no-console
    console.log(
      `[gc] row instances still alive after clear+gc: ${alive}/${ROWS}` +
        (gc ? '' : ' (gc unavailable — informational)'),
    );

    // Heap trend across many create/clear cycles.
    const heap: number[] = [];
    for (let c = 0; c < 12; c++) {
      list.create(ROWS);
      await flush();
      list.clear();
      await flush();
      await forceGc();
      heap.push(process.memoryUsage().heapUsed);
    }
    const mb = (b: number): number => Math.round((b / 1048576) * 10) / 10;
    // eslint-disable-next-line no-console
    console.log('[gc] heapUsed MB per cycle:', heap.map(mb));
    const growthMb = mb(heap[heap.length - 1] - heap[0]);
    // eslint-disable-next-line no-console
    console.log(`[gc] heap growth first→last: ${growthMb} MB over 12 cycles`);

    handle.unmount();
    container.remove();

    if (gc) {
      // Ground truth: nothing must retain the evicted cohort.
      expect(alive).toBe(0);
    }
  });

  it('replace mode (create→create, all-new keys, never empty) holds row count flat', async () => {
    // The exact benchmark pattern: `run()` replaces the whole data array with
    // fresh ids every time and never clears. Each cycle the keyed `each` removes
    // all old rows and builds all-new ones. The primary fix must release the
    // removed rows on per-key removal (not just on full clear), so the live
    // instance count stays flat instead of climbing ROWS per cycle.
    const list = new ListBloc();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const Row = component(
      RowBloc,
      (bloc) => html`<div>${select(bloc, (s) => s.id)}</div>`,
    );
    const handle = mount(
      each(
        select(list, (s) => s.ids),
        (id) => (Row as any)({ id }),
        (id) => id,
      ),
      container,
    );

    const counts: number[] = [];
    for (let c = 0; c < CYCLES; c++) {
      list.create(ROWS); // full replacement, all-new keys, NEVER empty
      await flush();
      counts.push(getRegistry().getInstancesMap(RowBloc).size);
    }
    // eslint-disable-next-line no-console
    console.log('[replace] live instances per cycle:', counts);

    handle.unmount();
    container.remove();

    // Flat at ROWS — never ROWS*cycle. (Heap may still creep from lit-html's
    // persistent `repeat` retaining removed ChildParts, which is a lit-html
    // concern, not a blac ref/instance leak.)
    for (const n of counts) expect(n).toBe(ROWS);
  });

  it('replace mode does not orphan comment markers in the live tree', async () => {
    // Direct regression for the lit-html `repeat` orphan-marker leak: every
    // all-new-key replace removed all old rows, and lit left one `_$endNode`
    // comment per removed row in the container. `each` must sweep them by
    // collapsing to `nothing` on a disjoint turnover, so the live comment-node
    // count returns to baseline each cycle instead of growing by ROWS.
    const list = new ListBloc();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const Row = component(
      RowBloc,
      (bloc) => html`<div>${select(bloc, (s) => s.id)}</div>`,
    );
    const handle = mount(
      each(
        select(list, (s) => s.ids),
        (id) => (Row as any)({ id }),
        (id) => id,
      ),
      container,
    );

    const countComments = (root: Node): number => {
      let n = 0;
      const walk = (node: Node): void => {
        for (const child of Array.from(node.childNodes)) {
          if (child.nodeType === 8) n += 1;
          walk(child);
        }
      };
      walk(root);
      return n;
    };

    const comments: number[] = [];
    for (let c = 0; c < CYCLES; c++) {
      list.create(ROWS); // full replacement, all-new keys, never empty
      await flush();
      comments.push(countComments(container));
    }
    // eslint-disable-next-line no-console
    console.log('[replace] live comment nodes per cycle:', comments);

    handle.unmount();
    container.remove();

    // Flat, not ROWS*cycle. Allow small constant slack for lit structural
    // markers; the leak was +ROWS per cycle (200), so a tight bound is decisive.
    const baseline = comments[0];
    for (const n of comments) expect(n).toBeLessThanOrEqual(baseline + 5);
  });
});
