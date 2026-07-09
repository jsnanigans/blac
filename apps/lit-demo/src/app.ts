import { component, html } from '@blac/lit';
import { CounterCard, CounterBoard } from './counter.ui';
import { TodoApp } from './todo.ui';

export const App = component(() => {
  return html`
    <main class="app">
      <header class="hero">
        <h1><span class="mark">@blac/lit</span></h1>
        <p class="tagline">render-once · fine-grained · blac is the backend</p>
      </header>

      <section>
        <h2>Shared instance</h2>
        <p class="hint">
          Both cards address the default instance — they move together.
        </p>
        <div class="board">${CounterCard()} ${CounterCard()}</div>
      </section>

      <section>
        <h2>Isolated instances · nested components</h2>
        <p class="hint">
          Each card owns its own Counter, keyed by id. Clicking one never
          touches another.
        </p>
        ${CounterBoard()}
      </section>

      <section>
        <h2>Todo · each / model / when / nested rows</h2>
        <p class="hint">
          Every row is a nested component sharing one TodoBloc — no props
          drilled, only an id.
        </p>
        ${TodoApp()}
      </section>
    </main>
  `;
});
