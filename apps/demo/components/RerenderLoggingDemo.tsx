import React from 'react';
import { Cubit, Blac } from '@blac/core';
import { useBloc } from '@blac/react';
import { Button } from './ui/Button';
import {
  COLOR_PRIMARY_ACCENT,
  COLOR_SECONDARY_ACCENT,
  COLOR_TEXT_SECONDARY,
  FONT_FAMILY_SANS,
} from '../lib/styles';

// Example state with multiple properties
interface TodoState {
  todos: Array<{ id: number; text: string; completed: boolean }>;
  filter: 'all' | 'active' | 'completed';
  searchTerm: string;
}

// Cubit to manage todos
class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({
      todos: [
        { id: 1, text: 'Learn BlaC', completed: true },
        { id: 2, text: 'Build an app', completed: false },
      ],
      filter: 'all',
      searchTerm: '',
    });
  }

  addTodo = (text: string) => {
    const newTodo = {
      id: Date.now(),
      text,
      completed: false,
    };
    this.emit({
      ...this.state,
      todos: [...this.state.todos, newTodo],
    });
  };

  toggleTodo = (id: number) => {
    this.emit({
      ...this.state,
      todos: this.state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    });
  };

  setFilter = (filter: TodoState['filter']) => {
    this.emit({ ...this.state, filter });
  };

  setSearchTerm = (searchTerm: string) => {
    this.emit({ ...this.state, searchTerm });
  };
}

// Component that uses all state properties
function TodoList() {
  const [state, cubit] = useBloc(TodoCubit);

  const filteredTodos = state.todos
    .filter((todo) => {
      if (state.filter === 'active') return !todo.completed;
      if (state.filter === 'completed') return todo.completed;
      return true;
    })
    .filter((todo) =>
      todo.text.toLowerCase().includes(state.searchTerm.toLowerCase()),
    );

  return (
    <div style={{ padding: '16px' }}>
      <h3
        style={{
          fontSize: '1.1em',
          fontWeight: 'bold',
          marginBottom: '16px',
          fontFamily: FONT_FAMILY_SANS,
        }}
      >
        Todo List (Full State Access)
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredTodos.map((todo) => (
          <div
            key={todo.id}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => cubit.toggleTodo(todo.id)}
              style={{ borderRadius: '4px' }}
            />
            <span
              style={{
                textDecoration: todo.completed ? 'line-through' : 'none',
              }}
            >
              {todo.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Optimized component that only tracks todo count
function TodoCount() {
  const [state] = useBloc(TodoCubit, {
    dependencies: (bloc) => [bloc.state.todos.length],
  });

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
      }}
    >
      <h3
        style={{
          fontSize: '1.1em',
          fontWeight: 'bold',
          fontFamily: FONT_FAMILY_SANS,
        }}
      >
        Todo Count (Optimized)
      </h3>
      <p style={{ marginTop: '8px' }}>Total todos: {state.todos.length}</p>
    </div>
  );
}

// Component for filter controls
function FilterControls() {
  const [state, cubit] = useBloc(TodoCubit, {
    dependencies: (bloc) => [bloc.state.filter],
  });

  return (
    <div style={{ padding: '16px' }}>
      <h3
        style={{
          fontSize: '1.1em',
          fontWeight: 'bold',
          marginBottom: '8px',
          fontFamily: FONT_FAMILY_SANS,
        }}
      >
        Filter (Optimized)
      </h3>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button
          onClick={() => cubit.setFilter('all')}
          variant={state.filter === 'all' ? 'default' : 'secondary'}
        >
          All
        </Button>
        <Button
          onClick={() => cubit.setFilter('active')}
          variant={state.filter === 'active' ? 'default' : 'secondary'}
        >
          Active
        </Button>
        <Button
          onClick={() => cubit.setFilter('completed')}
          variant={state.filter === 'completed' ? 'default' : 'secondary'}
        >
          Completed
        </Button>
      </div>
    </div>
  );
}

// Main example component
export default function RerenderLoggingDemo() {
  const [loggingEnabled, setLoggingEnabled] = React.useState(false);
  const [loggingLevel, setLoggingLevel] = React.useState<
    'minimal' | 'normal' | 'detailed'
  >('normal');

  React.useEffect(() => {
    if (loggingEnabled) {
      Blac.setConfig({ rerenderLogging: loggingLevel });
    } else {
      Blac.setConfig({ rerenderLogging: false });
    }
  }, [loggingEnabled, loggingLevel]);

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      <div
        style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
        }}
      >
        <h3
          style={{
            fontWeight: 'bold',
            marginBottom: '8px',
            fontFamily: FONT_FAMILY_SANS,
          }}
        >
          Logging Controls
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={loggingEnabled}
              onChange={(e) => setLoggingEnabled(e.target.checked)}
              style={{ borderRadius: '4px' }}
            />
            Enable Rerender Logging
          </label>

          {loggingEnabled && (
            <select
              value={loggingLevel}
              onChange={(e) => setLoggingLevel(e.target.value as any)}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
              }}
            >
              <option value="minimal">Minimal</option>
              <option value="normal">Normal</option>
              <option value="detailed">Detailed</option>
            </select>
          )}
        </div>
        <p
          style={{
            fontSize: '0.875em',
            color: COLOR_TEXT_SECONDARY,
            marginTop: '8px',
          }}
        >
          Open the browser console to see rerender logs. Try different actions
          and observe:
        </p>
        <ul
          style={{
            fontSize: '0.875em',
            color: COLOR_TEXT_SECONDARY,
            paddingLeft: '20px',
            marginTop: '4px',
          }}
        >
          <li>TodoList rerenders on any state change (uses entire state)</li>
          <li>TodoCount only rerenders when todo count changes</li>
          <li>FilterControls only rerenders when filter changes</li>
        </ul>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
        }}
      >
        <div style={{ border: '1px solid #ddd', borderRadius: '4px' }}>
          <TodoList />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ border: '1px solid #ddd', borderRadius: '4px' }}>
            <TodoCount />
          </div>
          <div style={{ border: '1px solid #ddd', borderRadius: '4px' }}>
            <FilterControls />
          </div>
        </div>
      </div>

      <div style={{ marginTop: '16px' }}>
        <Button
          onClick={() => {
            const cubit = Blac.instance.getBloc(TodoCubit);
            cubit.addTodo(`New todo ${Date.now()}`);
          }}
          variant="default"
        >
          Add Todo
        </Button>
        <p
          style={{
            fontSize: '0.875em',
            color: COLOR_TEXT_SECONDARY,
            marginTop: '8px',
          }}
        >
          Adding a todo will trigger rerenders in TodoList and TodoCount, but
          not FilterControls.
        </p>
      </div>
    </div>
  );
}
