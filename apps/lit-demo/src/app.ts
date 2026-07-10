import { html, select, match } from '@blac/lit';
import { component } from './dev/component';
import { RouterBloc, type Route } from './router/router.bloc';
import { Nav } from './router/nav.ui';
import { BasicsPage } from './basics.ui';
import { MarketPage } from './market/market.ui';
import { BenchmarkPage } from './benchmark/benchmark.ui';

export const App = component(RouterBloc, (r) => {
  return html`
    <main class="app">
      <header class="hero">
        <h1><span class="mark">@blac/lit</span></h1>
        <p class="tagline">
          render-once · fine-grained · watch what actually patches
        </p>
      </header>

      ${Nav()}

      <section class="page">
        ${
          // Each case is its OWN html template (distinct template identity), so
          // lit tears down the previous page's ComponentDirective and builds the
          // next one fresh. Returning the bare `Page()` directive here instead
          // would let lit reuse the same ComponentDirective instance — whose
          // render() short-circuits on `this.started` and returns the stale
          // first page (the "only updates after reload" bug).
          match(
            select(r, (s: { path: Route }) => s.path),
            {
              basics: () => html`<div class="route">${BasicsPage()}</div>`,
              market: () =>
                html`<div class="route route--market">${MarketPage()}</div>`,
              benchmark: () =>
                html`<div class="route route--benchmark">${BenchmarkPage()}</div>`,
            },
          )
        }
      </section>
    </main>
  `;
});
