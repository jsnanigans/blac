# `@blac/lit` — Design Prototype

> Status: **design draft** · Audience: blac maintainers · Companion deliverable: a `blac-lit` counter starter app (parallel to the default React counter).

---

## 1. Context — why this package

blac-core is already a **complete reactive backend**: state, fine-grained path tracking, instance registry + ref-counting, lifecycle, plugins, cross-bloc DI. The only thing it doesn't do is paint pixels.

Every framework binding we could pick (React, Solid, Svelte, Vue) ships _its own_ reactivity system, so most of the adapter's code exists to reconcile two competing models. `@blac/react` is the proof: per-consumer proxies, a tracker, `useSyncExternalStore`, and `APPLY_DEPS`/`REMOVE_DEPS_OWNER` plumbing — nearly all of it there to fake fine-grained updates on top of React's "re-run the whole component" model.

**lit-html is not a framework — it's a renderer.** Tagged-template → real DOM, efficient part-level diffing, zero state management, ~3–4 kB. That makes it the ideal paint layer for blac: blac owns _all_ state and decides _when_ to update; lit-html just owns _what the DOM looks like_.

The bridge is tiny because blac's subscription primitive is already effect-shaped:

```ts
// @dirtytalk/structural — container.ts
subscribe(interest: () => PathSet, cb: (dirty: PathSet) => void): () => void
```

You declare _which paths_ you care about; `cb` fires when any of them change. Wire that `cb` to `part.setValue()` and you have fine-grained DOM updates with **no virtual DOM and no re-render**. This is the whole idea.

### Design goals

1. **blac is the only source of truth.** The binding adds zero state primitives of its own.
2. **Render once, update forever.** A component body executes a single time; reactive "holes" update themselves. The opposite of the React re-render loop.
3. **Fine-grained by default.** Reuse blac's tracker so a binding subscribes to _exactly_ the paths it reads — including getters.
4. **Beautiful, tiny, compiler-free.** Pure runtime, fully tree-shakeable, ~1 kB of glue over lit-html. No build step, no JSX transform.
5. **Idiomatic blac.** Blocs are authored exactly as today (`Cubit`, arrow-field actions, `patch`/`emit`, getters for derived state, `static key`).

---

## 2. Mental model

```
   ┌─────────────┐   reads (tracked)    ┌──────────────┐   setValue()   ┌──────────┐
   │  blac Bloc  │ ───────────────────► │   Binding    │ ─────────────► │ DOM part │
   │  (backend)  │ ◄─────────────────── │ (lit part +  │                │ (a text  │
   │  state +    │   channel.subscribe  │  subscription)│                │  node,   │
   │  actions    │      (PathSet)       └──────────────┘                │  attr…)  │
   └─────────────┘                                                       └──────────┘
```

A **component** runs its body once and returns a lit template. Anywhere you read reactive state you leave a **Binding** — a self-updating hole. Each Binding:

1. runs your read under blac's structural **tracker** → collects a `PathSet`,
2. `channel.subscribe(() => pathSet, …)` on the bloc,
3. calls `part.setValue(newValue)` when those paths go dirty,
4. releases the registry ref + unsubscribes when its DOM part disconnects.

Nothing else re-runs. Ever.

---

## 3. The API surface

One import gives you the renderer (`html`/`svg` re-exported from lit-html) and the blac glue:

```ts
import {
  component,
  mount, // authoring + bootstrap
  html,
  svg, // re-exported from lit-html
  select, // reactive selector      →  Binding
  when,
  each,
  match, // control flow           →  take Bindings
  model,
  classes,
  styles, // form + attribute helpers
} from '@blac/lit';
```

### 3.1 `component(Bloc?, render)` — the unit of UI

```ts
component(Bloc, (bloc, ctx) => Template); // component bound to a bloc
component((ctx) => Template); // pure component, no bloc
```

