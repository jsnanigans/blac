import { createFileRoute, Outlet } from '@tanstack/react-router';
import PrettyLink from '../components/PrettyLink';

export const Route = createFileRoute('/demo')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <div className="bg-card dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-8">
        <h1 className="text-3xl font-bold mb-4 text-foreground dark:text-gray-100">Demo Components</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">Explore the different demo components to see blac in action.</p>
        <div className="flex flex-wrap gap-2">
          <PrettyLink to="/demo/counter">Counter</PrettyLink>
          <PrettyLink to="/demo/form">Form</PrettyLink>
          <PrettyLink to="/demo/taskboard">Task Board</PrettyLink>
        </div>
      </div>
      <div className="card">
        <Outlet />
      </div>
    </div>
  );
}
