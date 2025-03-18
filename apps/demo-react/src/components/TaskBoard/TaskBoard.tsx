import { useBloc } from '@blac/react';
import { TaskBoardBloc, TaskStatus, Task } from './TaskBoardBloc';
import { TaskColumn } from './TaskColumn';

export function TaskBoard() {
  const [{ filter, showAddTask, newTask }, taskBoardBloc] = useBloc(TaskBoardBloc);

  // These will only cause re-renders when the specific derived state changes
  const taskCountsByStatus = taskBoardBloc.taskCountsByStatus;

  const handleDrop = (taskId: string, newStatus: TaskStatus) => {
    taskBoardBloc.updateTaskStatus(taskId, newStatus);
  };

  return (
    <div className="">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Task Board
          </h1>
          <button
            onClick={taskBoardBloc.toggleAddTask}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {showAddTask ? 'Cancel' : 'Add Task'}
          </button>
        </div>

        {showAddTask && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="grid gap-4 mb-4">
              <div>
                <label
                  htmlFor="task-title"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Title
                </label>
                <input
                  type="text"
                  id="task-title"
                  value={newTask.title}
                  onChange={(e) =>
                    taskBoardBloc.updateNewTask({ title: e.target.value })
                  }
                  placeholder="Enter task title"
                  className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="task-description"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="task-description"
                  value={newTask.description}
                  onChange={(e) =>
                    taskBoardBloc.updateNewTask({ description: e.target.value })
                  }
                  placeholder="Enter task description"
                  rows={3}
                  className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="task-status"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Status
                  </label>
                  <select
                    id="task-status"
                    value={newTask.status}
                    onChange={(e) =>
                      taskBoardBloc.updateNewTask({
                        status: e.target.value as TaskStatus,
                      })
                    }
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="task-priority"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Priority
                  </label>
                  <select
                    id="task-priority"
                    value={newTask.priority}
                    onChange={(e) =>
                      taskBoardBloc.updateNewTask({
                        priority: e.target.value as Task['priority'],
                      })
                    }
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={taskBoardBloc.addTask}
                className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                disabled={!newTask.title.trim()}
              >
                Add Task
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-4 mb-4 flex-wrap">
          <div>
            <label
              htmlFor="status-filter"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Filter by Status
            </label>
            <select
              id="status-filter"
              value={filter.status}
              onChange={(e) =>
                taskBoardBloc.setStatusFilter(
                  e.target.value as TaskBoardBloc['state']['filter']['status']
                )
              }
              className="rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="priority-filter"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Filter by Priority
            </label>
            <select
              id="priority-filter"
              value={filter.priority}
              onChange={(e) =>
                taskBoardBloc.setPriorityFilter(
                  e.target.value as TaskBoardBloc['state']['filter']['priority']
                )
              }
              className="rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="search-filter"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Search
            </label>
            <input
              type="text"
              id="search-filter"
              value={filter.searchQuery}
              onChange={(e) => taskBoardBloc.setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-white">
              {taskCountsByStatus.todo}
            </span>{' '}
            to do
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">•</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-white">
              {taskCountsByStatus['in-progress']}
            </span>{' '}
            in progress
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">•</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-white">
              {taskCountsByStatus.done}
            </span>{' '}
            done
          </div>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        <TaskColumn
          status="todo"
        />
        <TaskColumn
          status="in-progress"
        />
        <TaskColumn
          status="done"
        />
      </div>
    </div>
  );
} 