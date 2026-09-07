import { Cubit } from '@blac/core';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export type TodoFilter = 'all' | 'active' | 'completed';

export interface TodoState {
  items: Todo[];
  filter: TodoFilter;
}

const STORAGE_KEY = 'blac-examples-todos';

function loadFromStorage(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({
      items: loadFromStorage(),
      filter: 'all',
    });
  }

  addTodo = (text: string) => {
    if (!text.trim()) return;
    this.patch({
      items: [
        ...this.state.items,
        { id: crypto.randomUUID(), text: text.trim(), completed: false },
      ],
    });
  };

  toggleTodo = (id: string) => {
    this.patch({
      items: this.state.items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    });
  };

  removeTodo = (id: string) => {
    this.patch({
      items: this.state.items.filter((item) => item.id !== id),
    });
  };

  setFilter = (filter: TodoFilter) => {
    this.patch({ filter });
  };

  clearCompleted = () => {
    this.patch({
      items: this.state.items.filter((item) => !item.completed),
    });
  };

  get filteredItems(): Todo[] {
    const { items, filter } = this.state;
    switch (filter) {
      case 'active':
        return items.filter((i) => !i.completed);
      case 'completed':
        return items.filter((i) => i.completed);
      default:
        return items;
    }
  }

  get activeCount(): number {
    return this.state.items.filter((i) => !i.completed).length;
  }

  get completedCount(): number {
    return this.state.items.filter((i) => i.completed).length;
  }
}
