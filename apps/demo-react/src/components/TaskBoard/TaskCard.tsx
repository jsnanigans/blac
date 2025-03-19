import { useState } from 'react';
import { Task, TaskStatus } from './TaskBoardBloc';

// Note that this component doesn't use useBloc directly
// It receives props from its parent component
// This demonstrates how Blac works well with traditional props too
interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onPriorityChange: (taskId: string, newPriority: Task['priority']) => void;
  onDelete: (taskId: string) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
}

const priorityColors = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const priorityBorders = {
  low: 'border-l-4 border-blue-400',
  medium: 'border-l-4 border-yellow-400',
  high: 'border-l-4 border-red-400',
};

export function TaskCard({
  task,
  onStatusChange,
  onPriorityChange,
  onDelete,
  onDragStart,
}: TaskCardProps) {
  // Local component state for UI interactions
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart(e, task);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${priorityBorders[task.priority]} p-4 ${
        isDragging ? 'opacity-50' : 'hover:shadow-md'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white">{task.title}</h3>
          {isExpanded && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {task.description}
            </p>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ⋮
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
              <div className="py-1">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </div>
                {(['todo', 'in-progress', 'done'] as TaskStatus[]).map((status) => (
                  <button
                    key={status}
                    className={`block px-4 py-2 text-sm w-full text-left ${
                      task.status === status
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => {
                      onStatusChange(task.id, status);
                      setShowDropdown(false);
                    }}
                  >
                    {status === 'todo' ? 'To Do' : status === 'in-progress' ? 'In Progress' : 'Done'}
                  </button>
                ))}
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Priority
                </div>
                {(['low', 'medium', 'high'] as const).map((priority) => (
                  <button
                    key={priority}
                    className={`block px-4 py-2 text-sm w-full text-left ${
                      task.priority === priority
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => {
                      onPriorityChange(task.id, priority);
                      setShowDropdown(false);
                    }}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </button>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button
                  className="block px-4 py-2 text-sm text-red-600 dark:text-red-400 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => {
                    onDelete(task.id);
                    setShowDropdown(false);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatDate(task.createdAt)}
          </span>
        </div>
        <div
          className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
            priorityColors[task.priority]
          }`}
        >
          {task.priority}
        </div>
      </div>
    </div>
  );
} 