Returns a **factory**: `(args?) => Renderable`. Placing the renderable in a template (or `mount`) acquires the bloc instance (ref-count++), runs `render` **once**, and releases on disconnect.

The `bloc` handle is the live instance:

| Access                     | Meaning                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `bloc.increment`           | an **action** (arrow-field method) — pass straight to `@click` |
| `bloc.$.count`             | a **reactive read** → `Binding<number>`, self-updating hole    |
| `bloc.$.completionPercent` | reactive read of a **getter** (tracked automatically)          |
| `bloc.state.count`         | a **one-shot** non-reactive read                               |

The `bloc.$` proxy is the heart of the ergonomics: it mirrors blac's own proxy-tracking philosophy. Reading `bloc.$.user.name` builds the path `user.name`; the read executes under the tracker so getters resolve to their _real_ dependencies.

### 3.2 `Binding<T>` — a reactive value

`bloc.$.x` and `select(...)` both return a `Binding`. A Binding is **directly renderable** and **transformable**:

```ts
bloc.$.count; // Binding<number>
bloc.$.count.map((n) => n * 2); // Binding<number>  (derived, still path-scoped to `count`)
select(bloc, (s) => `${s.count} clicks`); // Binding<string>
select([a.$.x, b.$.y], (x, y) => x + y); // combine across blocs
```

`bloc.$.x` is just sugar for `select(bloc, s => s.x)`.

### 3.3 Control flow — everything takes Bindings, everything stays fine-grained

```ts
when(
  cond,
  () => html`…`,
  () => html`…`,
); // cond: Binding<boolean>
each(listBinding, (item, i) => html`…`, keyFn); // keyed list (backed by lit `repeat`)
match(bloc.$.status, {
  // switch on a Binding
  idle: () => html`<start-btn></start-btn>`,
  loading: () => html`<spinner></spinner>`,
  error: () => html`<retry-btn></retry-btn>`,
});
```

`each` only re-renders items whose keyed slice changed — array adds/removes/moves touch only the affected DOM nodes.

### 3.4 Forms — two-way binding without a state framework

blac mutates through actions, so two-way binding is `read + write`:

```ts
html`<input ${model(bloc.$.email, (v) => bloc.setField('email', v))} />`;
```

`model(binding, setter)` wires the element's value from the Binding and calls `setter` on input. Reads stay fine-grained; writes go through your bloc action.

### 3.5 Attributes, classes, styles

Bindings drop into any lit position — text, attribute, property, event:

```ts
html`
  <input .value=${bloc.$.name} @input=${(e) => bloc.setName(e.target.value)} />
  <div class=${bloc.$.status}></div>
  <div ${classes({ active: bloc.$.isActive, done: bloc.$.done })}></div>
  <div ${styles({ width: bloc.$.progress.map((p) => `${p}%`) })}></div>
`;
```

### 3.6 Context (`ctx`) — multi-bloc, lifecycle, effects

```ts
component(CartBloc, (cart, ctx) => {
  const user = ctx.use(UserBloc); // consume another bloc (ref-counted for this component)
  ctx.onMount(() => cart.refresh());
  ctx.effect(() => console.log(cart.$.total)); // autorun: re-runs when read paths change (bridges `watch`)
  return html`<h1>${user.$.name}'s cart · ${cart.$.total}</h1>`;
});
```

`ctx` = `{ use(Bloc, args?), args, onMount(fn), onUnmount(fn), effect(fn) }`.

### 3.7 Instance identity

The factory's argument is the bloc's args (resolved via `static key`):

```ts
CounterView(); // default / shared instance
CounterView({ id: 'a' }); // instance keyed by args.id
CounterView.local(); // fresh, mount-private instance (unique key)
```

`.local()` replaces the old `isolated`/`instanceId` idea — it just acquires under a unique key.

### 3.8 `mount(renderable, container)`

```ts
const app = mount(CounterView(), document.getElementById('app')!);
// later…
app.unmount(); // disconnects parts → releases every bloc ref it acquired
```

---

## 4. Worked examples

### 4.1 Hero — the counter (the whole app)

```ts
// counter.bloc.ts
import { Cubit } from '@blac/core';

