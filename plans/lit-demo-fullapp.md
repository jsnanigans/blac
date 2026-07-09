# lit-demo → full app + re-render visualization

Goal: grow `apps/lit-demo` from 2 sections (counter, todo) into a small multi-page
app with a top nav/router, add two ported "challenging" examples (Live-pricing /
cross-bloc, and a multi-bloc Dashboard), and add a **re-render visualization** that
shows exactly which DOM holes get patched — proving `@blac/lit`'s render-once,
fine-grained model.

## Key facts about @blac/lit (do not fight these)

- `component(render)` / `component(Bloc, (bloc, ctx) => ...)` bodies run **exactly
  once** (on mount). Reactivity lives in the *holes*, not the component body.
- Reactive holes: `bloc.$.a.b` (state-path binding), `select(bloc, (s,b)=>...)`
  (getter/computed), `when(binding, then, else)`, `each(binding, item=>..., key)`,
  `match(binding, cases, fallback)`, `model(binding, setter)` (two-way input).
- `ctx.use(Bloc, {args})` acquires a bloc inside a pure component; `ctx.onMount`,
  `ctx.onUnmount`, `ctx.effect(bloc, fn)` (coarse autorun).
- `component(...).local(args)` = a fresh mount-private instance under a unique key.
- **Cross-bloc `.track()` DOES NOT subscribe in lit** (base impl returns raw
  `[state, instance]`; only React replaces `.track()` per-consumer). So a
  coordinator bloc must **aggregate its deps into its own state** and let consumers
  `select` off that own state. See CheckoutBloc below.
- `watch(BlocClass, (inst) => ...)` from `@blac/core` returns a disposer; fires on
  the watched default instance's state changes. Use for cross-bloc aggregation.
- `bloc.$blac` holds identity (`.id`), lifecycle via `onSystemEvent('dispose', fn)`.

## Directory layout (all under apps/lit-demo/)

```
main.ts                      (rewrite: mount App + Hud)
src/
  styles.css                 (extend)
  app.ts                     (rewrite: nav + router match)
  dev/
    devStats.ts              (counters module — the viz backend)
    component.ts             (traced component wrapper — counts body execs)
    pulse.ts                 (MutationObserver flash directive)
    hud.ui.ts                (fixed HUD: body-execs vs DOM-patches vs FPS + Reset)
  router/
    router.bloc.ts           (RouterCubit over location.hash)
    nav.ui.ts                (top nav; active link highlighted)
  counter.bloc.ts            (keep)
  counter.ui.ts              (edit: add pulse round value/label)
  todo.bloc.ts               (keep)
  todo.ui.ts                 (edit: import traced component; pulse rows/counts)
  pricing/
    cart.bloc.ts
    fx.bloc.ts
    promo.bloc.ts
    checkout.bloc.ts         (aggregates cart+fx+promo into own state via watch)
    pricing.ui.ts            (CartEditor, FxTicker, PromoPicker, Receipt)
  dashboard/
    stats.bloc.ts
    activity.bloc.ts
    theme.bloc.ts            (blac keepAlive)
    dashboard.ui.ts          (StatsWidget, ActivityWidget, ThemeWidget + sim tick)
```

## dev/devStats.ts — the viz backend (CONTRACT — do not change signatures)

Plain module, no bloc (avoids emit feedback loops). rAF-free; the HUD polls it.

```ts
export interface DevStatsSnapshot { bodyExecs: number; patches: number; }
let bodyExecs = 0;
let patches = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export const devStats = {
  bumpBody(): void { bodyExecs++; notify(); },
  bumpPatch(): void { patches++; notify(); },
  reset(): void { bodyExecs = 0; patches = 0; notify(); },
  snapshot(): DevStatsSnapshot { return { bodyExecs, patches }; },
  subscribe(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); },
};
```

## dev/component.ts — traced component (CONTRACT)

Re-exports a `component` that wraps the render fn to `devStats.bumpBody()` on each
execution (proves render-once: body runs once per mount). Mirrors both overloads of
`@blac/lit`'s `component`. Everything in the demo imports `component` from
`../dev/component` (NOT from `@blac/lit`), so all component bodies are counted.

