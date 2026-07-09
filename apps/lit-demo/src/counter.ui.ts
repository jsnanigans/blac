import { html } from '@blac/lit';
import { component } from './dev/component';
import { pulse } from './dev/pulse';
import { CounterBloc } from './counter.bloc';

export const CounterCard = component(CounterBloc, (c, ctx) => {
  return html`
    <article class="card">
      <header class="card__label">${ctx.args?.id ?? 'shared'}</header>
      <div class="card__value" ${pulse()}>${c.$.count}</div>
      <div class="card__controls">
        <button @click=${c.decrement} aria-label="decrement">−</button>
        <button class="primary" @click=${c.increment} aria-label="increment">
          +
        </button>
        <button class="ghost" @click=${c.reset}>reset</button>
      </div>
    </article>
  `;
});

// Nested: three isolated Counter instances, each keyed by a distinct id.
export const CounterBoard = component(() => {
  return html`
    <div class="board">
      ${CounterCard({ id: 'alpha' })} ${CounterCard({ id: 'beta' })}
      ${CounterCard({ id: 'gamma' })}
    </div>
  `;
});

export const CounterPage = component(() => {
  return html`
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
  `;
});
