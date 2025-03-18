import { useBloc } from '@blac/react';
import { TaskBoardBloc, TaskStatus, Task } from './TaskBoardBloc';
import { TaskColumn } from './TaskColumn';
import './TaskBoard.css';

export function TaskBoard() {
  const [state, taskBoardBloc] = useBloc(TaskBoardBloc);
  const { filter, showAddTask, newTask } = state;
  const { status: statusFilter, priority: priorityFilter, searchQuery } = filter;

  return (
    <div className="space-y-6 bg-[#0f131a] p-6 rounded-lg">
      <h2 className="text-2xl font-bold text-white">
        TaskBoard
      </h2>

      <div className="flex justify-between items-center">
        <p className="text-gray-400">
          Drag and drop tasks between columns to change their status
        </p>
        <button 
          onClick={() => taskBoardBloc.toggleAddTask()} 
          className="bg-blue-600 text-white px-5 py-2.5 rounded-md hover:bg-blue-500 transition-colors"
        >
          Add Task
        </button>
      </div>

      {showAddTask && (
        <div className="bg-[#1e222b] rounded-lg shadow-lg border border-gray-700 p-6 mb-4">
          <h3 className="text-xl font-semibold mb-4 text-white">New Task</h3>
          <div className="space-y-5">
            <div>
              <label htmlFor="title" className="block mb-2 text-sm font-medium text-gray-300">Title</label>
              <input 
                id="title"
                value={newTask.title}
                onChange={(e) => taskBoardBloc.updateNewTask({ title: e.target.value })}
                placeholder="Enter task title"
                className="w-full p-3 bg-[#131720] border border-gray-700 rounded-md text-white placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="description" className="block mb-2 text-sm font-medium text-gray-300">Description</label>
              <textarea 
                id="description"
                value={newTask.description}
                onChange={(e) => taskBoardBloc.updateNewTask({ description: e.target.value })}
                placeholder="Enter task description"
                className="w-full p-3 bg-[#131720] border border-gray-700 rounded-md text-white placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="priority" className="block mb-2 text-sm font-medium text-gray-300">Priority</label>
              <div className="relative">
                <select
                  id="priority"
                  value={newTask.priority}
                  onChange={(e) => {
                    const value = e.target.value as Task["priority"];
                    taskBoardBloc.updateNewTask({ priority: value });
                  }}
                  className="w-full p-3 pr-10 bg-[#131720] border border-gray-700 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M5.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615l-4.695 4.502c-0.533 0.481-1.141 0.446-1.574 0l-4.695-4.502c-0.408-0.418-0.436-1.17 0-1.615z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => taskBoardBloc.toggleAddTask()}
                className="px-5 py-2.5 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => taskBoardBloc.addTask()}
                disabled={!newTask.title}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label htmlFor="status-filter" className="block mb-2 text-sm font-medium text-gray-300">Status Filter</label>
              <div className="relative">
                <select
                  id="status-filter"
                  value={statusFilter || 'all'}
                  onChange={(e) => {
                    const value = e.target.value as TaskStatus | 'all';
                    taskBoardBloc.setStatusFilter(value);
                  }}
                  className="w-full p-3 pr-10 bg-[#131720] border border-gray-700 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option value="all">All</option>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M5.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615l-4.695 4.502c-0.533 0.481-1.141 0.446-1.574 0l-4.695-4.502c-0.408-0.418-0.436-1.17 0-1.615z" />
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="priority-filter" className="block mb-2 text-sm font-medium text-gray-300">Priority Filter</label>
              <div className="relative">
                <select
                  id="priority-filter"
                  value={priorityFilter || 'all'}
                  onChange={(e) => {
                    const value = e.target.value as Task["priority"] | 'all';
                    taskBoardBloc.setPriorityFilter(value);
                  }}
                  className="w-full p-3 pr-10 bg-[#131720] border border-gray-700 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option value="all">All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M5.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615l-4.695 4.502c-0.533 0.481-1.141 0.446-1.574 0l-4.695-4.502c-0.408-0.418-0.436-1.17 0-1.615z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <label htmlFor="search" className="block mb-2 text-sm font-medium text-gray-300">Search</label>
            <div className="relative">
              <input
                id="search"
                value={searchQuery}
                onChange={(e) => taskBoardBloc.setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="p-3 pl-10 bg-[#131720] border border-gray-700 rounded-md text-white placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500 w-full"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
            </div>
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
              className="ml-2 text-blue-400 hover:text-blue-300 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TaskColumn status="todo" />
        <TaskColumn status="in-progress" />
        <TaskColumn status="done" />
      </div>
    </div>
  );
} 