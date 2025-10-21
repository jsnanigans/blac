import { useState } from 'react';
import { useBloc } from '@blac/react';
import { Cubit, Vertex } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import { Plus, Trash2, Filter, CheckSquare, Square, Check } from 'lucide-react';

// =================================================================
// Simple List CRUD with Cubit
// =================================================================

interface Task {
  id: number;
  text: string;
  completed: boolean;
}

interface SimpleListState {
  tasks: Task[];
  nextId: number;
}

class SimpleListCubit extends Cubit<SimpleListState> {
  constructor() {
    super({
      tasks: [
        { id: 1, text: 'Learn list management patterns', completed: false },
        { id: 2, text: 'Build a task list', completed: false },
      ],
      nextId: 3,
    });
  }

  addTask = (text: string) => {
    if (!text.trim()) return;

    this.patch({
      tasks: [
        ...this.state.tasks,
        { id: this.state.nextId, text: text.trim(), completed: false },
      ],
      nextId: this.state.nextId + 1,
    });
  };

  toggleTask = (id: number) => {
    this.patch({
      tasks: this.state.tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    });
  };

  removeTask = (id: number) => {
    this.patch({
      tasks: this.state.tasks.filter((task) => task.id !== id),
    });
  };

  clearCompleted = () => {
    this.patch({
      tasks: this.state.tasks.filter((task) => !task.completed),
    });
  };
}

// =================================================================
// Event-Driven List with Filtering (Bloc Pattern)
// =================================================================

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  priorityFilter: 'all' | 'low' | 'medium' | 'high';
  nextId: number;
}

// Event classes
class AddTodoEvent {
  constructor(
    public readonly text: string,
    public readonly priority: 'low' | 'medium' | 'high' = 'medium',
  ) {}
}

class ToggleTodoEvent {
  constructor(public readonly id: number) {}
}

class RemoveTodoEvent {
  constructor(public readonly id: number) {}
}

class SetFilterEvent {
  constructor(public readonly filter: 'all' | 'active' | 'completed') {}
}

class SetPriorityFilterEvent {
  constructor(public readonly priority: 'all' | 'low' | 'medium' | 'high') {}
}

class ClearCompletedEvent {}

type TodoEvent =
  | AddTodoEvent
  | ToggleTodoEvent
  | RemoveTodoEvent
  | SetFilterEvent
  | SetPriorityFilterEvent
  | ClearCompletedEvent;

class TodoBloc extends Vertex<TodoState, TodoEvent> {
  constructor() {
    super({
      todos: [
        {
          id: 1,
          text: 'Review pull requests',
          completed: false,
          priority: 'high',
        },
        {
          id: 2,
          text: 'Update documentation',
          completed: false,
          priority: 'medium',
        },
        { id: 3, text: 'Refactor old code', completed: true, priority: 'low' },
      ],
      filter: 'all',
      priorityFilter: 'all',
      nextId: 4,
    });

    this.on(AddTodoEvent, this.handleAdd);
    this.on(ToggleTodoEvent, this.handleToggle);
    this.on(RemoveTodoEvent, this.handleRemove);
    this.on(SetFilterEvent, this.handleSetFilter);
    this.on(SetPriorityFilterEvent, this.handleSetPriorityFilter);
    this.on(ClearCompletedEvent, this.handleClearCompleted);
  }

  private handleAdd = (
    event: AddTodoEvent,
    emit: (state: TodoState) => void,
  ) => {
    if (!event.text.trim()) return;

    emit({
      ...this.state,
      todos: [
        ...this.state.todos,
        {
          id: this.state.nextId,
          text: event.text.trim(),
          completed: false,
          priority: event.priority,
        },
      ],
      nextId: this.state.nextId + 1,
    });
  };

  private handleToggle = (
    event: ToggleTodoEvent,
    emit: (state: TodoState) => void,
  ) => {
    emit({
      ...this.state,
      todos: this.state.todos.map((todo) =>
        todo.id === event.id ? { ...todo, completed: !todo.completed } : todo,
      ),
    });
  };

  private handleRemove = (
    event: RemoveTodoEvent,
    emit: (state: TodoState) => void,
  ) => {
    emit({
      ...this.state,
      todos: this.state.todos.filter((todo) => todo.id !== event.id),
    });
  };

  private handleSetFilter = (
    event: SetFilterEvent,
    emit: (state: TodoState) => void,
  ) => {
    emit({
      ...this.state,
      filter: event.filter,
    });
  };

  private handleSetPriorityFilter = (
    event: SetPriorityFilterEvent,
    emit: (state: TodoState) => void,
  ) => {
    emit({
      ...this.state,
      priorityFilter: event.priority,
    });
  };

  private handleClearCompleted = (
    _event: ClearCompletedEvent,
    emit: (state: TodoState) => void,
  ) => {
    emit({
      ...this.state,
      todos: this.state.todos.filter((todo) => !todo.completed),
    });
  };

  // Public API methods
  addTodo = (text: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    this.add(new AddTodoEvent(text, priority));
  };

  toggleTodo = (id: number) => {
    this.add(new ToggleTodoEvent(id));
  };

