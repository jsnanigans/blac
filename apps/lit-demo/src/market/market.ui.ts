import { component, type Ctx } from '../dev/component';
import { pulse } from '../dev/pulse';
import { html, select, each, model } from '@blac/lit';
import { MarketBloc, type MarketState, type Instrument } from './market.bloc';

function formatPrice(price: number): string {
  return price >= 1 ? `$${price.toFixed(2)}` : `$${price.toFixed(4)}`;
}

// Nested leaf: shares the single MarketBloc; only receives its row index via
// args, and reads everything through `select` (no `.$` proxy from `ctx.use`).
const MarketRow = component<{ symbol: string; name: string; index: number }>(
  (ctx: Ctx<{ symbol: string; name: string; index: number }>) => {
    const m = ctx.use(MarketBloc);
    const i = ctx.args!.index;
    return html`
      <tr>
        <td class="cell sym">${ctx.args!.symbol}</td>
        <td class="cell name">${ctx.args!.name}</td>
        <td
          class=${select(m, (s: MarketState) => {
            const it = s.instruments[i];
            return it.price > it.prev
              ? 'cell up'
              : it.price < it.prev
                ? 'cell down'
                : 'cell';
          })}
          ${pulse()}
        >
          ${select(m, (s: MarketState) => formatPrice(s.instruments[i].price))}
        </td>
        <td class="cell change" ${pulse()}>
          ${select(m, (s: MarketState) => {
            const it = s.instruments[i];
            const pct = ((it.price - it.open) / it.open) * 100;
            return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
          })}
        </td>
      </tr>
    `;
  },
);

export const MarketPage = component(MarketBloc, (m, ctx) => {
  ctx.onMount(() => {
    m.start();
    return () => m.stop();
  });
  return html`
    <div class="page">
      <div class="market-toolbar">
        <button class="primary" @click=${m.toggle}>
          ${select(m, (s: MarketState) => (s.running ? 'Pause' : 'Start'))}
        </button>
        <input
          type="range"
          min="60"
          max="6000"
          step="60"
          ${model(m.$.ratePerSec, (v: number) => m.setRate(v))}
        />
        <span ${pulse()}
          >${select(m, (s: MarketState) => s.ratePerSec)} ticks/sec</span
        >
        <span ${pulse()}
          >${select(m, (s: MarketState) => s.applied)} applied</span
        >
      </div>

      <p class="hint">
        Every frame a batch of instruments re-prices — but only the cells
        whose value actually changed flash. Watch the HUD: DOM patches track
        real changes, body execs stay flat. This is 48 rows updating
        thousands of times a second, render-once.
      </p>

      <table class="market">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Name</th>
            <th>Price</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          ${each(
            select(m, (s: MarketState) => s.instruments),
            (it: Instrument, i: number) =>
              MarketRow({ symbol: it.symbol, name: it.name, index: i }),
            (it: Instrument) => it.symbol,
          )}
        </tbody>
      </table>
    </div>
  `;
});
