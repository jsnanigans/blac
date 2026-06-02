/**
 * Tutorial checkpoint B — the final app with undo / redo / time-travel.
 *
 * The payoff of the whole tutorial: history is just more state. Every mutation
 * routes through a single `commit` helper that pushes the new todo list onto a
 * `past` stack. `undo`/`redo` move a cursor; `jumpTo` jumps to any snapshot.
 * Because BlaC state is plain immutable values, a list of past values IS a
 * complete undo history — no special engine required.
 *
 * Every export is a plain string (no runtime imports), so this module is
 * SSR-safe. Strings feed <BlacSandpack :files="..."> in the browser.
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
  // The undo history: every past snapshot of the todo list, oldest first.
  // The last entry is always the current list.
  past: Todo[][];
  // Index into \`past\` of the snapshot we are currently showing.
  cursor: number;
  // The filter is view-only, so it lives OUTSIDE the history.
  filter: Filter;
}

const EMPTY: Todo[] = [];

export class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({ past: [EMPTY], cursor: 0, filter: 'all' });
  }

  // Single funnel for every mutation. It takes the next todo list, drops any
  // "future" snapshots we had undone past, appends the new one, and points the
  // cursor at it. Every action below goes through here.
  private commit = (next: Todo[]) => {
    const { past, cursor } = this.state;
    const kept = past.slice(0, cursor + 1);
    this.patch({ past: [...kept, next], cursor: kept.length });
  };

  // The list the rest of the app reads: whatever snapshot the cursor points at.
  get todos(): Todo[] {
    return this.state.past[this.state.cursor];
  }

  add = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.commit([
      ...this.todos,
      { id: crypto.randomUUID(), text: trimmed, done: false },
    ]);
  };

  toggle = (id: string) => {
    this.commit(
      this.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  };

  remove = (id: string) => {
    this.commit(this.todos.filter((t) => t.id !== id));
  };

  setFilter = (filter: Filter) => this.patch({ filter });

  // Time travel: just move the cursor. No data is mutated.
  undo = () => {
    if (this.canUndo) this.patch({ cursor: this.state.cursor - 1 });
  };
  redo = () => {
    if (this.canRedo) this.patch({ cursor: this.state.cursor + 1 });
  };
  jumpTo = (index: number) => this.patch({ cursor: index });

  get canUndo(): boolean {
    return this.state.cursor > 0;
  }
  get canRedo(): boolean {
    return this.state.cursor < this.state.past.length - 1;
  }

  get visible(): Todo[] {
    const { filter } = this.state;
    if (filter === 'active') return this.todos.filter((t) => !t.done);
    if (filter === 'done') return this.todos.filter((t) => t.done);
    return this.todos;
  }

  get remaining(): number {
    return this.todos.filter((t) => !t.done).length;
  }
}
`;

export const appTsx = `import { useState, KeyboardEvent } from 'react';
import { useBloc } from '@blac/react';
import { TodoCubit, Filter } from './TodoCubit';
import './styles.css';

function AddRow() {
  const [text, setText] = useState('');
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

function HistoryBar() {
  // Re-renders when the cursor or the can-undo/redo flags change.
  const [, todo] = useBloc(TodoCubit, {
    select: (_, bloc) => [bloc.canUndo, bloc.canRedo],
  });
  return (
    <div className="history-bar">
      <button className="btn" disabled={!todo.canUndo} onClick={todo.undo}>
        Undo
      </button>
      <button className="btn" disabled={!todo.canRedo} onClick={todo.redo}>
        Redo
      </button>
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

// The time-travel UI: one dot per snapshot. Click any dot to jump there.
function Timeline() {
  const [state, todo] = useBloc(TodoCubit, {
    select: (_, bloc) => [bloc.state.cursor, bloc.state.past.length],
  });
  return (
    <div className="timeline">
      <span className="timeline-label">history</span>
      <div className="dots">
        {state.past.map((snapshot, i) => (
          <button
            key={i}
            title={\`\${snapshot.length} todo(s)\`}
            className={\`dot\${i === state.cursor ? ' current' : ''}\`}
            onClick={() => todo.jumpTo(i)}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="app">
      <h2>Todo with time travel</h2>
      <AddRow />
      <HistoryBar />
      <FilterBar />
      <List />
      <Timeline />
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

.add-row { display: flex; gap: 8px; margin-bottom: 10px; }

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

.history-bar { display: flex; gap: 8px; margin-bottom: 12px; }

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

.timeline {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px dashed #d6dae3;
  border-radius: 10px;
}

.timeline-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #8890a0;
}

.dots { display: flex; gap: 6px; flex-wrap: wrap; }

.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid #c8cdd8;
  background: #fff;
  cursor: pointer;
  padding: 0;
}
.dot:hover { border-color: #3451b2; }
.dot.current { background: #3451b2; border-color: #3451b2; }
`;

/**
 * Sandpack files map: keys are absolute paths inside the sandbox.
 * Pass straight to <BlacSandpack :files="tutorialTimeTravelFiles" />.
 */
export const tutorialTimeTravelFiles: Record<string, string> = {
  '/App.tsx': appTsx,
  '/TodoCubit.ts': todoCubitTs,
  '/styles.css': stylesCss,
};
