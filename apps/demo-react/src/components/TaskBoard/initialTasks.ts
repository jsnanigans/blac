import { Task } from "./TaskBoardBloc";

// Sample initial tasks
export const initialTasks: Task[] = [
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