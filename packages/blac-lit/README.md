# @blac/lit

A `lit-html` rendering binding for [blac](https://github.com/jsnanigans/blac), where blac is the
only reactive backend and `lit-html` is a dumb renderer. Components render **once** — reactive
reads leave self-updating "holes" in the DOM that update via blac's fine-grained path tracking,
with no virtual DOM and no re-render.

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

Clicking `+` updates only the `<output>` text node — the `component` body never runs again.

## API

### `component(Bloc?, render)`

`component(Bloc, (bloc, ctx) => Template)` binds to a bloc; `component((ctx) => Template)` is a pure
component with no bloc. Either form returns a **factory**: calling it (optionally with args, resolved
via the bloc's `static key`) acquires/creates the instance, runs `render` once, and returns a
renderable to drop into a template. `factory.local(args?)` acquires a fresh, mount-private instance
under a unique key instead of sharing one by args.

```ts
CounterView(); // shared/default instance
CounterView({ id: 'a' }); // instance keyed by args.id
CounterView.local(); // fresh, mount-private instance
```

### `$` vs `select`

`bloc.$.count` is a reactive read of a state path — it returns a `Binding`, a self-updating hole you
drop straight into a template (text, attribute, or property position). For computed/derived reads
(getters, combining multiple fields, cross-bloc), use `select(bloc, (state, bloc) => value)`:

```ts
html`${c.$.count}`;
html`${select(c, (s) => s.incrementCount + s.decrementCount)} ops`;
```

Both return `Binding`s, which are chainable via `.map`: `c.$.count.map((n) => n * 2)`.

### `when` / `each` / `match`

Control flow takes `Binding`s and stays fine-grained:

```ts
when(
  select(bloc, (s) => s.loggedIn),
  () => html`<dashboard></dashboard>`,
  () => html`<login-form></login-form>`,
);

each(
  bloc.$.items,
  (item) => html`<li>${item.text}</li>`,
  (item) => item.id, // optional key fn — keeps `each` keyed via lit's `repeat`
);

match(bloc.$.status, {
  idle: () => html`<start-btn></start-btn>`,
  loading: () => html`<spinner></spinner>`,
  error: () => html`<retry-btn></retry-btn>`,
});
```

### `model`

Two-way binding on an `<input>`, `<textarea>`, or `<select>`: reads a `Binding` into the element,
writes back through your setter on the element's default input event.

```ts
html`<input ${model(bloc.$.email, (v) => bloc.setField('email', v))} />`;
```

### `mount(renderable, container, options?)`

Bootstraps a renderable into a DOM container and returns a `MountHandle`:

```ts
const app = mount(CounterView(), document.querySelector('#app')!);
// later…
app.unmount(); // disconnects parts → releases every bloc ref it acquired
```
