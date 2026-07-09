import { Cubit } from '@blac/core';

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}
export type TodoFilter = 'all' | 'active' | 'done';
export interface TodoState {
  draft: string;
  items: Todo[];
  filter: TodoFilter;
}

export class TodoBloc extends Cubit<TodoState> {
  constructor() {
    super({ draft: '', items: [], filter: 'all' });
  }

  setDraft = (draft: string) => this.patch({ draft });

  add = (e?: Event) => {
    e?.preventDefault();
    const text = this.state.draft.trim();
    if (!text) return;
    this.patch({
      items: [
        ...this.state.items,
        { id: crypto.randomUUID(), text, done: false },
      ],
      draft: '',
    });
  };

  toggle = (id: string) =>
    this.patch({
      items: this.state.items.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t,
      ),
    });

  remove = (id: string) =>
    this.patch({ items: this.state.items.filter((t) => t.id !== id) });

  setFilter = (filter: TodoFilter) => this.patch({ filter });

  clearDone = () =>
    this.patch({ items: this.state.items.filter((t) => !t.done) });

  // Derived state = getters (read through this.state so tracking works).
  get visible(): Todo[] {
    const { items, filter } = this.state;
    if (filter === 'active') return items.filter((t) => !t.done);
    if (filter === 'done') return items.filter((t) => t.done);
    return items;
  }

  get activeCount(): number {
    return this.state.items.filter((t) => !t.done).length;
  }
}
