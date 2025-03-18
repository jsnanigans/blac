import { createFileRoute } from '@tanstack/react-router';
import { TaskBoard } from '../../components/TaskBoard';

export const Route = createFileRoute('/demo/taskboard')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold mb-6 text-foreground dark:text-gray-100">
          Blac Task Board Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          This demo showcases a powerful task management app built with Blac state management. 
          It demonstrates how Blac handles complex state, provides optimal re-rendering, 
          and implements a clean separation between UI and business logic.
        </p>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground dark:text-white">Key Features</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
            <li>
              <span className="font-medium">Drag and Drop:</span> Drag tasks between columns to change their status
            </li>
            <li>
              <span className="font-medium">Fine-Grained Reactivity:</span> Components only re-render when their specific data changes
            </li>
            <li>
              <span className="font-medium">Filtering:</span> Filter tasks by status, priority, or search term
            </li>
            <li>
              <span className="font-medium">Optimized Computed Properties:</span> The TaskBoardBloc provides computed properties that are only recalculated when necessary
            </li>
            <li>
              <span className="font-medium">Clean Architecture:</span> UI components are separated from business logic
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <TaskBoard />
      </section>

      <section className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-8">
        <h2 className="text-xl font-semibold mb-4 text-foreground dark:text-white">
          How It Works
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          This demo is built using the Blac state management library to illustrate separation of concerns and
          efficient state management.
        </p>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              TaskBoardBloc
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              The TaskBoardBloc is responsible for managing all task data, state transitions,
              and business logic. It emits state updates when tasks are added, updated, or filtered.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Computed Properties
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              The bloc provides computed properties (<code>todoTasks</code>, <code>inProgressTasks</code>, <code>doneTasks</code>) that
              filter the tasks based on status. Components that use these properties only re-render when
              the result of the computation changes.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Pure UI Components
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              The UI components focus solely on presentation and user interaction. They receive
              data and callbacks from the bloc but don't contain any business logic themselves.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
} 