  removeTodo = (id: number) => {
    this.add(new RemoveTodoEvent(id));
  };

  setFilter = (filter: 'all' | 'active' | 'completed') => {
    this.add(new SetFilterEvent(filter));
  };

  setPriorityFilter = (priority: 'all' | 'low' | 'medium' | 'high') => {
    this.add(new SetPriorityFilterEvent(priority));
  };

  clearCompleted = () => {
    this.add(new ClearCompletedEvent());
  };

  // Computed properties
  get filteredTodos(): Todo[] {
    let filtered = this.state.todos;

    // Apply completion filter
    switch (this.state.filter) {
      case 'active':
        filtered = filtered.filter((t) => !t.completed);
        break;
      case 'completed':
        filtered = filtered.filter((t) => t.completed);
        break;
    }

    // Apply priority filter
    if (this.state.priorityFilter !== 'all') {
      filtered = filtered.filter(
        (t) => t.priority === this.state.priorityFilter,
      );
    }

    return filtered;
  }

  get activeCount(): number {
    return this.state.todos.filter((t) => !t.completed).length;
  }

  get completedCount(): number {
    return this.state.todos.filter((t) => t.completed).length;
  }
}

// =================================================================
// Bulk Operations
// =================================================================

interface Item {
  id: number;
  name: string;
  selected: boolean;
}

interface BulkState {
  items: Item[];
  nextId: number;
}

class BulkOperationsCubit extends Cubit<BulkState> {
  constructor() {
    super({
      items: [
        { id: 1, name: 'Item 1', selected: false },
        { id: 2, name: 'Item 2', selected: false },
        { id: 3, name: 'Item 3', selected: false },
        { id: 4, name: 'Item 4', selected: false },
        { id: 5, name: 'Item 5', selected: false },
      ],
      nextId: 6,
    });
  }

  addItem = (name: string) => {
    if (!name.trim()) return;

    this.patch({
      items: [
        ...this.state.items,
        { id: this.state.nextId, name: name.trim(), selected: false },
      ],
      nextId: this.state.nextId + 1,
    });
  };

  toggleItem = (id: number) => {
    this.patch({
      items: this.state.items.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item,
      ),
    });
  };

  selectAll = () => {
    this.patch({
      items: this.state.items.map((item) => ({ ...item, selected: true })),
    });
  };

  deselectAll = () => {
    this.patch({
      items: this.state.items.map((item) => ({ ...item, selected: false })),
    });
  };

  deleteSelected = () => {
    this.patch({
      items: this.state.items.filter((item) => !item.selected),
    });
  };

  get selectedCount(): number {
    return this.state.items.filter((item) => item.selected).length;
  }

  get allSelected(): boolean {
    return (
      this.state.items.length > 0 &&
      this.state.items.every((item) => item.selected)
    );
  }

  get noneSelected(): boolean {
    return this.state.items.every((item) => !item.selected);
  }
}

// =================================================================
// Interactive Demos
// =================================================================

