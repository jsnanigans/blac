import { Cubit } from 'blac-next';

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

export interface TaskBoardState {
  tasks: Task[];
  filter: {
    status: TaskStatus | 'all';
    priority: 'all' | 'low' | 'medium' | 'high';
    searchQuery: string;
  };
  isLoading: boolean;
  showAddTask: boolean;
  newTask: TaskFormData;
}

export class TaskBoardBloc extends Cubit<TaskBoardState> {
  constructor() {
    super({
      tasks: initialTasks,
      filter: {
        status: 'all',
        priority: 'all',
        searchQuery: '',
      },
      isLoading: false,
      showAddTask: false,
      newTask: {
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
      },
    });
  }

  // Form operations
  toggleAddTask = () => {
    this.emit({
      ...this.state,
      showAddTask: !this.state.showAddTask,
    });
  };

  updateNewTask = (updates: Partial<TaskFormData>) => {
    this.emit({
      ...this.state,
      newTask: {
        ...this.state.newTask,
        ...updates,
      },
    });
  };

  resetNewTask = () => {
    this.emit({
      ...this.state,
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

    this.emit({
      ...this.state,
      tasks: [...this.state.tasks, newTask],
      showAddTask: false,
    });
    this.resetNewTask();
  };

  updateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    this.emit({
      ...this.state,
      tasks: this.state.tasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      ),
    });
  };

  updateTaskPriority = (taskId: string, priority: Task['priority']) => {
    this.emit({
      ...this.state,
      tasks: this.state.tasks.map((task) =>
        task.id === taskId ? { ...task, priority } : task
      ),
    });
  };

  deleteTask = (taskId: string) => {
    this.emit({
      ...this.state,
      tasks: this.state.tasks.filter((task) => task.id !== taskId),
    });
  };

  // Filter operations
  setStatusFilter = (status: TaskBoardState['filter']['status']) => {
    this.emit({
      ...this.state,
      filter: {
        ...this.state.filter,
        status,
      },
    });
  };

  setPriorityFilter = (priority: TaskBoardState['filter']['priority']) => {
    this.emit({
      ...this.state,
      filter: {
        ...this.state.filter,
        priority,
      },
    });
  };

  setSearchQuery = (searchQuery: string) => {
    this.emit({
      ...this.state,
      filter: {
        ...this.state.filter,
        searchQuery,
      },
    });
  };

  // Getters for filtered tasks
  get filteredTasks(): Task[] {
    const { status, priority, searchQuery } = this.state.filter;
    
    return this.state.tasks.filter((task) => {
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
  }

  get todoTasks(): Task[] {
    return this.filteredTasks.filter((task) => task.status === 'todo');
  }

  get inProgressTasks(): Task[] {
    return this.filteredTasks.filter((task) => task.status === 'in-progress');
  }

  get doneTasks(): Task[] {
    return this.filteredTasks.filter((task) => task.status === 'done');
  }

  get taskCountsByStatus(): Record<TaskStatus, number> {
    return {
      todo: this.todoTasks.length,
      'in-progress': this.inProgressTasks.length,
      done: this.doneTasks.length,
    };
  }
}

// Sample initial tasks
const initialTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Learn Blac Basics',
    description: 'Understand the core concepts of Blac state management',
    status: 'done',
    priority: 'high',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'task-2',
    title: 'Create Task Board Demo',
    description: 'Build a demo showcasing Blac capabilities with a drag-and-drop task board',
    status: 'in-progress',
    priority: 'high',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'task-3',
    title: 'Add Filtering',
    description: 'Implement filtering by status, priority, and search',
    status: 'todo',
    priority: 'medium',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'task-4',
    title: 'Optimize Performance',
    description: 'Ensure the app is performant with many tasks',
    status: 'todo',
    priority: 'medium',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'task-5',
    title: 'Write Documentation',
    description: 'Document the TaskBoard component and Bloc',
    status: 'todo',
    priority: 'low',
    createdAt: new Date(),
  },
]; 