/**
 * Comprehensive Examples for useBlocAdapter Hook
 *
 * This file demonstrates various use cases and patterns for the useBlocAdapter hook,
 * including selectors, lifecycle callbacks, concurrent features, and more.
 */

import React, {
  Suspense,
  useCallback,
  useTransition,
  useDeferredValue,
  useState,
  memo,
  useRef,
} from 'react';
import { Cubit, Blac } from '@blac/core';
import { useBlocAdapter } from '@blac/react';

interface DeepState {
  level1: {
    value: number;
    label: string;
    level2: {
      level3: {
        level4: {
          level5: {
            level6: {
              level7: {
                level8: {
                  level9: {
                    level10: {
                      value: number;
                      label: string;
                    };
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}

class DeepNestingCubit extends Cubit<DeepState> {
  constructor() {
    super({
      level1: {
        value: 0,
        label: 'root',
        level2: {
          level3: {
            level4: {
              level5: {
                level6: {
                  level7: {
                    level8: {
                      level9: {
                        level10: {
                          value: 0,
                          label: 'deep',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  updateDeepValue = (value: number) => {
    this.patch({
      level1: {
        ...this.state.level1,
        level2: {
          level3: {
            level4: {
              level5: {
                level6: {
                  level7: {
                    level8: {
                      level9: {
                        level10: {
                          value,
                          label:
                            this.state.level1.level2.level3.level4.level5.level6
                              .level7.level8.level9.level10.label,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  };

  updateDeepLabel = (label: string) => {
    this.patch({
      level1: {
        ...this.state.level1,
        level2: {
          level3: {
            level4: {
              level5: {
                level6: {
                  level7: {
                    level8: {
                      level9: {
                        level10: {
                          value:
                            this.state.level1.level2.level3.level4.level5.level6
                              .level7.level8.level9.level10.value,
                          label,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  };

  updateRootValue = (value: number) => {
    this.patch({
      level1: {
        value,
        label: this.state.level1.label,
        level2: this.state.level1.level2,
      },
    });
  };

  updateRootLabel = (label: string) => {
    this.patch({
      level1: {
        value: this.state.level1.value,
        label: label,
        level2: this.state.level1.level2,
      },
    });
  };
}

function DebugComponent() {
  const [state, cubit] = useBlocAdapter(DeepNestingCubit);
  useRenderCount('DebugComponent');
  console.log('-----------------------------------');
  console.log('DebugComponent render', { state });

  const deepValue =
    state.level1.level2.level3.level4.level5.level6.level7.level8.level9.level10
      .value;
  const rootValue = state.level1.value;
  console.log('Selected values', { deepValue, rootValue });
  console.log('-----------------------------------');

  return (
    <div>
      <div data-testid="deep-value">{deepValue}</div>
      <div data-testid="deep-value">{rootValue}</div>
      <button onClick={() => cubit.updateDeepValue(42)}>Update Value</button>
      <button onClick={() => cubit.updateDeepLabel('updated')}>
        Update Label
      </button>
      <button onClick={() => cubit.updateRootValue(42)}>
        Update Root Value
      </button>
      <button onClick={() => cubit.updateRootLabel('updated')}>
        Update Root Label
      </button>
    </div>
  );
}

// =============================================================================
// Example 1: Basic Counter (Simple State)
// =============================================================================

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };

  reset = () => {
    this.emit(0);
  };
}

function BasicCounter() {
  const [count, cubit] = useBlocAdapter(CounterCubit);

  return (
    <div className="example-card">
      <h3>1. Basic Counter</h3>
      <p className="example-description">
        Simple state subscription without selectors
      </p>
      <div className="counter-display">Count: {count}</div>
      <div className="button-group">
        <button onClick={cubit.increment}>+</button>
        <button onClick={cubit.decrement}>-</button>
        <button onClick={cubit.reset}>Reset</button>
      </div>
    </div>
  );
}

// =============================================================================
// Example 2: Todo List (Complex State with Selectors)
// =============================================================================

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({
      todos: [
        { id: 1, text: 'Learn BlaC', completed: true },
        { id: 2, text: 'Build awesome app', completed: false },
        { id: 3, text: 'Ship to production', completed: false },
      ],
      filter: 'all',
    });
  }

  addTodo = (text: string) => {
    this.emit({
      ...this.state,
      todos: [...this.state.todos, { id: Date.now(), text, completed: false }],
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

  setFilter = (filter: 'all' | 'active' | 'completed') => {
    this.emit({ ...this.state, filter });
  };
}

// Component using selector for total count
const TodoCount = memo(() => {
  const [count] = useBlocAdapter(TodoCubit, {
    selector: (state: TodoState) => state.todos.length,
  });

  return <div className="stat-badge">Total: {count}</div>;
});
TodoCount.displayName = 'TodoCount';

// Component using selector for active count
const ActiveTodoCount = memo(() => {
  const [activeCount] = useBlocAdapter(TodoCubit, {
    selector: (state: TodoState) =>
      state.todos.filter((t) => !t.completed).length,
  });

  return <div className="stat-badge">Active: {activeCount}</div>;
});
ActiveTodoCount.displayName = 'ActiveTodoCount';

// Component using computed selector
const TodoStats = memo(() => {
  const [stats] = useBlocAdapter(TodoCubit, {
    selector: (state: TodoState) => ({
      total: state.todos.length,
      active: state.todos.filter((t) => !t.completed).length,
      completed: state.todos.filter((t) => t.completed).length,
    }),
  });

  return (
    <div className="stats-row">
      <span>📊 Total: {stats.total}</span>
      <span>✓ Done: {stats.completed}</span>
      <span>⏳ Active: {stats.active}</span>
    </div>
  );
});
TodoStats.displayName = 'TodoStats';

function TodoExample() {
  const [state, cubit] = useBlocAdapter(TodoCubit);
  const [newTodo, setNewTodo] = useState('');

  const filteredTodos = state.todos.filter((todo) => {
    if (state.filter === 'active') return !todo.completed;
    if (state.filter === 'completed') return todo.completed;
    return true;
  });

  const handleAdd = () => {
    if (newTodo.trim()) {
      cubit.addTodo(newTodo);
      setNewTodo('');
    }
  };

  return (
    <div className="example-card">
      <h3>2. Todo List with Selectors</h3>
      <p className="example-description">
        Demonstrates fine-grained subscriptions using selectors
      </p>

      <div style={{ marginBottom: '15px' }}>
        <TodoStats />
      </div>

      <div className="input-group">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add a todo..."
        />
        <button onClick={handleAdd}>Add</button>
      </div>

      <div className="filter-buttons">
        <button
          className={state.filter === 'all' ? 'active' : ''}
          onClick={() => cubit.setFilter('all')}
        >
          All
        </button>
        <button
          className={state.filter === 'active' ? 'active' : ''}
          onClick={() => cubit.setFilter('active')}
        >
          Active
        </button>
        <button
          className={state.filter === 'completed' ? 'active' : ''}
          onClick={() => cubit.setFilter('completed')}
        >
          Completed
        </button>
      </div>

      <ul className="todo-list">
        {filteredTodos.map((todo) => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => cubit.toggleTodo(todo.id)}
            />
            <span
              style={{
                textDecoration: todo.completed ? 'line-through' : 'none',
              }}
            >
              {todo.text}
            </span>
          </li>
        ))}
      </ul>

      <div className="component-badges">
        <TodoCount />
        <ActiveTodoCount />
      </div>
    </div>
  );
}

// =============================================================================
// Example 3: Lifecycle Callbacks
// =============================================================================

class AnalyticsCubit extends Cubit<{ pageViews: number; events: string[] }> {
  constructor() {
    super({ pageViews: 0, events: [] });
  }

  trackPageView = () => {
    this.emit({
      ...this.state,
      pageViews: this.state.pageViews + 1,
      events: [
        ...this.state.events,
        `Page view at ${new Date().toLocaleTimeString()}`,
      ],
    });
  };

  trackEvent = (event: string) => {
    this.emit({
      ...this.state,
      events: [
        ...this.state.events,
        `${event} at ${new Date().toLocaleTimeString()}`,
      ],
    });
  };
}

function LifecycleExample() {
  // Memoize callbacks to ensure they're stable and only fire once
  const onMount = useCallback((cubit: AnalyticsCubit) => {
    console.log('🎬 Analytics component mounted');
    cubit.trackPageView();
  }, []);

  const onUnmount = useCallback((cubit: AnalyticsCubit) => {
    console.log('👋 Analytics component unmounting');
    cubit.trackEvent('Component unmounted');
  }, []);

  const [state, cubit] = useBlocAdapter(AnalyticsCubit, {
    onMount,
    onUnmount,
  });

  return (
    <div className="example-card">
      <h3>3. Lifecycle Callbacks</h3>
      <p className="example-description">
        onMount and onUnmount callbacks in action
      </p>

      <div className="stat-badge">Page Views: {state.pageViews}</div>

      <button onClick={() => cubit.trackEvent('Button clicked')}>
        Track Event
      </button>

      <div className="event-log">
        {state.events.slice(-5).map((event, i) => (
          <div key={i} className="log-entry">
            {event}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Example 4: Async Data with Suspense
// =============================================================================

class AsyncDataCubit extends Cubit<{ data: string | null }> {
  private _loadingPromise: Promise<void> | null = null;

  constructor() {
    super({ data: null });
  }

  get loadingPromise() {
    return this._loadingPromise;
  }

  loadData = async () => {
    if (this._loadingPromise) return this._loadingPromise;

    this._loadingPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        this.emit({
          data: `Data loaded at ${new Date().toLocaleTimeString()}`,
        });
        this._loadingPromise = null;
        resolve();
      }, 1500);
    });

    return this._loadingPromise;
  };

  refresh = () => {
    this._loadingPromise = null;
    this.emit({ data: null });
    return this.loadData();
  };
}

function AsyncComponent() {
  const [state, cubit] = useBlocAdapter(AsyncDataCubit);

  // Manual Suspense pattern
  if (!state.data && cubit.loadingPromise) {
    throw cubit.loadingPromise;
  }

  return (
    <div className="example-card">
      <h3>4. Async Data with Suspense</h3>
      <p className="example-description">
        Manual Suspense pattern for async operations
      </p>

      <div className="data-display">{state.data || 'No data'}</div>

      <button onClick={cubit.refresh}>Refresh Data</button>
    </div>
  );
}

function SuspenseExample() {
  const [show, setShow] = useState(false);

  return (
    <div className="example-card">
      <button onClick={() => setShow(!show)}>
        {show ? 'Hide' : 'Show'} Async Example
      </button>

      {show && (
        <Suspense fallback={<div className="loading">⏳ Loading data...</div>}>
          <AsyncComponent />
        </Suspense>
      )}
    </div>
  );
}

// =============================================================================
// Example 5: useTransition for Non-Urgent Updates
// =============================================================================

class SearchCubit extends Cubit<{ query: string; results: string[] }> {
  constructor() {
    super({ query: '', results: [] });
  }

  setQuery = (query: string) => {
    this.emit({ ...this.state, query });
  };

  search = (query: string) => {
    // Simulate expensive search
    const results = Array.from(
      { length: 50 },
      (_, i) => `Result ${i + 1} for "${query}"`,
    ).filter(
      (r) => query === '' || r.toLowerCase().includes(query.toLowerCase()),
    );

    this.emit({ ...this.state, results });
  };
}

function TransitionExample() {
  const [state, cubit] = useBlocAdapter(SearchCubit);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;

    // Update input immediately (urgent)
    cubit.setQuery(query);

    // Search in background (non-urgent)
    startTransition(() => {
      cubit.search(query);
    });
  };

  return (
    <div className="example-card">
      <h3>5. useTransition (Concurrent Rendering)</h3>
      <p className="example-description">
        Non-blocking search with immediate input feedback
      </p>

      <div className="input-group">
        <input
          type="text"
          value={state.query}
          onChange={handleChange}
          placeholder="Search..."
        />
        {isPending && <span className="spinner">⏳</span>}
      </div>

      <div className="stat-badge">{state.results.length} results</div>

      <div className="result-list">
        {state.results.slice(0, 10).map((result, i) => (
          <div key={i} className="result-item">
            {result}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Example 6: useDeferredValue for Expensive Computations
// =============================================================================

class FilterCubit extends Cubit<{ items: string[]; filter: string }> {
  constructor() {
    super({
      items: Array.from({ length: 1000 }, (_, i) => `Item ${i + 1}`),
      filter: '',
    });
  }

  setFilter = (filter: string) => {
    this.emit({ ...this.state, filter });
  };
}

function DeferredExample() {
  const [state, cubit] = useBlocAdapter(FilterCubit);
  const deferredFilter = useDeferredValue(state.filter);

  // Expensive computation uses deferred value
  const filteredItems = React.useMemo(() => {
    return state.items.filter((item) =>
      item.toLowerCase().includes(deferredFilter.toLowerCase()),
    );
  }, [state.items, deferredFilter]);

  const isStale = state.filter !== deferredFilter;

  return (
    <div className="example-card">
      <h3>6. useDeferredValue (Deferred Updates)</h3>
      <p className="example-description">
        Keep UI responsive during expensive filtering
      </p>

      <div className="input-group">
        <input
          type="text"
          value={state.filter}
          onChange={(e) => cubit.setFilter(e.target.value)}
          placeholder="Filter 1000 items..."
        />
        {isStale && <span className="spinner">⏳</span>}
      </div>

      <div className="stat-badge">
        {filteredItems.length} / {state.items.length} items
      </div>

      <div className="result-list">
        {filteredItems.slice(0, 20).map((item, i) => (
          <div key={i} className="result-item">
            {item}
          </div>
        ))}
        {filteredItems.length > 20 && (
          <div className="result-item" style={{ fontStyle: 'italic' }}>
            ... and {filteredItems.length - 20} more
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Example 7: Custom Comparison Function
// =============================================================================

interface User {
  id: number;
  name: string;
  email: string;
}

class UserListCubit extends Cubit<{ users: User[]; lastUpdate: number }> {
  constructor() {
    super({
      users: [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
        { id: 3, name: 'Charlie', email: 'charlie@example.com' },
      ],
      lastUpdate: Date.now(),
    });
  }

  updateUserEmail = (id: number, email: string) => {
    this.emit({
      users: this.state.users.map((u) => (u.id === id ? { ...u, email } : u)),
      lastUpdate: Date.now(),
    });
  };

  addUser = (name: string) => {
    this.emit({
      users: [
        ...this.state.users,
        { id: Date.now(), name, email: `${name.toLowerCase()}@example.com` },
      ],
      lastUpdate: Date.now(),
    });
  };
}

const UserList = memo(() => {
  const [users] = useBlocAdapter(UserListCubit, {
    selector: (state: { users: User[]; lastUpdate: number }) => state.users,
    // Custom comparison - only re-render if user IDs change
    compare: (prev: User[], next: User[]) => {
      if (prev.length !== next.length) return false;
      return prev.every((user: User, i: number) => user.id === next[i].id);
    },
  });

  return (
    <ul className="user-list">
      {users.map((user: User) => (
        <li key={user.id}>
          {user.name} ({user.email})
        </li>
      ))}
    </ul>
  );
});
UserList.displayName = 'UserList';

function CustomCompareExample() {
  const [state, cubit] = useBlocAdapter(UserListCubit);
  const [newName, setNewName] = useState('');

  return (
    <div className="example-card">
      <h3>7. Custom Comparison Function</h3>
      <p className="example-description">
        Avoid re-renders when array reference changes but content doesn't
      </p>

      <div className="input-group">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New user name..."
        />
        <button
          onClick={() => {
            if (newName.trim()) {
              cubit.addUser(newName);
              setNewName('');
            }
          }}
        >
          Add User
        </button>
      </div>

      <button
        onClick={() =>
          cubit.updateUserEmail(1, `alice+${Date.now()}@example.com`)
        }
      >
        Update Alice's Email (Won't re-render list)
      </button>

      <div className="stat-badge">
        Last update: {new Date(state.lastUpdate).toLocaleTimeString()}
      </div>

      <UserList />
    </div>
  );
}

// =============================================================================
// Example 8: Memoized Selector
// =============================================================================

class DataCubit extends Cubit<{ numbers: number[]; multiplier: number }> {
  constructor() {
    super({
      numbers: [1, 2, 3, 4, 5],
      multiplier: 2,
    });
  }

  setMultiplier = (multiplier: number) => {
    this.emit({ ...this.state, multiplier });
  };

  addNumber = () => {
    this.emit({
      ...this.state,
      numbers: [...this.state.numbers, this.state.numbers.length + 1],
    });
  };
}

function MemoizedSelectorExample() {
  const [multiplier, setMultiplier] = useState(2);

  // Memoize selector to avoid recreation on every render
  const selector = useCallback(
    (state: { numbers: number[]; multiplier: number }) =>
      state.numbers.map((n) => n * multiplier),
    [multiplier],
  );

  const [multipliedNumbers, cubit] = useBlocAdapter(DataCubit, {
    selector,
  });

  return (
    <div className="example-card">
      <h3>8. Memoized Selector</h3>
      <p className="example-description">
        Using useCallback to create stable selectors
      </p>

      <div className="input-group">
        <label>Multiplier:</label>
        <input
          type="number"
          value={multiplier}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            setMultiplier(val);
            cubit.setMultiplier(val);
          }}
        />
      </div>

      <button onClick={cubit.addNumber}>Add Number</button>

      <div className="number-grid">
        {multipliedNumbers.map((n: number, i: number) => (
          <div key={i} className="number-badge">
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Example 9: Multiple Subscriptions
// =============================================================================

class SharedStateCubit extends Cubit<{ value: number; lastUpdated: string }> {
  constructor() {
    super({ value: 0, lastUpdated: new Date().toLocaleTimeString() });
  }

  increment = () => {
    this.emit({
      value: this.state.value + 1,
      lastUpdated: new Date().toLocaleTimeString(),
    });
  };
}

const ValueDisplay = memo(() => {
  const [value] = useBlocAdapter(SharedStateCubit, {
    selector: (state: { value: number; lastUpdated: string }) => state.value,
  });

  return <div className="stat-badge">Value: {value}</div>;
});
ValueDisplay.displayName = 'ValueDisplay';

const TimeDisplay = memo(() => {
  const [time] = useBlocAdapter(SharedStateCubit, {
    selector: (state: { value: number; lastUpdated: string }) =>
      state.lastUpdated,
  });

  return <div className="stat-badge">Updated: {time}</div>;
});
TimeDisplay.displayName = 'TimeDisplay';

const FullStateDisplay = memo(() => {
  const [state] = useBlocAdapter(SharedStateCubit);

  return (
    <div className="stat-badge">
      Full State: {state.value} @ {state.lastUpdated}
    </div>
  );
});
FullStateDisplay.displayName = 'FullStateDisplay';

function MultipleSubscriptionsExample() {
  const [, cubit] = useBlocAdapter(SharedStateCubit);

  return (
    <div className="example-card">
      <h3>9. Multiple Subscriptions</h3>
      <p className="example-description">
        Multiple components subscribing to different parts of the same state
      </p>

      <button onClick={cubit.increment}>Increment</button>

      <div className="component-badges">
        <ValueDisplay />
        <TimeDisplay />
        <FullStateDisplay />
      </div>

      <p className="note">
        💡 Each component only re-renders when its selected state changes
      </p>
    </div>
  );
}

// =============================================================================
// Example 10: Shared vs Isolated Blocs
// =============================================================================

class IsolatedCounterCubit extends Cubit<number> {
  static isolated = true;

  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

function IsolatedCounter({ label }: { label: string }) {
  const [count, cubit] = useBlocAdapter(IsolatedCounterCubit);

  return (
    <div className="counter-card">
      <div className="counter-label">{label}</div>
      <div className="counter-value">{count}</div>
      <button onClick={cubit.increment}>+1</button>
    </div>
  );
}

function SharedVsIsolatedExample() {
  return (
    <div className="example-card">
      <h3>10. Shared vs Isolated Blocs</h3>
      <p className="example-description">
        Isolated blocs - each component gets its own instance
      </p>

      <div className="counter-grid">
        <IsolatedCounter label="Counter A" />
        <IsolatedCounter label="Counter B" />
        <IsolatedCounter label="Counter C" />
      </div>

      <p className="note">
        💡 Each counter is independent because IsolatedCounterCubit has static
        isolated = true
      </p>
    </div>
  );
}

// =============================================================================
// Example 11: Fine-Grained Dependency Tracking with Render Counters
// =============================================================================

interface ProfileState {
  user: {
    id: number;
    name: string;
    email: string;
  };
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
  stats: {
    views: number;
    likes: number;
  };
}

class ProfileCubit extends Cubit<ProfileState> {
  constructor() {
    super({
      user: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      },
      settings: {
        theme: 'light',
        notifications: true,
      },
      stats: {
        views: 0,
        likes: 0,
      },
    });
  }

  updateName = (name: string) => {
    this.emit({
      ...this.state,
      user: { ...this.state.user, name },
    });
  };

  updateEmail = (email: string) => {
    this.emit({
      ...this.state,
      user: { ...this.state.user, email },
    });
  };

  toggleTheme = () => {
    this.emit({
      ...this.state,
      settings: {
        ...this.state.settings,
        theme: this.state.settings.theme === 'light' ? 'dark' : 'light',
      },
    });
  };

  toggleNotifications = () => {
    this.emit({
      ...this.state,
      settings: {
        ...this.state.settings,
        notifications: !this.state.settings.notifications,
      },
    });
  };

  incrementViews = () => {
    this.emit({
      ...this.state,
      stats: { ...this.state.stats, views: this.state.stats.views + 1 },
    });
  };

  incrementLikes = () => {
    this.emit({
      ...this.state,
      stats: { ...this.state.stats, likes: this.state.stats.likes + 1 },
    });
  };
}

// Hook to track render counts
function useRenderCount(componentName: string) {
  const renderCount = useRef(0);
  renderCount.current++;

  return (
    <div
      className="render-badge"
      style={{
        fontSize: '11px',
        padding: '2px 6px',
        borderRadius: '4px',
        background: renderCount.current > 1 ? '#4ade80' : '#94a3b8',
        color: 'white',
        fontWeight: 'bold',
      }}
    >
      Renders: {renderCount.current}
    </div>
  );
}

// Component subscribing only to user.name
const UserNameDisplay = memo(() => {
  const [name] = useBlocAdapter(ProfileCubit, {
    selector: (state: ProfileState) => state.user.name,
  });

  return (
    <div className="profile-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Name</div>
          <div style={{ fontWeight: 'bold' }}>{name}</div>
        </div>
        {useRenderCount('UserNameDisplay')}
      </div>
    </div>
  );
});
UserNameDisplay.displayName = 'UserNameDisplay';

// Component subscribing only to user.email
const UserEmailDisplay = memo(() => {
  const [email] = useBlocAdapter(ProfileCubit, {
    selector: (state: ProfileState) => state.user.email,
  });

  return (
    <div className="profile-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Email</div>
          <div style={{ fontWeight: 'bold' }}>{email}</div>
        </div>
        {useRenderCount('UserEmailDisplay')}
      </div>
    </div>
  );
});
UserEmailDisplay.displayName = 'UserEmailDisplay';

// Component subscribing only to settings.theme
const ThemeDisplay = memo(() => {
  const [theme] = useBlocAdapter(ProfileCubit, {
    selector: (state: ProfileState) => state.settings.theme,
  });

  return (
    <div className="profile-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Theme</div>
          <div style={{ fontWeight: 'bold' }}>
            {theme === 'light' ? '☀️ Light' : '🌙 Dark'}
          </div>
        </div>
        {useRenderCount('ThemeDisplay')}
      </div>
    </div>
  );
});
ThemeDisplay.displayName = 'ThemeDisplay';

// Component subscribing only to settings.notifications
const NotificationDisplay = memo(() => {
  const [notifications] = useBlocAdapter(ProfileCubit, {
    selector: (state: ProfileState) => state.settings.notifications,
  });

  return (
    <div className="profile-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Notifications
          </div>
          <div style={{ fontWeight: 'bold' }}>
            {notifications ? '🔔 Enabled' : '🔕 Disabled'}
          </div>
        </div>
        {useRenderCount('NotificationDisplay')}
      </div>
    </div>
  );
});
NotificationDisplay.displayName = 'NotificationDisplay';

// Component subscribing to stats object
const StatsDisplay = memo(() => {
  const [stats] = useBlocAdapter(ProfileCubit, {
    selector: (state: ProfileState) => state.stats,
  });

  return (
    <div className="profile-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Views</div>
            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
              {stats.views}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Likes</div>
            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
              {stats.likes}
            </div>
          </div>
        </div>
        {useRenderCount('StatsDisplay')}
      </div>
    </div>
  );
});
StatsDisplay.displayName = 'StatsDisplay';

// Component subscribing to entire state (inefficient)
const ProfileFullStateDisplay = memo(() => {
  const [state] = useBlocAdapter(ProfileCubit);

  return (
    <div className="profile-card" style={{ borderLeft: '3px solid #ef4444' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}
          >
            ⚠️ Full State (Re-renders on ANY change)
          </div>
          <div style={{ fontSize: '11px', marginTop: '4px' }}>
            {state.user.name} | {state.settings.theme} | {state.stats.views}{' '}
            views
          </div>
        </div>
        {useRenderCount('ProfileFullStateDisplay')}
      </div>
    </div>
  );
});
ProfileFullStateDisplay.displayName = 'ProfileFullStateDisplay';

function RenderCounterExample() {
  const [, cubit] = useBlocAdapter(ProfileCubit);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  return (
    <div className="example-card">
      <h3>11. Fine-Grained Dependency Tracking</h3>
      <p className="example-description">
        Watch render counters to see which components re-render on state changes
      </p>

      <div style={{ marginBottom: '20px' }}>
        <h4
          style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#64748b' }}
        >
          Update Controls
        </h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}
        >
          <div className="input-group">
            <input
              type="text"
              placeholder="New name..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nameInput.trim()) {
                  cubit.updateName(nameInput);
                  setNameInput('');
                }
              }}
            />
            <button
              onClick={() => {
                if (nameInput.trim()) {
                  cubit.updateName(nameInput);
                  setNameInput('');
                }
              }}
            >
              Update Name
            </button>
          </div>
          <div className="input-group">
            <input
              type="email"
              placeholder="New email..."
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && emailInput.trim()) {
                  cubit.updateEmail(emailInput);
                  setEmailInput('');
                }
              }}
            />
            <button
              onClick={() => {
                if (emailInput.trim()) {
                  cubit.updateEmail(emailInput);
                  setEmailInput('');
                }
              }}
            >
              Update Email
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginTop: '10px',
            flexWrap: 'wrap',
          }}
        >
          <button onClick={cubit.toggleTheme}>Toggle Theme</button>
          <button onClick={cubit.toggleNotifications}>
            Toggle Notifications
          </button>
          <button onClick={cubit.incrementViews}>Increment Views</button>
          <button onClick={cubit.incrementLikes}>Increment Likes</button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4
          style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#64748b' }}
        >
          Optimized Components (Selector-based)
        </h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}
        >
          <UserNameDisplay />
          <UserEmailDisplay />
          <ThemeDisplay />
          <NotificationDisplay />
        </div>
        <div style={{ marginTop: '10px' }}>
          <StatsDisplay />
        </div>
      </div>

      <div>
        <h4
          style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#64748b' }}
        >
          Unoptimized Component (No Selector)
        </h4>
        <ProfileFullStateDisplay />
      </div>

      <div
        style={{
          marginTop: '20px',
          padding: '15px',
          background: '#f0f9ff',
          borderRadius: '6px',
          fontSize: '13px',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          💡 Try this:
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>
            Update the <strong>name</strong> - only <code>UserNameDisplay</code>{' '}
            and <code>ProfileFullStateDisplay</code> re-render
          </li>
          <li>
            Toggle <strong>theme</strong> - only <code>ThemeDisplay</code> and{' '}
            <code>ProfileFullStateDisplay</code> re-render
          </li>
          <li>
            Increment <strong>views</strong> - only <code>StatsDisplay</code>{' '}
            and <code>ProfileFullStateDisplay</code> re-render
          </li>
          <li>
            Notice: <code>ProfileFullStateDisplay</code> re-renders on{' '}
            <strong>every</strong> change (inefficient!)
          </li>
        </ul>
      </div>
    </div>
  );
}

// =============================================================================
// Example 12: Automatic Dependency Tracking (No Selector Needed!)
// =============================================================================

interface AppState {
  user: {
    profile: {
      name: string;
      email: string;
    };
    settings: {
      theme: 'light' | 'dark';
      notifications: boolean;
    };
  };
  counter: number;
  showCounter: boolean;
  lastUpdate: number;
}

class AutoTrackCubit extends Cubit<AppState> {
  constructor() {
    super({
      user: {
        profile: {
          name: 'Alice',
          email: 'alice@example.com',
        },
        settings: {
          theme: 'light',
          notifications: true,
        },
      },
      counter: 0,
      showCounter: true,
      lastUpdate: Date.now(),
    });
  }

  updateName = (name: string) => {
    this.emit({
      ...this.state,
      user: {
        ...this.state.user,
        profile: { ...this.state.user.profile, name },
      },
      lastUpdate: Date.now(),
    });
  };

  updateEmail = (email: string) => {
    this.emit({
      ...this.state,
      user: {
        ...this.state.user,
        profile: { ...this.state.user.profile, email },
      },
      lastUpdate: Date.now(),
    });
  };

  toggleTheme = () => {
    this.emit({
      ...this.state,
      user: {
        ...this.state.user,
        settings: {
          ...this.state.user.settings,
          theme: this.state.user.settings.theme === 'light' ? 'dark' : 'light',
        },
      },
      lastUpdate: Date.now(),
    });
  };

  incrementCounter = () => {
    this.emit({
      ...this.state,
      counter: this.state.counter + 1,
      lastUpdate: Date.now(),
    });
  };

  toggleShowCounter = () => {
    this.emit({
      ...this.state,
      showCounter: !this.state.showCounter,
      lastUpdate: Date.now(),
    });
  };
}

// Component that only accesses user.profile.name - auto-tracks only that path!
const AutoTrackUserName = memo(() => {
  const [state] = useBlocAdapter(AutoTrackCubit);
  // No selector needed! Only re-renders when state.user.profile.name changes

  return (
    <div className="profile-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Name (Auto-tracked)
          </div>
          <div style={{ fontWeight: 'bold' }}>{state.user.profile.name}</div>
        </div>
        {useRenderCount('AutoTrackUserName')}
      </div>
    </div>
  );
});
AutoTrackUserName.displayName = 'AutoTrackUserName';

// Component that only accesses user.profile.email
const AutoTrackUserEmail = memo(() => {
  const [state] = useBlocAdapter(AutoTrackCubit);

  return (
    <div className="profile-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Email (Auto-tracked)
          </div>
          <div style={{ fontWeight: 'bold' }}>{state.user.profile.email}</div>
        </div>
        {useRenderCount('AutoTrackUserEmail')}
      </div>
    </div>
  );
});
AutoTrackUserEmail.displayName = 'AutoTrackUserEmail';

// Component that only accesses user.settings.theme
const AutoTrackTheme = memo(() => {
  const [state] = useBlocAdapter(AutoTrackCubit);

  return (
    <div className="profile-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Theme (Auto-tracked)
          </div>
          <div style={{ fontWeight: 'bold' }}>
            {state.user.settings.theme === 'light' ? '☀️ Light' : '🌙 Dark'}
          </div>
        </div>
        {useRenderCount('AutoTrackTheme')}
      </div>
    </div>
  );
});
AutoTrackTheme.displayName = 'AutoTrackTheme';

// Component with conditional access - demonstrates dynamic dependency tracking
const AutoTrackConditionalCounter = memo(() => {
  const [state] = useBlocAdapter(AutoTrackCubit);

  // When showCounter is true, tracks both showCounter AND counter
  // When showCounter is false, only tracks showCounter
  return (
    <div className="profile-card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ width: '100%' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Conditional Counter (Auto-tracked)
          </div>
          <div style={{ fontWeight: 'bold', marginTop: '4px' }}>
            {state.showCounter ? (
              <span>Count: {state.counter}</span>
            ) : (
              <span>Counter Hidden</span>
            )}
          </div>
        </div>
        {useRenderCount('AutoTrackConditionalCounter')}
      </div>
    </div>
  );
});
AutoTrackConditionalCounter.displayName = 'AutoTrackConditionalCounter';

function AutoTrackingExample() {
  const [state, cubit] = useBlocAdapter(AutoTrackCubit);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  return (
    <div className="example-card">
      <h3>12. Automatic Dependency Tracking 🎯</h3>
      <p className="example-description">
        <strong>No selectors required!</strong> Components automatically track
        only the properties they access.
      </p>

      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          background: '#ecfdf5',
          borderRadius: '6px',
          borderLeft: '4px solid #10b981',
        }}
      >
        <div
          style={{ fontWeight: 'bold', marginBottom: '8px', color: '#065f46' }}
        >
          ✨ How it works
        </div>
        <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#047857' }}>
          Each component automatically tracks which properties it accesses
          during render. When state changes, only components that accessed
          changed properties will re-render.
          <strong> No manual selectors needed!</strong>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4
          style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#64748b' }}
        >
          Update Controls
        </h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}
        >
          <div className="input-group">
            <input
              type="text"
              placeholder="New name..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nameInput.trim()) {
                  cubit.updateName(nameInput);
                  setNameInput('');
                }
              }}
            />
            <button
              onClick={() => {
                if (nameInput.trim()) {
                  cubit.updateName(nameInput);
                  setNameInput('');
                }
              }}
            >
              Update Name
            </button>
          </div>
          <div className="input-group">
            <input
              type="email"
              placeholder="New email..."
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && emailInput.trim()) {
                  cubit.updateEmail(emailInput);
                  setEmailInput('');
                }
              }}
            />
            <button
              onClick={() => {
                if (emailInput.trim()) {
                  cubit.updateEmail(emailInput);
                  setEmailInput('');
                }
              }}
            >
              Update Email
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginTop: '10px',
            flexWrap: 'wrap',
          }}
        >
          <button onClick={cubit.toggleTheme}>Toggle Theme</button>
          <button onClick={cubit.incrementCounter}>Increment Counter</button>
          <button onClick={cubit.toggleShowCounter}>
            {state.showCounter ? 'Hide Counter' : 'Show Counter'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4
          style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#64748b' }}
        >
          Auto-Tracked Components (No Selectors! 🎉)
        </h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}
        >
          <AutoTrackUserName />
          <AutoTrackUserEmail />
          <AutoTrackTheme />
        </div>
        <div style={{ marginTop: '10px' }}>
          <AutoTrackConditionalCounter />
        </div>
      </div>

      <div
        style={{
          marginTop: '20px',
          padding: '15px',
          background: '#f0f9ff',
          borderRadius: '6px',
          fontSize: '13px',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          💡 Try this:
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>
            Update the <strong>name</strong> - only{' '}
            <code>AutoTrackUserName</code> re-renders
          </li>
          <li>
            Update the <strong>email</strong> - only{' '}
            <code>AutoTrackUserEmail</code> re-renders
          </li>
          <li>
            Toggle <strong>theme</strong> - only <code>AutoTrackTheme</code>{' '}
            re-renders
          </li>
          <li>
            Increment <strong>counter</strong> - only{' '}
            <code>AutoTrackConditionalCounter</code> re-renders (if shown)
          </li>
          <li>
            Toggle <strong>show counter</strong> -{' '}
            <code>AutoTrackConditionalCounter</code> re-renders and dependencies
            update!
          </li>
        </ul>
      </div>

      <div
        style={{
          marginTop: '15px',
          padding: '15px',
          background: '#fef3c7',
          borderRadius: '6px',
          fontSize: '12px',
          borderLeft: '4px solid #f59e0b',
        }}
      >
        <div
          style={{ fontWeight: 'bold', marginBottom: '6px', color: '#92400e' }}
        >
          ⚠️ Performance Note
        </div>
        <div style={{ color: '#78350f' }}>
          Auto-tracking uses Proxies and has a small overhead. For deeply nested
          objects or performance-critical paths, explicit selectors may still be
          faster. The system automatically tracks up to 2 levels deep by default
          (configurable).
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Examples Page
// =============================================================================

export function AdapterExamples() {
  const [activeTab, setActiveTab] = React.useState<
    'basic' | 'debug' | 'advanced' | 'performance' | 'react18'
  >('debug');

  React.useEffect(() => {
    // Reset Blac instance when component mounts for clean state
    Blac.resetInstance();
  }, []);

  const renderDebug = () => (
    <>
      <DebugComponent />
      <DebugComponent />
    </>
  );

  const renderBasicExamples = () => (
    <>
      <BasicCounter />
      <TodoExample />
      <LifecycleExample />
    </>
  );

  const renderAdvancedExamples = () => (
    <>
      <CustomCompareExample />
      <MemoizedSelectorExample />
      <MultipleSubscriptionsExample />
      <SharedVsIsolatedExample />
    </>
  );

  const renderPerformanceExamples = () => (
    <>
      <AutoTrackingExample />
      <RenderCounterExample />
    </>
  );

  const renderReact18Examples = () => (
    <>
      <SuspenseExample />
      <TransitionExample />
      <DeferredExample />
    </>
  );

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '40px',
          borderRadius: '12px',
          marginBottom: '30px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '36px' }}>useBlocAdapter Examples</h1>
        <p style={{ margin: '10px 0 0 0', fontSize: '18px', opacity: 0.9 }}>
          Comprehensive examples demonstrating various patterns and use cases
        </p>
      </div>

      <div className="tabs">
        <button
          className={activeTab === 'basic' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('basic')}
        >
          Basic Examples
        </button>
        <button
          className={activeTab === 'advanced' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced Patterns
        </button>
        <button
          className={activeTab === 'performance' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </button>
        <button
          className={activeTab === 'react18' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('react18')}
        >
          React 18 Features
        </button>
        <button
          className={activeTab === 'debug' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('debug')}
        >
          DEBUG
        </button>
      </div>

      <div className="examples-grid">
        {activeTab === 'basic' && renderBasicExamples()}
        {activeTab === 'advanced' && renderAdvancedExamples()}
        {activeTab === 'performance' && renderPerformanceExamples()}
        {activeTab === 'react18' && renderReact18Examples()}
        {activeTab === 'debug' && renderDebug()}
      </div>

      <div
        style={{
          marginTop: '40px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '8px',
          borderLeft: '4px solid #667eea',
        }}
      >
        <h3 style={{ marginTop: 0 }}>📚 Key Takeaways</h3>
        <ul style={{ margin: 0, lineHeight: '1.8' }}>
          <li>
            Use <strong>selectors</strong> for fine-grained subscriptions and
            better performance
          </li>
          <li>
            Add <strong>custom comparison</strong> functions to avoid
            unnecessary re-renders
          </li>
          <li>
            Leverage <strong>lifecycle callbacks</strong> (onMount/onUnmount)
            for side effects
          </li>
          <li>
            Use <strong>React.memo</strong> with selectors to prevent parent
            re-render cascades
          </li>
          <li>
            <strong>useTransition</strong> and <strong>useDeferredValue</strong>{' '}
            work seamlessly
          </li>
          <li>
            Manual <strong>Suspense pattern</strong> gives you full control over
            async operations
          </li>
        </ul>
      </div>
    </div>
  );
}