export function ListManagementInteractive() {
  const [activeDemo, setActiveDemo] = useState<
    'simple' | 'event-driven' | 'bulk'
  >('simple');

  return (
    <div className="my-8 space-y-6">
      {/* Demo Switcher */}
      <div className="flex justify-center gap-3 flex-wrap">
        <Button
          onClick={() => setActiveDemo('simple')}
          variant={activeDemo === 'simple' ? 'primary' : 'outline'}
          size="sm"
        >
          Simple CRUD
        </Button>
        <Button
          onClick={() => setActiveDemo('event-driven')}
          variant={activeDemo === 'event-driven' ? 'primary' : 'outline'}
          size="sm"
        >
          Event-Driven + Filtering
        </Button>
        <Button
          onClick={() => setActiveDemo('bulk')}
          variant={activeDemo === 'bulk' ? 'primary' : 'outline'}
          size="sm"
        >
          Bulk Operations
        </Button>
      </div>

      {/* Demo Content */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-6 py-6 shadow-subtle">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5 opacity-90" />
          <div className="relative space-y-4">
            <h3 className="text-lg font-semibold mb-4">
              {activeDemo === 'simple' && 'Simple CRUD with Cubit'}
              {activeDemo === 'event-driven' &&
                'Event-Driven List with Filtering'}
              {activeDemo === 'bulk' && 'Bulk Operations'}
            </h3>

            {activeDemo === 'simple' && <SimpleListDemo />}
            {activeDemo === 'event-driven' && <EventDrivenListDemo />}
            {activeDemo === 'bulk' && <BulkOperationsDemo />}
          </div>
        </div>

        <div className="space-y-4">
          {activeDemo === 'simple' && (
            <StateViewer
              bloc={SimpleListCubit}
              title="Simple List State"
              defaultCollapsed={false}
            />
          )}
          {activeDemo === 'event-driven' && (
            <StateViewer
              bloc={TodoBloc}
              title="Todo Bloc State"
              defaultCollapsed={false}
              maxDepth={2}
            />
          )}
          {activeDemo === 'bulk' && (
            <StateViewer
              bloc={BulkOperationsCubit}
              title="Bulk Operations State"
              defaultCollapsed={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SimpleListDemo() {
  const [state, cubit] = useBloc(SimpleListCubit);
  const [inputValue, setInputValue] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      cubit.addTask(inputValue);
      setInputValue('');
    }
  };

  const completedCount = state.tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Add a new task..."
          className="flex-1 px-3 py-2 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-background"
        />
        <Button type="submit" disabled={!inputValue.trim()} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </form>

      {state.tasks.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">
            No tasks yet. Add one above!
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {state.tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg border-2 border-border bg-surface"
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => cubit.toggleTask(task.id)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span
                  className={`flex-1 text-sm ${
                    task.completed ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {task.text}
                </span>
                <button
                  onClick={() => cubit.removeTask(task.id)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 bg-surface-muted rounded-lg text-sm">
            <span className="text-muted-foreground">
              {completedCount} of {state.tasks.length} completed
            </span>
            {completedCount > 0 && (
              <Button
                onClick={cubit.clearCompleted}
                variant="outline"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Completed
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EventDrivenListDemo() {
  const [state, bloc] = useBloc(TodoBloc);
  const [inputValue, setInputValue] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<
    'low' | 'medium' | 'high'
  >('medium');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      bloc.addTodo(inputValue, selectedPriority);
      setInputValue('');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      default:
        return 'bg-surface-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Add a new todo..."
            className="flex-1 px-3 py-2 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-background"
          />
          <Button
            type="submit"
            disabled={!inputValue.trim()}
            variant="primary"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        <div className="flex gap-2 text-sm">
          <span className="font-medium self-center">Priority:</span>
          {(['low', 'medium', 'high'] as const).map((priority) => (
            <button
              key={priority}
              type="button"
              onClick={() => setSelectedPriority(priority)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                selectedPriority === priority
                  ? getPriorityColor(priority)
                  : 'bg-surface-muted text-muted-foreground'
              }`}
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </button>
          ))}
        </div>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 p-3 bg-surface-muted rounded-lg text-xs">
        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-muted-foreground" />
          <span className="font-medium">Status:</span>
          {(['all', 'active', 'completed'] as const).map((filter) => (
            <Button
              key={filter}
              onClick={() => bloc.setFilter(filter)}
              variant={state.filter === filter ? 'primary' : 'outline'}
              size="sm"
              className="text-xs px-2 py-1"
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="font-medium">Priority:</span>
          {(['all', 'low', 'medium', 'high'] as const).map((priority) => (
            <Button
              key={priority}
              onClick={() => bloc.setPriorityFilter(priority)}
              variant={
                state.priorityFilter === priority ? 'primary' : 'outline'
              }
              size="sm"
              className="text-xs px-2 py-1"
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Todo List */}
      {bloc.filteredTodos.length === 0 ? (
        <div className="flex items-center justify-center h-[180px] border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">
            No todos match the current filters
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {bloc.filteredTodos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-2 p-2 rounded-lg border-2 border-border bg-surface"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => bloc.toggleTodo(todo.id)}
                className="w-3 h-3 cursor-pointer"
              />
              <span
                className={`flex-1 text-xs ${
                  todo.completed ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {todo.text}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(todo.priority)}`}
              >
                {todo.priority}
              </span>
              <button
                onClick={() => bloc.removeTodo(todo.id)}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between p-2 bg-surface-muted rounded-lg text-xs">
        <span className="text-muted-foreground">
          {bloc.activeCount} active, {bloc.completedCount} completed
        </span>
        {bloc.completedCount > 0 && (
          <Button
            onClick={bloc.clearCompleted}
            variant="outline"
            size="sm"
            className="text-xs px-2 py-1"
          >
            Clear Completed
          </Button>
        )}
      </div>
    </div>
  );
}

function BulkOperationsDemo() {
  const [state, cubit] = useBloc(BulkOperationsCubit);
  const [inputValue, setInputValue] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      cubit.addItem(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Add a new item..."
          className="flex-1 px-3 py-2 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-background"
        />
        <Button type="submit" disabled={!inputValue.trim()} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </form>

      {/* Bulk Actions */}
      <div className="flex items-center gap-2 p-3 bg-surface-muted rounded-lg flex-wrap">
        <Button
          onClick={cubit.selectAll}
          disabled={cubit.allSelected}
          variant="outline"
          size="sm"
        >
          <CheckSquare className="w-4 h-4 mr-2" />
          Select All
        </Button>
        <Button
          onClick={cubit.deselectAll}
          disabled={cubit.noneSelected}
          variant="outline"
          size="sm"
        >
          <Square className="w-4 h-4 mr-2" />
          Deselect All
        </Button>
        <Button
          onClick={cubit.deleteSelected}
          disabled={cubit.noneSelected}
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 dark:text-red-400"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete ({cubit.selectedCount})
        </Button>
      </div>

      {/* Item List */}
      {state.items.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">
            No items yet. Add one above!
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {state.items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                item.selected
                  ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                  : 'border-border bg-surface'
              }`}
            >
              <input
                type="checkbox"
                checked={item.selected}
                onChange={() => cubit.toggleItem(item.id)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="flex-1 text-sm">{item.name}</span>
              {item.selected && (
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