```ts
import { component as litComponent, type Ctx } from '@blac/lit';
import type { StateContainerConstructor, ExtractArgs } from '@blac/core';
import { devStats } from './devStats';
export type { Ctx };

export function component<T extends StateContainerConstructor>(
  Bloc: T, render: (bloc: any, ctx: Ctx<ExtractArgs<T>>) => unknown,
): ReturnType<typeof litComponent>;
export function component<A = unknown>(
  render: (ctx: Ctx<A>) => unknown,
): ReturnType<typeof litComponent>;
export function component(a: any, b?: any): any {
  if (typeof b === 'function') {
    return litComponent(a, (bloc: any, ctx: any) => { devStats.bumpBody(); return b(bloc, ctx); });
  }
  return litComponent((ctx: any) => { devStats.bumpBody(); return a(ctx); });
}
```

Note: keep re-exporting `html, select, when, each, match, model` from `@blac/lit`
directly at call sites — only `component` is wrapped.

## dev/pulse.ts — flash directive (CONTRACT: `pulse()` )

An element-part directive. Attach in a template: ``html`<span ${pulse()}>${bloc.$.x}</span>` ``.
Watches the host element's content mutations and flashes it + bumps `devStats.bumpPatch()`.

- Use `directive` + `AsyncDirective` from `lit-html/directive.js` /
  `lit-html/async-directive.js` (same imports the package uses).
- `update(part)`: on first call capture `part.element` (an `Element`), create a
  `MutationObserver` observing `{ childList: true, characterData: true, subtree: true }`.
  Return `nothing` from `render`.
- Observer callback: add class `is-pulsing` to the element, call
  `devStats.bumpPatch()`, and (clearing any prior timer) `setTimeout(() =>
  element.classList.remove('is-pulsing'), 450)`. Re-adding the class within the
  window should restart the animation (remove then add on next frame, or toggle a
  data attribute counter). Simplest robust restart: remove class, force reflow via
  `void el.offsetWidth`, re-add.
- Do **not** observe `attributes` (prevents the flash class from re-triggering).
- `disconnected()`: `observer.disconnect()` + clear timer. `reconnected()`:
  re-observe.
- Guidance to consumers: put `pulse()` on **leaf holes** (the specific span/cell
  that shows a reactive value), not big wrappers, so nested changes don't flash the
  parent. Subtree:true is fine because we guide placement.

## dev/hud.ui.ts — the HUD

A fixed-position panel (bottom-right). Built with the traced `component` (pure) but
its live numbers update via `devStats.subscribe` + a `ref`-driven manual DOM write,
plus an rAF FPS meter. Do NOT put `pulse()` anywhere in the HUD (would self-count).

Implementation approach (keeps it lit-idiomatic, avoids per-tick emits):
- Use `import { ref } from 'lit-html/directives/ref.js'` to grab the three number
  spans (`bodyExecs`, `patches`, `fps`).
- In `ctx.onMount`: subscribe to `devStats` and write `bodyExecs`/`patches` text on
  change; start an rAF loop computing FPS (copy the simple frame-delta approach) and
  write `fps` text; color fps (>=55 green, >=30 amber, else red).
- In `ctx.onUnmount`: unsubscribe + cancel rAF.
- Render a small legend: "green pulse = DOM hole patched · body execs stay flat =
  render-once" and a **Reset** button calling `devStats.reset()`.
- Markup uses class `hud`, children `.hud__row`, `.hud__k`, `.hud__v`, and a
  `<button class="ghost" @click=${() => devStats.reset()}>reset</button>`.

Export: `export const Hud = component((ctx) => { ... })`.

## router/router.bloc.ts

```ts
import { Cubit } from '@blac/core';
export type Route = 'counter' | 'todo' | 'pricing' | 'dashboard';
export const ROUTES: { path: Route; label: string }[] = [
  { path: 'counter', label: 'Counter' },
  { path: 'todo', label: 'Todo' },
  { path: 'pricing', label: 'Live Pricing' },
  { path: 'dashboard', label: 'Dashboard' },
];
interface RouterState { path: Route; }
const read = (): Route => {
  const h = (location.hash.replace(/^#\/?/, '') || 'counter') as Route;
  return ROUTES.some((r) => r.path === h) ? h : 'counter';
};
export class RouterBloc extends Cubit<RouterState> {
  constructor() {
    super({ path: read() });
    window.addEventListener('hashchange', this._onHash);
  }
  private _onHash = () => this.emit({ path: read() });
  navigate = (path: Route) => { location.hash = `/${path}`; };
}
```
(RouterBloc is the default shared instance. keepAlive not required — App holds it.)

## router/nav.ui.ts

