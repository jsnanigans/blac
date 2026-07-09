import { html } from '@blac/lit';
import { component } from './dev/component';
import { CounterPage } from './counter.ui';
import { TodoApp } from './todo.ui';

// Gentle on-ramp: the canonical counter + todo, wired to the same pulse/HUD
// instrumentation as the heavier demos so the render-once story reads from the
// very first click.
export const BasicsPage = component(() => {
  return html`
    ${CounterPage()}

    <section>
      <h2>Todo · each / model / when / nested rows</h2>
      <p class="hint">
        Every row is a nested component sharing one TodoBloc — no props drilled,
        only an id. Toggle or edit one row and watch only that row flash.
      </p>
      ${TodoApp()}
    </section>
  `;
});
