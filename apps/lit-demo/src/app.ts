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
          match(
            select(r, (s: { path: Route }) => s.path),
            {
              basics: () => BasicsPage(),
              market: () => MarketPage(),
              benchmark: () => BenchmarkPage(),
            },
          )
        }
      </section>
    </main>
  `;
});
