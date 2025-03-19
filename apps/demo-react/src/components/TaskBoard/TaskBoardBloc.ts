import { Cubit } from 'blac-next';
import { initialTasks } from './initialTasks';

// Define the basic types for our task management system
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Task['priority'];
}

// Define the state shape for our TaskBoard
export interface TaskBoardState {
  tasks: Task[];
  filter: {
    status: TaskStatus | 'all';
    priority: 'all' | Task['priority'];
    searchQuery: string;
  };
  showAddTask: boolean;
  newTask: TaskFormData;
  // Add a cache for filtered results
  _filteredTasksCache?: {
    tasks: Task[];
    filterKey: string;
  };
}

// Create a Cubit class to manage our TaskBoard state
export class TaskBoardBloc extends Cubit<TaskBoardState> {
  constructor() {
    // Initialize state with default values when instantiated
    super({
      tasks: initialTasks,
      filter: {
        status: 'all',
        priority: 'all',
        searchQuery: '',
      },
      showAddTask: false,
      newTask: {
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
      },
    });
  }

  // Helper to generate a cache key for filtered tasks
  private getFilterKey(): string {
    const { status, priority, searchQuery } = this.state.filter;
    return `${status}-${priority}-${searchQuery}`;
  }

  // Form operations
  toggleAddTask = () => {
    // Use patch to efficiently update only what changed
    this.patch({
      showAddTask: !this.state.showAddTask,
    });
  };

  updateNewTask = (updates: Partial<TaskFormData>) => {
    this.patch({
      newTask: {
        ...this.state.newTask,
        ...updates,
      },
    });
  };

  resetNewTask = () => {
    this.patch({
      newTask: {
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
      },
    });
  };

  // Task operations
  addTask = () => {
    if (!this.state.newTask.title.trim()) return;

    const newTask: Task = {
      ...this.state.newTask,
      id: `task-${Date.now()}`,
      createdAt: new Date(),
    };

    this.patch({
      tasks: [...this.state.tasks, newTask],
      showAddTask: false,
      // Clear the cache when tasks change
      _filteredTasksCache: undefined,
    });
    this.resetNewTask();
  };

  updateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    this.patch({
      tasks: this.state.tasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      ),
      // Clear the cache when tasks change
      _filteredTasksCache: undefined,
    });
  };

  updateTaskPriority = (taskId: string, priority: Task['priority']) => {
    this.patch({
      tasks: this.state.tasks.map((task) =>
        task.id === taskId ? { ...task, priority } : task
      ),
      // Clear the cache when tasks change
      _filteredTasksCache: undefined,
    });
  };

  deleteTask = (taskId: string) => {
    this.patch({
      tasks: this.state.tasks.filter((task) => task.id !== taskId),
      // Clear the cache when tasks change
      _filteredTasksCache: undefined,
    });
  };

  // Filter operations
  setStatusFilter = (status: TaskBoardState['filter']['status']) => {
    this.patch({
      filter: {
        ...this.state.filter,
        status,
      },
      // Clear the cache when filters change
      _filteredTasksCache: undefined,
    });
  };

  setPriorityFilter = (priority: TaskBoardState['filter']['priority']) => {
    this.patch({
      filter: {
        ...this.state.filter,
        priority,
      },
      // Clear the cache when filters change
      _filteredTasksCache: undefined,
    });
  };

  setSearchQuery = (searchQuery: string) => {
    this.patch({
      filter: {
        ...this.state.filter,
        searchQuery,
      },
      // Clear the cache when filters change
      _filteredTasksCache: undefined,
    });
  };

  // Getters (computed properties) - these automatically cache and recalculate only when dependencies change
  get filteredTasks(): Task[] {
    const filterKey = this.getFilterKey();
    
    // Return cached results if available and valid
    if (this.state._filteredTasksCache?.filterKey === filterKey) {
      return this.state._filteredTasksCache.tasks;
    }

    const { status, priority, searchQuery } = this.state.filter;
    
    const filtered = this.state.tasks.filter((task) => {
      // Filter by status
      if (status !== 'all' && task.status !== status) return false;
      
      // Filter by priority
      if (priority !== 'all' && task.priority !== priority) return false;
      
      // Filter by search query
      if (
        searchQuery &&
        !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !task.description.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      
      return true;
    });

    // Cache the results
    this.patch({
      _filteredTasksCache: {
        tasks: filtered,
        filterKey,
      },
    });

    return filtered;
  }

  // Computed properties for each column's tasks
  get todoTasks(): Task[] {
    return this.filteredTasks.filter((task) => task.status === 'todo');
  }

  get inProgressTasks(): Task[] {
    return this.filteredTasks.filter((task) => task.status === 'in-progress');
  }

  get doneTasks(): Task[] {
    return this.filteredTasks.filter((task) => task.status === 'done');
  }

  // Add a computed property for task statistics
  get taskStats() {
    const total = this.state.tasks.length;
    const completed = this.doneTasks.length;
    const inProgress = this.inProgressTasks.length;
    const todo = this.todoTasks.length;

    return {
      total,
      completed,
      inProgress,
      todo,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }
}
