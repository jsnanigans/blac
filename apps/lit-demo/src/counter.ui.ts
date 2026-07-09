import { component, html } from '@blac/lit';
import { CounterBloc } from './counter.bloc';

export const CounterCard = component(CounterBloc, (c, ctx) => {
  return html`
    <article class="card">
      <header class="card__label">${ctx.args?.id ?? 'shared'}</header>
      <div class="card__value">${c.$.count}</div>
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