export class Counter extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
}
```

```ts
// counter.view.ts
import { component, html } from '@blac/lit';
import { Counter } from './counter.bloc';

export const CounterView = component(
  Counter,
  (c) => html`
    <div class="counter">
      <button @click=${c.decrement}>–</button>
      <output>${c.$.count}</output>
      <button @click=${c.increment}>+</button>
    </div>
  `,
);
```

```ts
// main.ts
import { mount } from '@blac/lit';
import { CounterView } from './counter.view';

mount(CounterView(), document.querySelector('#app')!);
```

Clicking `+` updates **only the `<output>` text node**. The `component` body never runs again — put a `console.log` in it and it fires exactly once.

### 4.2 Derived state + a shared instance

Using the real `01-counter` bloc (tracks `count`, `incrementCount`, `lastAction`, plus a getter):

```ts
export const CounterCard = component(
  CounterBloc,
  (c) => html`
    <article class="card">
      <div class="display">${c.$.count}</div>

      <div class="controls">
        <button @click=${c.decrement}>−</button>
        <button @click=${c.increment}>+</button>
        <button @click=${c.reset} class="ghost">Reset</button>
      </div>

      <!-- getter read: subscribes to exactly what the getter touches -->
      <footer>
        ${c.$.lastAction} ·
        ${select(c, (s) => s.incrementCount + s.decrementCount)} ops
      </footer>
    </article>
  `,
);

// two cards, same shared instance — they stay in lock-step:
mount(html`${CounterCard()} ${CounterCard()}`, root);

// two isolated instances:
mount(html`${CounterCard({ id: 'a' })} ${CounterCard({ id: 'b' })}`, root);
```

### 4.3 A list — `each`, `model`, and getters

```ts
export const TodoApp = component(
  TodoBloc,
  (t) => html`
    <form @submit=${t.add}>
      <input
        ${model(t.$.draft, (v) => t.setDraft(v))}
        placeholder="What next?"
      />
    </form>

    <ul>
      ${each(
        t.$.filteredItems,
        (todo) => html`
          <li class=${todo.done ? 'done' : ''}>
            <input
              type="checkbox"
              .checked=${todo.done}
              @change=${() => t.toggle(todo.id)}
            />
            <span>${todo.text}</span>
            <button @click=${() => t.remove(todo.id)}>✕</button>
          </li>
        `,
        (todo) => todo.id,
      )}
    </ul>

    <footer>
      ${t.$.activeCount} left ·
      ${each(
        ['all', 'active', 'done'],
        (f) => html` <button @click=${() => t.setFilter(f)}>${f}</button> `,
      )}
    </footer>
  `,
);
```

`filteredItems`/`activeCount` are getters on the bloc — they auto-track their real dependencies, so adding a todo re-renders only the list and the count, nothing else.

### 4.4 Async — `match` on a status field

```ts
export const Feed = component(FeedBloc, (feed, ctx) => {
  ctx.onMount(() => feed.load());
  return html`
    <section>
      ${match(feed.$.status, {
        loading: () => html`<spinner></spinner>`,
        error: () => html`<button @click=${feed.load}>Retry</button>`,
        ready: () =>
          each(
            feed.$.posts,
            (p) => html`<post-card .post=${p}></post-card>`,
            (p) => p.id,
          ),
      })}
    </section>
  `;
});
```

### 4.5 App orchestration — global stores, cross-bloc, routing

Global state is just a `keepAlive` bloc — it _is_ the store; no Provider tree required.

```ts
// stores
@blac({ keepAlive: true })
class Session extends Cubit<{ user: User | null }> {
  /* … */
}

