import { describe, it, expect } from 'vite-plus/test';
import { html } from 'lit-html';
import { Cubit } from '@blac/core';
import { flush } from '@blac/core/testing';
import { component, mount, each, when, model } from './index';

// ---------------------------------------------------------------------------
// Regression: the `$` reactive proxy (`view.$.draft`) wraps its real Binding
// in a `Proxy`. `Binding` metadata lives in a WeakMap keyed by object
// identity, which cannot see through the proxy — so `model`/`when`/`each`,
// which resolve a binding via `getBindingMeta`, threw
// "value is not a Binding produced by @blac/lit" for every `$.`-path binding
// (while raw `select(...)` bindings worked). The proxy now mirrors the
// terminal binding's meta onto itself.
// ---------------------------------------------------------------------------

class FormBloc extends Cubit<{ draft: string; open: boolean; tags: string[] }> {
  constructor() {
    super({ draft: '', open: true, tags: [] });
  }
  setDraft = (draft: string): void => this.emit({ ...this.state, draft });
  toggle = (): void => this.emit({ ...this.state, open: !this.state.open });
  setTags = (tags: string[]): void => this.emit({ ...this.state, tags });
}

describe('$ reactive proxy bindings resolve through getBindingMeta', () => {
  it('model() binds a $.path without throwing and stays two-way', async () => {
    let bloc!: FormBloc;
    const App = component(FormBloc, (view) => {
      bloc = view as unknown as FormBloc;
      return html`<input
        ${model(view.$.draft, (v: string) => view.setDraft(v))}
      />`;
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const handle = mount(App(), container);
    await flush();

    const input = container.querySelector('input')!;
    expect(input.value).toBe('');

    bloc.setDraft('hello');
    await flush();
    expect(input.value).toBe('hello');

    handle.unmount();
    container.remove();
  });

  it('when() accepts a $.path predicate binding', async () => {
    let bloc!: FormBloc;
    const App = component(FormBloc, (view) => {
      bloc = view as unknown as FormBloc;
      return html`${when(
        view.$.open,
        () => html`<span>on</span>`,
        () => html`<span>off</span>`,
      )}`;
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const handle = mount(App(), container);
    await flush();
    expect(container.textContent).toBe('on');

    bloc.toggle();
    await flush();
    expect(container.textContent).toBe('off');

    handle.unmount();
    container.remove();
  });

  it('each() accepts a $.path array binding', async () => {
    let bloc!: FormBloc;
    const App = component(FormBloc, (view) => {
      bloc = view as unknown as FormBloc;
      return html`<ul>
        ${each(
          view.$.tags,
          (t: string) => html`<li>${t}</li>`,
          (t: string) => t,
        )}
      </ul>`;
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const handle = mount(App(), container);
    await flush();
    expect(container.querySelectorAll('li').length).toBe(0);

    bloc.setTags(['a', 'b']);
    await flush();
    expect(
      Array.from(container.querySelectorAll('li')).map((el) => el.textContent),
    ).toEqual(['a', 'b']);

    handle.unmount();
    container.remove();
  });
});