`export const Nav = component(RouterBloc, (r) => ...)`. Render `ROUTES.map` to
`<button class="nav__link" @click=${() => r.navigate(path)}>`. Mark active with a
reactive class: bind `class` via
`` html`<button class=${select(r, s => s.path === path ? 'nav__link active' : 'nav__link')} ...>` `` —
put a `pulse()` is NOT needed on nav. Layout class `nav`.

## app.ts (rewrite)

```ts
export const App = component(RouterBloc, (r) => html`
  <main class="app">
    <header class="hero">
      <h1><span class="mark">@blac/lit</span></h1>
      <p class="tagline">render-once · fine-grained · watch what actually patches</p>
    </header>
    ${Nav()}
    <section class="page">
      ${match(select(r, (s) => s.path), {
        counter: () => CounterPage(),
        todo: () => TodoApp(),
        pricing: () => PricingPage(),
        dashboard: () => DashboardPage(),
      })}
    </section>
  </main>
`);
```
Where `CounterPage` = the existing shared+isolated counter sections wrapped in one
pure component (move current app.ts counter markup here), `TodoApp` existing,
`PricingPage`/`DashboardPage` new. `match` unmounts the previous page (disposes its
non-keepAlive blocs) — good lifecycle demo.

## main.ts (rewrite)

```ts
import './src/styles.css';
import { mount } from '@blac/lit';
import { html } from '@blac/lit';
import { App } from './src/app';
import { Hud } from './src/dev/hud.ui';
const root = document.getElementById('app');
if (!root) throw new Error('missing #app');
mount(html`${App()}${Hud()}`, root);
```

## pricing/*  (cross-bloc, aggregation pattern)

Port CartBloc/FxRateBloc/PromoBloc from apps/examples 12-cross-bloc verbatim in
spirit (catalog, setQty, addProduct, subtotalEur/itemCount getters; fx random-walk
interval start/stop; promo tiers + TIER_DISCOUNT/TIER_LABEL/TIERS).

**checkout.bloc.ts** — the key change vs the React example: aggregate into own state.

```ts
import { Cubit, watch } from '@blac/core';
import { CartBloc } from './cart.bloc';
import { FxRateBloc } from './fx.bloc';
import { PromoBloc, TIER_DISCOUNT } from './promo.bloc';
export interface CheckoutState {
  liveFx: boolean;
  subtotalEur: number;
  discountPct: number;
  usdPerEur: number;
  totalUsd: number;
}
export class CheckoutBloc extends Cubit<CheckoutState> {
  private cart = this.depend(CartBloc);
  private fx = this.depend(FxRateBloc);
  private promo = this.depend(PromoBloc);
  private frozenRate = 1.08;
  constructor() {
    super({ liveFx: true, subtotalEur: 0, discountPct: 0, usdPerEur: 1.08, totalUsd: 0 });
    const stops = [
      watch(CartBloc, () => this.recompute()),
      watch(FxRateBloc, () => this.recompute()),
      watch(PromoBloc, () => this.recompute()),
    ];
    // CONFIRMED: `this.onSystemEvent('dispose', fn)` is the correct protected
    // lifecycle hook (StateContainer.ts:720). Returns a disposer; we don't need it.
    this.onSystemEvent('dispose', () => stops.forEach((s) => s()));
    this.recompute();
  }
  private recompute = () => {
    const cart = this.cart.untracked();
    const promo = this.promo.untracked();
    const subtotalEur = cart.subtotalEur;
    const discountPct = TIER_DISCOUNT[promo.state.tier];
    const usdPerEur = this.state.liveFx ? this.fx.untracked().state.usdPerEur : this.frozenRate;
    const totalUsd = subtotalEur * (1 - discountPct) * usdPerEur;
    this.patch({ subtotalEur, discountPct, usdPerEur, totalUsd });
  };
  toggleLiveFx = () => {
    if (this.state.liveFx) {
      this.frozenRate = this.fx.untracked().state.usdPerEur;
      this.patch({ liveFx: false });
    } else { this.patch({ liveFx: true }); }
    this.recompute();
  };
}
```
IMPLEMENTER: verify `onSystemEvent('dispose', fn)` is the correct lifecycle hook name
on StateContainer (grep packages/blac-core/src for `onSystemEvent`); if the signature
differs, adapt. If `watch` fires synchronously on subscribe, the extra `recompute()`
is harmless. Do not leave watchers undisposed.