@blac({ keepAlive: true })
class Router extends Cubit<{ route: 'home' | 'cart' | 'login' }> {
  go = (route: Route) => this.emit({ route });
}
```

```ts
// a header that reads two stores at once
const Header = component((ctx) => {
  const session = ctx.use(Session);
  const router = ctx.use(Router);
  return html`
    <header>
      <a @click=${() => router.go('home')}>Home</a>
      ${when(
        select(session, (s) => !!s.user),
        () => html`<span>${session.$.user.map((u) => u!.name)}</span>`,
        () => html`<a @click=${() => router.go('login')}>Sign in</a>`,
      )}
    </header>
  `;
});

// the app shell = a router-driven match over components
const App = component((ctx) => {
  const router = ctx.use(Router);
  return html`
    ${Header()}
    <main>
      ${match(router.$.route, {
        home: () => Home(),
        cart: () => Cart(),
        login: () => Login(),
      })}
    </main>
  `;
});

mount(App(), document.body);
```

Cross-bloc dependencies _inside_ a bloc still use the native `this.depend(OtherBloc)` handle — the component layer doesn't change that; it only adds `ctx.use` for _components_ that read multiple blocs.

### 4.6 Nested components

Nesting is **just interpolation** — drop a child's renderable into a parent's template with `${Child(args)}`. No `children` prop, no slots API. Each nested component independently acquires its bloc, renders **once**, and releases when its DOM part disconnects. There are three composition shapes:

#### (a) Presentational children are plain functions

If a child holds no state, it doesn't need `component()` at all — a function returning `html` composes natively:

```ts
const Avatar = (user: User) =>
  html`<img class="avatar" src=${user.avatarUrl} alt=${user.name} />`;
const Stat = (label: string, value: unknown) =>
  html`<div class="stat"><b>${value}</b><span>${label}</span></div>`;

const ProfileCard = component(
  ProfileBloc,
  (p) => html`
    <article class="profile">
      ${Avatar(p.state.user)}
      <!-- one-shot data, plain fn -->
      ${Stat('followers', p.$.followerCount)}
      <!-- a Binding flows straight through -->
    </article>
  `,
);
```

A `Binding` (`p.$.followerCount`) passed into a plain function still updates itself — the function just places it in the template.

#### (b) Nested components sharing ONE bloc (no prop drilling)

Decompose a feature into a tree where every node reaches the _same_ instance via `ctx.use` / `component(SameBloc, …)`. Because the instance key is identical, they all resolve to one ref-counted bloc — state flows without threading props through the tree:

```ts
// leaf: a single row. Pulls the shared bloc; gets its id from args.
const TodoItem = component((ctx) => {
  const todo = ctx.use(TodoBloc);
  const { id } = ctx.args;
  return html` <li>
    <input
      type="checkbox"
      .checked=${select(todo, (s) => s.byId[id].done)}
      @change=${() => todo.toggle(id)}
    />
    <span>${select(todo, (s) => s.byId[id].text)}</span>
    <button @click=${() => todo.remove(id)}>✕</button>
  </li>`;
});

// middle: the list. `each` maps state → one nested TodoItem per id (keyed).
const TodoList = component(
  TodoBloc,
  (todo) => html`
    <ul>
      ${each(
        todo.$.visibleIds,
        (id) => TodoItem({ id }),
        (id) => id,
      )}
    </ul>
  `,
);

const TodoInput = component(
  TodoBloc,
  (todo) => html`
    <form @submit=${todo.add}>
      <input
        ${model(todo.$.draft, (v) => todo.setDraft(v))}
        placeholder="Add…"
      />
    </form>
  `,
);

const TodoFooter = component(
  TodoBloc,
  (todo) => html`
    <footer>
      ${todo.$.activeCount} left ·
      <button @click=${todo.clearDone}>Clear done</button>
    </footer>
  `,
);

// root: composes the three children — zero props passed down.
const TodoApp = component(
  () => html`
    <section class="todo">${TodoInput()} ${TodoList()} ${TodoFooter()}</section>
  `,
);

