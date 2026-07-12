import { describe, it, expect } from 'vite-plus/test';
import { html } from 'lit-html';
import { Cubit } from '@blac/core';
import { flush } from '@blac/core/testing';
import { component, mount, each, select } from './index';
import { __recomputeProbe, __registerProbe } from './internal/binding-session';

// Regression gate for the recompute fan-out fix (see
// plans/blac-lit-recompute-fanout.md). A single-row / small op on a large
// keyed list must wake O(rows-actually-changed) bindings, NOT O(N):
//   - the per-tick memo in BindingSession collapses the double-compute, and
//   - ComponentDirective returning `noChange` for unchanged identity stops an
//     `each`/`repeat` reorder from re-rendering every sibling row.
// The idiomatic byId/order model (per-key leaf tracking) is what lets the
// tracker wake only the changed rows in the first place.

interface Row {
  id: number;
  label: string;
  selected: boolean;
}
interface S {
  order: number[];
  byId: Record<number, Row>;
}

class Bench extends Cubit<S> {
  #selectedId: number | null = null;
  constructor() {
    super({ order: [], byId: {} });
  }
  run = (n: number): void => {
    const order: number[] = [];
    const byId: Record<number, Row> = {};
    for (let i = 1; i <= n; i++) {
      order.push(i);
      byId[i] = { id: i, label: `row ${i}`, selected: false };
    }
    this.#selectedId = null;
    this.emit({ order, byId });
  };
  updateEveryTenth = (): void => {
    const byId = { ...this.state.byId };
    for (let i = 0; i < this.state.order.length; i += 10) {
      const id = this.state.order[i];
      byId[id] = { ...byId[id], label: byId[id].label + ' !!!' };
    }
    this.patch({ byId }); // order ref unchanged
  };
  swapRows = (a: number, b: number): void => {
    const order = this.state.order.slice(0);
    const t = order[a];
    order[a] = order[b];
    order[b] = t;
    this.patch({ order }); // byId ref unchanged
  };
  select = (id: number): void => {
    const byId = { ...this.state.byId };
    if (this.#selectedId !== null && byId[this.#selectedId]) {
      byId[this.#selectedId] = { ...byId[this.#selectedId], selected: false };
    }
    if (byId[id]) byId[id] = { ...byId[id], selected: true };
    this.#selectedId = id;
    this.patch({ byId }); // order ref unchanged
  };
  remove = (id: number): void => {
    const order = this.state.order.filter((x) => x !== id);
    const byId = { ...this.state.byId };
    delete byId[id];
    if (this.#selectedId === id) this.#selectedId = null;
    this.patch({ order, byId });
  };
}

const Row = component<{ id: number }>((ctx) => {
  const b = ctx.use(Bench);
  const id = ctx.args!.id;
  return html`
    <tr class=${select(b, (s: S) => (s.byId[id]?.selected ? 'selected' : ''))}>
      <td class="id">${id}</td>
      <td class="label">${select(b, (s: S) => s.byId[id]?.label ?? '')}</td>
    </tr>
  `;
});

const Page = component(
  Bench,
  (b) =>
    html`<table>
      <tbody>
        ${each(
          select(b, (s: S) => s.order),
          (id: number) => Row({ id }),
          (id: number) => id,
        )}
      </tbody>
    </table>`,
);

async function mountBench(): Promise<{
  bloc: Bench;
  container: HTMLElement;
  handle: { unmount(): void };
}> {
  let bloc!: Bench;
  const App = component(Bench, (b) => {
    bloc = b as unknown as Bench;
    return Page();
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = mount(App(), container);
  await flush();
  return { bloc, container, handle };
}

const rows = (c: HTMLElement) => Array.from(c.querySelectorAll('tbody tr'));
const idAt = (c: HTMLElement, i: number) =>
  rows(c)[i].querySelector('.id')!.textContent!.trim();
const labelAt = (c: HTMLElement, i: number) =>
  rows(c)[i].querySelector('.label')!.textContent!.trim();

describe('recompute budget: single-row ops stay O(changed), not O(N)', () => {
  it('wakes only the rows that actually change', async () => {
    const N = 100;
    const { bloc, container, handle } = await mountBench();
    bloc.run(N);
    await flush();

    const measure = async (
      fn: () => void,
    ): Promise<{ recompute: number; register: number }> => {
      __recomputeProbe.reset();
      __registerProbe.reset();
      fn();
      await flush();
      return {
        recompute: __recomputeProbe.count(),
        register: __registerProbe.count(),
      };
    };

    // 10 of 100 rows change their label; order ref unchanged.
    const update = await measure(() => bloc.updateEveryTenth());
    expect(update.recompute).toBeLessThanOrEqual(20); // ~10, must be << N
    expect(update.register).toBeLessThanOrEqual(update.recompute); // shape unchanged → ~0 re-registers

    // Two rows reorder; no byId entry changes.
    const swap = await measure(() => bloc.swapRows(1, 98));
    expect(swap.recompute).toBeLessThanOrEqual(5); // O(1), must be << N
    expect(swap.register).toBeLessThanOrEqual(swap.recompute);

    // One row's selection flips.
    const sel = await measure(() => bloc.select(50));
    expect(sel.recompute).toBeLessThanOrEqual(5); // O(1)
    expect(sel.register).toBeLessThanOrEqual(sel.recompute);

    // One row removed.
    const rem = await measure(() => bloc.remove(50));
    expect(rem.recompute).toBeLessThanOrEqual(5); // O(1)
    expect(rem.register).toBeLessThanOrEqual(rem.recompute);

    handle.unmount();
    container.remove();
  });
});

describe('correctness under noChange (rows still render/reorder right)', () => {
  it('keeps content correct across update / swap / select / remove', async () => {
    const { bloc, container, handle } = await mountBench();
    bloc.run(5);
    await flush();
    expect(rows(container).map((_, i) => idAt(container, i))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);

    // update: id 1 (order[0]) gets ' !!!'; others unchanged.
    bloc.updateEveryTenth();
    await flush();
    expect(labelAt(container, 0)).toBe('row 1 !!!');
    expect(labelAt(container, 1)).toBe('row 2');

    // swap positions 1 and 3: order [1,4,3,2,5]. DOM must reorder, labels follow ids.
    bloc.swapRows(1, 3);
    await flush();
    expect(rows(container).map((_, i) => idAt(container, i))).toEqual([
      '1',
      '4',
      '3',
      '2',
      '5',
    ]);
    expect(labelAt(container, 1)).toBe('row 4');
    expect(labelAt(container, 3)).toBe('row 2');

    // select id 4 (now at position 1).
    bloc.select(4);
    await flush();
    expect(rows(container)[1].className.trim()).toBe('selected');
    expect(rows(container)[0].className.trim()).toBe('');

    // reselect id 3 clears the old selection.
    bloc.select(3);
    await flush();
    expect(rows(container)[1].className.trim()).toBe('');
    expect(rows(container)[2].className.trim()).toBe('selected');

    // remove id 4.
    bloc.remove(4);
    await flush();
    expect(rows(container).map((_, i) => idAt(container, i))).toEqual([
      '1',
      '3',
      '2',
      '5',
    ]);

    handle.unmount();
    container.remove();
  });
});
