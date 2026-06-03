/**
 * Showcase demo: Todo list
 *
 * Shows: Cubit with list state, derived getters (filteredItems, activeCount),
 * multiple components consuming the same Cubit, filter state.
 *
 * All exports are plain strings (no runtime imports) so this module is
 * SSR-safe and can be imported at the top level of an `.mdx` page.
 */

export const todoCubitTs = `import { Cubit } from '@blac/core';

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

export class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({ items: [], filter: 'all' });
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
    this.patch({ items: this.state.items.filter((i) => i.id !== id) });
  };

  setFilter = (filter: TodoFilter) => {
    this.patch({ filter });
  };

  clearCompleted = () => {
    this.patch({ items: this.state.items.filter((i) => !i.completed) });
  };

  get filteredItems(): Todo[] {
    const { items, filter } = this.state;
    if (filter === 'active') return items.filter((i) => !i.completed);
    if (filter === 'completed') return items.filter((i) => i.completed);
    return items;
  }

  get activeCount(): number {
    return this.state.items.filter((i) => !i.completed).length;
  }
}
`;

export const appTsx = `import { useState, KeyboardEvent } from 'react';
import { useBloc } from '@blac/react';
import { TodoCubit, TodoFilter } from './TodoCubit';
import './styles.css';

function AddTodoInput() {
  const [text, setText] = useState('');
  const [, cubit] = useBloc(TodoCubit);

  const submit = () => {
    if (!text.trim()) return;
    cubit.addTodo(text);
    setText('');
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
  };

  return (
    <div className="add-row">
      <input
        className="add-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        placeholder="What needs to be done?"
      />
      <button className="add-btn" onClick={submit}>
        Add
      </button>
    </div>
  );
}

function TodoItem({ id, text, completed }: { id: string; text: string; completed: boolean }) {
  const [, cubit] = useBloc(TodoCubit);
  return (
    <li className={\`todo-item\${completed ? ' done' : ''}\`}>
      <input
        type="checkbox"
        checked={completed}
        onChange={() => cubit.toggleTodo(id)}
      />
      <span className="todo-text">{text}</span>
      <button className="remove-btn" onClick={() => cubit.removeTodo(id)}>
        ✕
      </button>
    </li>
  );
}

function FilterBar() {
  const [state, cubit] = useBloc(TodoCubit);
  const filters: TodoFilter[] = ['all', 'active', 'completed'];
  return (
    <div className="filter-bar">
      {filters.map((f) => (
        <button
          key={f}
          className={\`filter-btn\${state.filter === f ? ' active' : ''}\`}
          onClick={() => cubit.setFilter(f)}
        >
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [state, cubit] = useBloc(TodoCubit);
  const visible = cubit.filteredItems;

  return (
    <div className="demo">
      <h2>Todo</h2>
      <p className="hint">
        One <code>TodoCubit</code> — multiple components, all reactive. Each
        component reads only what it needs; derived getters live on the cubit.
      </p>

      <AddTodoInput />
      <FilterBar />

      <ul className="todo-list">
        {visible.length === 0 && (
          <li className="empty">Nothing here — add a task above.</li>
        )}
        {visible.map((item) => (
          <TodoItem key={item.id} {...item} />
        ))}
      </ul>

      <div className="footer">
        <span>{cubit.activeCount} item{cubit.activeCount !== 1 ? 's' : ''} left</span>
        {state.items.some((i) => i.completed) && (
          <button className="clear-btn" onClick={cubit.clearCompleted}>
            Clear completed
          </button>
        )}
      </div>
    </div>
  );
}
`;

export const stylesCss = `* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #ffffff;
  color: #1f2430;
}

.demo {
  padding: 20px;
  max-width: 480px;
  margin: 0 auto;
}

.demo h2 { margin: 0 0 6px; font-size: 20px; }

.hint {
  margin: 0 0 16px;
  font-size: 13px;
  color: #5a6373;
  line-height: 1.5;
}

.hint code {
  background: #eef0f4;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
}

.add-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.add-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #c8cdd8;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.add-input:focus { border-color: #3451b2; }

.add-btn {
  padding: 8px 16px;
  background: #3451b2;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.add-btn:hover { background: #2a3f8f; }

.filter-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.filter-btn {
  padding: 4px 10px;
  border: 1px solid #e2e5ec;
  border-radius: 6px;
  background: transparent;
  font-size: 13px;
  cursor: pointer;
  color: #5a6373;
}

.filter-btn.active {
  background: #eef0f8;
  border-color: #3451b2;
  color: #3451b2;
  font-weight: 500;
}

.todo-list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
  border: 1px solid #e2e5ec;
  border-radius: 10px;
  overflow: hidden;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid #e2e5ec;
  background: #fff;
}

.todo-item:last-child { border-bottom: none; }

.todo-item.done .todo-text {
  text-decoration: line-through;
  color: #a0a8b4;
}

.todo-text { flex: 1; font-size: 14px; }

.remove-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #b0b8c4;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
}

.remove-btn:hover { color: #e53e3e; background: #fff0f0; }

.empty {
  padding: 20px;
  text-align: center;
  color: #a0a8b4;
  font-size: 14px;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #8890a0;
}

.clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #8890a0;
  font-size: 13px;
  text-decoration: underline;
  padding: 0;
}

.clear-btn:hover { color: #3451b2; }
`;

/**
 * Pass to <BlacSandpack files={todoShowcaseFiles} /> (mounted client:only).
 */
export const todoShowcaseFiles: Record<string, string> = {
  '/App.tsx': appTsx,
  '/TodoCubit.ts': todoCubitTs,
  '/styles.css': stylesCss,
};