mount(TodoApp(), root);
```

All four components address one `TodoBloc`. Adding a todo re-runs only `TodoList`'s `each` (it produces a new `TodoItem`); toggling a row updates only that row's checkbox + text; the count in `TodoFooter` updates on its own. Nothing re-renders top-down.

#### (c) Nested components with isolated instances

Give each child its own bloc instance by passing distinct args (resolved through the bloc's `static key`). The parent just lists them:

```ts
const CounterCard = component(
  Counter,
  (c, ctx) => html`
    <article class="card">
      <header>${ctx.args?.id ?? 'default'}</header>
      <div class="value">${c.$.count}</div>
      <button @click=${c.decrement}>–</button>
      <button @click=${c.increment}>+</button>
    </article>
  `,
);

const Board = component(
  () => html`
    <section class="board">
      ${CounterCard({ id: 'alpha' })}
      <!-- three independent Counter instances -->
      ${CounterCard({ id: 'beta' })} ${CounterCard({ id: 'gamma' })}
      ${CounterCard.local()}
      <!-- a fresh, mount-private instance -->
    </section>
  `,
);
```

Each card owns a separate `Counter`; clicking `+` on `alpha` never touches `beta`. When a card is removed from the DOM, its instance's ref drops and (unless `keepAlive`) it disposes automatically.

> **Lifecycle at every level:** nesting depth is irrelevant to teardown. Any component removed from the DOM — a filtered-out `TodoItem`, a routed-away page, a whole subtree — disconnects its lit parts, which unsubscribes its Bindings and releases its bloc refs. Ref-counting is per-instance, so a shared bloc survives until its _last_ consumer unmounts.

---

## 5. How it maps onto blac-core (bridge internals)

The entire runtime is a handful of directives over primitives that already exist.

**The reactive hole** — one `AsyncDirective` (paraphrased):

```ts
import { AsyncDirective, directive } from 'lit-html/async-directive.js';
import { track } from '@dirtytalk/structural'; // run a read fn, capture its PathSet

class LiveDirective extends AsyncDirective {
  #unsub?: () => void;

  render(bloc: StateContainer, read: (state: any, bloc: any) => unknown) {
    const [value, paths] = track(() => read(bloc.state, bloc)); // ← reuse blac's tracker
    this.#unsub ??= bloc.subscribe(
      // ← reuse channel.subscribe
      () => paths,
      () => this.setValue(track(() => read(bloc.state, bloc))[0]),
    );
    return value;
  }
  protected disconnected() {
    this.#unsub?.();
    this.#unsub = undefined;
  }
  protected reconnected() {
    /* re-subscribe */
  }
}
export const live = directive(LiveDirective);
```

- **`select` / `bloc.$`** → `live(bloc, readFn)`. The `$` proxy just records the property-access chain into a `readFn` and hands it to `live`.
- **`component`** → `acquire(Bloc, key, args)` on entry (registry ref++), run body once, `release` when the host part disconnects. Reuses `acquire`/`release`/`resolveInstanceKey` from `@blac/core`'s registry — the same functions `@blac/react` uses.
- **`each`** → `live` producing the array + lit-html's `repeat` directive for keyed reconciliation.
- **`ctx.effect`** → `watch(bloc, fn)` from `@blac/core/watch`, torn down on disconnect.
- **`model`** → `live` for the value + a plain event listener calling the setter.

No new reactivity. No vdom. The binding is glue between two things blac already exposes (`track` + `subscribe`/`acquire`) and two things lit already exposes (`AsyncDirective` + `repeat`).

---

## 6. Package shape

```
packages/blac-lit/
  package.json          # name: @blac/lit, deps: lit-html, @blac/core, @dirtytalk/structural
  src/
    index.ts            # public exports (component, mount, select, when, each, match, model, classes, styles, html, svg)
    component.ts        # component() + ctx + acquire/release lifecycle
    live.ts             # LiveDirective + Binding + the `$` proxy
    control-flow.ts     # when / each / match
    forms.ts            # model
    attrs.ts            # classes / styles
