import { useState } from 'react';
import { Task, TaskStatus } from './TaskBoardBloc';

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

export function TaskCard({
  task,
  onStatusChange,
  onPriorityChange,
  onDelete,
  onDragStart,
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-3 cursor-grab active:cursor-grabbing"
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
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg
              className="w-5 h-5 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
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
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
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