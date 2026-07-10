import { describe, it, expect } from 'vite-plus/test';
import { html } from 'lit-html';
import { Cubit } from '@blac/core';
import { flush } from '@blac/core/testing';
import { component, mount, each, select, type Ctx } from './index';

class ListBloc extends Cubit<{ items: number[] }> {
  constructor() {
    super({ items: [] });
  }
  set = (items: number[]): void => {
    this.emit({ items });
  };
}

describe('component() lifecycle in a keyed list', () => {
  // Regression: a bare `component()` used as the direct item of `each`/`repeat`
  // used to leak. lit's `_$clear(isClearingValue=true)` skips disconnecting the
  // item-root directive, so `disconnected()` never fired and every acquired ref
  // / onMount cleanup stayed live forever. `component()` now wraps its directive
  // in a template so the removable item root is a TemplateInstance whose nested
  // directive always gets disconnected on removal.
  it('tears down every row connection when the list is cleared', async () => {
    let live = 0;
    const Row = component<{ id: number }>((ctx: Ctx<{ id: number }>) => {
      ctx.onMount(() => {
        live += 1;
        return () => {
          live -= 1;
        };
      });
      return html`<li>${ctx.args!.id}</li>`;
    });

    const list = new ListBloc();
    const container = document.createElement('ul');
    document.body.appendChild(container);
    const handle = mount(
      each(
        select(list, (s) => s.items),
        (id) => Row({ id }),
        (id) => id,
      ),
      container,
    );

    list.set([1, 2, 3, 4, 5]);
    await flush();
    expect(live).toBe(5);

    // Full clear: before the fix this stayed at 5 (leaked). Now it must drain.
    list.set([]);
    await flush();
    expect(live).toBe(0);

    // Re-populate and clear again to prove teardown is repeatable, not one-shot.
    list.set([6, 7]);
    await flush();
    expect(live).toBe(2);
    list.set([]);
    await flush();
    expect(live).toBe(0);

    handle.unmount();
    container.remove();
    expect(live).toBe(0);
  });

  it('tears down connections for removed rows on partial updates', async () => {
    let live = 0;
    const Row = component<{ id: number }>((ctx: Ctx<{ id: number }>) => {
      ctx.onMount(() => {
        live += 1;
        return () => {
          live -= 1;
        };
      });
      return html`<li>${ctx.args!.id}</li>`;
    });

    const list = new ListBloc();
    const container = document.createElement('ul');
    document.body.appendChild(container);
    const handle = mount(
      each(
        select(list, (s) => s.items),
        (id) => Row({ id }),
        (id) => id,
      ),
      container,
    );

    list.set([1, 2, 3]);
    await flush();
    expect(live).toBe(3);

    // Drop two rows; only the survivors' connections should remain.
    list.set([2]);
    await flush();
    expect(live).toBe(1);

    handle.unmount();
    container.remove();
    expect(live).toBe(0);
  });
});