```

**Exports mirror `@blac/react`'s conventions** (a `configureBlacLit`, a testing entry) so the two bindings feel like siblings. Target size budget: **≤ 2 kB brotli** on top of lit-html.

### v1 implementation status (shipped)

Implemented and typecheck-clean; the `apps/lit-demo` app runs against it:

- `component(Bloc?, render)` + `.local()`, `mount()` — acquire/release wired to lit directive `disconnected`/`reconnected`.
- `select(bloc, fn)`, the `bloc.$` state-path proxy, `Binding` (+`.map`), `bind` (low-level).
- `when` / `each` (keyed via lit `repeat`) / `match`, and `model` (two-way input).
- `ctx`: `args`, `use`, `onMount`, `onUnmount`, and `effect(bloc, fn)` (coarse — re-runs on any change to the given bloc, via core `watch`).
- The reactive hole reuses `trackRender` → `channel.subscribe`, with `expandWithAncestors` **ported verbatim** from `@blac/react`.

Files: `src/{component,live,control-flow,forms,mount,config,index}.ts` + `src/internal/track.ts` (no `attrs.ts` yet — see deferred).

**Deferred (design lists them; not in v1):**

- `classes` / `styles` attribute helpers — for now use an attribute-position Binding (`class=${c.$.status}`).
- Multi-bloc `select([a.$.x, b.$.y], fn)` — v1 `select` is single-bloc; combine via separate holes / `ctx.use`.
- Getters through `$` — `$` covers state paths only; getters/derived go through `select(bloc, (_s, b) => b.getter)` (uses the tracked-bloc proxy so deps are recorded).

---

## 7. Decisions

**Locked:**

- ✅ **Reactive reads** — ship **both** `bloc.$.x` (sugar) **and** explicit `select(bloc, fn)`. `$` is the hero; `select` covers cross-bloc / computed reads.
- ✅ **Naming** — the UI unit is **`component`**.
- ✅ **Scope** — **functional-only for v1**: `component()` + `mount()`. No Web Component base class yet.

**Still open (decide before / during build):**

1. **Low-level directive name** — `live` vs `bind` for the internal reactive-hole directive (mostly internal; `$`/`select` is the public face).
2. **Coarse mode** — offer an opt-in "re-render the whole component on any change" (`component.eager`) for people who don't want fine-grained holes, or stay fine-grained-only?
3. **`BlacElement` (post-v1)** — a Custom Element base whose `render()` is a blac-bound template, for real Shadow-DOM encapsulation. Deferred, not dropped.
4. **SSR** — lit-html has `@lit-labs/ssr`; is server rendering in scope after v1?
5. **DevTools** — `devtools-connect` should work unchanged (it hooks the registry, not the render layer) — confirm during the starter build.

---

## 8. Why this beats a "port of `@blac/react`"

|                   | `@blac/react`                                                            | `@blac/lit`                                |
| ----------------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| Update unit       | whole component re-runs                                                  | single DOM part                            |
| Reactivity source | React + blac (two systems reconciled)                                    | blac only                                  |
| Glue needed       | per-consumer proxy, tracker bridge, `useSyncExternalStore`, `APPLY_DEPS` | one `AsyncDirective` + `acquire`/`release` |
| Build step        | JSX transform                                                            | none                                       |
| "Render" runs     | every update                                                             | **once**                                   |
| Runtime size      | React (~40 kB) + binding                                                 | lit-html (~4 kB) + ~2 kB                   |

---

## 9. Next step

Build the **`blac-lit` counter starter** (§4.1) as a standalone Vite app — the lit-html answer to the default React counter — to validate the `component` / `$` / `mount` trio end-to-end before committing the full directive set.
