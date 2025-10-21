import React, { useState } from 'react';
import { Cubit, Vertex } from '@blac/core';
import { useBloc } from '@blac/react';
import {
  Plus,
  Trash2,
  Check,
  X,
  Filter,
  CheckSquare,
  Square,
} from 'lucide-react';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import {
  ArticleSection,
  SectionHeader,
} from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { ConceptCallout } from '@/components/shared/ConceptCallout';
import { StateViewer } from '@/components/shared/StateViewer';
import { Button } from '@/ui/Button';

// ============================================================================
// DEMO 1: Simple List CRUD with Cubit
// ============================================================================

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
          className="flex-1 px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
        />
        <Button type="submit" disabled={!inputValue.trim()} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </form>

      {state.tasks.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            No tasks yet. Add one above!
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {state.tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => cubit.toggleTask(task.id)}
                  className="w-4 h-4"
                />
                <span
                  className={`flex-1 ${
                    task.completed
                      ? 'line-through text-gray-500 dark:text-gray-400'
                      : ''
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

          <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
            <span className="text-gray-600 dark:text-gray-400">
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

      <StateViewer bloc={SimpleListCubit} title="Current State" />
    </div>
  );
}

// ============================================================================
// DEMO 2: Event-Driven List with Filtering (Bloc Pattern)
// ============================================================================

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
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
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
            className="flex-1 px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800"
          />
          <Button type="submit" disabled={!inputValue.trim()} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        <div className="flex gap-2">
          <span className="text-sm font-medium self-center">Priority:</span>
          {(['low', 'medium', 'high'] as const).map((priority) => (
            <button
              key={priority}
              type="button"
              onClick={() => setSelectedPriority(priority)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                selectedPriority === priority
                  ? getPriorityColor(priority)
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </button>
          ))}
        </div>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium">Status:</span>
          {(['all', 'active', 'completed'] as const).map((filter) => (
            <Button
              key={filter}
              onClick={() => bloc.setFilter(filter)}
              variant={state.filter === filter ? 'primary' : 'outline'}
              size="sm"
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Priority:</span>
          {(['all', 'low', 'medium', 'high'] as const).map((priority) => (
            <Button
              key={priority}
              onClick={() => bloc.setPriorityFilter(priority)}
              variant={
                state.priorityFilter === priority ? 'primary' : 'outline'
              }
              size="sm"
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Todo List */}
      {bloc.filteredTodos.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            No todos match the current filters
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {bloc.filteredTodos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => bloc.toggleTodo(todo.id)}
                className="w-4 h-4"
              />
              <span
                className={`flex-1 ${
                  todo.completed
                    ? 'line-through text-gray-500 dark:text-gray-400'
                    : ''
                }`}
              >
                {todo.text}
              </span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(todo.priority)}`}
              >
                {todo.priority}
              </span>
              <button
                onClick={() => bloc.removeTodo(todo.id)}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          {bloc.activeCount} active, {bloc.completedCount} completed
        </span>
        {bloc.completedCount > 0 && (
          <Button onClick={bloc.clearCompleted} variant="outline" size="sm">
            Clear Completed
          </Button>
        )}
      </div>

      <StateViewer bloc={TodoBloc} title="Current State" maxDepth={2} />
    </div>
  );
}

// ============================================================================
// DEMO 3: Bulk Operations
// ============================================================================

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
          className="flex-1 px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800"
        />
        <Button type="submit" disabled={!inputValue.trim()} variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </form>

      {/* Bulk Actions */}
      <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
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
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Selected ({cubit.selectedCount})
        </Button>
      </div>

      {/* Item List */}
      {state.items.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            No items yet. Add one above!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {state.items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                item.selected
                  ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <input
                type="checkbox"
                checked={item.selected}
                onChange={() => cubit.toggleItem(item.id)}
                className="w-4 h-4"
              />
              <span className="flex-1">{item.name}</span>
              {item.selected && (
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              )}
            </div>
          ))}
        </div>
      )}

      <StateViewer bloc={BulkOperationsCubit} title="Current State" />
    </div>
  );
}

