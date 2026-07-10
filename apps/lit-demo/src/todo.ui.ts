import { html, each, when, model, select } from '@blac/lit';
import { component } from './dev/component';
import { pulse } from './dev/pulse';
import {
  TodoBloc,
  type Todo,
  type TodoState,
  type TodoFilter,
} from './todo.bloc';

// Nested leaf: shares the single TodoBloc; only receives its id via args.
const TodoRow = component((ctx) => {
  const todo = ctx.use(TodoBloc);
  const id = (ctx.args as { id: string }).id;
  const item = (s: TodoState) => s.items.find((t) => t.id === id);
  return html`
    <li class="todo">
      <input
        type="checkbox"
        .checked=${select(todo, (s: TodoState) => item(s)?.done ?? false)}
        @change=${() => todo.toggle(id)}
      />
      <span class="todo__text" ${pulse()}
        >${select(todo, (s: TodoState) => item(s)?.text ?? '')}</span
      >
      <button class="ghost" @click=${() => todo.remove(id)} aria-label="remove">
        ✕
      </button>
    </li>
  `;
});

const filters: TodoFilter[] = ['all', 'active', 'done'];

export const TodoApp = component(TodoBloc, (t) => {
  return html`
    <div class="todo-app">
      <form class="todo-form" @submit=${t.add}>
        <input
          class="todo-input"
          placeholder="Add a task…"
          ${model(t.$.draft, (v: string) => t.setDraft(v))}
        />
        <button class="primary" type="submit">Add</button>
      </form>

      <ul class="todo-list">
        ${each(
          select(t, (_s, b) => b.visible),
          (item: Todo) => TodoRow({ id: item.id }),
          (item: Todo) => item.id,
        )}
      </ul>

      ${when(
        select(t, (s: TodoState) => s.items.length > 0),
        () => html`
          <footer class="todo-footer">
            <span ${pulse()}
              >${select(t, (_s, b) => b.activeCount)}
              left</span
            >
            <span class="filters">
              ${filters.map(
                (f) =>
                  html`<button class="chip" @click=${() => t.setFilter(f)}>
                    ${f}
                  </button>`,
              )}
            </span>
            <button class="ghost" @click=${t.clearDone}>clear done</button>
          </footer>
        `,
        () => html`<p class="empty">No tasks yet — add one above.</p>`,
      )}
    </div>
  `;
});