**pricing.ui.ts** components (all traced `component`, liberal `pulse()` on value holes):
- `FxTicker` = `component(FxRateBloc, (fx, ctx) => ...)`: on `ctx.onMount` call
  `fx.start()`, on `ctx.onUnmount` `fx.stop()`. Show `fx.$.usdPerEur` and `fx.$.ticks`
  each wrapped in `pulse()` — these flash every 1.5s.
- `CartEditor` = `component(CartBloc, (cart) => ...)`: `each` over `cart.$.lines`
  (key by id) rendering a row with qty steppers (`cart.setQty`), name, price. Put
  `pulse()` on each line's qty cell. Add-product buttons from CART_CATALOG.
- `PromoPicker` = `component(PromoBloc, (p) => ...)`: TIERS buttons calling
  `p.setTier`; active tier highlighted via `select`.
- `Receipt` = `component(CheckoutBloc, (c) => ...)`: rows for subtotal (EUR),
  discount %, rate, **total USD** — each value hole wrapped in `pulse()`. A
  toggle button `@click=${c.toggleLiveFx}` labelled from `select(c, s => s.liveFx)`.
  **Teaching moment**: the FX ticker flashes every tick and the Receipt's rate+total
  flash with it, but the Cart line rows DO NOT flash — cross-bloc, fine-grained.
- `PricingPage` = pure `component` laying out FxTicker + CartEditor + PromoPicker +
  Receipt in a grid, with a `.hint` explaining what to watch.

## dashboard/*  (multi-bloc isolation)

Port StatsCubit (rename StatsBloc; keep `simulateUpdate`; `formattedRevenue` getter
via `select`), ActivityCubit→ActivityBloc (addEntry, entries), ThemeCubit→ThemeBloc
(`blac({ keepAlive: true })`, mode/accent/fontSize). Drop AnalyticsPlugin (skip the
plugin — out of scope).

**dashboard.ui.ts**:
- `StatsWidget` = `component(StatsBloc, ...)`: three stat tiles bound to
  `stats.$.visitors/revenue/orders` (each in `pulse()`), a "simulate" button, and an
  optional `ctx.onMount` interval calling `simulateUpdate()` every 2s (store id,
  clear in `onUnmount`). Only these tiles flash on tick.
- `ThemeWidget` = `component(ThemeBloc, ...)`: mode toggle, accent color input
  (`model` bound to `theme.$.accentColor`), fontSize buttons. `pulse()` on the
  displayed mode/accent.
- `ActivityWidget` = `component(ActivityBloc, ...)`: `each` over `activity.$.entries`
  (key by id); an "add entry" button. New rows flash.
- `DashboardPage` = pure `component` grid of the three widgets + `.hint`. The point:
  the Stats interval flashes ONLY the stats tiles; Theme + Activity stay calm.

## styles.css additions

- Pulse: `.is-pulsing { animation: blac-pulse 0.45s ease; }` and
  `@keyframes blac-pulse { from { background: rgba(124,157,255,.45); box-shadow: 0 0 0 3px rgba(124,157,255,.35);} to { background: transparent; box-shadow: 0 0 0 3px transparent; } }`
  Also give pulsed holes a base `border-radius: 6px; transition: background .2s;` via a
  shared class if helpful (or rely on animation only).
- `.nav` (flex row, gap, centered, wrap), `.nav__link` (chip-like button),
  `.nav__link.active` (accent bg).
- `.hud` fixed bottom-right, dark glass panel, mono font, small; `.hud__row` flex
  space-between; `.hud__v` bold; fps color set inline by JS.
- `.page` spacing; pricing `.pricing-grid` and dashboard `.dash-grid`
  (responsive `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))`).
- Reuse existing `.card`, `.board`, `.todo*`, buttons.
- Stat tile `.stat` / `.stat__value` / `.stat__label`; receipt `.receipt`,
  `.receipt__row`, `.receipt__total`.

## Verification (orchestrator runs, with user OK)

- `cd apps/lit-demo && vp run format:check` then a build/typecheck (`vp build`) —
  ONLY after the user approves running it (global rule: no builds without permission).
- Manual: `vp dev` on port 3010, click through nav, watch the HUD (patches climb,
  body-execs stay flat), confirm fine-grained flashing.

## Constraints for all implementers

- Import `component` from `../dev/component` (relative depth varies per folder), and
  `html/select/when/each/match/model/nothing` from `@blac/lit`. `pulse` from the dev
  folder. `devStats` from dev.
- Do NOT run tests / typechecks / builds / format (orchestrator does that).
- Do NOT commit.
- Match existing code style (2-space, single quotes, arrow-method blocs).
</content>
</invoke>