// ===== DEMO METADATA =====

const demoMetadata = {
  id: 'list-management',
  title: 'List Management & CRUD',
  description:
    'Master list operations with CRUD patterns, filtering, computed properties, and bulk operations.',
  category: '02-patterns' as const,
  difficulty: 'beginner' as const,
  tags: ['cubit', 'bloc', 'crud', 'lists', 'filtering', 'bulk-operations'],
  estimatedTime: 15,
  learningPath: {
    previous: 'data-fetching',
    next: 'filtering-sorting',
    sequence: 5,
  },
  theme: {
    primaryColor: '#10b981',
    accentColor: '#34d399',
  },
};

// ============================================================================
// Main Demo Component
// ============================================================================

export function ListManagementDemo() {
  return (
    <DemoArticle metadata={demoMetadata} showBlocGraph={true}>
      {/* Introduction */}
      <ArticleSection theme="cubit" id="introduction">
        <SectionHeader>List Management Fundamentals</SectionHeader>
        <Prose>
          <p>
            Lists are everywhere: todo lists, shopping carts, user tables,
            comment threads. Managing lists well is a fundamental skill in
            front-end development.
          </p>
          <p>
            In this guide, you'll learn three progressively advanced patterns:
          </p>
          <ul>
            <li>
              <strong>Simple CRUD with Cubit</strong>: Create, Read, Update,
              Delete operations
            </li>
            <li>
              <strong>Event-Driven Lists with Bloc</strong>: Complex filtering
              and computed properties
            </li>
            <li>
              <strong>Bulk Operations</strong>: Select all, delete selected,
              mass updates
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Demo 1: Simple CRUD */}
      <ArticleSection id="simple-crud">
        <SectionHeader>Simple CRUD with Cubit</SectionHeader>
        <Prose>
          <p>
            The simplest way to manage a list: direct state mutations using a
            Cubit. Perfect for basic lists without complex business logic.
          </p>
        </Prose>

        <CodePanel
          language="typescript"
          title="SimpleListCubit.ts"
          code={`interface Task {
  id: number;
  text: string;
  completed: boolean;
}

interface SimpleListState {
  tasks: Task[];
  nextId: number;
}

class SimpleListCubit extends Cubit<SimpleListState> {
  // CREATE
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

  // UPDATE
  toggleTask = (id: number) => {
    this.patch({
      tasks: this.state.tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      ),
    });
  };

  // DELETE
  removeTask = (id: number) => {
    this.patch({
      tasks: this.state.tasks.filter((task) => task.id !== id),
    });
  };

  // BULK DELETE
  clearCompleted = () => {
    this.patch({
      tasks: this.state.tasks.filter((task) => !task.completed),
    });
  };
}`}
        />

        <div className="my-6">
          <SimpleListDemo />
        </div>

        <ConceptCallout type="tip" title="Immutability is Key">
          <p>
            Notice how we <strong>never mutate</strong> the original array.
            Instead, we create new arrays using spread operators (
            <code>...</code>), <code>map()</code>, and <code>filter()</code>.
            This is critical for React's change detection.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Demo 2: Event-Driven Lists */}
      <ArticleSection theme="neutral" id="event-driven">
        <SectionHeader>Event-Driven Lists with Bloc</SectionHeader>
        <Prose>
          <p>
            For complex lists with business rules, filtering, or auditing
            requirements, use the <strong>Bloc pattern</strong>. Events make
            state changes explicit and testable.
          </p>
          <p>This pattern shines when you need:</p>
          <ul>
            <li>Complex filtering logic (multiple filter types)</li>
            <li>Computed properties derived from list state</li>
            <li>Event logging or undo/redo functionality</li>
            <li>Integration with Redux DevTools</li>
          </ul>
        </Prose>

        <CodePanel
          language="typescript"
          title="TodoBloc.ts"
          code={`// Define event classes
class AddTodoEvent {
  constructor(
    public readonly text: string,
    public readonly priority: 'low' | 'medium' | 'high'
  ) {}
}

class SetFilterEvent {
  constructor(public readonly filter: 'all' | 'active' | 'completed') {}
}

class TodoBloc extends Vertex<TodoState, TodoEvent> {
  constructor() {
    super(initialState);

    // Register event handlers
    this.on(AddTodoEvent, this.handleAdd);
    this.on(SetFilterEvent, this.handleSetFilter);
  }

  private handleAdd = (event: AddTodoEvent, emit) => {
    emit({
      ...this.state,
      todos: [
        ...this.state.todos,
        {
          id: this.state.nextId,
          text: event.text,
          priority: event.priority,
          completed: false,
        },
      ],
      nextId: this.state.nextId + 1,
    });
  };

  // Public API
  addTodo = (text: string, priority: 'low' | 'medium' | 'high') => {
    this.add(new AddTodoEvent(text, priority));
  };

  // Computed properties
  get filteredTodos(): Todo[] {
    let filtered = this.state.todos;

    // Apply completion filter
    if (this.state.filter === 'active') {
      filtered = filtered.filter((t) => !t.completed);
    } else if (this.state.filter === 'completed') {
      filtered = filtered.filter((t) => t.completed);
    }

    // Apply priority filter
    if (this.state.priorityFilter !== 'all') {
      filtered = filtered.filter((t) => t.priority === this.state.priorityFilter);
    }

    return filtered;
  }

  get activeCount(): number {
    return this.state.todos.filter((t) => !t.completed).length;
  }
}`}
        />

        <div className="my-6">
          <EventDrivenListDemo />
        </div>

        <ConceptCallout type="tip" title="Computed Properties">
          <p>
            Getters like <code>filteredTodos</code> and <code>activeCount</code>{' '}
            are <strong>computed on-demand</strong>. They're not stored in
            state, which prevents duplication and keeps your state minimal.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Demo 3: Bulk Operations */}
      <ArticleSection id="bulk-operations">
        <SectionHeader>Bulk Operations</SectionHeader>
        <Prose>
          <p>
            When users need to act on multiple items at once, implement{' '}
            <strong>bulk operations</strong>. Common patterns:
          </p>
          <ul>
            <li>
              <strong>Select All / Deselect All</strong>: Toggle all items
            </li>
            <li>
              <strong>Delete Selected</strong>: Remove multiple items
            </li>
            <li>
              <strong>Mark All Complete</strong>: Batch update status
            </li>
            <li>
              <strong>Export Selected</strong>: Download subset of data
            </li>
          </ul>
        </Prose>

        <CodePanel
          language="typescript"
          title="BulkOperationsCubit.ts"
          code={`interface Item {
  id: number;
  name: string;
  selected: boolean; // Track selection state
}

class BulkOperationsCubit extends Cubit<{ items: Item[] }> {
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

  // Computed properties
  get selectedCount(): number {
    return this.state.items.filter((item) => item.selected).length;
  }

  get allSelected(): boolean {
    return (
      this.state.items.length > 0 &&
      this.state.items.every((item) => item.selected)
    );
  }
}`}
        />

        <div className="my-6">
          <BulkOperationsDemo />
        </div>

        <ConceptCallout type="warning" title="Performance Consideration">
          <p>
            Bulk operations on large lists (10,000+ items) can be slow.
            Consider:
          </p>
          <ul>
            <li>
              <strong>Virtual scrolling</strong>: Only render visible items
            </li>
            <li>
              <strong>Pagination</strong>: Operate on current page only
            </li>
            <li>
              <strong>Background processing</strong>: Use Web Workers for heavy
              operations
            </li>
            <li>
              <strong>Optimistic updates</strong>: Update UI immediately, sync
              with server later
            </li>
          </ul>
        </ConceptCallout>
      </ArticleSection>

      {/* Best Practices */}
      <ArticleSection id="best-practices">
        <SectionHeader>Best Practices</SectionHeader>
        <Prose>
          <h3>1. Generate Stable IDs</h3>
        </Prose>
        <CodePanel
          language="typescript"
          code={`// ❌ Bad: Using array index as ID
items.map((item, index) => <div key={index}>{item.text}</div>);

// ✅ Good: Use unique, stable IDs
class ListCubit extends Cubit<State> {
  private nextId = 1; // Auto-incrementing ID

  addItem = (text: string) => {
    this.patch({
      items: [...this.state.items, { id: this.nextId++, text }],
    });
  };
}

// ✅ Better: Use UUIDs for distributed systems
import { nanoid } from 'nanoid';

addItem = (text: string) => {
  this.patch({
    items: [...this.state.items, { id: nanoid(), text }],
  });
};`}
        />

        <Prose>
          <h3>2. Keep State Normalized</h3>
        </Prose>
        <CodePanel
          language="typescript"
          code={`// ❌ Bad: Nested duplicated data
interface State {
  users: Array<{ id: number; name: string; posts: Post[] }>;
  posts: Post[];
}

// ✅ Good: Normalized with references
interface State {
  users: Record<number, User>;
  posts: Record<number, Post>;
  // Posts reference user IDs, not full user objects
}

// Makes updates easier:
updateUser = (id: number, name: string) => {
  this.patch({
    users: {
      ...this.state.users,
      [id]: { ...this.state.users[id], name },
    },
  });
};`}
        />

        <Prose>
          <h3>3. Use Computed Properties for Filtering</h3>
        </Prose>
        <CodePanel
          language="typescript"
          code={`// ❌ Bad: Store filtered list in state
interface State {
  todos: Todo[];
  filter: Filter;
  filteredTodos: Todo[]; // Duplication!
}

// ✅ Good: Compute on-demand with getter
class TodoBloc extends Vertex<State> {
  get filteredTodos(): Todo[] {
    switch (this.state.filter) {
      case 'active':
        return this.state.todos.filter((t) => !t.completed);
      case 'completed':
        return this.state.todos.filter((t) => t.completed);
      default:
        return this.state.todos;
    }
  }
}`}
        />

        <Prose>
          <h3>4. Batch Multiple Updates</h3>
        </Prose>
        <CodePanel
          language="typescript"
          code={`// ❌ Bad: Multiple separate state updates
markAllComplete = () => {
  this.state.todos.forEach((todo) => {
    this.toggleTodo(todo.id); // Triggers re-render for EACH todo!
  });
};

// ✅ Good: Single batched update
markAllComplete = () => {
  this.patch({
    todos: this.state.todos.map((todo) => ({ ...todo, completed: true })),
  });
};`}
        />
      </ArticleSection>

      {/* Summary */}
      <ArticleSection theme="success" id="summary">
        <SectionHeader>Summary</SectionHeader>
        <Prose>
          <p>You've mastered three essential list management patterns:</p>
        </Prose>

        <div className="grid gap-4 my-6">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold mb-2">Simple CRUD with Cubit</h4>
            <p className="text-sm">
              Direct state mutations for straightforward lists. Fast to
              implement, easy to understand. Perfect for basic CRUD operations.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-800">
            <h4 className="font-semibold mb-2">Event-Driven Lists with Bloc</h4>
            <p className="text-sm">
              Explicit events for complex business logic, filtering, and
              computed properties. Testable, auditable, and scalable for
              production apps.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800">
            <h4 className="font-semibold mb-2">Bulk Operations</h4>
            <p className="text-sm">
              Select all, delete selected, and mass updates for power users.
              Essential for data-heavy applications like admin panels and
              dashboards.
            </p>
          </div>
        </div>

        <ConceptCallout type="tip" title="Next Steps">
          <p>Now that you understand list management, explore:</p>
          <ul>
            <li>
              <strong>Filtering & Sorting</strong>: Advanced search and sort
              patterns
            </li>
            <li>
              <strong>Persistence</strong>: Save list state to localStorage or
              database
            </li>
            <li>
              <strong>Undo/Redo</strong>: Time-travel debugging with event
              history
            </li>
            <li>
              <strong>Optimistic Updates</strong>: Instant UI updates with
              server sync
            </li>
          </ul>
        </ConceptCallout>
      </ArticleSection>
    </DemoArticle>
  );
}
