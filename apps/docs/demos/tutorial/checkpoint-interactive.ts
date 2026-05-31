/**
 * Tutorial checkpoint A — the interactive Todo app at the end of Step 4.
 *
 * This is the "it works in React" milestone: one TodoCubit, several components
 * each reading only the slice they need, add / toggle / remove / filter, and a
 * derived `remaining` getter.
 *
 * Every export is a plain string (no runtime imports), so this module is
 * SSR-safe and can be imported anywhere in VitePress. The strings are handed to
 * <BlacSandpack :files="..."> which maps them into the in-browser sandbox.
 *
 * Uses the REAL published API surface:
 *   - Cubit from @blac/core
 *   - useBloc from @blac/react (returns [state, bloc])
 */

export const todoCubitTs = `import { Cubit } from '@blac/core';

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export type Filter = 'all' | 'active' | 'done';

export interface TodoState {
  todos: Todo[];
  filter: Filter;
}

export class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({ todos: [], filter: 'all' });
  }

  add = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // patch deep-merges, so we only mention the key we change.
    this.patch({
      todos: [
        ...this.state.todos,
        { id: crypto.randomUUID(), text: trimmed, done: false },
      ],
    });
  };

  toggle = (id: string) => {
    this.patch({
      todos: this.state.todos.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t,
      ),
    });
  };

  remove = (id: string) => {
    this.patch({ todos: this.state.todos.filter((t) => t.id !== id) });
  };

  setFilter = (filter: Filter) => this.patch({ filter });

  // Derived on every read, so it can never drift from todos/filter.
  get visible(): Todo[] {
    const { todos, filter } = this.state;
    if (filter === 'active') return todos.filter((t) => !t.done);
    if (filter === 'done') return todos.filter((t) => t.done);
    return todos;
  }

  get remaining(): number {
    return this.state.todos.filter((t) => !t.done).length;
  }
}
`;

export const appTsx = `import { useState, KeyboardEvent } from 'react';
import { useBloc } from '@blac/react';
import { TodoCubit, Filter } from './TodoCubit';
import './styles.css';

function AddRow() {
  const [text, setText] = useState('');
  // Action-only consumer: it never reads state, so it never re-renders.
  const [, todo] = useBloc(TodoCubit);

  const submit = () => {
    todo.add(text);
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
        placeholder="What needs doing?"
      />
      <button className="btn primary" onClick={submit}>Add</button>
    </div>
  );
}

function FilterBar() {
  const [state, todo] = useBloc(TodoCubit);
  const filters: Filter[] = ['all', 'active', 'done'];
  return (
    <div className="filter-bar">
      {filters.map((f) => (
        <button
          key={f}
          className={\`chip\${state.filter === f ? ' active' : ''}\`}
          onClick={() => todo.setFilter(f)}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

function TodoRow({ id, text, done }: { id: string; text: string; done: boolean }) {
  const [, todo] = useBloc(TodoCubit);
  return (
    <li className={\`row\${done ? ' done' : ''}\`}>
      <input type="checkbox" checked={done} onChange={() => todo.toggle(id)} />
      <span className="row-text">{text}</span>
      <button className="x" onClick={() => todo.remove(id)}>✕</button>
    </li>
  );
}

function List() {
  // Reads state.todos + state.filter (through the getter's source) and wakes
  // only when those change.
  const [, todo] = useBloc(TodoCubit, {
    select: (_, bloc) => [bloc.visible],
  });
  const visible = todo.visible;
  return (
    <ul className="list">
      {visible.length === 0 && <li className="empty">Nothing here yet.</li>}
      {visible.map((t) => (
        <TodoRow key={t.id} {...t} />
      ))}
    </ul>
  );
}

function Footer() {
  const [, todo] = useBloc(TodoCubit, {
    select: (_, bloc) => [bloc.remaining],
  });
  return (
    <p className="footer">
      {todo.remaining} item{todo.remaining !== 1 ? 's' : ''} left
    </p>
  );
}

export default function App() {
  return (
    <div className="app">
      <h2>Todo</h2>
      <AddRow />
      <FilterBar />
      <List />
      <Footer />
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

.app {
  padding: 20px;
  max-width: 440px;
  margin: 0 auto;
}

.app h2 { margin: 0 0 14px; font-size: 20px; }

.add-row { display: flex; gap: 8px; margin-bottom: 12px; }

.add-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #c8cdd8;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}
.add-input:focus { border-color: #3451b2; }

.btn {
  padding: 8px 14px;
  border: 1px solid #c8cdd8;
  background: #fff;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}
.btn:hover { background: #f2f4f8; }
.btn.primary { background: #3451b2; color: #fff; border-color: #3451b2; }
.btn.primary:hover { background: #2a3f8f; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.filter-bar { display: flex; gap: 6px; margin-bottom: 12px; }

.chip {
  padding: 4px 12px;
  border: 1px solid #e2e5ec;
  border-radius: 999px;
  background: transparent;
  font-size: 13px;
  cursor: pointer;
  color: #5a6373;
  text-transform: capitalize;
}
.chip.active {
  background: #eef0f8;
  border-color: #3451b2;
  color: #3451b2;
  font-weight: 500;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
  border: 1px solid #e2e5ec;
  border-radius: 10px;
  overflow: hidden;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid #e2e5ec;
  background: #fff;
}
.row:last-child { border-bottom: none; }
.row.done .row-text { text-decoration: line-through; color: #a0a8b4; }

.row-text { flex: 1; font-size: 14px; }

.x {
  background: none;
  border: none;
  cursor: pointer;
  color: #b0b8c4;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
}
.x:hover { color: #e53e3e; background: #fff0f0; }

.empty { padding: 20px; text-align: center; color: #a0a8b4; font-size: 14px; }

.footer { font-size: 13px; color: #8890a0; margin: 0; }
`;

/**
 * Sandpack files map: keys are absolute paths inside the sandbox.
 * Pass straight to <BlacSandpack :files="tutorialInteractiveFiles" />.
 */
export const tutorialInteractiveFiles: Record<string, string> = {
  '/App.tsx': appTsx,
  '/TodoCubit.ts': todoCubitTs,
  '/styles.css': stylesCss,
};
