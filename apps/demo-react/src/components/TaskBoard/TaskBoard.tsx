import { useBloc } from '@blac/react';
import { TaskBoardBloc, TaskStatus, Task } from './TaskBoardBloc';
import { TaskColumn } from './TaskColumn';
import './TaskBoard.css';

// Memoize the filter options to prevent unnecessary re-renders
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;

export function TaskBoard() {
  const [state, taskBoardBloc] = useBloc(TaskBoardBloc);
  const { filter, showAddTask, newTask } = state;
  const { status: statusFilter, priority: priorityFilter, searchQuery } = filter;
  const { taskStats } = taskBoardBloc;

  return (
    <div className="space-y-6 bg-[#0f131a] p-6 rounded-lg">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Task Board</h2>
            <p className="text-sm text-gray-400 mt-1">
              {taskStats.completed} of {taskStats.total} tasks completed ({taskStats.completionRate.toFixed(1)}%)
            </p>
          </div>
          <div className="space-x-2">
            <button 
              onClick={() => taskBoardBloc.toggleAddTask()} 
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500 transition-colors"
            >
              Add Task
            </button>
          </div>
        </div>
        
        <p className="text-gray-400">
          A demonstration of state management with Blac. Try adding tasks, filtering, or dragging between columns.
        </p>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1e222b] p-4 rounded-lg">
          <div className="text-sm text-gray-400">Total Tasks</div>
          <div className="text-2xl font-bold text-white">{taskStats.total}</div>
        </div>
        <div className="bg-[#1e222b] p-4 rounded-lg">
          <div className="text-sm text-gray-400">To Do</div>
          <div className="text-2xl font-bold text-blue-400">{taskStats.todo}</div>
        </div>
        <div className="bg-[#1e222b] p-4 rounded-lg">
          <div className="text-sm text-gray-400">In Progress</div>
          <div className="text-2xl font-bold text-yellow-400">{taskStats.inProgress}</div>
        </div>
        <div className="bg-[#1e222b] p-4 rounded-lg">
          <div className="text-sm text-gray-400">Completed</div>
          <div className="text-2xl font-bold text-green-400">{taskStats.completed}</div>
        </div>
      </div>

      {showAddTask && (
        <div className="bg-[#1e222b] rounded-lg p-4 mb-4">
          <h3 className="text-xl font-semibold mb-4 text-white">New Task</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block mb-2 text-sm text-gray-300">Title</label>
              <input 
                id="title"
                value={newTask.title}
                onChange={(e) => taskBoardBloc.updateNewTask({ title: e.target.value })}
                placeholder="Enter task title"
                className="w-full p-2 bg-[#131720] border border-gray-700 rounded-md text-white"
              />
            </div>
            <div>
              <label htmlFor="description" className="block mb-2 text-sm text-gray-300">Description</label>
              <textarea 
                id="description"
                value={newTask.description}
                onChange={(e) => taskBoardBloc.updateNewTask({ description: e.target.value })}
                placeholder="Enter task description"
                className="w-full p-2 bg-[#131720] border border-gray-700 rounded-md text-white"
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="priority" className="block mb-2 text-sm text-gray-300">Priority</label>
              <select
                id="priority"
                value={newTask.priority}
                onChange={(e) => {
                  const value = e.target.value as Task["priority"];
                  taskBoardBloc.updateNewTask({ priority: value });
                }}
                className="w-full p-2 bg-[#131720] border border-gray-700 rounded-md text-white"
              >
                {PRIORITY_OPTIONS.slice(1).map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              <button 
                onClick={() => taskBoardBloc.toggleAddTask()}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button 
                onClick={() => taskBoardBloc.addTask()}
                disabled={!newTask.title}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="status-filter" className="block mb-2 text-sm text-gray-300">Status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                const value = e.target.value as TaskStatus | 'all';
                taskBoardBloc.setStatusFilter(value);
              }}
              className="w-full p-2 bg-[#131720] border border-gray-700 rounded-md text-white"
            >
              {STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="priority-filter" className="block mb-2 text-sm text-gray-300">Priority</label>
            <select
              id="priority-filter"
              value={priorityFilter}
              onChange={(e) => {
                const value = e.target.value as Task["priority"] | 'all';
                taskBoardBloc.setPriorityFilter(value);
              }}
              className="w-full p-2 bg-[#131720] border border-gray-700 rounded-md text-white"
            >
              {PRIORITY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="search" className="block mb-2 text-sm text-gray-300">Search</label>
            <input
              id="search"
              value={searchQuery}
              onChange={(e) => taskBoardBloc.setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full p-2 bg-[#131720] border border-gray-700 rounded-md text-white"
            />
          </div>
        </div>

        <div className="text-sm text-gray-400">
          Showing {taskBoardBloc.filteredTasks.length} of {state.tasks.length} tasks
          {(statusFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
            <button 
              onClick={() => {
                taskBoardBloc.setStatusFilter('all');
                taskBoardBloc.setPriorityFilter('all');
                taskBoardBloc.setSearchQuery('');
              }}
              className="ml-2 text-blue-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TaskColumn status="todo" />
        <TaskColumn status="in-progress" />
        <TaskColumn status="done" />
      </div>

      <div className="mt-8 p-4 bg-[#1e222b] rounded-md">
        <h3 className="text-lg font-semibold text-white mb-2">Blac Concepts Demonstrated</h3>
        <ul className="list-disc pl-5 text-gray-300 space-y-2 text-sm">
          <li>
            <strong>Direct State Access:</strong> Each component can directly access the TaskBoardBloc without props drilling
          </li>
          <li>
            <strong>Intelligent Re-rendering:</strong> Components only re-render when data they actually use changes
          </li>
          <li>
            <strong>Computed Properties:</strong> <code>todoTasks</code>, <code>inProgressTasks</code>, and <code>doneTasks</code> are only recalculated when dependencies change
          </li>
          <li>
            <strong>Clean Updates:</strong> Using <code>patch()</code> to efficiently update only what has changed
          </li>
          <li>
            <strong>Performance Optimizations:</strong> Filtered results are cached and only recalculated when filters change
          </li>
          <li>
            <strong>Derived State:</strong> Task statistics are automatically calculated and updated when tasks change
          </li>
        </ul>
      </div>
    </div>
  );
} 