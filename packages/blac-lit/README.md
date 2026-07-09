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
